package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// UploadFavicon handles favicon file uploads
func (h *Handlers) UploadFavicon(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("favicon")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type (should be image)
	contentType := header.Header.Get("Content-Type")
	if contentType != "image/x-icon" && contentType != "image/png" && contentType != "image/jpeg" && contentType != "image/gif" {
		http.Error(w, "Invalid file type. Only ico, png, jpg, gif allowed", http.StatusBadRequest)
		return
	}

	// Create data directory if it doesn't exist
	dataDir := "data"
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		os.MkdirAll(dataDir, 0755)
	}

	// Determine file extension
	var ext string
	switch contentType {
	case "image/x-icon":
		ext = ".ico"
	case "image/png":
		ext = ".png"
	case "image/jpeg":
		ext = ".jpg"
	case "image/gif":
		ext = ".gif"
	default:
		ext = filepath.Ext(header.Filename)
	}

	// Save file as favicon with appropriate extension
	faviconPath := filepath.Join(dataDir, "favicon"+ext)
	dst, err := os.Create(faviconPath)
	if err != nil {
		http.Error(w, "Unable to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Unable to save file", http.StatusInternalServerError)
		return
	}

	// Update settings with the new favicon path
	settings := h.store.GetSettings()
	settings.CustomFaviconPath = "/data/favicon" + ext
	h.store.SaveSettings(settings)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "path": settings.CustomFaviconPath})
}

// UploadFont handles custom font file uploads
func (h *Handlers) UploadFont(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("font")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type (should be font)
	contentType := header.Header.Get("Content-Type")
	filename := header.Filename
	ext := strings.ToLower(filepath.Ext(filename))

	validTypes := map[string]bool{
		"font/woff":              true,
		"font/woff2":             true,
		"font/ttf":               true,
		"font/otf":               true,
		"application/font-woff":  true,
		"application/font-woff2": true,
		"application/x-font-ttf": true,
		"application/x-font-otf": true,
		"application/font-sfnt":  true,
	}

	isValidType := validTypes[contentType]
	isValidExt := ext == ".woff" || ext == ".woff2" || ext == ".ttf" || ext == ".otf"

	if !isValidType && !isValidExt {
		http.Error(w, "Invalid file type. Only woff, woff2, ttf, otf allowed", http.StatusBadRequest)
		return
	}

	// Create data directory if it doesn't exist
	dataDir := "data"
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		os.MkdirAll(dataDir, 0755)
	}

	// Determine file extension
	switch contentType {
	case "font/woff", "application/font-woff":
		ext = ".woff"
	case "font/woff2", "application/font-woff2":
		ext = ".woff2"
	case "font/ttf", "application/x-font-ttf", "application/font-sfnt":
		ext = ".ttf"
	case "font/otf", "application/x-font-otf":
		ext = ".otf"
	default:
		// Use extension from filename if content type not recognized
		if ext == "" {
			ext = filepath.Ext(header.Filename)
		}
	}

	// Save file as font with appropriate extension
	fontPath := filepath.Join(dataDir, "font"+ext)
	dst, err := os.Create(fontPath)
	if err != nil {
		http.Error(w, "Unable to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Unable to save file", http.StatusInternalServerError)
		return
	}

	// Update settings with the new font path
	settings := h.store.GetSettings()
	settings.CustomFontPath = "/data/font" + ext
	h.store.SaveSettings(settings)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "path": settings.CustomFontPath})
}

// UploadIcon handles bookmark icon file uploads
func (h *Handlers) UploadIcon(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("icon")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type (should be image)
	contentType := header.Header.Get("Content-Type")
	if contentType != "image/x-icon" && contentType != "image/png" && contentType != "image/jpeg" && contentType != "image/gif" && contentType != "image/svg+xml" {
		http.Error(w, "Invalid file type. Only ico, png, jpg, gif, svg allowed", http.StatusBadRequest)
		return
	}

	// Create data/icons directory if it doesn't exist
	iconsDir := "data/icons"
	if _, err := os.Stat(iconsDir); os.IsNotExist(err) {
		os.MkdirAll(iconsDir, 0755)
	}

	// Determine file extension
	var ext string
	switch contentType {
	case "image/x-icon":
		ext = ".ico"
	case "image/png":
		ext = ".png"
	case "image/jpeg":
		ext = ".jpg"
	case "image/gif":
		ext = ".gif"
	case "image/svg+xml":
		ext = ".svg"
	default:
		ext = filepath.Ext(header.Filename)
	}

	// Generate unique filename based on original filename (without extension)
	baseName := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
	// Sanitize filename to prevent path traversal
	baseName = strings.ReplaceAll(baseName, "..", "")
	baseName = strings.ReplaceAll(baseName, "/", "")
	baseName = strings.ReplaceAll(baseName, "\\", "")

	// Check if file already exists
	fileName := baseName + ext
	filePath := filepath.Join(iconsDir, fileName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// File doesn't exist, save it
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		_, err = io.Copy(dst, file)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
	}
	// If file exists, we reuse it (no need to save again)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "icon": fileName})
}

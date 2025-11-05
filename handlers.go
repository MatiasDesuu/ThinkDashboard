package main

import (
	"archive/zip"
	"bytes"
	"crypto/tls"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type Handlers struct {
	store Store
	files embed.FS
}

func NewHandlers(store Store, files embed.FS) *Handlers {
	return &Handlers{
		store: store,
		files: files,
	}
}

// validateBookmarkURL checks if the bookmark URL has a safe scheme (http or https)
func validateBookmarkURL(bookmarkURL string) error {
	if bookmarkURL == "" {
		return nil // Allow empty URLs
	}

	parsedURL, err := url.Parse(bookmarkURL)
	if err != nil {
		return fmt.Errorf("invalid URL format")
	}

	// Only allow http and https schemes
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("URL scheme '%s' is not allowed. Only http and https are permitted", parsedURL.Scheme)
	}

	return nil
}

// isValidImportFilename validates that the filename is safe and allowed for import
func (h *Handlers) isValidImportFilename(filename string) bool {
	// Prevent path traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return false
	}

	// Allow only specific filenames with their extensions
	allowedFiles := []string{
		"settings.json",
		"colors.json",
		"pages.json",
		"favicon.ico",
		"favicon.png",
		"favicon.jpg",
		"favicon.gif",
		"font.woff",
		"font.woff2",
		"font.ttf",
		"font.otf",
	}

	// Check if it's one of the specific files
	for _, allowed := range allowedFiles {
		if filename == allowed {
			return true
		}
	}

	// Check if it's a bookmarks file (bookmarks- followed by digits and .json)
	if strings.HasPrefix(filename, "bookmarks-") && strings.HasSuffix(filename, ".json") {
		// Extract the number part
		numberPart := strings.TrimPrefix(strings.TrimSuffix(filename, ".json"), "bookmarks-")
		if _, err := strconv.Atoi(numberPart); err == nil {
			return true
		}
	}

	return false
}

func (h *Handlers) Dashboard(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/dashboard.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme               string
		FontSize            string
		ShowBackgroundDots  bool
		ShowTitle           bool
		ShowDate            bool
		ShowConfigButton    bool
		ShowSearchButton    bool
		EnableCustomTitle   bool
		CustomTitle         string
		EnableCustomFavicon bool
		CustomFaviconPath   string
		EnableCustomFont    bool
		CustomFontPath      string
		Language            string
		ShowPageTabs        bool
	}{
		Theme:               settings.Theme,
		FontSize:            settings.FontSize,
		ShowBackgroundDots:  settings.ShowBackgroundDots,
		ShowTitle:           settings.ShowTitle,
		ShowDate:            settings.ShowDate,
		ShowConfigButton:    settings.ShowConfigButton,
		ShowSearchButton:    settings.ShowSearchButton,
		EnableCustomTitle:   settings.EnableCustomTitle,
		CustomTitle:         settings.CustomTitle,
		EnableCustomFavicon: settings.EnableCustomFavicon,
		CustomFaviconPath:   settings.CustomFaviconPath,
		EnableCustomFont:    settings.EnableCustomFont,
		CustomFontPath:      settings.CustomFontPath,
		Language:            settings.Language,
		ShowPageTabs:        settings.ShowPageTabs,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(buf.Bytes())
}

func (h *Handlers) Config(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/config.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme               string
		FontSize            string
		ShowBackgroundDots  bool
		ShowTitle           bool
		ShowDate            bool
		ShowConfigButton    bool
		EnableCustomFavicon bool
		CustomFaviconPath   string
		EnableCustomFont    bool
		CustomFontPath      string
		Language            string
		ShowPageTabs        bool
	}{
		Theme:               settings.Theme,
		FontSize:            settings.FontSize,
		ShowBackgroundDots:  settings.ShowBackgroundDots,
		ShowTitle:           settings.ShowTitle,
		ShowDate:            settings.ShowDate,
		ShowConfigButton:    settings.ShowConfigButton,
		EnableCustomFavicon: settings.EnableCustomFavicon,
		CustomFaviconPath:   settings.CustomFaviconPath,
		EnableCustomFont:    settings.EnableCustomFont,
		CustomFontPath:      settings.CustomFontPath,
		Language:            settings.Language,
		ShowPageTabs:        settings.ShowPageTabs,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(buf.Bytes())
}

func (h *Handlers) setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func (h *Handlers) GetBookmarks(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	pageIDStr := r.URL.Query().Get("page")
	all := r.URL.Query().Get("all")
	var bookmarks []Bookmark

	if all == "true" {
		// Get bookmarks from all pages
		bookmarks = h.store.GetAllBookmarks()
	} else if pageIDStr != "" {
		pageID, err := strconv.Atoi(pageIDStr)
		if err != nil {
			http.Error(w, "Invalid page ID", http.StatusBadRequest)
			return
		}
		bookmarks = h.store.GetBookmarksByPage(pageID)
	} else {
		// No page ID provided - return empty array
		// Pages are required now, no global bookmarks
		bookmarks = []Bookmark{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmarks)
}

func (h *Handlers) SaveBookmarks(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	pageIDStr := r.URL.Query().Get("page")
	if pageIDStr == "" {
		http.Error(w, "Page ID is required", http.StatusBadRequest)
		return
	}

	var bookmarks []Bookmark
	if err := json.NewDecoder(r.Body).Decode(&bookmarks); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate each bookmark URL
	for _, bookmark := range bookmarks {
		if err := validateBookmarkURL(bookmark.URL); err != nil {
			http.Error(w, fmt.Sprintf("Invalid bookmark URL: %v", err), http.StatusBadRequest)
			return
		}
	}

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	h.store.SaveBookmarksByPage(pageID, bookmarks)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) AddBookmark(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	var request struct {
		Page     int      `json:"page"`
		Bookmark Bookmark `json:"bookmark"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate the bookmark URL
	if err := validateBookmarkURL(request.Bookmark.URL); err != nil {
		http.Error(w, fmt.Sprintf("Invalid bookmark URL: %v", err), http.StatusBadRequest)
		return
	}

	h.store.AddBookmarkToPage(request.Page, request.Bookmark)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) DeleteBookmark(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	var request struct {
		Page     int      `json:"page"`
		Bookmark Bookmark `json:"bookmark"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteBookmarkFromPage(request.Page, request.Bookmark); err != nil {
		http.Error(w, "Error deleting bookmark", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) GetCategories(w http.ResponseWriter, r *http.Request) {
	pageIDStr := r.URL.Query().Get("page")
	if pageIDStr == "" {
		// No page param provided - return empty array
		// Categories are now per-page only, no global categories
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Category{})
		return
	}

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	categories := h.store.GetCategoriesByPage(pageID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *Handlers) SaveCategories(w http.ResponseWriter, r *http.Request) {
	pageIDStr := r.URL.Query().Get("page")
	if pageIDStr == "" {
		http.Error(w, "Page ID is required", http.StatusBadRequest)
		return
	}

	var categories []Category
	if err := json.NewDecoder(r.Body).Decode(&categories); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	h.store.SaveCategoriesByPage(pageID, categories)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) GetPages(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	pages := h.store.GetPages()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func (h *Handlers) SavePages(w http.ResponseWriter, r *http.Request) {
	var pages []Page
	if err := json.NewDecoder(r.Body).Decode(&pages); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Extract page order (array of IDs)
	order := make([]int, len(pages))
	for i, page := range pages {
		order[i] = page.ID
	}

	// Save the order
	h.store.SavePageOrder(order)

	// Save each page individually
	// Note: This assumes bookmarks are saved separately via SaveBookmarks endpoint
	for _, page := range pages {
		// Get existing bookmarks for this page to preserve them
		bookmarks := h.store.GetBookmarksByPage(page.ID)
		h.store.SavePage(page, bookmarks)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) DeletePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageIDStr := vars["id"]

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	// Prevent deleting page 1 (main page)
	if pageID == 1 {
		http.Error(w, "Cannot delete the main page", http.StatusBadRequest)
		return
	}

	// Delete the page file
	if err := h.store.DeletePage(pageID); err != nil {
		http.Error(w, "Error deleting page", http.StatusInternalServerError)
		return
	}

	// Update the page order - remove the deleted page ID
	order := h.store.GetPageOrder()
	newOrder := make([]int, 0, len(order))
	for _, id := range order {
		if id != pageID {
			newOrder = append(newOrder, id)
		}
	}
	h.store.SavePageOrder(newOrder)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings := h.store.GetSettings()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func (h *Handlers) SaveSettings(w http.ResponseWriter, r *http.Request) {
	var settings Settings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	h.store.SaveSettings(settings)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

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

func (h *Handlers) Colors(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/colors.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme              string
		FontSize           string
		ShowBackgroundDots bool
		EnableCustomFont   bool
		CustomFontPath     string
		Language           string
	}{
		Theme:              settings.Theme,
		FontSize:           settings.FontSize,
		ShowBackgroundDots: settings.ShowBackgroundDots,
		EnableCustomFont:   settings.EnableCustomFont,
		CustomFontPath:     settings.CustomFontPath,
		Language:           settings.Language,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(buf.Bytes())
}

func (h *Handlers) GetColors(w http.ResponseWriter, r *http.Request) {
	colors := h.store.GetColors()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(colors)
}

func (h *Handlers) SaveColors(w http.ResponseWriter, r *http.Request) {
	var colors ColorTheme
	if err := json.NewDecoder(r.Body).Decode(&colors); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	h.store.SaveColors(colors)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) ResetColors(w http.ResponseWriter, r *http.Request) {
	// Get current colors to preserve custom themes
	currentColors := h.store.GetColors()

	// Reset only light and dark themes to defaults, keep custom themes
	defaultColors := ColorTheme{
		Light: ThemeColors{
			TextPrimary:         "#1F2937",
			TextSecondary:       "#6B7280",
			TextTertiary:        "#9CA3AF",
			BackgroundPrimary:   "#F9FAFB",
			BackgroundSecondary: "#F3F4F6",
			BackgroundDots:      "#E5E7EB",
			BackgroundModal:     "rgba(255, 255, 255, 0.9)",
			BorderPrimary:       "#D1D5DB",
			BorderSecondary:     "#E5E7EB",
			AccentSuccess:       "#059669",
			AccentWarning:       "#D97706",
			AccentError:         "#DC2626",
		},
		Dark: ThemeColors{
			TextPrimary:         "#E5E7EB",
			TextSecondary:       "#9CA3AF",
			TextTertiary:        "#6B7280",
			BackgroundPrimary:   "#000",
			BackgroundSecondary: "#1F2937",
			BackgroundDots:      "#1F2937",
			BackgroundModal:     "rgba(0, 0, 0, 0.8)",
			BorderPrimary:       "#4B5563",
			BorderSecondary:     "#374151",
			AccentSuccess:       "#10B981",
			AccentWarning:       "#F59E0B",
			AccentError:         "#EF4444",
		},
		Custom: currentColors.Custom, // Preserve existing custom themes
	}

	h.store.SaveColors(defaultColors)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(defaultColors)
}

func (h *Handlers) GetCustomThemesList(w http.ResponseWriter, r *http.Request) {
	colors := h.store.GetColors()

	themesMap := make(map[string]string)
	for themeID, themeColors := range colors.Custom {
		themesMap[themeID] = themeColors.Name
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(themesMap)
}

func (h *Handlers) CustomThemeCSS(w http.ResponseWriter, r *http.Request) {
	colors := h.store.GetColors()

	w.Header().Set("Content-Type", "text/css")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	css := `/* Custom Theme Variables - Loaded from colors.json */

/* Light Theme Variables */
html[data-theme="light"] body {
    /* Text Colors */
    --text-primary: ` + colors.Light.TextPrimary + `;
    --text-secondary: ` + colors.Light.TextSecondary + `;
    --text-tertiary: ` + colors.Light.TextTertiary + `;
    
    /* Background Colors */
    --background-primary: ` + colors.Light.BackgroundPrimary + `;
    --background-secondary: ` + colors.Light.BackgroundSecondary + `;
    --background-dots: ` + colors.Light.BackgroundDots + `;
    --background-modal: ` + colors.Light.BackgroundModal + `;
    
    /* Border Colors */
    --border-primary: ` + colors.Light.BorderPrimary + `;
    --border-secondary: ` + colors.Light.BorderSecondary + `;
    
    /* Accent Colors */
    --accent-success: ` + colors.Light.AccentSuccess + `;
    --accent-warning: ` + colors.Light.AccentWarning + `;
    --accent-error: ` + colors.Light.AccentError + `;
}

/* Dark Theme Variables */
html[data-theme="dark"] body {
    /* Text Colors */
    --text-primary: ` + colors.Dark.TextPrimary + `;
    --text-secondary: ` + colors.Dark.TextSecondary + `;
    --text-tertiary: ` + colors.Dark.TextTertiary + `;
    
    /* Background Colors */
    --background-primary: ` + colors.Dark.BackgroundPrimary + `;
    --background-secondary: ` + colors.Dark.BackgroundSecondary + `;
    --background-dots: ` + colors.Dark.BackgroundDots + `;
    --background-modal: ` + colors.Dark.BackgroundModal + `;
    
    /* Border Colors */
    --border-primary: ` + colors.Dark.BorderPrimary + `;
    --border-secondary: ` + colors.Dark.BorderSecondary + `;
    
    /* Accent Colors */
    --accent-success: ` + colors.Dark.AccentSuccess + `;
    --accent-warning: ` + colors.Dark.AccentWarning + `;
    --accent-error: ` + colors.Dark.AccentError + `;
}
`

	// Add custom themes CSS
	for themeID, themeColors := range colors.Custom {
		customThemeCSS := `
/* Custom Theme: ` + themeID + ` */
html[data-theme="` + themeID + `"] body {
    /* Text Colors */
    --text-primary: ` + themeColors.TextPrimary + `;
    --text-secondary: ` + themeColors.TextSecondary + `;
    --text-tertiary: ` + themeColors.TextTertiary + `;
    
    /* Background Colors */
    --background-primary: ` + themeColors.BackgroundPrimary + `;
    --background-secondary: ` + themeColors.BackgroundSecondary + `;
    --background-dots: ` + themeColors.BackgroundDots + `;
    --background-modal: ` + themeColors.BackgroundModal + `;
    
    /* Border Colors */
    --border-primary: ` + themeColors.BorderPrimary + `;
    --border-secondary: ` + themeColors.BorderSecondary + `;
    
    /* Accent Colors */
    --accent-success: ` + themeColors.AccentSuccess + `;
    --accent-warning: ` + themeColors.AccentWarning + `;
    --accent-error: ` + themeColors.AccentError + `;
}
`
		css += customThemeCSS
	}

	w.Write([]byte(css))
}

func (h *Handlers) PingURL(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers first
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Get URL from query parameter
	urlParam := r.URL.Query().Get("url")
	if urlParam == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "URL parameter is required",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Parse and validate URL
	parsedURL, err := url.Parse(urlParam)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "Invalid URL",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Validate that the URL belongs to a registered bookmark
	allBookmarks := h.store.GetAllBookmarks()
	isValidBookmark := false
	for _, bookmark := range allBookmarks {
		if bookmark.URL == urlParam {
			isValidBookmark = true
			break
		}
	}
	if !isValidBookmark {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "URL is not a registered bookmark",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Extract host and port
	host := parsedURL.Hostname()
	port := parsedURL.Port()
	if port == "" {
		if parsedURL.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}

	// Start timing
	start := time.Now()

	// Try TCP connection first (fast ping)
	address := net.JoinHostPort(host, port)
	conn, err := net.DialTimeout("tcp", address, 2*time.Second)

	if err == nil {
		conn.Close()
		elapsed := time.Since(start).Milliseconds()
		// Ensure minimum of 1ms for display purposes
		if elapsed < 1 {
			elapsed = 1
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "online",
			"ping":   elapsed,
		})
		return
	}

	// If TCP fails, try a quick HTTP request as fallback
	client := &http.Client{
		Timeout: 3 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
			DialContext: (&net.Dialer{
				Timeout: 2 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   2 * time.Second,
			ResponseHeaderTimeout: 2 * time.Second,
		},
	}

	req, err := http.NewRequest("HEAD", urlParam, nil)
	if err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	resp, err := client.Do(req)
	if resp != nil {
		defer resp.Body.Close()
	}

	elapsed := time.Since(start).Milliseconds()
	// Ensure minimum of 1ms for display purposes
	if elapsed < 1 {
		elapsed = 1
	}

	if err == nil && resp != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "online",
			"ping":   elapsed,
		})
		return
	}

	// Offline
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "offline",
		"ping":   nil,
	})
}

func (h *Handlers) Backup(w http.ResponseWriter, r *http.Request) {
	// Create a buffer to write our archive to
	buf := new(bytes.Buffer)

	// Create a new zip archive
	zipWriter := zip.NewWriter(buf)

	// Walk through the data directory
	dataDir := "data"
	err := filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Create a relative path for the zip entry
		relPath, err := filepath.Rel(dataDir, path)
		if err != nil {
			return err
		}

		// Create zip file entry
		zipFile, err := zipWriter.Create(relPath)
		if err != nil {
			return err
		}

		// Open the file
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		// Copy file content to zip
		_, err = io.Copy(zipFile, file)
		return err
	})

	if err != nil {
		http.Error(w, "Failed to create backup", http.StatusInternalServerError)
		return
	}

	// Close the zip writer
	err = zipWriter.Close()
	if err != nil {
		http.Error(w, "Failed to finalize backup", http.StatusInternalServerError)
		return
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=thinkdashboard-backup.zip")
	w.Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	// Write the zip content to response
	w.Write(buf.Bytes())
}

func (h *Handlers) Import(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(32 << 20) // 32MB max
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "No files provided", http.StatusBadRequest)
		return
	}

	// Process each file
	for _, fileHeader := range files {
		filename := fileHeader.Filename

		// Validate filename to prevent path traversal and ensure only allowed files
		if !h.isValidImportFilename(filename) {
			http.Error(w, fmt.Sprintf("Invalid filename: %s", filename), http.StatusBadRequest)
			return
		}

		file, err := fileHeader.Open()
		if err != nil {
			http.Error(w, "Failed to open file", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		// Read file content
		content, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		// Validate JSON content for JSON files
		if strings.HasSuffix(filename, ".json") {
			if !json.Valid(content) {
				http.Error(w, fmt.Sprintf("Invalid JSON content in file: %s", filename), http.StatusBadRequest)
				return
			}
		}

		// Determine destination path
		destPath := filepath.Join("data", filename)

		// Write file to data directory
		err = os.WriteFile(destPath, content, 0644)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Import successful"))
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

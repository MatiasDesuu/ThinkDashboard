package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

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
	// Prevent path traversal, but allow icons/ subdirectory
	if strings.Contains(filename, "..") {
		return false
	}
	if strings.Contains(filename, "\\") {
		return false
	}
	// Allow / only in icons/ prefix
	if strings.Contains(filename, "/") && !strings.HasPrefix(filename, "icons/") {
		return false
	}

	// Allow only specific filenames with their extensions
	allowedFiles := []string{
		"settings.json",
		"colors.json",
		"pages.json",
		"finders.json",
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

	// Check if it's an image file in root data directory
	if !strings.Contains(filename, "/") {
		validImageExtensions := []string{".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"}
		for _, ext := range validImageExtensions {
			if strings.HasSuffix(filename, ext) {
				return true
			}
		}
	}

	// Check if it's an icon file (icons/ followed by filename with image extension)
	if strings.HasPrefix(filename, "icons/") {
		// Allow common image extensions
		validExtensions := []string{".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"}
		for _, ext := range validExtensions {
			if strings.HasSuffix(filename, ext) {
				return true
			}
		}
	}

	return false
}

// Import handles the import of backup files
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

		// Normalize path separators to /
		filename = strings.ReplaceAll(filename, "\\", "/")

		fmt.Printf("Processing file: %s\n", filename)

		// Validate filename to prevent path traversal and ensure only allowed files
		if !h.isValidImportFilename(filename) {
			fmt.Printf("Invalid filename: %s\n", filename)
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
				fmt.Printf("Invalid JSON in file: %s\n", filename)
				http.Error(w, fmt.Sprintf("Invalid JSON content in file: %s", filename), http.StatusBadRequest)
				return
			}
		}

		// Determine destination path
		var destPath string
		if strings.HasPrefix(filename, "favicon.") {
			destPath = filename
		} else if !strings.Contains(filename, "/") {
			// Check if it's an image file that should go to icons/
			validImageExtensions := []string{".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"}
			isImage := false
			for _, ext := range validImageExtensions {
				if strings.HasSuffix(filename, ext) {
					isImage = true
					break
				}
			}
			if isImage {
				destPath = filepath.Join("data", "icons", filename)
			} else {
				destPath = filepath.Join("data", filename)
			}
		} else {
			destPath = filepath.Join("data", filename)
		}

		// Ensure the directory exists
		dir := filepath.Dir(destPath)
		err = os.MkdirAll(dir, 0755)
		if err != nil {
			http.Error(w, "Failed to create directory", http.StatusInternalServerError)
			return
		}

		// Write file
		err = os.WriteFile(destPath, content, 0644)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Import successful"))
}

// Backup creates a zip file with all data from the data directory
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

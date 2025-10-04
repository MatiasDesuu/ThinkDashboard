package main

import (
	"embed"
	"encoding/json"
	"html/template"
	"net/http"
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

func (h *Handlers) Dashboard(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/dashboard.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme              string
		ShowBackgroundDots bool
		ShowTitle          bool
		ShowDate           bool
		ShowConfigButton   bool
	}{
		Theme:              settings.Theme,
		ShowBackgroundDots: settings.ShowBackgroundDots,
		ShowTitle:          settings.ShowTitle,
		ShowDate:           settings.ShowDate,
		ShowConfigButton:   settings.ShowConfigButton,
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

func (h *Handlers) Config(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/config.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme              string
		ShowBackgroundDots bool
		ShowTitle          bool
		ShowDate           bool
		ShowConfigButton   bool
	}{
		Theme:              settings.Theme,
		ShowBackgroundDots: settings.ShowBackgroundDots,
		ShowTitle:          settings.ShowTitle,
		ShowDate:           settings.ShowDate,
		ShowConfigButton:   settings.ShowConfigButton,
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

func (h *Handlers) GetBookmarks(w http.ResponseWriter, r *http.Request) {
	pageID := r.URL.Query().Get("page")
	all := r.URL.Query().Get("all")
	var bookmarks []Bookmark

	if all == "true" {
		// Get bookmarks from all pages
		bookmarks = h.store.GetAllBookmarks()
	} else if pageID != "" {
		bookmarks = h.store.GetBookmarksByPage(pageID)
	} else {
		bookmarks = h.store.GetBookmarks()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmarks)
}

func (h *Handlers) SaveBookmarks(w http.ResponseWriter, r *http.Request) {
	pageID := r.URL.Query().Get("page")
	var bookmarks []Bookmark
	if err := json.NewDecoder(r.Body).Decode(&bookmarks); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if pageID != "" {
		h.store.SaveBookmarksByPage(pageID, bookmarks)
	} else {
		h.store.SaveBookmarks(bookmarks)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) GetCategories(w http.ResponseWriter, r *http.Request) {
	categories := h.store.GetCategories()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *Handlers) SaveCategories(w http.ResponseWriter, r *http.Request) {
	var categories []Category
	if err := json.NewDecoder(r.Body).Decode(&categories); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	h.store.SaveCategories(categories)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) GetPages(w http.ResponseWriter, r *http.Request) {
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

	h.store.SavePages(pages)
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

func (h *Handlers) Colors(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(h.files, "templates/colors.html")
	if err != nil {
		http.Error(w, "Template parsing error", http.StatusInternalServerError)
		return
	}

	settings := h.store.GetSettings()

	data := struct {
		Theme              string
		ShowBackgroundDots bool
	}{
		Theme:              settings.Theme,
		ShowBackgroundDots: settings.ShowBackgroundDots,
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
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
	// Reset to default colors by removing the file
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
	}

	h.store.SaveColors(defaultColors)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(defaultColors)
}

func (h *Handlers) CustomThemeCSS(w http.ResponseWriter, r *http.Request) {
	colors := h.store.GetColors()

	w.Header().Set("Content-Type", "text/css")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	css := `/* Custom Theme Variables - Loaded from colors.json */

/* Light Theme Variables */
body.light {
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
body.dark {
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

	w.Write([]byte(css))
}

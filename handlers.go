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
		Theme            string
		ShowTitle        bool
		ShowDate         bool
		ShowConfigButton bool
	}{
		Theme:            settings.Theme,
		ShowTitle:        settings.ShowTitle,
		ShowDate:         settings.ShowDate,
		ShowConfigButton: settings.ShowConfigButton,
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
		Theme            string
		ShowTitle        bool
		ShowDate         bool
		ShowConfigButton bool
	}{
		Theme:            settings.Theme,
		ShowTitle:        settings.ShowTitle,
		ShowDate:         settings.ShowDate,
		ShowConfigButton: settings.ShowConfigButton,
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

func (h *Handlers) GetBookmarks(w http.ResponseWriter, r *http.Request) {
	bookmarks := h.store.GetBookmarks()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmarks)
}

func (h *Handlers) SaveBookmarks(w http.ResponseWriter, r *http.Request) {
	var bookmarks []Bookmark
	if err := json.NewDecoder(r.Body).Decode(&bookmarks); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	h.store.SaveBookmarks(bookmarks)
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

package main

import (
	"embed"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

//go:embed static/* templates/*
var embeddedFiles embed.FS

func main() {
	// Initialize MIME types
	mime.AddExtensionType(".css", "text/css")
	mime.AddExtensionType(".js", "application/javascript")

	// Initialize the data store
	store := NewStore()

	// Initialize handlers
	handlers := NewHandlers(store, embeddedFiles)

	// Create router
	r := mux.NewRouter()

	// Routes
	r.HandleFunc("/", handlers.Dashboard).Methods("GET")
	r.HandleFunc("/config", handlers.Config).Methods("GET")
	r.HandleFunc("/colors", handlers.Colors).Methods("GET")
	r.HandleFunc("/api/bookmarks", handlers.GetBookmarks).Methods("GET")
	r.HandleFunc("/api/bookmarks", handlers.SaveBookmarks).Methods("POST")
	r.HandleFunc("/api/categories", handlers.GetCategories).Methods("GET")
	r.HandleFunc("/api/categories", handlers.SaveCategories).Methods("POST")
	r.HandleFunc("/api/pages", handlers.GetPages).Methods("GET")
	r.HandleFunc("/api/pages", handlers.SavePages).Methods("POST")
	r.HandleFunc("/api/pages/{id:[0-9]+}", handlers.DeletePage).Methods("DELETE")
	r.HandleFunc("/api/settings", handlers.GetSettings).Methods("GET")
	r.HandleFunc("/api/settings", handlers.SaveSettings).Methods("POST")
	r.HandleFunc("/api/colors", handlers.GetColors).Methods("GET")
	r.HandleFunc("/api/colors", handlers.SaveColors).Methods("POST")
	r.HandleFunc("/api/colors/reset", handlers.ResetColors).Methods("POST")
	r.HandleFunc("/api/colors/custom-themes", handlers.GetCustomThemesList).Methods("GET")
	r.HandleFunc("/api/theme.css", handlers.CustomThemeCSS).Methods("GET")

	// Static files with proper MIME type handling
	staticFS, _ := fs.Sub(embeddedFiles, "static")
	staticHandler := http.FileServer(http.FS(staticFS))
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set correct MIME type based on file extension
		ext := filepath.Ext(r.URL.Path)
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			w.Header().Set("Content-Type", mimeType)
		}
		staticHandler.ServeHTTP(w, r)
	})))

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Dashboard: http://localhost:%s", port)
	log.Printf("Configuration: http://localhost:%s/config", port)

	log.Fatal(http.ListenAndServe(":"+port, r))
}

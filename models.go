package main

import (
	"encoding/json"
	"os"
	"sync"
)

type Bookmark struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Shortcut string `json:"shortcut"`
	Category string `json:"category"`
}

type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Settings struct {
	Theme            string `json:"theme"` // "light" or "dark"
	OpenInNewTab     bool   `json:"openInNewTab"`
	ColumnsPerRow    int    `json:"columnsPerRow"`
	ShowTitle        bool   `json:"showTitle"`
	ShowDate         bool   `json:"showDate"`
	ShowConfigButton bool   `json:"showConfigButton"`
}

type Store interface {
	GetBookmarks() []Bookmark
	SaveBookmarks(bookmarks []Bookmark)
	GetCategories() []Category
	SaveCategories(categories []Category)
	GetSettings() Settings
	SaveSettings(settings Settings)
}

type FileStore struct {
	bookmarksFile  string
	categoriesFile string
	settingsFile   string
	mutex          sync.RWMutex
}

func NewStore() Store {
	return &FileStore{
		bookmarksFile:  "data/bookmarks.json",
		categoriesFile: "data/categories.json",
		settingsFile:   "data/settings.json",
	}
}

func (fs *FileStore) ensureDataDir() {
	os.MkdirAll("data", 0755)
}

func (fs *FileStore) GetBookmarks() []Bookmark {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.bookmarksFile)
	if err != nil {
		// Return default bookmarks if file doesn't exist with examples of multi-character shortcuts
		return []Bookmark{
			{ID: "1", Name: "GitHub", URL: "https://github.com", Shortcut: "G", Category: "development"},
			{ID: "2", Name: "GitHub Issues", URL: "https://github.com/issues", Shortcut: "GI", Category: "development"},
			{ID: "3", Name: "GitHub Pull Requests", URL: "https://github.com/pulls", Shortcut: "GP", Category: "development"},
			{ID: "4", Name: "YouTube", URL: "https://youtube.com", Shortcut: "Y", Category: "media"},
			{ID: "5", Name: "YouTube Studio", URL: "https://studio.youtube.com", Shortcut: "YS", Category: "media"},
			{ID: "6", Name: "Twitter", URL: "https://twitter.com", Shortcut: "T", Category: "social"},
			{ID: "7", Name: "TikTok", URL: "https://tiktok.com", Shortcut: "TT", Category: "social"},
			{ID: "8", Name: "Google", URL: "https://google.com", Shortcut: "", Category: "search"},
		}
	}

	var bookmarks []Bookmark
	json.Unmarshal(data, &bookmarks)
	return bookmarks
}

func (fs *FileStore) SaveBookmarks(bookmarks []Bookmark) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	data, _ := json.MarshalIndent(bookmarks, "", "  ")
	os.WriteFile(fs.bookmarksFile, data, 0644)
}

func (fs *FileStore) GetCategories() []Category {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.categoriesFile)
	if err != nil {
		// Return default categories if file doesn't exist
		return []Category{
			{ID: "development", Name: "Development"},
			{ID: "media", Name: "Media"},
			{ID: "social", Name: "Social"},
			{ID: "search", Name: "Search"},
			{ID: "utilities", Name: "Utilities"},
		}
	}

	var categories []Category
	json.Unmarshal(data, &categories)
	return categories
}

func (fs *FileStore) SaveCategories(categories []Category) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	data, _ := json.MarshalIndent(categories, "", "  ")
	os.WriteFile(fs.categoriesFile, data, 0644)
}

func (fs *FileStore) GetSettings() Settings {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.settingsFile)
	if err != nil {
		// Return default settings if file doesn't exist
		return Settings{
			Theme:            "dark",
			OpenInNewTab:     true,
			ColumnsPerRow:    3,
			ShowTitle:        true,
			ShowDate:         true,
			ShowConfigButton: true,
		}
	}

	var settings Settings
	json.Unmarshal(data, &settings)
	return settings
}

func (fs *FileStore) SaveSettings(settings Settings) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	data, _ := json.MarshalIndent(settings, "", "  ")
	os.WriteFile(fs.settingsFile, data, 0644)
}

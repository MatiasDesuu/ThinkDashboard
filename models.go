package main

import (
	"encoding/json"
	"os"
	"sync"
)

type Bookmark struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Shortcut    string `json:"shortcut"`
	Category    string `json:"category"`
	CheckStatus bool   `json:"checkStatus"`
}

type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Settings struct {
	Theme              string `json:"theme"` // "light" or "dark"
	OpenInNewTab       bool   `json:"openInNewTab"`
	ColumnsPerRow      int    `json:"columnsPerRow"`
	FontSize           string `json:"fontSize"` // "small", "medium", or "large"
	ShowBackgroundDots bool   `json:"showBackgroundDots"`
	ShowTitle          bool   `json:"showTitle"`
	ShowDate           bool   `json:"showDate"`
	ShowConfigButton   bool   `json:"showConfigButton"`
	ShowStatus         bool   `json:"showStatus"`
	ShowPing           bool   `json:"showPing"`
}

type ColorTheme struct {
	Light ThemeColors `json:"light"`
	Dark  ThemeColors `json:"dark"`
}

type ThemeColors struct {
	TextPrimary         string `json:"textPrimary"`
	TextSecondary       string `json:"textSecondary"`
	TextTertiary        string `json:"textTertiary"`
	BackgroundPrimary   string `json:"backgroundPrimary"`
	BackgroundSecondary string `json:"backgroundSecondary"`
	BackgroundDots      string `json:"backgroundDots"`
	BackgroundModal     string `json:"backgroundModal"`
	BorderPrimary       string `json:"borderPrimary"`
	BorderSecondary     string `json:"borderSecondary"`
	AccentSuccess       string `json:"accentSuccess"`
	AccentWarning       string `json:"accentWarning"`
	AccentError         string `json:"accentError"`
}

type Store interface {
	GetBookmarks() []Bookmark
	SaveBookmarks(bookmarks []Bookmark)
	GetCategories() []Category
	SaveCategories(categories []Category)
	GetSettings() Settings
	SaveSettings(settings Settings)
	GetColors() ColorTheme
	SaveColors(colors ColorTheme)
}

type FileStore struct {
	bookmarksFile  string
	categoriesFile string
	settingsFile   string
	colorsFile     string
	mutex          sync.RWMutex
}

func NewStore() Store {
	store := &FileStore{
		bookmarksFile:  "data/bookmarks.json",
		categoriesFile: "data/categories.json",
		settingsFile:   "data/settings.json",
		colorsFile:     "data/colors.json",
	}

	// Initialize default files if they don't exist
	store.initializeDefaultFiles()

	return store
}

func (fs *FileStore) initializeDefaultFiles() {
	fs.ensureDataDir()

	// Initialize bookmarks if file doesn't exist
	if _, err := os.Stat(fs.bookmarksFile); os.IsNotExist(err) {
		defaultBookmarks := []Bookmark{
			{ID: "1", Name: "GitHub", URL: "https://github.com", Shortcut: "G", Category: "development", CheckStatus: false},
			{ID: "2", Name: "GitHub Issues", URL: "https://github.com/issues", Shortcut: "GI", Category: "development", CheckStatus: false},
			{ID: "3", Name: "GitHub Pull Requests", URL: "https://github.com/pulls", Shortcut: "GP", Category: "development", CheckStatus: false},
			{ID: "4", Name: "YouTube", URL: "https://youtube.com", Shortcut: "Y", Category: "media", CheckStatus: false},
			{ID: "5", Name: "YouTube Studio", URL: "https://studio.youtube.com", Shortcut: "YS", Category: "media", CheckStatus: false},
			{ID: "6", Name: "Twitter", URL: "https://twitter.com", Shortcut: "T", Category: "social", CheckStatus: false},
			{ID: "7", Name: "TikTok", URL: "https://tiktok.com", Shortcut: "TT", Category: "social", CheckStatus: false},
			{ID: "8", Name: "Google", URL: "https://google.com", Shortcut: "", Category: "search", CheckStatus: false},
		}
		data, _ := json.MarshalIndent(defaultBookmarks, "", "  ")
		os.WriteFile(fs.bookmarksFile, data, 0644)
	}

	// Initialize categories if file doesn't exist
	if _, err := os.Stat(fs.categoriesFile); os.IsNotExist(err) {
		defaultCategories := []Category{
			{ID: "development", Name: "Development"},
			{ID: "media", Name: "Media"},
			{ID: "social", Name: "Social"},
			{ID: "search", Name: "Search"},
			{ID: "utilities", Name: "Utilities"},
		}
		data, _ := json.MarshalIndent(defaultCategories, "", "  ")
		os.WriteFile(fs.categoriesFile, data, 0644)
	}

	// Initialize settings if file doesn't exist
	if _, err := os.Stat(fs.settingsFile); os.IsNotExist(err) {
		defaultSettings := Settings{
			Theme:              "dark",
			OpenInNewTab:       true,
			ColumnsPerRow:      3,
			FontSize:           "medium",
			ShowBackgroundDots: true,
			ShowTitle:          true,
			ShowDate:           true,
			ShowConfigButton:   true,
			ShowStatus:         false,
			ShowPing:           false,
		}
		data, _ := json.MarshalIndent(defaultSettings, "", "  ")
		os.WriteFile(fs.settingsFile, data, 0644)
	}

	// Initialize colors if file doesn't exist
	if _, err := os.Stat(fs.colorsFile); os.IsNotExist(err) {
		defaultColors := getDefaultColors()
		data, _ := json.MarshalIndent(defaultColors, "", "  ")
		os.WriteFile(fs.colorsFile, data, 0644)
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
			Theme:              "dark",
			OpenInNewTab:       true,
			ColumnsPerRow:      3,
			FontSize:           "medium",
			ShowBackgroundDots: true,
			ShowTitle:          true,
			ShowDate:           true,
			ShowConfigButton:   true,
			ShowStatus:         false,
			ShowPing:           false,
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

func getDefaultColors() ColorTheme {
	return ColorTheme{
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
}

func (fs *FileStore) GetColors() ColorTheme {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.colorsFile)
	if err != nil {
		// Return default colors if file doesn't exist
		return getDefaultColors()
	}

	var colors ColorTheme
	if err := json.Unmarshal(data, &colors); err != nil {
		return getDefaultColors()
	}
	return colors
}

func (fs *FileStore) SaveColors(colors ColorTheme) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	data, _ := json.MarshalIndent(colors, "", "  ")
	os.WriteFile(fs.colorsFile, data, 0644)
}

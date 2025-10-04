package main

import (
	"encoding/json"
	"os"
	"sync"
)

type Bookmark struct {
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

type Page struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Settings struct {
	CurrentPage        string `json:"currentPage"` // ID of the current page
	Theme              string `json:"theme"`       // "light" or "dark"
	OpenInNewTab       bool   `json:"openInNewTab"`
	ColumnsPerRow      int    `json:"columnsPerRow"`
	FontSize           string `json:"fontSize"` // "small", "medium", or "large"
	ShowBackgroundDots bool   `json:"showBackgroundDots"`
	ShowTitle          bool   `json:"showTitle"`
	ShowDate           bool   `json:"showDate"`
	ShowConfigButton   bool   `json:"showConfigButton"`
	ShowStatus         bool   `json:"showStatus"`
	ShowPing           bool   `json:"showPing"`
	GlobalShortcuts    bool   `json:"globalShortcuts"` // Use shortcuts from all pages
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
	GetBookmarksByPage(pageID string) []Bookmark
	GetAllBookmarks() []Bookmark
	SaveBookmarksByPage(pageID string, bookmarks []Bookmark)
	GetCategories() []Category
	SaveCategories(categories []Category)
	GetPages() []Page
	SavePages(pages []Page)
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
	pagesFile      string
	mutex          sync.RWMutex
}

func NewStore() Store {
	store := &FileStore{
		bookmarksFile:  "data/bookmarks.json",
		categoriesFile: "data/categories.json",
		settingsFile:   "data/settings.json",
		colorsFile:     "data/colors.json",
		pagesFile:      "data/pages.json",
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
			{Name: "GitHub", URL: "https://github.com", Shortcut: "G", Category: "development", CheckStatus: false},
			{Name: "GitHub Issues", URL: "https://github.com/issues", Shortcut: "GI", Category: "development", CheckStatus: false},
			{Name: "GitHub Pull Requests", URL: "https://github.com/pulls", Shortcut: "GP", Category: "development", CheckStatus: false},
			{Name: "YouTube", URL: "https://youtube.com", Shortcut: "Y", Category: "media", CheckStatus: false},
			{Name: "YouTube Studio", URL: "https://studio.youtube.com", Shortcut: "YS", Category: "media", CheckStatus: false},
			{Name: "Twitter", URL: "https://twitter.com", Shortcut: "T", Category: "social", CheckStatus: false},
			{Name: "TikTok", URL: "https://tiktok.com", Shortcut: "TT", Category: "social", CheckStatus: false},
			{Name: "Google", URL: "https://google.com", Shortcut: "", Category: "search", CheckStatus: false},
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
			CurrentPage:        "default",
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
			GlobalShortcuts:    false,
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

	// Initialize pages if file doesn't exist
	if _, err := os.Stat(fs.pagesFile); os.IsNotExist(err) {
		defaultPages := []Page{
			{ID: "default", Name: "main"},
		}
		data, _ := json.MarshalIndent(defaultPages, "", "  ")
		os.WriteFile(fs.pagesFile, data, 0644)
	}

	// Migrate existing bookmarks to default page if they exist and page-specific doesn't
	defaultPageBookmarksFile := "data/bookmarks-default.json"
	if _, err := os.Stat(fs.bookmarksFile); err == nil {
		if _, err := os.Stat(defaultPageBookmarksFile); os.IsNotExist(err) {
			// Copy bookmarks.json to bookmarks-default.json
			data, _ := os.ReadFile(fs.bookmarksFile)
			os.WriteFile(defaultPageBookmarksFile, data, 0644)
		}
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
			{Name: "GitHub", URL: "https://github.com", Shortcut: "G", Category: "development"},
			{Name: "GitHub Issues", URL: "https://github.com/issues", Shortcut: "GI", Category: "development"},
			{Name: "GitHub Pull Requests", URL: "https://github.com/pulls", Shortcut: "GP", Category: "development"},
			{Name: "YouTube", URL: "https://youtube.com", Shortcut: "Y", Category: "media"},
			{Name: "YouTube Studio", URL: "https://studio.youtube.com", Shortcut: "YS", Category: "media"},
			{Name: "Twitter", URL: "https://twitter.com", Shortcut: "T", Category: "social"},
			{Name: "TikTok", URL: "https://tiktok.com", Shortcut: "TT", Category: "social"},
			{Name: "Google", URL: "https://google.com", Shortcut: "", Category: "search"},
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

func (fs *FileStore) GetBookmarksByPage(pageID string) []Bookmark {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	filename := "data/bookmarks-" + pageID + ".json"
	data, err := os.ReadFile(filename)
	if err != nil {
		// Return empty bookmarks for new pages
		return []Bookmark{}
	}

	var bookmarks []Bookmark
	json.Unmarshal(data, &bookmarks)
	return bookmarks
}

func (fs *FileStore) SaveBookmarksByPage(pageID string, bookmarks []Bookmark) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	filename := "data/bookmarks-" + pageID + ".json"
	data, _ := json.MarshalIndent(bookmarks, "", "  ")
	os.WriteFile(filename, data, 0644)
}

func (fs *FileStore) GetAllBookmarks() []Bookmark {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	// Get all pages
	pages := fs.GetPages()

	var allBookmarks []Bookmark

	// Collect bookmarks from all pages
	for _, page := range pages {
		pageBookmarks := fs.GetBookmarksByPage(page.ID)
		allBookmarks = append(allBookmarks, pageBookmarks...)
	}

	return allBookmarks
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

func (fs *FileStore) GetPages() []Page {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.pagesFile)
	if err != nil {
		// Return default page if file doesn't exist
		return []Page{
			{ID: "default", Name: "main"},
		}
	}

	var pages []Page
	json.Unmarshal(data, &pages)
	return pages
}

func (fs *FileStore) SavePages(pages []Page) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	data, _ := json.MarshalIndent(pages, "", "  ")
	os.WriteFile(fs.pagesFile, data, 0644)
}

func (fs *FileStore) GetSettings() Settings {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.settingsFile)
	if err != nil {
		// Return default settings if file doesn't exist
		return Settings{
			CurrentPage:        "default",
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
			GlobalShortcuts:    false,
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

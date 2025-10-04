package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
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
	ID   int    `json:"id"`   // Numeric ID matching the file number (bookmarks-1.json = id: 1)
	Name string `json:"name"` // Editable page name
}

type PageWithBookmarks struct {
	Page      Page       `json:"page"`
	Bookmarks []Bookmark `json:"bookmarks"`
}

type PageOrder struct {
	Order []int `json:"order"` // Array of page IDs in display order
}

type Settings struct {
	CurrentPage        int    `json:"currentPage"` // Numeric ID of the current page
	Theme              string `json:"theme"`       // "light" or "dark"
	OpenInNewTab       bool   `json:"openInNewTab"`
	ColumnsPerRow      int    `json:"columnsPerRow"`
	FontSize           string `json:"fontSize"` // "small", "medium", or "large"
	ShowBackgroundDots bool   `json:"showBackgroundDots"`
	ShowTitle          bool   `json:"showTitle"`
	ShowDate           bool   `json:"showDate"`
	ShowConfigButton   bool   `json:"showConfigButton"`
	ShowSearchButton   bool   `json:"showSearchButton"`
	ShowStatus         bool   `json:"showStatus"`
	ShowPing           bool   `json:"showPing"`
	GlobalShortcuts    bool   `json:"globalShortcuts"` // Use shortcuts from all pages
	HyprMode           bool   `json:"hyprMode"`        // Launcher mode for PWA usage
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
	GetBookmarksByPage(pageID int) []Bookmark
	GetAllBookmarks() []Bookmark
	SaveBookmarksByPage(pageID int, bookmarks []Bookmark)
	GetCategories() []Category
	SaveCategories(categories []Category)
	GetPages() []Page
	SavePage(page Page, bookmarks []Bookmark)
	DeletePage(pageID int) error
	GetPageOrder() []int
	SavePageOrder(order []int)
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
	pageOrderFile  string
	dataDir        string
	mutex          sync.RWMutex
}

func NewStore() Store {
	store := &FileStore{
		bookmarksFile:  "data/bookmarks.json",
		categoriesFile: "data/categories.json",
		settingsFile:   "data/settings.json",
		colorsFile:     "data/colors.json",
		pageOrderFile:  "data/pages.json",
		dataDir:        "data",
	}

	// Initialize default files if they don't exist
	store.initializeDefaultFiles()

	return store
}

func (fs *FileStore) initializeDefaultFiles() {
	fs.ensureDataDir()

	// Initialize bookmarks for main page if file doesn't exist
	mainPageBookmarksFile := "data/bookmarks-1.json"
	if _, err := os.Stat(mainPageBookmarksFile); os.IsNotExist(err) {
		defaultPageWithBookmarks := PageWithBookmarks{
			Page: Page{
				ID:   1,
				Name: "main",
			},
			Bookmarks: []Bookmark{
				{Name: "GitHub", URL: "https://github.com", Shortcut: "G", Category: "development", CheckStatus: false},
				{Name: "GitHub Issues", URL: "https://github.com/issues", Shortcut: "GI", Category: "development", CheckStatus: false},
				{Name: "GitHub Pull Requests", URL: "https://github.com/pulls", Shortcut: "GP", Category: "development", CheckStatus: false},
				{Name: "YouTube", URL: "https://youtube.com", Shortcut: "Y", Category: "media", CheckStatus: false},
				{Name: "YouTube Studio", URL: "https://studio.youtube.com", Shortcut: "YS", Category: "media", CheckStatus: false},
				{Name: "Twitter", URL: "https://twitter.com", Shortcut: "T", Category: "social", CheckStatus: false},
				{Name: "TikTok", URL: "https://tiktok.com", Shortcut: "TT", Category: "social", CheckStatus: false},
				{Name: "Google", URL: "https://google.com", Shortcut: "", Category: "search", CheckStatus: false},
			},
		}
		data, _ := json.MarshalIndent(defaultPageWithBookmarks, "", "  ")
		os.WriteFile(mainPageBookmarksFile, data, 0644)
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
			CurrentPage:        1,
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
			GlobalShortcuts:    true,
			HyprMode:           false,
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

func (fs *FileStore) GetBookmarksByPage(pageID int) []Bookmark {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	// Read directly from bookmarks-{pageID}.json
	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return []Bookmark{}
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return []Bookmark{}
	}

	return pageWithBookmarks.Bookmarks
}

func (fs *FileStore) SaveBookmarksByPage(pageID int, bookmarks []Bookmark) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	// Read the existing page data
	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		// If file doesn't exist, create new page with this ID
		pageWithBookmarks := PageWithBookmarks{
			Page: Page{
				ID:   pageID,
				Name: fmt.Sprintf("Page %d", pageID),
			},
			Bookmarks: bookmarks,
		}
		newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
		os.WriteFile(filePath, newData, 0644)
		return
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return
	}

	// Update only bookmarks, preserve page metadata
	pageWithBookmarks.Bookmarks = bookmarks
	newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
	os.WriteFile(filePath, newData, 0644)
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

	return fs.getPages()
}

func (fs *FileStore) getPages() []Page {
	fs.ensureDataDir()

	var pages []Page

	// Read all bookmarks files in data directory
	files, err := os.ReadDir(fs.dataDir)
	if err != nil {
		return []Page{{ID: 1, Name: "main"}}
	}

	// First, collect all pages from bookmark files
	pageMap := make(map[int]Page)
	for _, file := range files {
		if file.IsDir() || !strings.HasPrefix(file.Name(), "bookmarks-") || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		filePath := fmt.Sprintf("%s/%s", fs.dataDir, file.Name())
		data, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		var pageWithBookmarks PageWithBookmarks
		if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
			continue
		}

		pageMap[pageWithBookmarks.Page.ID] = pageWithBookmarks.Page
	}

	if len(pageMap) == 0 {
		return []Page{{ID: 1, Name: "main"}}
	}

	// Get the order from pages.json
	order := fs.getPageOrder()

	// If no order file exists, create default order
	if len(order) == 0 {
		for id := range pageMap {
			order = append(order, id)
		}
		// Save the default order
		fs.savePageOrder(order)
	}

	// Build pages array in the specified order
	for _, id := range order {
		if page, exists := pageMap[id]; exists {
			pages = append(pages, page)
		}
	}

	// Add any pages that exist in files but not in order
	for id, page := range pageMap {
		found := false
		for _, orderId := range order {
			if orderId == id {
				found = true
				break
			}
		}
		if !found {
			pages = append(pages, page)
		}
	}

	return pages
}

func (fs *FileStore) GetPageOrder() []int {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	return fs.getPageOrder()
}

func (fs *FileStore) getPageOrder() []int {
	fs.ensureDataDir()

	data, err := os.ReadFile(fs.pageOrderFile)
	if err != nil {
		return []int{}
	}

	var pageOrder PageOrder
	if err := json.Unmarshal(data, &pageOrder); err != nil {
		return []int{}
	}

	return pageOrder.Order
}

func (fs *FileStore) SavePageOrder(order []int) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.savePageOrder(order)
}

func (fs *FileStore) savePageOrder(order []int) {
	fs.ensureDataDir()

	pageOrder := PageOrder{
		Order: order,
	}

	data, _ := json.MarshalIndent(pageOrder, "", "  ")
	os.WriteFile(fs.pageOrderFile, data, 0644)
}

func (fs *FileStore) SavePage(page Page, bookmarks []Bookmark) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	// The page ID IS the file number
	// bookmarks-1.json has page.id = 1
	// When saving, just use page.ID directly
	pageWithBookmarks := PageWithBookmarks{
		Page:      page,
		Bookmarks: bookmarks,
	}

	fileName := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, page.ID)
	data, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
	os.WriteFile(fileName, data, 0644)
}

func (fs *FileStore) DeletePage(pageID int) error {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	// Delete bookmarks-{pageID}.json
	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	return os.Remove(filePath)
}

func (fs *FileStore) GetSettings() Settings {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	data, err := os.ReadFile(fs.settingsFile)
	if err != nil {
		// Return default settings if file doesn't exist
		return Settings{
			CurrentPage:        1,
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
			GlobalShortcuts:    true,
			HyprMode:           false,
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

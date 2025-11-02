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
	ID         string `json:"id"`
	Name       string `json:"name"`
	OriginalID string `json:"originalId,omitempty"` // Track original ID for renames
}

type Page struct {
	ID   int    `json:"id"`   // Numeric ID matching the file number (bookmarks-1.json = id: 1)
	Name string `json:"name"` // Editable page name
}

type PageWithBookmarks struct {
	Page       Page       `json:"page"`
	Categories []Category `json:"categories,omitempty"`
	Bookmarks  []Bookmark `json:"bookmarks"`
}

type PageOrder struct {
	Order []int `json:"order"` // Array of page IDs in display order
}

type Settings struct {
	CurrentPage               int    `json:"currentPage"` // Numeric ID of the current page
	Theme                     string `json:"theme"`       // "light" or "dark"
	OpenInNewTab              bool   `json:"openInNewTab"`
	ColumnsPerRow             int    `json:"columnsPerRow"`
	FontSize                  string `json:"fontSize"` // "small", "medium", or "large"
	ShowBackgroundDots        bool   `json:"showBackgroundDots"`
	ShowTitle                 bool   `json:"showTitle"`
	ShowDate                  bool   `json:"showDate"`
	ShowConfigButton          bool   `json:"showConfigButton"`
	ShowSearchButton          bool   `json:"showSearchButton"`
	ShowStatus                bool   `json:"showStatus"`
	ShowPing                  bool   `json:"showPing"`
	ShowStatusLoading         bool   `json:"showStatusLoading"`
	GlobalShortcuts           bool   `json:"globalShortcuts"`           // Use shortcuts from all pages
	HyprMode                  bool   `json:"hyprMode"`                  // Launcher mode for PWA usage
	AnimationsEnabled         bool   `json:"animationsEnabled"`         // Enable or disable animations globally
	EnableCustomTitle         bool   `json:"enableCustomTitle"`         // Enable custom page title
	CustomTitle               string `json:"customTitle"`               // Custom page title
	ShowPageInTitle           bool   `json:"showPageInTitle"`           // Show current page name in title
	ShowPageNamesInTabs       bool   `json:"showPageNamesInTabs"`       // Show page names in tabs instead of numbers
	EnableCustomFavicon       bool   `json:"enableCustomFavicon"`       // Enable custom favicon
	CustomFaviconPath         string `json:"customFaviconPath"`         // Path to custom favicon file
	EnableCustomFont          bool   `json:"enableCustomFont"`          // Enable custom font
	CustomFontPath            string `json:"customFontPath"`            // Path to custom font file
	Language                  string `json:"language"`                  // Language code, e.g., "en" or "es"
	InterleaveMode            bool   `json:"interleaveMode"`            // Interleave mode for search (/ for shortcuts, direct input for fuzzy)
	ShowPageTabs              bool   `json:"showPageTabs"`              // Show page navigation tabs
	EnableFuzzySuggestions    bool   `json:"enableFuzzySuggestions"`    // Enable fuzzy suggestions in shortcut search
	FuzzySuggestionsStartWith bool   `json:"fuzzySuggestionsStartWith"` // Fuzzy suggestions start with query instead of contains
	KeepSearchOpenWhenEmpty   bool   `json:"keepSearchOpenWhenEmpty"`   // Keep search interface open when query is empty
}

type ColorTheme struct {
	Light  ThemeColors            `json:"light"`
	Dark   ThemeColors            `json:"dark"`
	Custom map[string]ThemeColors `json:"custom"` // Custom themes with dynamic keys
}

type ThemeColors struct {
	Name                string `json:"name,omitempty"` // Optional name for custom themes
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
	// Bookmarks - per page only
	GetBookmarksByPage(pageID int) []Bookmark
	GetAllBookmarks() []Bookmark
	SaveBookmarksByPage(pageID int, bookmarks []Bookmark)
	AddBookmarkToPage(pageID int, bookmark Bookmark)
	DeleteBookmarkFromPage(pageID int, bookmark Bookmark) error
	// Categories - per page only
	GetCategoriesByPage(pageID int) []Category
	SaveCategoriesByPage(pageID int, categories []Category)
	// Pages
	GetPages() []Page
	SavePage(page Page, bookmarks []Bookmark)
	DeletePage(pageID int) error
	GetPageOrder() []int
	SavePageOrder(order []int)
	// Settings
	GetSettings() Settings
	SaveSettings(settings Settings)
	// Colors
	GetColors() ColorTheme
	SaveColors(colors ColorTheme)
}

type FileStore struct {
	settingsFile  string
	colorsFile    string
	pageOrderFile string
	dataDir       string
	mutex         sync.RWMutex
}

func NewStore() Store {
	store := &FileStore{
		settingsFile:  "data/settings.json",
		colorsFile:    "data/colors.json",
		pageOrderFile: "data/pages.json",
		dataDir:       "data",
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
			Categories: []Category{
				{ID: "development", Name: "Development"},
				{ID: "media", Name: "Media"},
				{ID: "social", Name: "Social"},
				{ID: "search", Name: "Search"},
				{ID: "utilities", Name: "Utilities"},
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
			ShowStatusLoading:  true,
			GlobalShortcuts:    true,
			HyprMode:           false,
			AnimationsEnabled:  true, // Default to animations enabled
			Language:           "en",
			ShowPageTabs:       true,
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

// getDefaultNewPageCategories returns the default categories for a newly created page
func getDefaultNewPageCategories() []Category {
	return []Category{
		{ID: "others", Name: "dashboard.others"},
	}
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
		// If file doesn't exist, create new page with this ID and default categories
		pageWithBookmarks := PageWithBookmarks{
			Page: Page{
				ID:   pageID,
				Name: fmt.Sprintf("Page %d", pageID),
			},
			Categories: getDefaultNewPageCategories(),
			Bookmarks:  bookmarks,
		}
		newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
		os.WriteFile(filePath, newData, 0644)
		return
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return
	}

	// Update only bookmarks, preserve page metadata and categories
	pageWithBookmarks.Bookmarks = bookmarks
	newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
	os.WriteFile(filePath, newData, 0644)
}

func (fs *FileStore) AddBookmarkToPage(pageID int, bookmark Bookmark) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	// Read the existing page data
	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		// If file doesn't exist, create new page with this ID and default categories
		pageWithBookmarks := PageWithBookmarks{
			Page: Page{
				ID:   pageID,
				Name: fmt.Sprintf("Page %d", pageID),
			},
			Categories: getDefaultNewPageCategories(),
			Bookmarks:  []Bookmark{bookmark},
		}
		newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
		os.WriteFile(filePath, newData, 0644)
		return
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return
	}

	// Add the new bookmark to existing bookmarks
	pageWithBookmarks.Bookmarks = append(pageWithBookmarks.Bookmarks, bookmark)
	newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
	os.WriteFile(filePath, newData, 0644)
}

func (fs *FileStore) DeleteBookmarkFromPage(pageID int, bookmarkToDelete Bookmark) error {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	// Read the existing page data
	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return err
	}

	// Find and remove the bookmark
	originalLength := len(pageWithBookmarks.Bookmarks)
	pageWithBookmarks.Bookmarks = fs.removeBookmarkFromSlice(pageWithBookmarks.Bookmarks, bookmarkToDelete)

	// If no bookmark was removed, return error
	if len(pageWithBookmarks.Bookmarks) == originalLength {
		return fmt.Errorf("bookmark not found")
	}

	// Save the updated data
	newData, err := json.MarshalIndent(pageWithBookmarks, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, newData, 0644)
}

func (fs *FileStore) removeBookmarkFromSlice(bookmarks []Bookmark, toDelete Bookmark) []Bookmark {
	result := make([]Bookmark, 0)
	removed := false
	for _, b := range bookmarks {
		if !removed && b.Name == toDelete.Name && b.URL == toDelete.URL {
			removed = true
			// Skip this bookmark (remove only the first match)
		} else {
			result = append(result, b)
		}
	}
	return result
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

// GetCategoriesByPage returns categories stored inside bookmarks-{pageID}.json if present
func (fs *FileStore) GetCategoriesByPage(pageID int) []Category {
	fs.mutex.RLock()
	defer fs.mutex.RUnlock()

	fs.ensureDataDir()

	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return []Category{}
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return []Category{}
	}

	return pageWithBookmarks.Categories
}

// SaveCategoriesByPage saves categories inside bookmarks-{pageID}.json, creating the file if needed
// It also updates bookmarks to use the new category IDs when category names change
func (fs *FileStore) SaveCategoriesByPage(pageID int, categories []Category) {
	fs.mutex.Lock()
	defer fs.mutex.Unlock()

	fs.ensureDataDir()

	filePath := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, pageID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		// Create new page file with provided categories and empty bookmarks
		// Note: This is called when explicitly saving categories for a page
		pageWithBookmarks := PageWithBookmarks{
			Page: Page{
				ID:   pageID,
				Name: fmt.Sprintf("Page %d", pageID),
			},
			Categories: categories,
			Bookmarks:  []Bookmark{},
		}
		newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
		os.WriteFile(filePath, newData, 0644)
		return
	}

	var pageWithBookmarks PageWithBookmarks
	if err := json.Unmarshal(data, &pageWithBookmarks); err != nil {
		return
	}

	// Create a mapping from old category IDs to new category IDs
	// This allows us to update bookmarks when category names (and thus IDs) change
	oldToNewCategoryMap := make(map[string]string)

	// Build the mapping using originalId if available, otherwise try to match by position or name
	for i, newCat := range categories {
		// If originalId is set, use it to find the old category
		if newCat.OriginalID != "" {
			oldToNewCategoryMap[newCat.OriginalID] = newCat.ID
			// Also map from current ID to new ID in case they're different
			if newCat.OriginalID != newCat.ID {
				oldToNewCategoryMap[newCat.OriginalID] = newCat.ID
			}
		} else if i < len(pageWithBookmarks.Categories) {
			// Fallback: map by position if originalId is not available
			oldCat := pageWithBookmarks.Categories[i]
			oldToNewCategoryMap[oldCat.ID] = newCat.ID
		}
	}

	// Update bookmarks to use new category IDs
	for i := range pageWithBookmarks.Bookmarks {
		oldCategoryID := pageWithBookmarks.Bookmarks[i].Category
		if newCategoryID, exists := oldToNewCategoryMap[oldCategoryID]; exists {
			pageWithBookmarks.Bookmarks[i].Category = newCategoryID
		}
	}

	pageWithBookmarks.Categories = categories
	newData, _ := json.MarshalIndent(pageWithBookmarks, "", "  ")
	os.WriteFile(filePath, newData, 0644)
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
	// When saving, try to preserve existing categories stored in the file
	fileName := fmt.Sprintf("%s/bookmarks-%d.json", fs.dataDir, page.ID)

	var existing PageWithBookmarks
	if data, err := os.ReadFile(fileName); err == nil {
		_ = json.Unmarshal(data, &existing)
	}

	pageWithBookmarks := PageWithBookmarks{
		Page:       page,
		Categories: existing.Categories,
		Bookmarks:  bookmarks,
	}

	if pageWithBookmarks.Categories == nil {
		pageWithBookmarks.Categories = getDefaultNewPageCategories()
	}

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
			CurrentPage:               1,
			Theme:                     "dark",
			OpenInNewTab:              true,
			ColumnsPerRow:             3,
			FontSize:                  "m",
			ShowBackgroundDots:        true,
			ShowTitle:                 true,
			ShowDate:                  true,
			ShowConfigButton:          true,
			ShowStatus:                false,
			ShowPing:                  false,
			ShowStatusLoading:         true,
			GlobalShortcuts:           true,
			HyprMode:                  false,
			AnimationsEnabled:         true,
			Language:                  "en",
			InterleaveMode:            false,
			ShowPageTabs:              true,
			EnableFuzzySuggestions:    false,
			FuzzySuggestionsStartWith: false,
			KeepSearchOpenWhenEmpty:   false,
		}
	}

	var settings Settings
	json.Unmarshal(data, &settings)

	// Check if showPageTabs was present in the JSON, if not, default to true
	var raw map[string]interface{}
	json.Unmarshal(data, &raw)
	if _, exists := raw["showPageTabs"]; !exists {
		settings.ShowPageTabs = true
	}

	// Normalize legacy fontSize values (one-time migration)
	switch settings.FontSize {
	case "small":
		settings.FontSize = "sm"
	case "medium":
		settings.FontSize = "m"
	case "large":
		settings.FontSize = "l"
	}

	// Set default language if empty
	if settings.Language == "" {
		settings.Language = "en"
	}

	// If we migrated a legacy value, persist it back to disk so clients receive normalized values
	if dataStr := string(data); dataStr != "" {
		// If normalization changed the value, save the settings file
		// (quick compare by marshalling current settings)
		if b, err := json.MarshalIndent(settings, "", "  "); err == nil {
			// Only write if content differs
			if string(b) != dataStr {
				_ = os.WriteFile(fs.settingsFile, b, 0644)
			}
		}
	}

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
		Custom: make(map[string]ThemeColors), // Initialize empty custom themes map
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

	// Ensure custom themes map is initialized
	if colors.Custom == nil {
		colors.Custom = make(map[string]ThemeColors)
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

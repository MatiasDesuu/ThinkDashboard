/**
 * Main Configuration Manager
 * Orchestrates all configuration modules
 */

class ConfigManager {
    constructor() {
        // Initialize modules
        this.storage = new ConfigStorage();
        this.data = new ConfigData(this.storage);
        this.ui = new ConfigUI();
        this.pages = new ConfigPages();
        this.categories = new ConfigCategories();
        this.bookmarks = new ConfigBookmarks();
        this.settings = new ConfigSettings();

        // Data
        this.pagesData = [];
        this.currentPageId = 'default';
        this.bookmarksData = [];
        this.categoriesData = [];
        this.settingsData = {
            currentPage: 'default',
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            fontSize: 'medium',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showStatus: false,
            showPing: false
        };
        this.deviceSpecific = false;

        this.init();
    }

    async init() {
        await this.loadData();
        this.setupDOM();
        this.setupEventListeners();
        this.renderConfig();
        this.initReordering();
        
        // Initialize custom selects after everything is loaded
        if (typeof initCustomSelects === 'function') {
            setTimeout(() => {
                initCustomSelects();
            }, 0);
        }
    }

    async loadData() {
        try {
            this.deviceSpecific = this.storage.getDeviceSpecificFlag();

            const { bookmarks, categories, pages, settings } = await this.data.loadData(this.deviceSpecific);
            
            this.bookmarksData = bookmarks;
            this.categoriesData = categories;
            this.pagesData = pages;
            this.settingsData = settings;
            this.currentPageId = settings.currentPage || 'default';
            
            // Load bookmarks for current page
            await this.loadPageBookmarks(this.currentPageId);
        } catch (error) {
            console.error('Error loading data:', error);
            this.ui.showNotification('Error loading configuration', 'error');
        }
    }

    async loadPageBookmarks(pageId) {
        try {
            this.currentPageId = pageId;
            this.bookmarksData = await this.data.loadBookmarksByPage(pageId);
            this.bookmarks.render(this.bookmarksData, this.categoriesData);
            this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
                this.bookmarksData = newBookmarks;
                this.renderConfig();
                this.initReordering();
            });
        } catch (error) {
            console.error('Error loading page bookmarks:', error);
            this.ui.showNotification('Error loading bookmarks for page', 'error');
        }
    }

    setupDOM() {
        this.settings.applyTheme(this.settingsData.theme);
        this.settings.applyFontSize(this.settingsData.fontSize);
        this.settings.applyBackgroundDots(this.settingsData.showBackgroundDots);
    }

    setupEventListeners() {
        // Setup settings listeners with callbacks
        this.settings.setupListeners(this.settingsData, {
            onThemeChange: (theme) => {
                this.settings.applyTheme(theme);
            },
            onFontSizeChange: (fontSize) => {
                this.settings.applyFontSize(fontSize);
            },
            onBackgroundDotsChange: (show) => {
                this.settings.applyBackgroundDots(show);
            },
            onStatusVisibilityChange: () => {
                this.settings.updateStatusOptionsVisibility(this.settingsData.showStatus);
            }
        });

        // Device-specific settings checkbox
        const deviceSpecificCheckbox = document.getElementById('device-specific-checkbox');
        if (deviceSpecificCheckbox) {
            deviceSpecificCheckbox.checked = this.deviceSpecific;
            deviceSpecificCheckbox.addEventListener('change', async (e) => {
                this.deviceSpecific = e.target.checked;
                this.storage.setDeviceSpecificFlag(this.deviceSpecific);
                
                if (this.deviceSpecific) {
                    this.storage.saveDeviceSettings(this.settingsData);
                    this.ui.showNotification('Device-specific settings enabled. Settings will now be stored locally.', 'success');
                } else {
                    this.storage.clearDeviceSettings();
                    this.ui.showNotification('Device-specific settings disabled. Current values will be saved to global settings when you click Save.', 'success');
                }
            });
        }

        // Initial update of status options visibility
        this.settings.updateStatusOptionsVisibility(this.settingsData.showStatus);

        // Add page button
        const addPageBtn = document.getElementById('add-page-btn');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => this.addPage());
        }

        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.addCategory());
        }

        // Add bookmark button
        const addBookmarkBtn = document.getElementById('add-bookmark-btn');
        if (addBookmarkBtn) {
            addBookmarkBtn.addEventListener('click', () => this.addBookmark());
        }

        // Page selector in bookmarks tab
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.addEventListener('change', (e) => {
                this.loadPageBookmarks(e.target.value);
            });
        }

        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChanges());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
    }

    renderConfig() {
        this.pages.render(this.pagesData, this.generateId.bind(this));
        this.pages.renderPageSelector(this.pagesData, this.currentPageId);
        this.categories.render(this.categoriesData, this.generateId.bind(this));
        this.bookmarks.render(this.bookmarksData, this.categoriesData);
    }

    initReordering() {
        // Initialize page reordering
        this.pages.initReorder(this.pagesData, (newPages) => {
            this.pagesData = newPages;
            this.renderConfig();
            this.initReordering();
        });

        // Initialize category reordering
        this.categories.initReorder(this.categoriesData, (newCategories) => {
            this.categoriesData = newCategories;
            this.renderConfig();
            this.initReordering();
        });

        // Initialize bookmark reordering
        this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
            this.bookmarksData = newBookmarks;
            this.renderConfig();
            this.initReordering();
        });
    }

    addPage() {
        this.pages.add(this.pagesData, this.generateId.bind(this));
        this.renderConfig();
        this.initReordering();
    }

    addCategory() {
        this.categories.add(this.categoriesData, this.generateId.bind(this));
        this.renderConfig();
        this.initReordering();
    }

    addBookmark() {
        this.bookmarks.add(this.bookmarksData);
        this.renderConfig();
        this.initReordering();
    }

    async removePage(index) {
        const removed = this.pages.remove(this.pagesData, index);
        if (removed) {
            this.renderConfig();
            this.initReordering();
        } else {
            this.ui.showNotification('Cannot remove the default page', 'error');
        }
    }

    async removeCategory(index) {
        const removed = await this.categories.remove(this.categoriesData, index);
        if (removed) {
            this.renderConfig();
            this.initReordering();
        }
    }

    async removeBookmark(index) {
        const removed = await this.bookmarks.remove(this.bookmarksData, index);
        if (removed) {
            this.renderConfig();
            this.initReordering();
        }
    }

    async saveChanges() {
        try {
            // Update settings from UI
            this.settings.updateFromUI(this.settingsData);
            // Always set currentPage to the first page (don't use the editing page)
            this.settingsData.currentPage = this.pagesData.length > 0 ? this.pagesData[0].id : 'default';

            // Save all data
            await this.data.saveAll({
                bookmarks: this.bookmarksData,
                categories: this.categoriesData,
                pages: this.pagesData,
                settings: this.settingsData,
                currentPageId: this.currentPageId,
                deviceSpecific: this.deviceSpecific
            });

            this.ui.showNotification('Configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.ui.showNotification('Error saving configuration', 'error');
        }
    }

    async resetToDefaults() {
        const confirmed = await window.AppModal.danger({
            title: 'Reset Settings',
            message: 'Are you sure you want to reset all settings to defaults? This will remove all your bookmarks and categories. This action cannot be undone.',
            confirmText: 'Reset',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return;
        }

        // Reset to default data
        this.bookmarksData = [
            { name: 'GitHub', url: 'https://github.com', shortcut: 'G', category: 'development' },
            { name: 'GitHub Issues', url: 'https://github.com/issues', shortcut: 'GI', category: 'development' },
            { name: 'GitHub Pull Requests', url: 'https://github.com/pulls', shortcut: 'GP', category: 'development' },
            { name: 'YouTube', url: 'https://youtube.com', shortcut: 'Y', category: 'media' },
            { name: 'YouTube Studio', url: 'https://studio.youtube.com', shortcut: 'YS', category: 'media' },
            { name: 'Twitter', url: 'https://twitter.com', shortcut: 'T', category: 'social' },
            { name: 'TikTok', url: 'https://tiktok.com', shortcut: 'TT', category: 'social' },
            { name: 'Google', url: 'https://google.com', shortcut: '', category: 'search' }
        ];

        this.categoriesData = [
            { id: 'development', name: 'Development' },
            { id: 'media', name: 'Media' },
            { id: 'social', name: 'Social' },
            { id: 'search', name: 'Search' },
            { id: 'utilities', name: 'Utilities' }
        ];

        this.settingsData = this.settings.getDefaults();

        // Update UI
        document.getElementById('theme-select').value = this.settingsData.theme;
        document.getElementById('columns-input').value = this.settingsData.columnsPerRow;
        document.getElementById('font-size-select').value = this.settingsData.fontSize;
        document.getElementById('new-tab-checkbox').checked = this.settingsData.openInNewTab;
        document.getElementById('show-background-dots-checkbox').checked = this.settingsData.showBackgroundDots;
        document.getElementById('show-title-checkbox').checked = this.settingsData.showTitle;
        document.getElementById('show-date-checkbox').checked = this.settingsData.showDate;
        document.getElementById('show-config-button-checkbox').checked = this.settingsData.showConfigButton;

        this.setupDOM();
        this.renderConfig();
        this.initReordering();
        this.ui.showNotification('Settings reset to defaults', 'success');
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

// Initialize when DOM is ready
let configManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        configManager = new ConfigManager();
    });
} else {
    configManager = new ConfigManager();
}

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
        this.originalPagesData = []; // Track original pages to detect deletions
        this.currentPageId = 1; // Default to page 1
        this.currentCategoriesPageId = 1; // Default to page 1 for categories
        this.bookmarksData = [];
        this.categoriesData = [];
        this.settingsData = {
            currentPage: 'default',
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            fontSize: 'm',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showStatus: false,
            showPing: false,
            globalShortcuts: true,
            hyprMode: false
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

        // Show body after everything is loaded and rendered
        document.body.classList.remove('loading');

        // Load categories for current page into the categories tab (if present)
        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            // Ensure selector has been populated
            setTimeout(() => {
                this.currentCategoriesPageId = parseInt(this.currentPageId);
                categoriesSelector.value = this.currentPageId;
                this.loadPageCategories(this.currentPageId);
            }, 0);
        }
    }

    async loadData() {
        try {
            this.deviceSpecific = this.storage.getDeviceSpecificFlag();
            const { bookmarks, pages, settings } = await this.data.loadData(this.deviceSpecific);

            this.bookmarksData = bookmarks;
            this.pagesData = pages;
            this.originalPagesData = JSON.parse(JSON.stringify(pages)); // Deep copy
            this.settingsData = settings;
            this.currentPageId = settings.currentPage || 1; // Default to page 1
            
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
            // Load categories specific to this page and render bookmarks with those categories
            await this.loadPageCategories(pageId);
            this.bookmarks.render(this.bookmarksData, this.categoriesData);
            this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
                this.bookmarksData = newBookmarks;
                this.renderConfig();
                this.initReordering();
            });
            // categories for this page have already been loaded above
        } catch (error) {
            console.error('Error loading page bookmarks:', error);
            this.ui.showNotification('Error loading bookmarks for page', 'error');
        }
    }

    async loadPageCategories(pageId) {
        try {
            const categories = await this.data.loadCategoriesByPage(pageId);
            this.categoriesData = categories;
            this.categories.render(this.categoriesData, this.generateId.bind(this));
            this.categories.initReorder(this.categoriesData, (newCategories) => {
                this.categoriesData = newCategories;
            });
        } catch (error) {
            console.error('Error loading categories for page:', error);
            this.ui.showNotification('Error loading categories for page', 'error');
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

        // Page selector in categories tab
        const categoriesPageSelector = document.getElementById('categories-page-selector');
        if (categoriesPageSelector) {
            categoriesPageSelector.addEventListener('change', (e) => {
                this.currentCategoriesPageId = parseInt(e.target.value);
                this.loadPageCategories(e.target.value);
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
        
        // Preserve current page selection before re-rendering page selector
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector && pageSelector.value) {
            this.currentPageId = parseInt(pageSelector.value);
        }
        this.pages.renderPageSelector(this.pagesData, this.currentPageId);

        // Populate categories page selector if present
        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            // Preserve current categories page selection
            if (categoriesSelector.value) {
                this.currentCategoriesPageId = parseInt(categoriesSelector.value);
            }
            
            categoriesSelector.innerHTML = '';
            this.pagesData.forEach(page => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.name;
                // Use currentCategoriesPageId instead of currentPageId
                if (page.id === this.currentCategoriesPageId) option.selected = true;
                categoriesSelector.appendChild(option);
            });
        }

        this.categories.render(this.categoriesData, this.generateId.bind(this));
        this.bookmarks.render(this.bookmarksData, this.categoriesData);
        
        // Refresh custom selects to reflect DOM changes
        this.refreshCustomSelects();
    }

    /**
     * Refresh custom select instances after DOM changes
     */
    refreshCustomSelects() {
        // Find all select elements that have been initialized as custom selects
        const selects = document.querySelectorAll('select[data-custom-select-init="true"]');
        
        selects.forEach(select => {
            // DON'T trigger change event - it causes data reload
            // Just update the visual display of the custom select
            
            // If the custom select wrapper exists, find and refresh it
            const wrapper = select.closest('.custom-select-wrapper');
            if (wrapper) {
                // Re-populate options by finding the CustomSelect instance
                // We need to manually refresh the options
                const optionsContainer = wrapper.querySelector('.custom-select-options');
                const trigger = wrapper.querySelector('.custom-select-trigger .custom-select-text');
                
                if (optionsContainer && trigger) {
                    // Clear existing options
                    optionsContainer.innerHTML = '';
                    
                    // Repopulate from the original select
                    Array.from(select.options).forEach((option, index) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'custom-select-option';
                        optionDiv.textContent = option.textContent;
                        optionDiv.dataset.value = option.value;
                        optionDiv.dataset.index = index;
                        
                        if (option.selected) {
                            optionDiv.classList.add('selected');
                        }
                        
                        optionDiv.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Update original select
                            select.selectedIndex = index;
                            // Trigger change event
                            const changeEvent = new Event('change', { bubbles: true });
                            select.dispatchEvent(changeEvent);
                            // Update UI
                            trigger.textContent = option.textContent;
                            // Update selected class
                            optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                                opt.classList.remove('selected');
                            });
                            optionDiv.classList.add('selected');
                            // Close dropdown
                            wrapper.querySelector('.custom-select').classList.remove('open');
                        });
                        
                        optionsContainer.appendChild(optionDiv);
                    });
                    
                    // Update trigger text
                    const selectedOption = select.options[select.selectedIndex];
                    if (selectedOption) {
                        trigger.textContent = selectedOption.textContent;
                    }
                }
            }
        });
    }

    initReordering() {
        // Initialize page reordering
        this.pages.initReorder(this.pagesData, (newPages) => {
            this.pagesData = newPages;
            // Don't re-render - we use direct object references
            // Only update the page selector to reflect new order
            this.pages.renderPageSelector(this.pagesData, this.currentPageId);
        });

        // Initialize category reordering
        this.categories.initReorder(this.categoriesData, (newCategories) => {
            this.categoriesData = newCategories;
            // Don't re-render - we use direct object references
        });

        // Initialize bookmark reordering
        this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
            this.bookmarksData = newBookmarks;
            // Don't re-render for bookmarks - we use direct object references
            // Re-rendering causes performance issues due to CustomSelect re-initialization
        });
    }

    async addPage() {
        const newPage = this.pages.add(this.pagesData, this.generateId.bind(this));
        
        // Create the page file immediately with default "Others" category
        const defaultCategories = [{ id: 'others', name: 'Others' }];
        try {
            await this.data.saveCategoriesByPage(defaultCategories, newPage.id);
            await this.data.saveBookmarks([], newPage.id);
        } catch (error) {
            console.error('Error creating new page:', error);
        }
        
        this.renderConfig();
        this.initReordering();

        // Update both page selectors to the new page
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.value = String(newPage.id);
            this.currentPageId = newPage.id;
            this.loadPageBookmarks(newPage.id);
        }

        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            this.currentCategoriesPageId = newPage.id;
            categoriesSelector.value = String(newPage.id);
            this.loadPageCategories(newPage.id);
        }
    }

    addCategory() {
        // Initialize categoriesData if it's null (for new pages)
        if (!this.categoriesData) {
            this.categoriesData = [];
        }
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
        const page = this.pagesData[index];
        if (!page) return;
        
        // Don't allow removing page 1 (main page)
        if (page.id === 1) {
            this.ui.showNotification('Cannot remove the main page', 'error');
            return;
        }
        
        // Show confirmation modal
        const confirmed = await window.AppModal.danger({
            title: 'Remove Page',
            message: `Are you sure you want to remove the page "${page.name}"? All bookmarks in this page will be deleted. This action cannot be undone.`,
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Delete from server immediately
            await this.data.deletePage(page.id);
            
            // Remove from local array
            this.pagesData.splice(index, 1);
            
            // Update original pages as well
            const origIndex = this.originalPagesData.findIndex(p => p.id === page.id);
            if (origIndex !== -1) {
                this.originalPagesData.splice(origIndex, 1);
            }
            
            this.renderConfig();
            this.initReordering();
            this.ui.showNotification('Page deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting page:', error);
            this.ui.showNotification('Error deleting page', 'error');
        }
    }

    async removeCategory(index) {
        const category = this.categoriesData[index];
        if (!category) return;
        
        const removed = await this.categories.remove(this.categoriesData, index);
        if (removed) {
            // Remove this category from all bookmarks that use it
            this.bookmarksData.forEach(bookmark => {
                if (bookmark.category === category.id) {
                    bookmark.category = ''; // Set to empty string (no category)
                }
            });
            
            this.renderConfig();
            this.initReordering();
            this.ui.showNotification('Category removed and cleared from bookmarks', 'success');
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
            this.settingsData.currentPage = this.pagesData.length > 0 ? this.pagesData[0].id : 1;

            // Save bookmarks and pages (skip global categories)
            await this.data.saveAll({
                bookmarks: this.bookmarksData,
                categories: null,
                pages: this.pagesData,
                settings: this.settingsData,
                currentPageId: this.currentPageId,
                deviceSpecific: this.deviceSpecific
            });

            // Save per-page categories if categories selector is present
            const categoriesSelector = document.getElementById('categories-page-selector');
            if (categoriesSelector && this.currentCategoriesPageId) {
                await this.data.saveCategoriesByPage(this.categoriesData, this.currentCategoriesPageId);
            }

            // Update original pages after successful save
            this.originalPagesData = JSON.parse(JSON.stringify(this.pagesData));

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
        document.getElementById('show-search-button-checkbox').checked = this.settingsData.showSearchButton;

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

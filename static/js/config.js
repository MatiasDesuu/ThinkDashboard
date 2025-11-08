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
        this.language = new ConfigLanguage();
        this.pages = new ConfigPages(this.language.t.bind(this.language));
        this.categories = new ConfigCategories(this.language.t.bind(this.language));
        this.bookmarks = new ConfigBookmarks(this.language.t.bind(this.language));
        window.configBookmarks = this.bookmarks;
        this.finders = new ConfigFinders(this.language.t.bind(this.language));
        this.backup = new ConfigBackup(this.language.t.bind(this.language));
        this.settings = new ConfigSettings(this.language);

        // Data
        this.pagesData = [];
        this.originalPagesData = []; // Track original pages to detect deletions
        this.currentPageId = 1; // Default to page 1
        this.currentCategoriesPageId = 1; // Default to page 1 for categories
        this.bookmarksData = [];
        this.findersData = [];
        this.categoriesData = []; // Categories for the categories tab
        this.bookmarksPageCategories = []; // Categories for the bookmarks tab (read-only)
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
            skipFastPing: false,
            globalShortcuts: true,
            hyprMode: false,
            showPageNamesInTabs: false,
            enableCustomFavicon: false,
            customFaviconPath: '',
            enableCustomFont: false,
            customFontPath: '',
            language: 'en',
            interleaveMode: false,
            showPageTabs: true,
            enableFuzzySuggestions: false,
            fuzzySuggestionsStartWith: false,
            keepSearchOpenWhenEmpty: false,
            showIcons: false
        };
        this.deviceSpecific = false;

        this.init();
    }

    async init() {
        await this.loadData();
        await this.language.init(this.settingsData.language);
        this.setupDOM();
        await this.setupEventListeners();
        this.language.setupLanguageSelector();
        
        // Set language for global modal
        if (window.AppModal) {
            window.AppModal.setLanguage(this.language);
        }
        this.renderConfig();
        this.initReordering();
        
        if (typeof initCustomSelects === 'function') {
            setTimeout(() => initCustomSelects(), 0);
        }

        document.body.classList.remove('loading');

        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            this.currentCategoriesPageId = parseInt(this.currentPageId);
            this.loadPageCategories(this.currentPageId);
        }
    }

    async loadData() {
        try {
            this.deviceSpecific = this.storage.getDeviceSpecificFlag();
            const { bookmarks, pages, settings } = await this.data.loadData(this.deviceSpecific);

            this.bookmarksData = bookmarks;
            this.pagesData = pages;
            this.originalPagesData = JSON.parse(JSON.stringify(pages));
            this.findersData = await this.data.loadFinders();
            this.settingsData = { ...this.settingsData, ...settings };
            if (!this.settingsData.language || this.settingsData.language === "") {
                this.settingsData.language = 'en';
            }
            if (typeof this.settingsData.interleaveMode === 'undefined') {
                this.settingsData.interleaveMode = false;
            }
            if (typeof this.settingsData.showPageTabs === 'undefined') {
                this.settingsData.showPageTabs = true;
            }
            this.currentPageId = settings.currentPage || 1;
            
            await this.loadPageBookmarks(this.currentPageId);
        } catch (error) {
            console.error('Error loading data:', error);
            this.ui.showNotification(this.language.t('config.errorLoadingConfig'), 'error');
        }
    }

    async loadPageBookmarks(pageId) {
        try {
            this.currentPageId = parseInt(pageId);
            this.bookmarksData = await this.data.loadBookmarksByPage(pageId);
            this.bookmarksPageCategories = (await this.data.loadCategoriesByPage(pageId)).map(cat => ({ ...cat }));
            
            this.bookmarks.render(this.bookmarksData, this.bookmarksPageCategories);
            this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
                this.bookmarksData = newBookmarks;
            });
        } catch (error) {
            console.error('Error loading page bookmarks:', error);
            this.ui.showNotification(this.language.t('config.errorLoadingBookmarks'), 'error');
        }
    }

    async loadPageCategories(pageId) {
        try {
            this.currentCategoriesPageId = parseInt(pageId);
            this.categoriesData = (await this.data.loadCategoriesByPage(pageId)).map(cat => ({ ...cat }));
            this.categories.render(this.categoriesData, this.generateId.bind(this));
            this.categories.initReorder(this.categoriesData, (newCategories) => {
                this.categoriesData = newCategories;
            });
        } catch (error) {
            console.error('Error loading categories for page:', error);
            this.ui.showNotification(this.language.t('config.errorLoadingCategories'), 'error');
        }
    }

    setupDOM() {
        this.settings.applyTheme(this.settingsData.theme);
        this.settings.applyFontSize(this.settingsData.fontSize);
        this.settings.applyBackgroundDots(this.settingsData.showBackgroundDots);
        this.settings.applyAnimations(this.settingsData.animationsEnabled);
    }

    async setupEventListeners() {
        // Setup settings listeners with callbacks
        await this.settings.setupListeners(this.settingsData, {
            onThemeChange: (theme) => {
                this.settings.applyTheme(theme);
            },
            onFontSizeChange: (fontSize) => {
                this.settings.applyFontSize(fontSize);
            },
            onBackgroundDotsChange: (show) => {
                this.settings.applyBackgroundDots(show);
            },
            onAnimationsChange: (enabled) => {
                this.settings.applyAnimations(enabled);
            },
            onStatusVisibilityChange: () => {
                this.settings.updateStatusOptionsVisibility(this.settingsData.showStatus);
            }
        });



        const deviceSpecificCheckbox = document.getElementById('device-specific-checkbox');
        if (deviceSpecificCheckbox) {
            deviceSpecificCheckbox.checked = this.deviceSpecific;
            deviceSpecificCheckbox.addEventListener('change', async (e) => {
                this.deviceSpecific = e.target.checked;
                this.storage.setDeviceSpecificFlag(this.deviceSpecific);
                
                const message = this.deviceSpecific 
                    ? this.language.t('config.deviceSpecificEnabled')
                    : this.language.t('config.deviceSpecificDisabled');
                
                if (this.deviceSpecific) {
                    this.storage.saveDeviceSettings(this.settingsData);
                } else {
                    this.storage.clearDeviceSettings();
                }
                this.ui.showNotification(message, 'success');
            });
        }

        this.settings.updateStatusOptionsVisibility(this.settingsData.showStatus);

        const addPageBtn = document.getElementById('add-page-btn');
        if (addPageBtn) addPageBtn.addEventListener('click', () => this.addPage());

        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addCategory());

        const addBookmarkBtn = document.getElementById('add-bookmark-btn');
        if (addBookmarkBtn) addBookmarkBtn.addEventListener('click', () => this.addBookmark());

        const addFinderBtn = document.getElementById('add-finder-btn');
        if (addFinderBtn) addFinderBtn.addEventListener('click', () => this.addFinder());

        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.addEventListener('change', (e) => this.loadPageBookmarks(e.target.value));
        }

        const categoriesPageSelector = document.getElementById('categories-page-selector');
        if (categoriesPageSelector) {
            categoriesPageSelector.addEventListener('change', (e) => {
                this.currentCategoriesPageId = parseInt(e.target.value);
                this.loadPageCategories(e.target.value);
            });
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveChanges());

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetToDefaults());
    }

    renderConfig() {
        this.pages.render(this.pagesData, this.generateId.bind(this));
        
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector && pageSelector.value) {
            this.currentPageId = parseInt(pageSelector.value);
        }
        this.pages.renderPageSelector(this.pagesData, this.currentPageId);

        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            if (categoriesSelector.value) {
                this.currentCategoriesPageId = parseInt(categoriesSelector.value);
            }
            
            categoriesSelector.innerHTML = '';
            this.pagesData.forEach(page => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.name;
                if (page.id === this.currentCategoriesPageId) option.selected = true;
                categoriesSelector.appendChild(option);
            });
        }

        this.bookmarks.render(this.bookmarksData, this.bookmarksPageCategories);
        this.finders.render(this.findersData);
        this.refreshCustomSelects();
        
        // Set checkbox states
        const interleaveModeCheckbox = document.getElementById('interleave-mode-checkbox');
        if (interleaveModeCheckbox) interleaveModeCheckbox.checked = this.settingsData.interleaveMode;
    }

    refreshCustomSelects() {
        const selects = document.querySelectorAll('select[data-custom-select-init="true"]');
        
        selects.forEach(select => {
            const wrapper = select.closest('.custom-select-wrapper');
            if (!wrapper) return;

            const optionsContainer = wrapper.querySelector('.custom-select-options');
            const trigger = wrapper.querySelector('.custom-select-trigger .custom-select-text');
            
            if (optionsContainer && trigger) {
                optionsContainer.innerHTML = '';
                
                Array.from(select.options).forEach((option, index) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'custom-select-option';
                    optionDiv.textContent = option.textContent;
                    optionDiv.dataset.value = option.value;
                    optionDiv.dataset.index = index;
                    
                    if (option.selected) optionDiv.classList.add('selected');
                    
                    optionDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        select.selectedIndex = index;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        trigger.textContent = option.textContent;
                        optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        optionDiv.classList.add('selected');
                        wrapper.querySelector('.custom-select').classList.remove('open');
                    });
                    
                    optionsContainer.appendChild(optionDiv);
                });
                
                const selectedOption = select.options[select.selectedIndex];
                if (selectedOption) trigger.textContent = selectedOption.textContent;
            }
        });
    }

    initReordering() {
        this.pages.initReorder(this.pagesData, (newPages) => {
            this.pagesData = newPages;
            this.pages.renderPageSelector(this.pagesData, this.currentPageId);
        });

        this.categories.initReorder(this.categoriesData, (newCategories) => {
            this.categoriesData = newCategories;
        });

        this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
            this.bookmarksData = newBookmarks;
        });

        this.finders.initReorder(this.findersData, (newFinders) => {
            this.findersData = newFinders;
        });
    }

    async addPage() {
        const newPage = this.pages.add(this.pagesData, this.generateId.bind(this));
        
        const defaultCategories = [{ id: 'others', name: this.language.t('dashboard.others') }];
        try {
            await this.data.saveCategoriesByPage(defaultCategories, newPage.id);
            await this.data.saveBookmarks([], newPage.id);
        } catch (error) {
            console.error('Error creating new page:', error);
        }
        
        this.pages.render(this.pagesData, this.generateId.bind(this));
        this.pages.renderPageSelector(this.pagesData, newPage.id);
        this.pages.initReorder(this.pagesData, (newPages) => {
            this.pagesData = newPages;
            this.pages.renderPageSelector(this.pagesData, this.currentPageId);
        });

        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.value = String(newPage.id);
            this.currentPageId = newPage.id;
            this.loadPageBookmarks(newPage.id);
        }

        const categoriesSelector = document.getElementById('categories-page-selector');
        if (categoriesSelector) {
            categoriesSelector.innerHTML = '';
            this.pagesData.forEach(page => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.name;
                if (page.id === newPage.id) option.selected = true;
                categoriesSelector.appendChild(option);
            });
            
            this.currentCategoriesPageId = newPage.id;
            this.loadPageCategories(newPage.id);
        }
    }

    addCategory() {
        if (!this.categoriesData) this.categoriesData = [];
        
        this.categories.add(this.categoriesData, this.generateId.bind(this));
        this.categories.render(this.categoriesData, this.generateId.bind(this));
        this.categories.initReorder(this.categoriesData, (newCategories) => {
            this.categoriesData = newCategories;
        });
    }

    addBookmark() {
        this.bookmarks.add(this.bookmarksData);
        this.bookmarks.render(this.bookmarksData, this.bookmarksPageCategories);
        this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
            this.bookmarksData = newBookmarks;
        });
    }

    addFinder() {
        this.finders.add(this.findersData);
        this.finders.render(this.findersData);
        this.finders.initReorder(this.findersData, (newFinders) => {
            this.findersData = newFinders;
        });
    }

    async removePage(index) {
        const page = this.pagesData[index];
        if (!page) return;
        
        if (page.id === 1) {
            this.ui.showNotification(this.language.t('config.cannotRemoveMainPage'), 'error');
            return;
        }
        
        const confirmed = await window.AppModal.danger({
            title: this.language.t('config.removePageTitle'),
            message: this.language.t('config.removePageMessage').replace('{pageName}', page.name),
            confirmText: this.language.t('config.remove'),
            cancelText: this.language.t('config.cancel')
        });
        
        if (!confirmed) return;
        
        try {
            await this.data.deletePage(page.id);
            
            this.pagesData.splice(index, 1);
            
            const origIndex = this.originalPagesData.findIndex(p => p.id === page.id);
            if (origIndex !== -1) {
                this.originalPagesData.splice(origIndex, 1);
            }
            
            this.pages.render(this.pagesData, this.generateId.bind(this));
            this.pages.renderPageSelector(this.pagesData, 1);
            this.pages.initReorder(this.pagesData, (newPages) => {
                this.pagesData = newPages;
                this.pages.renderPageSelector(this.pagesData, this.currentPageId);
            });
            
            this.currentPageId = 1;
            this.currentCategoriesPageId = 1;
            await this.loadPageBookmarks(1);
            await this.loadPageCategories(1);
            
            const pageSelector = document.getElementById('page-selector');
            if (pageSelector) pageSelector.value = '1';
            
            const categoriesSelector = document.getElementById('categories-page-selector');
            if (categoriesSelector) {
                categoriesSelector.innerHTML = '';
                this.pagesData.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    if (p.id === 1) option.selected = true;
                    categoriesSelector.appendChild(option);
                });
            }
            
            this.ui.showNotification(this.language.t('config.pageDeleted'), 'success');
        } catch (error) {
            console.error('Error deleting page:', error);
            this.ui.showNotification(this.language.t('config.errorDeletingPage'), 'error');
        }
    }

    async removeCategory(index) {
        const category = this.categoriesData[index];
        if (!category) return;
        
        const removed = await this.categories.remove(this.categoriesData, index);
        if (removed) {
            if (this.currentPageId === this.currentCategoriesPageId) {
                this.bookmarksData.forEach(bookmark => {
                    if (bookmark.category === category.id) {
                        bookmark.category = '';
                    }
                });
            }
            
            this.categories.render(this.categoriesData, this.generateId.bind(this));
            this.categories.initReorder(this.categoriesData, (newCategories) => {
                this.categoriesData = newCategories;
            });
            this.ui.showNotification(this.language.t('config.categoryRemoved'), 'success');
        }
    }

    async removeBookmark(index) {
        const removed = await this.bookmarks.remove(this.bookmarksData, index);
        if (removed) {
            this.bookmarks.render(this.bookmarksData, this.bookmarksPageCategories);
            this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
                this.bookmarksData = newBookmarks;
            });
        }
    }

    async removeFinder(index) {
        const removed = await this.finders.remove(this.findersData, index);
        if (removed) {
            this.finders.render(this.findersData);
            this.finders.initReorder(this.findersData, (newFinders) => {
                this.findersData = newFinders;
            });
        }
    }

    async moveBookmark(index) {
        const bookmark = this.bookmarksData[index];
        if (!bookmark) return;

        // Create page options
        const pageOptions = this.pagesData
            .map(page => {
                const isCurrent = page.id === this.currentPageId;
                return `<button class="modal-page-btn ${isCurrent ? 'current' : ''}" ${isCurrent ? 'disabled' : `onclick="window.tempMoveBookmark(${index}, ${page.id})"`}>${page.name}${isCurrent ? ' (current)' : ''}</button>`;
            })
            .join('');

        const html = `
            <p>${this.language.t('config.moveBookmarkMessage')}</p>
            <div class="modal-page-list">
                ${pageOptions}
            </div>
        `;

        // Define temp function
        window.tempMoveBookmark = async (idx, pid) => {
            await this.doMoveBookmark(idx, pid);
            AppModal.hide();
        };

        await window.AppModal.confirm({
            title: this.language.t('config.moveBookmarkTitle'),
            htmlMessage: html,
            confirmText: this.language.t('config.cancel'),
            showCancel: false,
            onConfirm: () => {}
        });

        // Clean up
        delete window.tempMoveBookmark;
    }

    async doMoveBookmark(index, newPageId) {
        const bookmark = this.bookmarksData[index];
        if (!bookmark) return;

        if (newPageId === this.currentPageId) {
            this.ui.showNotification(this.language.t('config.bookmarkAlreadyHere'), 'info');
            return;
        }

        try {
            // Remove from current page
            this.bookmarksData.splice(index, 1);

            // Load bookmarks from new page
            const newPageBookmarks = await this.data.loadBookmarksByPage(newPageId);

            // Add bookmark with category cleared
            const movedBookmark = { ...bookmark, category: '' };
            newPageBookmarks.push(movedBookmark);

            // Save both pages
            await this.data.saveBookmarks(this.bookmarksData, this.currentPageId);
            await this.data.saveBookmarks(newPageBookmarks, newPageId);

            // Re-render current page
            this.bookmarks.render(this.bookmarksData, this.bookmarksPageCategories);
            this.bookmarks.initReorder(this.bookmarksData, (newBookmarks) => {
                this.bookmarksData = newBookmarks;
            });

            this.ui.showNotification(this.language.t('config.bookmarkMoved'), 'success');
        } catch (error) {
            console.error('Error moving bookmark:', error);
            this.ui.showNotification(this.language.t('config.errorMovingBookmark'), 'error');
        }
    }

    getCategoriesFromDOM() {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return null;

        const categoryItems = categoriesList.querySelectorAll('.category-item');
        const categories = [];

        categoryItems.forEach((item) => {
            const category = item._categoryRef;
            if (category) categories.push(category);
        });

        return categories;
    }

    async saveChanges() {
        try {
            this.settings.updateFromUI(this.settingsData);
            this.settingsData.currentPage = this.pagesData.length > 0 ? this.pagesData[0].id : 1;

            await this.data.saveBookmarks(this.bookmarksData, this.currentPageId);
            await this.data.saveFinders(this.findersData);
            
            if (this.currentCategoriesPageId) {
                const categoriesForSelectedPage = this.getCategoriesFromDOM();
                if (categoriesForSelectedPage && categoriesForSelectedPage.length >= 0) {
                    await this.data.saveCategoriesByPage(categoriesForSelectedPage, this.currentCategoriesPageId);
                }
            }
            
            await this.data.savePages(this.pagesData);
            
            if (this.deviceSpecific) {
                // Don't save global settings in localStorage
                const settingsToSave = { ...this.settingsData };
                delete settingsToSave.enableCustomFavicon;
                delete settingsToSave.customFaviconPath;
                delete settingsToSave.enableCustomFont;
                delete settingsToSave.customFontPath;
                this.storage.saveDeviceSettings(settingsToSave);
            } else {
                await this.data.saveSettings(this.settingsData);
            }

            this.originalPagesData = JSON.parse(JSON.stringify(this.pagesData));
            this.ui.showNotification(this.language.t('config.configSaved'), 'success');
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.ui.showNotification(this.language.t('config.errorSavingConfig'), 'error');
        }
    }

    async resetToDefaults() {
        const confirmed = await window.AppModal.danger({
            title: this.language.t('config.resetSettingsTitle'),
            message: this.language.t('config.resetSettingsMessage'),
            confirmText: this.language.t('config.reset'),
            cancelText: this.language.t('config.cancel')
        });
        
        if (!confirmed) return;
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
        document.getElementById('theme-select').value = this.settingsData.theme;
        document.getElementById('columns-input').value = this.settingsData.columnsPerRow;
        document.getElementById('font-size-select').value = this.settingsData.fontSize;
        document.getElementById('new-tab-checkbox').checked = this.settingsData.openInNewTab;
        document.getElementById('show-background-dots-checkbox').checked = this.settingsData.showBackgroundDots;
        document.getElementById('show-title-checkbox').checked = this.settingsData.showTitle;
        document.getElementById('show-date-checkbox').checked = this.settingsData.showDate;
        document.getElementById('show-config-button-checkbox').checked = this.settingsData.showConfigButton;
        document.getElementById('show-search-button-checkbox').checked = this.settingsData.showSearchButton;
        document.getElementById('show-finders-button-checkbox').checked = this.settingsData.showFindersButton;
        document.getElementById('show-commands-button-checkbox').checked = this.settingsData.showCommandsButton;
        document.getElementById('interleave-mode-checkbox').checked = false;
        document.getElementById('show-page-tabs-checkbox').checked = this.settingsData.showPageTabs;

        this.setupDOM();
        this.renderConfig();
        this.initReordering();
        this.ui.showNotification(this.language.t('config.settingsReset'), 'success');
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

let configManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => configManager = new ConfigManager());
} else {
    configManager = new ConfigManager();
}

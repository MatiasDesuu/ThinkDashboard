// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.bookmarks = [];
        this.allBookmarks = []; // For global shortcuts
        this.categories = [];
        this.pages = [];
        this.currentPageId = 'default';
        this.settings = {
            currentPage: 'default',
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            fontSize: 'medium',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showConfigButton: true,
            showStatus: false,
            showPing: false,
            globalShortcuts: false,
            hyprMode: false
        };
        this.searchComponent = null;
        this.statusMonitor = null;
        this.keyboardNavigation = null;
        this.swipeNavigation = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupDOM();
        this.initializeSearchComponent();
        this.initializeStatusMonitor();
        this.initializeKeyboardNavigation();
        this.initializeSwipeNavigation();
        this.initializeHyprMode();
        this.renderPageNavigation();
        this.renderDashboard();
        this.setupPageShortcuts();
        
        // Set initial page title
        const firstPage = this.pages.length > 0 ? this.pages[0] : null;
        if (firstPage) {
            this.updatePageTitle(firstPage.name);
        }

        // Show body after everything is loaded and rendered
        document.body.classList.remove('loading');
    }

    async loadData() {
        try {
            const [categoriesRes, pagesRes, settingsRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/pages'),
                fetch('/api/settings')
            ]);

            this.categories = await categoriesRes.json();
            this.pages = await pagesRes.json();
            
            // Load settings from localStorage or server based on device-specific flag
            const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
            if (deviceSpecific) {
                const deviceSettings = localStorage.getItem('dashboardSettings');
                this.settings = deviceSettings ? JSON.parse(deviceSettings) : await settingsRes.json();
            } else {
                this.settings = await settingsRes.json();
            }

            // Always load the first page on dashboard load (not from settings)
            this.currentPageId = this.pages.length > 0 ? this.pages[0].id : 'default';
            
            // Load bookmarks for first page
            await this.loadPageBookmarks(this.currentPageId);
            
            // If global shortcuts is enabled, load all bookmarks for search
            if (this.settings.globalShortcuts) {
                await this.loadAllBookmarks();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadPageBookmarks(pageId) {
        try {
            const bookmarksRes = await fetch(`/api/bookmarks?page=${pageId}`);
            this.bookmarks = await bookmarksRes.json();
            this.currentPageId = pageId;
            
            // Update page title
            const page = this.pages.find(p => p.id === pageId);
            if (page) {
                this.updatePageTitle(page.name);
            }
            
            // Update search component and render
            if (this.searchComponent) {
                this.updateSearchComponent();
            }
            this.renderDashboard();
            
            // Reset keyboard navigation to first element when changing pages
            if (this.keyboardNavigation) {
                this.keyboardNavigation.resetToFirst();
            }
        } catch (error) {
            console.error('Error loading page bookmarks:', error);
        }
    }

    async loadAllBookmarks() {
        try {
            const allBookmarksRes = await fetch('/api/bookmarks?all=true');
            this.allBookmarks = await allBookmarksRes.json();
            
            // Update search component with all bookmarks
            if (this.searchComponent) {
                this.updateSearchComponent();
            }
        } catch (error) {
            console.error('Error loading all bookmarks:', error);
        }
    }

    updatePageTitle(pageName) {
        const titleElement = document.querySelector('.title');
        if (titleElement) {
            titleElement.textContent = pageName || 'dashboard';
        }
    }

    renderPageNavigation() {
        const container = document.getElementById('page-navigation');
        if (!container) return;

        container.innerHTML = '';

        this.pages.forEach((page, index) => {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-nav-btn';
            if (page.id === this.currentPageId) {
                pageBtn.classList.add('active');
            }
            // Show page number instead of name
            pageBtn.textContent = (index + 1).toString();
            pageBtn.addEventListener('click', () => {
                // Update all buttons
                container.querySelectorAll('.page-nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                pageBtn.classList.add('active');
                
                // Load bookmarks for selected page
                this.loadPageBookmarks(page.id);
                // Update title
                this.updatePageTitle(page.name);
            });
            container.appendChild(pageBtn);
        });
    }

    setupDOM() {
        // Control date visibility and set up if visible
        this.updateDateVisibility();

        // Apply theme - use classList to preserve other classes
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(this.settings.theme);
        document.body.setAttribute('data-theme', this.settings.theme);
        document.body.setAttribute('data-show-title', this.settings.showTitle);
        document.body.setAttribute('data-show-date', this.settings.showDate);
        document.body.setAttribute('data-show-config-button', this.settings.showConfigButton);
        document.body.setAttribute('data-show-search-button', this.settings.showSearchButton);

        // Apply font size
        this.applyFontSize();

        // Apply background dots
        this.applyBackgroundDots();

        // Control title visibility dynamically
        this.updateTitleVisibility();
        
        // Control config button visibility dynamically  
        this.updateConfigButtonVisibility();

        // Control search button visibility dynamically
        this.updateSearchButtonVisibility();

        // Apply columns setting
        const grid = document.getElementById('dashboard-layout');
        if (grid) {
            grid.className = `dashboard-grid columns-${this.settings.columnsPerRow}`;
        }
    }

    initializeSearchComponent() {
        // Initialize search component with current data
        // Use all bookmarks if global shortcuts is enabled, otherwise just current page
        const bookmarksForSearch = this.settings.globalShortcuts ? this.allBookmarks : this.bookmarks;
        
        if (window.SearchComponent) {
            this.searchComponent = new window.SearchComponent(bookmarksForSearch, this.settings);
        } else {
            console.warn('SearchComponent not found. Make sure search.js is loaded.');
        }
    }

    // Method to update search component when data changes
    updateSearchComponent() {
        if (this.searchComponent) {
            // Use all bookmarks if global shortcuts is enabled, otherwise just current page
            const bookmarksForSearch = this.settings.globalShortcuts ? this.allBookmarks : this.bookmarks;
            this.searchComponent.updateData(bookmarksForSearch, this.settings);
        }
    }

    initializeStatusMonitor() {
        // Initialize status monitor with current settings
        if (window.StatusMonitor) {
            this.statusMonitor = new window.StatusMonitor(this.settings);
            // Make dashboard instance available globally for status monitor
            window.dashboardInstance = this;
        } else {
            console.warn('StatusMonitor not found. Make sure status.js is loaded.');
        }
    }

    initializeKeyboardNavigation() {
        // Initialize keyboard navigation component
        if (window.KeyboardNavigation) {
            this.keyboardNavigation = new window.KeyboardNavigation(this);
        } else {
            console.warn('KeyboardNavigation not found. Make sure keyboard-navigation.js is loaded.');
        }
    }

    initializeSwipeNavigation() {
        // Initialize swipe navigation component for touch gestures
        if (window.SwipeNavigation) {
            this.swipeNavigation = new window.SwipeNavigation(this);
        } else {
            console.warn('SwipeNavigation not found. Make sure swipe-navigation.js is loaded.');
        }
    }

    initializeHyprMode() {
        // Initialize HyprMode component
        if (window.hyprMode) {
            window.hyprMode.init(this.settings.hyprMode || false);
        } else {
            console.warn('HyprMode not found. Make sure hypr-mode.js is loaded.');
        }
    }

    // Method to update status monitor when settings change
    updateStatusMonitor() {
        if (this.statusMonitor) {
            this.statusMonitor.updateSettings(this.settings);
        }
    }

    setupPageShortcuts() {
        // Listen for number key presses to switch pages
        document.addEventListener('keydown', (e) => {
            // Only handle number keys 1-9
            // Ignore if user is typing in an input field or if search is active
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Check if shortcut search is active
            const searchElement = document.getElementById('shortcut-search');
            if (searchElement && searchElement.classList.contains('show')) {
                return;
            }
            
            // Don't trigger if modifier keys are pressed
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }
            
            // Check if a number key (1-9) was pressed
            const key = e.key;
            if (key >= '1' && key <= '9') {
                const pageIndex = parseInt(key) - 1;
                
                // Check if this page exists
                if (pageIndex < this.pages.length) {
                    e.preventDefault(); // Prevent default browser behavior
                    e.stopPropagation(); // Stop the event from reaching other listeners
                    
                    const page = this.pages[pageIndex];
                    
                    // Update navigation buttons
                    const navButtons = document.querySelectorAll('.page-nav-btn');
                    navButtons.forEach(btn => btn.classList.remove('active'));
                    if (navButtons[pageIndex]) {
                        navButtons[pageIndex].classList.add('active');
                    }
                    
                    // Load the page
                    this.loadPageBookmarks(page.id);
                    this.updatePageTitle(page.name);
                }
            }
        });
    }



    renderDashboard() {
        const container = document.getElementById('dashboard-layout');
        if (!container) return;

        // Group bookmarks by category
        const groupedBookmarks = this.groupBookmarksByCategory();
        
        // Clear container
        container.innerHTML = '';

        // Render categories
        this.categories.forEach(category => {
            const categoryBookmarks = groupedBookmarks[category.id] || [];
            if (categoryBookmarks.length === 0) return;

            const categoryElement = this.createCategoryElement(category, categoryBookmarks);
            container.appendChild(categoryElement);
        });

        // Handle bookmarks without category
        const uncategorizedBookmarks = groupedBookmarks[''] || [];
        if (uncategorizedBookmarks.length > 0) {
            const uncategorizedCategory = { id: '', name: 'Other' };
            const categoryElement = this.createCategoryElement(uncategorizedCategory, uncategorizedBookmarks);
            container.appendChild(categoryElement);
        }

        // Update search component with current data
        this.updateSearchComponent();
        
        // Initialize status monitoring after rendering
        if (this.statusMonitor) {
            this.statusMonitor.init(this.bookmarks);
        }
    }

    groupBookmarksByCategory() {
        const grouped = {};
        
        this.bookmarks.forEach(bookmark => {
            const categoryId = bookmark.category || '';
            if (!grouped[categoryId]) {
                grouped[categoryId] = [];
            }
            grouped[categoryId].push(bookmark);
        });

        // Bookmarks are kept in the order they appear in the JSON file
        // No sorting applied - respects the order from data/bookmarks-X.json

        return grouped;
    }

    createCategoryElement(category, bookmarks) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        // Category title
        const titleElement = document.createElement('h2');
        titleElement.className = 'category-title';
        titleElement.textContent = category.name.toLowerCase();
        categoryDiv.appendChild(titleElement);

        // Bookmarks list
        const bookmarksList = document.createElement('div');
        bookmarksList.className = 'bookmarks-list';

        bookmarks.forEach(bookmark => {
            const bookmarkElement = this.createBookmarkElement(bookmark);
            bookmarksList.appendChild(bookmarkElement);
        });

        categoryDiv.appendChild(bookmarksList);
        return categoryDiv;
    }

    createBookmarkElement(bookmark) {
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.className = 'bookmark-link';
        link.textContent = bookmark.name;
        link.setAttribute('data-bookmark-url', bookmark.url);
        
        // Always add click handler to check HyprMode dynamically
        link.addEventListener('click', (e) => {
            // Check if HyprMode is enabled at click time
            if (window.hyprMode && window.hyprMode.isEnabled()) {
                e.preventDefault();
                window.hyprMode.handleBookmarkClick(bookmark.url);
            }
            // If HyprMode is not enabled, let the default behavior happen
            // (which will be controlled by target="_blank" if openInNewTab is true)
        });
        
        // Set target for new tab if openInNewTab is enabled and HyprMode is not
        if (this.settings.openInNewTab) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }

        // Add shortcut indicator if exists
        if (bookmark.shortcut && bookmark.shortcut.trim()) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'bookmark-shortcut';
            shortcutSpan.textContent = bookmark.shortcut.toUpperCase();
            link.appendChild(shortcutSpan);
        }

        return link;
    }

    updateTitleVisibility() {
        let titleWrapper = document.querySelector('.title-wrapper');
        
        if (this.settings.showTitle) {
            // Show title - create if it doesn't exist
            if (!titleWrapper) {
                titleWrapper = document.createElement('div');
                titleWrapper.className = 'title-wrapper';
                titleWrapper.innerHTML = '<h1 class="title">dashboard</h1>';
                
                // Insert after date element if it exists, otherwise at the beginning of header
                const header = document.querySelector('.header');
                const dateElement = document.getElementById('date-element');
                if (dateElement) {
                    header.insertBefore(titleWrapper, dateElement.nextSibling);
                } else {
                    header.insertBefore(titleWrapper, header.firstChild);
                }
            }
        } else {
            // Hide title - remove if it exists
            if (titleWrapper) {
                titleWrapper.remove();
            }
        }
    }

    applyFontSize() {
        // Remove existing font size classes
        document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
        // Add current font size class
        const fontSize = this.settings.fontSize || 'medium';
        document.body.classList.add(`font-size-${fontSize}`);
    }

    applyBackgroundDots() {
        // Toggle background dots class
        if (this.settings.showBackgroundDots !== false) {
            document.body.classList.remove('no-background-dots');
        } else {
            document.body.classList.add('no-background-dots');
        }
    }

    updateConfigButtonVisibility() {
        let configLink = document.querySelector('.config-link');
        
        if (this.settings.showConfigButton) {
            // Show config button - create if it doesn't exist
            if (!configLink) {
                configLink = document.createElement('div');
                configLink.className = 'config-link';
                configLink.innerHTML = '<a href="/config">config</a>';
                
                // Add to header at the end
                const header = document.querySelector('.header');
                header.appendChild(configLink);
            }
        } else {
            // Hide config button - remove if it exists
            if (configLink) {
                configLink.remove();
            }
        }
    }

    updateSearchButtonVisibility() {
        let searchButton = document.getElementById('search-button');
        
        if (this.settings.showSearchButton) {
            // Show search button - create if it doesn't exist
            if (!searchButton) {
                searchButton = document.createElement('button');
                searchButton.id = 'search-button';
                searchButton.className = 'search-button';
                searchButton.setAttribute('aria-label', 'Open search');
                searchButton.innerHTML = `
                    <span class="search-button-icon">></span>
                    <span class="search-button-text">search</span>
                `;
                
                // Add click handler
                searchButton.addEventListener('click', () => {
                    if (this.searchComponent) {
                        this.searchComponent.openSearchInterface();
                    }
                });
                
                // Add to body
                document.body.appendChild(searchButton);
            }
        } else {
            // Hide search button - remove if it exists
            if (searchButton) {
                searchButton.remove();
            }
        }
    }

    updateDateVisibility() {
        let dateElement = document.getElementById('date-element');
        
        if (this.settings.showDate) {
            // Show date - create if it doesn't exist
            if (!dateElement) {
                dateElement = document.createElement('div');
                dateElement.id = 'date-element';
                dateElement.className = 'date';
                
                // Insert at the beginning of header
                const header = document.querySelector('.header');
                header.insertBefore(dateElement, header.firstChild);
            }
            
            // Set date content
            const today = new Date();
            const month = today.toLocaleString('default', { month: 'short' });
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            dateElement.textContent = `${day}/${month}/${year}`;
        } else {
            // Hide date - remove if it exists
            if (dateElement) {
                dateElement.remove();
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
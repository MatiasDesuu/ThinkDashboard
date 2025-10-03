// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.bookmarks = [];
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
            showPing: false
        };
        this.searchComponent = null;
        this.statusMonitor = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupDOM();
        this.initializeSearchComponent();
        this.initializeStatusMonitor();
        this.renderPageNavigation();
        this.renderDashboard();
        
        // Set initial page title
        const firstPage = this.pages.length > 0 ? this.pages[0] : null;
        if (firstPage) {
            this.updatePageTitle(firstPage.name);
        }
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
        } catch (error) {
            console.error('Error loading page bookmarks:', error);
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
            pageBtn.setAttribute('title', page.name); // Show name in tooltip
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

        // Apply font size
        this.applyFontSize();

        // Apply background dots
        this.applyBackgroundDots();

        // Control title visibility dynamically
        this.updateTitleVisibility();
        
        // Control config button visibility dynamically  
        this.updateConfigButtonVisibility();

        // Apply columns setting
        const grid = document.getElementById('dashboard-layout');
        if (grid) {
            grid.className = `dashboard-grid columns-${this.settings.columnsPerRow}`;
        }
        
        // Adjust header margin based on title and date visibility
        const header = document.querySelector('.header');
        if (header) {
            if (!this.settings.showTitle && !this.settings.showDate) {
                // Neither title nor date
                header.style.marginBottom = '1rem';
                header.style.minHeight = '40px';
            } else if (this.settings.showTitle && !this.settings.showDate) {
                // Only title, no date - needs proper spacing
                header.style.marginBottom = '2.5rem';
                header.style.minHeight = '80px';
            } else if (!this.settings.showTitle && this.settings.showDate) {
                // Only date, no title - reduce excessive spacing
                header.style.marginBottom = '1.5rem';
                header.style.minHeight = '50px';
            } else {
                // Both title and date - default spacing
                header.style.marginBottom = '3rem';
                header.style.minHeight = '80px';
            }
        }
    }

    initializeSearchComponent() {
        // Initialize search component with current data
        if (window.SearchComponent) {
            this.searchComponent = new window.SearchComponent(this.bookmarks, this.settings);
        } else {
            console.warn('SearchComponent not found. Make sure search.js is loaded.');
        }
    }

    // Method to update search component when data changes
    updateSearchComponent() {
        if (this.searchComponent) {
            this.searchComponent.updateData(this.bookmarks, this.settings);
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

    // Method to update status monitor when settings change
    updateStatusMonitor() {
        if (this.statusMonitor) {
            this.statusMonitor.updateSettings(this.settings);
        }
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

        // Sort bookmarks within each category
        Object.keys(grouped).forEach(categoryId => {
            grouped[categoryId].sort((a, b) => a.name.localeCompare(b.name));
        });

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
// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.bookmarks = [];
        this.categories = [];
        this.settings = {
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            showTitle: true,
            showDate: true,
            showConfigButton: true
        };
        this.shortcuts = new Map();
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupDOM();
        this.setupKeyboardShortcuts();
        this.renderDashboard();
    }

    async loadData() {
        try {
            const [bookmarksRes, categoriesRes, settingsRes] = await Promise.all([
                fetch('/api/bookmarks'),
                fetch('/api/categories'),
                fetch('/api/settings')
            ]);

            this.bookmarks = await bookmarksRes.json();
            this.categories = await categoriesRes.json();
            this.settings = await settingsRes.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    setupDOM() {
        // Set up date if visible
        const dateElement = document.getElementById('date-element');
        if (dateElement && this.settings.showDate) {
            const today = new Date();
            const month = today.toLocaleString('default', { month: 'short' });
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            dateElement.textContent = `${day}/${month}/${year}`;
        }

        // Apply theme
        document.body.className = this.settings.theme;
        document.body.setAttribute('data-theme', this.settings.theme);
        document.body.setAttribute('data-show-title', this.settings.showTitle);
        document.body.setAttribute('data-show-date', this.settings.showDate);
        document.body.setAttribute('data-show-config-button', this.settings.showConfigButton);

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

    setupKeyboardShortcuts() {
        // Clear existing shortcuts
        this.shortcuts.clear();
        this.currentQuery = '';
        this.searchActive = false;
        this.searchMatches = [];
        this.selectedMatchIndex = 0;

        // Build shortcuts map
        this.bookmarks.forEach(bookmark => {
            if (bookmark.shortcut && bookmark.shortcut.trim()) {
                this.shortcuts.set(bookmark.shortcut.toLowerCase(), bookmark);
            }
        });

        // Add keyboard event listener
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            this.handleKeyPress(e);
        });

        // Close search on escape
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this.closeSearch();
            }
        });
        
        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            const searchElement = document.getElementById('shortcut-search');
            const searchContainer = document.querySelector('.search-container');
            
            if (this.searchActive && searchElement && searchContainer) {
                // If clicked on the backdrop (not on the search container)
                if (e.target === searchElement) {
                    this.closeSearch();
                }
            }
        });
    }

    handleKeyPress(e) {
        const key = e.key.toUpperCase();
        
        // Handle special keys
        if (key === 'ESCAPE') {
            this.closeSearch();
            return;
        }
        
        if (key === 'ENTER' && this.searchActive) {
            e.preventDefault();
            this.selectCurrentMatch();
            return;
        }
        
        if (key === 'ARROWUP' && this.searchActive) {
            e.preventDefault();
            this.navigateMatches(-1);
            return;
        }
        
        if (key === 'ARROWDOWN' && this.searchActive) {
            e.preventDefault();
            this.navigateMatches(1);
            return;
        }
        
        if (key === 'BACKSPACE' && this.searchActive) {
            e.preventDefault();
            this.removeLastChar();
            return;
        }

        // Only handle alphanumeric keys
        if (!/^[A-Z0-9]$/.test(key)) {
            return;
        }

        e.preventDefault();
        this.addToQuery(key);
    }

    addToQuery(key) {
        this.currentQuery += key;
        
        // Check for exact match first
        const exactMatch = this.shortcuts.get(this.currentQuery.toLowerCase());
        if (exactMatch) {
            // If it's a single character or no other shortcuts start with this query
            const hasLongerMatches = Array.from(this.shortcuts.keys()).some(shortcut => 
                shortcut !== this.currentQuery.toLowerCase() && 
                shortcut.startsWith(this.currentQuery.toLowerCase())
            );
            
            if (!hasLongerMatches) {
                // Open immediately if no longer matches exist
                this.openBookmark(exactMatch);
                this.resetQuery();
                return;
            }
        }
        
        // Show search interface and find matches
        this.updateSearch();
    }

    removeLastChar() {
        if (this.currentQuery.length > 0) {
            this.currentQuery = this.currentQuery.slice(0, -1);
            if (this.currentQuery.length === 0) {
                this.closeSearch();
            } else {
                this.updateSearch();
            }
        }
    }

    updateSearch() {
        // Find matching shortcuts
        this.searchMatches = [];
        this.shortcuts.forEach((bookmark, shortcut) => {
            if (shortcut.startsWith(this.currentQuery.toLowerCase())) {
                this.searchMatches.push({ shortcut, bookmark });
            }
        });

        // Sort matches by shortcut length (shorter first)
        this.searchMatches.sort((a, b) => a.shortcut.length - b.shortcut.length);

        // Always show search interface, even with no matches
        this.showSearch();
        this.selectedMatchIndex = 0;
        this.renderSearchMatches();
    }

    showSearch() {
        this.searchActive = true;
        const searchElement = document.getElementById('shortcut-search');
        const queryElement = document.getElementById('search-query');
        
        if (searchElement && queryElement) {
            queryElement.textContent = this.currentQuery;
            searchElement.classList.add('show');
        }
    }

    closeSearch() {
        this.searchActive = false;
        this.resetQuery();
        const searchElement = document.getElementById('shortcut-search');
        if (searchElement) {
            searchElement.classList.remove('show');
        }
    }

    resetQuery() {
        this.currentQuery = '';
        this.searchMatches = [];
        this.selectedMatchIndex = 0;
    }

    renderSearchMatches() {
        const matchesContainer = document.getElementById('search-matches');
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '';

        if (this.searchMatches.length === 0) {
            // Show "no matches" message
            const noMatchElement = document.createElement('div');
            noMatchElement.className = 'search-match';
            noMatchElement.innerHTML = `
                <span class="search-match-shortcut">—</span>
                <span class="search-match-name">No matches found</span>
            `;
            matchesContainer.appendChild(noMatchElement);
            return;
        }

        this.searchMatches.forEach((match, index) => {
            const matchElement = document.createElement('div');
            matchElement.className = `search-match ${index === this.selectedMatchIndex ? 'selected' : ''}`;
            matchElement.innerHTML = `
                <span class="search-match-shortcut">${match.shortcut.toUpperCase()}</span>
                <span class="search-match-name">${match.bookmark.name}</span>
            `;
            
            matchElement.addEventListener('click', () => {
                this.openBookmark(match.bookmark);
            });
            
            matchesContainer.appendChild(matchElement);
        });
    }

    navigateMatches(direction) {
        if (this.searchMatches.length === 0) return;
        
        this.selectedMatchIndex += direction;
        
        if (this.selectedMatchIndex < 0) {
            this.selectedMatchIndex = this.searchMatches.length - 1;
        } else if (this.selectedMatchIndex >= this.searchMatches.length) {
            this.selectedMatchIndex = 0;
        }
        
        this.renderSearchMatches();
    }

    selectCurrentMatch() {
        if (this.searchMatches.length > 0 && this.selectedMatchIndex >= 0) {
            const selectedMatch = this.searchMatches[this.selectedMatchIndex];
            this.openBookmark(selectedMatch.bookmark);
        }
        // If no matches, do nothing (keep search open)
    }

    openBookmark(bookmark) {
        // Close search first if it's active
        if (this.searchActive) {
            this.closeSearch();
        }
        
        // Small delay to ensure search is closed before opening bookmark
        setTimeout(() => {
            if (this.settings.openInNewTab) {
                window.open(bookmark.url, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = bookmark.url;
            }
        }, 100);
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
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
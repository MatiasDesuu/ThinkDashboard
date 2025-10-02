// Search Component JavaScript
class SearchComponent {
    constructor(bookmarks = [], settings = {}) {
        this.bookmarks = bookmarks;
        this.settings = settings;
        this.shortcuts = new Map();
        this.currentQuery = '';
        this.searchActive = false;
        this.searchMatches = [];
        this.selectedMatchIndex = 0;
        
        this.init();
    }

    init() {
        this.buildShortcutsMap();
        this.setupEventListeners();
    }

    updateData(bookmarks, settings) {
        this.bookmarks = bookmarks;
        this.settings = settings;
        this.buildShortcutsMap();
    }

    buildShortcutsMap() {
        // Clear existing shortcuts
        this.shortcuts.clear();
        this.currentQuery = '';
        this.searchActive = false;
        this.searchMatches = [];

        // Build shortcuts map
        this.bookmarks.forEach(bookmark => {
            if (bookmark.shortcut && bookmark.shortcut.trim()) {
                this.shortcuts.set(bookmark.shortcut.toLowerCase(), bookmark);
            }
        });
    }

    setupEventListeners() {
        // Add keyboard event listener
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Don't trigger shortcuts if any modifier key is pressed
            // This allows browser shortcuts like Ctrl+W, Ctrl+R, Ctrl+Q, etc.
            if (e.ctrlKey || e.altKey || e.metaKey) {
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
                this.searchMatches.push({ shortcut, bookmark, type: 'bookmark' });
            }
        });

        // Check if 'config' matches the current query
        if ('config'.startsWith(this.currentQuery.toLowerCase()) && this.currentQuery.length > 0) {
            this.searchMatches.push({ 
                shortcut: 'config', 
                bookmark: { name: 'Configuration', url: '/config' }, 
                type: 'config' 
            });
        }

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
            const baseClass = `search-match ${index === this.selectedMatchIndex ? 'selected' : ''}`;
            const configClass = match.type === 'config' ? ' config-entry' : '';
            matchElement.className = baseClass + configClass;
            matchElement.innerHTML = `
                <span class="search-match-shortcut">${match.shortcut.toUpperCase()}</span>
                <span class="search-match-name">${match.bookmark.name}</span>
            `;
            
            matchElement.addEventListener('click', () => {
                if (match.type === 'config') {
                    this.openConfig();
                } else {
                    this.openBookmark(match.bookmark);
                }
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
            if (selectedMatch.type === 'config') {
                this.openConfig();
            } else {
                this.openBookmark(selectedMatch.bookmark);
            }
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

    openConfig() {
        // Close search first if it's active
        if (this.searchActive) {
            this.closeSearch();
        }
        
        // Navigate to config page
        setTimeout(() => {
            window.location.href = '/config';
        }, 100);
    }

    // Public methods for external usage
    isActive() {
        return this.searchActive;
    }

    getCurrentQuery() {
        return this.currentQuery;
    }

    getMatches() {
        return this.searchMatches;
    }
}

// Export for use in other modules
window.SearchComponent = SearchComponent;
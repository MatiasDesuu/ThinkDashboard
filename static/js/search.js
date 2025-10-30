// Search Component JavaScript
class SearchComponent {
    constructor(bookmarks = [], settings = {}, language = null) {
        this.bookmarks = bookmarks;
        this.settings = settings;
        this.language = language;
        this.shortcuts = new Map();
        this.currentQuery = '';
        this.searchActive = false;
        this.searchMatches = [];
        this.selectedMatchIndex = 0;
        this.matchElements = []; // Store references to DOM elements for selection highlighting
        this.justCompleted = false; // Flag to prevent accidental execution after completion
        
        this.commandsComponent = new window.SearchCommandsComponent(this.language);

        this.fuzzySearchComponent = new window.FuzzySearchComponent(this.bookmarks, (bookmark) => this.openBookmark(bookmark));

        this.interleaveMode = settings.interleaveMode || false;

        this.init();
    }

    init() {
        this.buildShortcutsMap();
        this.setupEventListeners();
    }

    updateData(bookmarks, settings, language = null) {
        this.bookmarks = bookmarks;
        this.settings = settings;
        this.language = language || this.language;
        this.commandsComponent.setLanguage(this.language);
        this.fuzzySearchComponent.updateBookmarks(bookmarks);
        this.interleaveMode = settings.interleaveMode || false;
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
        // Setup mobile input listener
        const mobileInput = document.getElementById('search-input-mobile');
        if (mobileInput) {
            mobileInput.addEventListener('input', (e) => {
                const value = e.target.value.toUpperCase();
                if (value.length > this.currentQuery.length) {
                    // Character added
                    const newChar = value[value.length - 1];
                    if (/^[A-Z0-9: /]$/.test(newChar)) {
                        this.addToQuery(newChar);
                    }
                } else if (value.length < this.currentQuery.length) {
                    // Character removed
                    this.removeLastChar();
                }
                // Keep input synced
                e.target.value = this.currentQuery;
            });

            mobileInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectCurrentMatch();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.closeSearch();
                }
            });
        }

        // Add keyboard event listener
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input, except when search is active and it's a navigation key
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (!this.searchActive || !['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                    return;
                }
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

        // Add search button event listener
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.openSearchInterface();
            });
        }
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

        // Handle colon key to start commands
        if (key === ':') {
            e.preventDefault();
            this.addToQuery(':');
            return;
        }

        // Handle / key to start fuzzy search
        if (key === '/') {
            e.preventDefault();
            this.addToQuery('/');
            return;
        }

        // Handle space key for commands
        if (key === ' ' && this.currentQuery.startsWith(':')) {
            e.preventDefault();
            this.addToQuery(' ');
            return;
        }

        // Only handle letter keys (A-Z) and numbers (0-9) when search is active, otherwise only letters and :
        if (this.searchActive) {
            if (!/^[A-Z0-9]$/.test(key)) {
                return;
            }
        } else {
            if (this.interleaveMode) {
                if (!/^[A-Z0-9/]$/.test(key)) {
                    return;
                }
            } else {
                if (!/^[A-Z:/]$/.test(key)) {
                    return;
                }
            }
        }

        e.preventDefault();
        this.addToQuery(key);
    }

    addToQuery(key) {
        this.currentQuery += key;
        
        // Check for exact match first
        const query = this.currentQuery.startsWith('/') ? this.currentQuery.slice(1) : this.currentQuery;
        const isShortcutMode = (this.currentQuery.startsWith('/') && this.interleaveMode) || (!this.currentQuery.startsWith('/') && !this.interleaveMode);
        
        if (isShortcutMode) {
            const exactMatch = this.shortcuts.get(query.toLowerCase());
            if (exactMatch) {
                // If it's a single character or no other shortcuts start with this query
                const hasLongerMatches = Array.from(this.shortcuts.keys()).some(shortcut => 
                    shortcut !== query.toLowerCase() && 
                    shortcut.startsWith(query.toLowerCase())
                );
                
                if (!hasLongerMatches) {
                    // Open immediately if no longer matches exist
                    this.openBookmark(exactMatch);
                    this.resetQuery();
                    return;
                }
            }
        }
        
        // Show search interface and find matches
        this.updateSearch();
    }

    removeLastChar() {
        if (this.currentQuery.length > 0) {
            this.currentQuery = this.currentQuery.slice(0, -1);
            if (this.currentQuery.length === 0 && !this.settings.keepSearchOpenWhenEmpty) {
                this.closeSearch();
            } else {
                this.updateSearch();
            }
        }
    }

    updateSearch() {
        // Find matching shortcuts
        this.searchMatches = [];

        if (this.currentQuery.startsWith(':')) {
            // Handle commands
            this.searchMatches = this.commandsComponent.handleCommand(this.currentQuery);
        } else {
            const query = this.currentQuery.startsWith('/') ? this.currentQuery.slice(1) : this.currentQuery;
            const isShortcutMode = (this.currentQuery.startsWith('/') && this.interleaveMode) || (!this.currentQuery.startsWith('/') && !this.interleaveMode);
            
            if (isShortcutMode) {
                // Only search for shortcuts if query is not empty
                if (query.length > 0) {
                    // Handle bookmark shortcuts
                    this.shortcuts.forEach((bookmark, shortcut) => {
                        if (shortcut.startsWith(query.toLowerCase())) {
                            this.searchMatches.push({ shortcut, bookmark, type: 'bookmark' });
                        }
                    });

                    // Check if 'config' matches the current query
                    if ('config'.startsWith(query.toLowerCase())) {
                        this.searchMatches.push({ 
                            shortcut: 'config', 
                            bookmark: { name: this.language ? this.language.t('dashboard.configuration') : 'Configuration', url: '/config' }, 
                            type: 'config' 
                        });
                    }

                    // Check if 'colors' matches the current query
                    if ('colors'.startsWith(query.toLowerCase())) {
                        this.searchMatches.push({ 
                            shortcut: 'colors', 
                            bookmark: { name: this.language ? this.language.t('dashboard.colorCustomization') : 'Color Customization', url: '/colors' }, 
                            type: 'colors' 
                        });
                    }

                    // Sort matches by shortcut length (shorter first)
                    this.searchMatches.sort((a, b) => a.shortcut.length - b.shortcut.length);

                    // Add fuzzy suggestions if enabled
                    if (this.settings.enableFuzzySuggestions) {
                        let fuzzyMatches = this.fuzzySearchComponent.handleFuzzy(query);
                        const includedUrls = new Set(this.searchMatches.map(m => m.bookmark.url));
                        let filteredFuzzy = fuzzyMatches.filter(m => !includedUrls.has(m.bookmark.url));
                        
                        // If start with option is enabled, filter further
                        if (this.settings.fuzzySuggestionsStartWith) {
                            filteredFuzzy = filteredFuzzy.filter(m => m.bookmark.name.toLowerCase().startsWith(query.toLowerCase()));
                        }
                        
                        this.searchMatches.push(...filteredFuzzy);
                    }
                }
            } else {
                // Handle fuzzy search - only if query is not empty
                if (query.length > 0) {
                    this.searchMatches = this.fuzzySearchComponent.handleFuzzy(query);
                }
            }
        }

        // Always show search interface, even with no matches
        this.showSearch();
        if (this.selectedMatchIndex === -1) {
            // Keep -1 to avoid auto-selection
        } else {
            this.selectedMatchIndex = 0;
        }
        this.renderSearchMatches();
    }

    showSearch() {
        this.searchActive = true;
        const searchElement = document.getElementById('shortcut-search');
        const queryElement = document.getElementById('search-query');
        const mobileInput = document.getElementById('search-input-mobile');
        
        if (searchElement && queryElement) {
            queryElement.textContent = this.currentQuery;
            searchElement.classList.add('show');
            
            // Focus mobile input to show keyboard
            if (mobileInput) {
                mobileInput.value = this.currentQuery;
                // Use setTimeout to ensure the search is visible before focusing
                setTimeout(() => {
                    mobileInput.focus();
                }, 100);
            }
        }
    }

    closeSearch() {
        this.searchActive = false;
        this.resetQuery();
        const searchElement = document.getElementById('shortcut-search');
        const mobileInput = document.getElementById('search-input-mobile');
        
        if (searchElement) {
            searchElement.classList.remove('show');
        }
        
        // Blur mobile input to hide keyboard
        if (mobileInput) {
            mobileInput.blur();
            mobileInput.value = '';
        }
        
        // Clear the displayed matches
        this.renderSearchMatches();
    }

    updateSelectionHighlight() {
        // Update keyboard-selected class on existing elements
        this.matchElements.forEach((element, index) => {
            if (index === this.selectedMatchIndex) {
                element.classList.add('keyboard-selected');
                // Scroll the selected element into view
                element.scrollIntoView({
                    behavior: 'instant',
                    block: 'nearest',
                    inline: 'nearest'
                });
            } else {
                element.classList.remove('keyboard-selected');
            }
        });
    }

    resetQuery() {
        this.currentQuery = '';
        this.searchMatches = [];
        this.selectedMatchIndex = 0;
        this.matchElements = []; // Clear element references
        this.justCompleted = false; // Reset flag
    }

    renderSearchMatches() {
        const matchesContainer = document.getElementById('search-matches');
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '';
        this.matchElements = []; // Reset element references

        if (this.searchMatches.length === 0) {
            // Show empty container when no matches (no message when opened from button)
            if (this.currentQuery.length > 0) {
                // Only show "no matches" if user has typed something
                const noMatchElement = document.createElement('div');
                noMatchElement.className = 'search-match';
                noMatchElement.innerHTML = `
                    <span class="search-match-shortcut">—</span>
                    <span class="search-match-name">${this.language ? this.language.t('dashboard.noMatchesFound') : 'No matches found'}</span>
                `;
                matchesContainer.appendChild(noMatchElement);
                this.matchElements.push(noMatchElement); // Store reference
            }
            return;
        }

        this.searchMatches.forEach((match, index) => {
            const matchElement = document.createElement('div');
            const baseClass = `search-match ${index === this.selectedMatchIndex ? 'keyboard-selected' : ''}`;
            const configClass = (match.type === 'config' || match.type === 'colors') ? ' config-entry' : '';
            const commandClass = (match.type === 'command' || match.type === 'command-completion') ? ' command-entry' : '';
            const fuzzyClass = match.type === 'fuzzy' ? ' fuzzy-entry' : '';
            matchElement.className = baseClass + configClass + commandClass + fuzzyClass;
            
            // Get the display name based on match type
            let displayName;
            if (match.type === 'fuzzy') {
                displayName = this.fuzzySearchComponent.highlightFuzzyMatch(match.name, this.currentQuery.slice(1));
            } else {
                displayName = (match.type === 'bookmark' || match.type === 'config' || match.type === 'colors') ? match.bookmark.name : match.name;
            }
            
            // For fuzzy search, don't show shortcut span to avoid empty space
            let shortcutHtml = '';
            if (match.type !== 'fuzzy') {
                shortcutHtml = `<span class="search-match-shortcut">${match.shortcut.toUpperCase()}</span>`;
            }
            
            matchElement.innerHTML = `
                ${shortcutHtml}
                <span class="search-match-name">${displayName}</span>
            `;
            
            matchElement.addEventListener('click', () => {
                if (match.type === 'config') {
                    this.openConfig();
                } else if (match.type === 'colors') {
                    this.openColors();
                } else if (match.type === 'command') {
                    match.action();
                    this.closeSearch();
                } else if (match.type === 'command-completion') {
                    this.currentQuery = match.completion;
                    this.updateSearch();
                    this.selectedMatchIndex = 0; // Auto-select first match after completion
                    this.updateSelectionHighlight(); // Update visual selection
                    this.justCompleted = true; // Prevent immediate execution
                } else if (match.type === 'fuzzy') {
                    match.action();
                    this.closeSearch();
                } else {
                    this.openBookmark(match.bookmark);
                }
            });
            
            matchesContainer.appendChild(matchElement);
            this.matchElements.push(matchElement); // Store reference
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
        
        this.updateSelectionHighlight();
    }

    selectCurrentMatch() {
        if (this.justCompleted) {
            this.justCompleted = false;
            return;
        }
        
        if (this.searchMatches.length > 0 && this.selectedMatchIndex >= 0) {
            const selectedMatch = this.searchMatches[this.selectedMatchIndex];
            if (selectedMatch.type === 'config') {
                this.openConfig();
            } else if (selectedMatch.type === 'colors') {
                this.openColors();
            } else if (selectedMatch.type === 'command') {
                selectedMatch.action();
                this.closeSearch();
            } else if (selectedMatch.type === 'command-completion') {
                this.currentQuery = selectedMatch.completion;
                this.updateSearch();
                this.selectedMatchIndex = 0; // Auto-select first match after completion
                this.updateSelectionHighlight(); // Update visual selection
                this.justCompleted = true; // Prevent immediate execution
            } else if (selectedMatch.type === 'fuzzy') {
                selectedMatch.action();
                this.closeSearch();
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
            // Check if HyprMode is enabled
            if (window.hyprMode && window.hyprMode.isEnabled()) {
                window.hyprMode.handleBookmarkClick(bookmark.url);
            } else if (this.settings.openInNewTab) {
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

    openColors() {
        // Close search first if it's active
        if (this.searchActive) {
            this.closeSearch();
        }
        
        // Navigate to colors page
        setTimeout(() => {
            window.location.href = '/colors';
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

    // Open search interface directly (for button click)
    openSearchInterface() {
        if (!this.searchActive) {
            this.currentQuery = '';
            this.searchMatches = [];
            this.selectedMatchIndex = 0;
            this.showSearch();
            this.renderSearchMatches();
        }
    }
}

// Export for use in other modules
window.SearchComponent = SearchComponent;
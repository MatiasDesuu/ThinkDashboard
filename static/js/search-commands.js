// Search Commands Component JavaScript
class SearchCommandsComponent {
    constructor(language = null, currentBookmarks = [], allBookmarks = []) {
        this.language = language;
        
        // Available commands
        this.availableCommands = {
            'theme': this.handleThemeCommand.bind(this),
            'fontsize': this.handleFontSizeCommand.bind(this),
            'columns': this.handleColumnsCommand.bind(this),
            'remove': this.handleRemoveCommand.bind(this)
        };

        // Available themes - will be loaded dynamically
        this.themes = [];
        this.customThemes = {};
        
        // Current page bookmarks and all bookmarks
        this.currentBookmarks = currentBookmarks;
        this.allBookmarks = allBookmarks;
        
        // Confirmation state for remove command
        this.confirmationBookmark = null;
        
        // Load themes on initialization
        this.loadThemes();
    }

    /**
     * Set language for translations
     * @param {Object} language - Language translation object
     */
    setLanguage(language) {
        this.language = language;
    }

    /**
     * Set current page bookmarks and all bookmarks for remove command
     * @param {Array} currentBookmarks - Bookmarks from current page
     * @param {Array} allBookmarks - All bookmarks from all pages
     */
    setBookmarks(currentBookmarks, allBookmarks) {
        this.currentBookmarks = currentBookmarks;
        this.allBookmarks = allBookmarks;
        this.resetState();
    }

    /**
     * Reset internal state (confirmation mode, etc.)
     */
    resetState() {
        this.confirmationBookmark = null;
    }

    /**
     * Load available themes from the application
     */
    async loadThemes() {
        try {
            // Load custom themes from API
            const response = await fetch('/api/colors/custom-themes');
            if (response.ok) {
                this.customThemes = await response.json();
            }
        } catch (error) {
            console.error('Error loading custom themes:', error);
        }

        // Build complete theme list
        this.themes = ['light', 'dark'];
        
        // Add custom themes
        if (this.customThemes && typeof this.customThemes === 'object') {
            if (Array.isArray(this.customThemes)) {
                this.themes = this.themes.concat(this.customThemes);
            } else {
                this.themes = this.themes.concat(Object.keys(this.customThemes));
            }
        }
    }

    /**
     * Handle a command query
     * @param {string} query - The full query starting with ':'
     * @returns {Array} Array of match objects with name and action
     */
    handleCommand(query) {
        if (!query.startsWith(':')) {
            return [];
        }

        // If just ":", show available commands
        if (query === ':') {
            return this.getAvailableCommands();
        }

        const afterColon = query.slice(1);
        const parts = afterColon.split(' ');
        const potentialCommand = parts[0].toLowerCase();

        // Check if it's a complete command
        if (this.availableCommands[potentialCommand]) {
            return this.availableCommands[potentialCommand](parts.slice(1));
        }

        // Check if it's the start of a command
        const matchingCommands = Object.keys(this.availableCommands).filter(cmd => 
            cmd.startsWith(potentialCommand)
        );

        if (matchingCommands.length > 0) {
            return matchingCommands.map(commandName => ({
                name: '',
                shortcut: `:${commandName.toUpperCase()}`,
                completion: `:${commandName.toUpperCase()} `,
                type: 'command-completion'
            }));
        }

        return [];
    }

    /**
     * Get list of available commands
     * @returns {Array} Array of command matches
     */
    getAvailableCommands() {
        return Object.keys(this.availableCommands).map(commandName => ({
            name: '',
            shortcut: `:${commandName.toUpperCase()}`,
            completion: `:${commandName.toUpperCase()} `,
            type: 'command-completion'
        }));
    }

    /**
     * Handle the :theme command
     * @param {Array} args - Arguments after 'theme'
     * @returns {Array} Array of theme matches
     */
    handleThemeCommand(args) {
        // If args has one empty string, treat as no args
        const effectiveArgs = (args.length === 1 && args[0] === '') ? [] : args;
        
        if (effectiveArgs.length === 0) {
            // Show all themes
            return this.themes.map(themeId => {
                const displayName = this.getThemeDisplayName(themeId);
                return {
                    name: displayName,
                    shortcut: `:theme`,
                    action: () => this.applyTheme(themeId),
                    type: 'command'
                };
            });
        } else {
            // Show matching themes
            const themeQuery = effectiveArgs.join(' ').toLowerCase();
            const matchingThemes = this.themes.filter(themeId => {
                const displayName = this.getThemeDisplayName(themeId);
                return displayName.toLowerCase().startsWith(themeQuery);
            });

            return matchingThemes.map(themeId => {
                const displayName = this.getThemeDisplayName(themeId);
                return {
                    name: displayName,
                    shortcut: `:theme`,
                    action: () => this.applyTheme(themeId),
                    type: 'command'
                };
            });
        }
    }

    /**
     * Handle the :fontsize command
     * @param {Array} args - Arguments after 'fontsize'
     * @returns {Array} Array of font size matches
     */
    handleFontSizeCommand(args) {
        const fontSizeMap = ['xs', 's', 'sm', 'm', 'lg', 'l', 'xl'];
        const fontSizeDisplayNames = {
            'xs': this.language ? this.language.t('dashboard.extraSmall') : 'Extra Small',
            's': this.language ? this.language.t('dashboard.small') : 'Small',
            'sm': this.language ? this.language.t('dashboard.smallMedium') : 'Small Medium',
            'm': this.language ? this.language.t('dashboard.medium') : 'Medium',
            'lg': this.language ? this.language.t('dashboard.largeMedium') : 'Large Medium',
            'l': this.language ? this.language.t('dashboard.large') : 'Large',
            'xl': this.language ? this.language.t('dashboard.extraLarge') : 'Extra Large'
        };

        // If args has one empty string, treat as no args
        const effectiveArgs = (args.length === 1 && args[0] === '') ? [] : args;
        
        if (effectiveArgs.length === 0) {
            // Show all font sizes
            return fontSizeMap.map(size => {
                const displayName = fontSizeDisplayNames[size] || size.toUpperCase();
                return {
                    name: displayName,
                    shortcut: `:fontsize`,
                    action: () => this.applyFontSize(size),
                    type: 'command'
                };
            });
        } else {
            // Show matching font sizes
            const sizeQuery = effectiveArgs.join(' ').toLowerCase();
            const matchingSizes = fontSizeMap.filter(size => {
                const displayName = fontSizeDisplayNames[size] || size.toUpperCase();
                return displayName.toLowerCase().startsWith(sizeQuery) || size.startsWith(sizeQuery);
            });

            return matchingSizes.map(size => {
                const displayName = fontSizeDisplayNames[size] || size.toUpperCase();
                return {
                    name: displayName,
                    shortcut: `:fontsize`,
                    action: () => this.applyFontSize(size),
                    type: 'command'
                };
            });
        }
    }

    /**
     * Handle the :columns command
     * @param {Array} args - Arguments after 'columns'
     * @returns {Array} Array of column matches
     */
    handleColumnsCommand(args) {
        const columnMap = ['1', '2', '3', '4', '5', '6'];
        const columnDisplayNames = {
            '1': this.language ? this.language.t('dashboard.oneColumn') : '1 Column',
            '2': this.language ? this.language.t('dashboard.twoColumns') : '2 Columns',
            '3': this.language ? this.language.t('dashboard.threeColumns') : '3 Columns',
            '4': this.language ? this.language.t('dashboard.fourColumns') : '4 Columns',
            '5': this.language ? this.language.t('dashboard.fiveColumns') : '5 Columns',
            '6': this.language ? this.language.t('dashboard.sixColumns') : '6 Columns'
        };

        // If args has one empty string, treat as no args
        const effectiveArgs = (args.length === 1 && args[0] === '') ? [] : args;
        
        if (effectiveArgs.length === 0) {
            // Show all column options
            return columnMap.map(column => {
                const displayName = columnDisplayNames[column] || `${column} Columns`;
                return {
                    name: displayName,
                    shortcut: `:columns`,
                    action: () => this.applyColumns(column),
                    type: 'command'
                };
            });
        } else {
            // Show matching column options
            const columnQuery = effectiveArgs.join(' ').toLowerCase();
            const matchingColumns = columnMap.filter(column => {
                const displayName = columnDisplayNames[column] || `${column} Columns`;
                return displayName.toLowerCase().startsWith(columnQuery) || column.startsWith(columnQuery);
            });

            return matchingColumns.map(column => {
                const displayName = columnDisplayNames[column] || `${column} Columns`;
                return {
                    name: displayName,
                    shortcut: `:columns`,
                    action: () => this.applyColumns(column),
                    type: 'command'
                };
            });
        }
    }

    /**
     * Handle the :remove command
     * Shows bookmarks from all pages by default, or current page if query contains '#'
     * When a bookmark is selected, shows Yes/No confirmation
     * @param {Array} args - Arguments after 'remove'
     * @returns {Array} Array of bookmark matches or confirmation options
     */
    handleRemoveCommand(args) {
        // If in confirmation mode, show Yes/No options
        if (this.confirmationBookmark) {
            return this.getConfirmationMatches();
        }

        // Parse query for current page mode (#) and fuzzy search
        const effectiveArgs = (args.length === 1 && args[0] === '') ? [] : args;
        const query = effectiveArgs.join(' ').toLowerCase();
        const isCurrentPageMode = query.includes('#');
        const bookmarksToSearch = isCurrentPageMode ? this.currentBookmarks : this.allBookmarks;
        const fuzzyQuery = isCurrentPageMode ? query.replace('#', '').trim() : query;

        return this.getBookmarkMatches(bookmarksToSearch, fuzzyQuery);
    }

    /**
     * Get confirmation matches (Yes/No)
     * @returns {Array} Confirmation options
     */
    getConfirmationMatches() {
        return [
            {
                name: this.language ? this.language.t('others.yes') : 'Yes',
                shortcut: ':remove',
                action: () => this.removeBookmark(this.confirmationBookmark),
                type: 'command'
            },
            {
                name: this.language ? this.language.t('others.no') : 'No',
                shortcut: ':remove',
                action: () => { this.confirmationBookmark = null; },
                type: 'command'
            }
        ];
    }

    /**
     * Get bookmark matches for fuzzy search
     * @param {Array} bookmarks - Bookmarks to search in
     * @param {string} fuzzyQuery - Search query
     * @returns {Array} Bookmark matches
     */
    getBookmarkMatches(bookmarks, fuzzyQuery) {
        if (fuzzyQuery === '') {
            // Show all bookmarks from selected scope
            return bookmarks.map(bookmark => ({
                name: bookmark.name,
                shortcut: ':remove',
                action: () => { this.confirmationBookmark = bookmark; return false; },
                type: 'command'
            }));
        } else {
            // Show matching bookmarks using fuzzy search
            const matchingBookmarks = bookmarks.filter(bookmark => 
                this.fuzzyMatch(fuzzyQuery, bookmark.name)
            );

            return matchingBookmarks.map(bookmark => ({
                name: bookmark.name,
                shortcut: ':remove',
                action: () => { this.confirmationBookmark = bookmark; return false; },
                type: 'command'
            }));
        }
    }

    /**
     * Fuzzy match: checks if query is contained in text (case-insensitive)
     * @param {string} query - The search query
     * @param {string} text - The text to search in
     * @returns {boolean} True if text contains query
     */
    fuzzyMatch(query, text) {
        query = query.toLowerCase();
        text = text.toLowerCase();
        return text.includes(query);
    }

    /**
     * Remove a bookmark from the current page
     * @param {Object} bookmark - The bookmark to remove
     */
    async removeBookmark(bookmark) {
        try {
            // Get current page ID from dashboard
            const currentPageId = window.dashboardInstance ? window.dashboardInstance.currentPageId : 1;
            
            const response = await fetch('/api/bookmarks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: currentPageId,
                    bookmark: bookmark
                })
            });

            if (response.ok) {
                // Reset confirmation state
                this.confirmationBookmark = null;
                // Refresh the dashboard
                if (window.dashboardInstance) {
                    window.dashboardInstance.loadPageBookmarks(currentPageId);
                    window.dashboardInstance.updateSearchComponent();
                }
            } else {
                console.error('Failed to delete bookmark');
            }
        } catch (error) {
            console.error('Error deleting bookmark:', error);
        }
    }

    /**
     * Get the display name for a theme ID
     * @param {string} themeId - The theme ID
     * @returns {string} The display name
     */
    getThemeDisplayName(themeId) {
        if (themeId === 'light') return this.language ? this.language.t('dashboard.lightTheme') : 'Light';
        if (themeId === 'dark') return this.language ? this.language.t('dashboard.darkTheme') : 'Dark';
        
        // Check custom themes
        if (this.customThemes && typeof this.customThemes === 'object') {
            if (Array.isArray(this.customThemes)) {
                return themeId; // If it's an array, the ID is the name
            } else {
                return this.customThemes[themeId] || themeId;
            }
        }
        
        return themeId;
    }

    /**
     * Apply a theme
     * @param {string} theme - The theme name to apply
     */
    async applyTheme(theme) {
        // Remove all theme classes
        document.body.classList.remove('dark', 'light');
        
        // Remove any custom theme classes
        const themeIds = Array.isArray(this.customThemes)
            ? this.customThemes
            : (this.customThemes && typeof this.customThemes === 'object')
                ? Object.keys(this.customThemes)
                : [];

        themeIds.forEach(themeId => {
            document.body.classList.remove(themeId);
        });
        
        // Add the new theme class
        document.body.classList.add(theme);
        document.body.setAttribute('data-theme', theme);
        
        // Get showBackgroundDots setting
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        let showBackgroundDots = true; // default
        
        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    showBackgroundDots = parsed.showBackgroundDots !== false;
                    // Update theme in localStorage
                    parsed.theme = theme;
                    localStorage.setItem('dashboardSettings', JSON.stringify(parsed));
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // For server settings, we need to fetch current settings, update theme, and save back
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const currentSettings = await response.json();
                    currentSettings.theme = theme;
                    showBackgroundDots = currentSettings.showBackgroundDots !== false;
                    
                    // Save updated settings to server
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentSettings)
                    });
                }
            } catch (error) {
                console.error('Error saving theme to server:', error);
            }
        }
        
        // Apply theme using ThemeLoader
        if (window.ThemeLoader && typeof window.ThemeLoader.applyTheme === 'function') {
            const currentFontSize = window.ThemeLoader.getFontSize ? window.ThemeLoader.getFontSize() : 'm';
            window.ThemeLoader.applyTheme(theme, showBackgroundDots, currentFontSize);
        } else {
            console.warn('ThemeLoader not available');
        }
    }

    /**
     * Apply a font size
     * @param {string} fontSize - The font size to apply
     */
    async applyFontSize(fontSize) {
        // Remove all font size classes
        document.body.classList.remove('font-size-xs', 'font-size-s', 'font-size-sm', 'font-size-m', 'font-size-lg', 'font-size-l', 'font-size-xl');
        
        // Add the new font size class
        document.body.classList.add(`font-size-${fontSize}`);
        
        // Update settings
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        
        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    // Update fontSize in localStorage
                    parsed.fontSize = fontSize;
                    localStorage.setItem('dashboardSettings', JSON.stringify(parsed));
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // For server settings, we need to fetch current settings, update fontSize, and save back
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const currentSettings = await response.json();
                    currentSettings.fontSize = fontSize;
                    
                    // Save updated settings to server
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentSettings)
                    });
                }
            } catch (error) {
                console.error('Error saving font size to server:', error);
            }
        }
    }

    /**
     * Apply a column count
     * @param {string} columns - The number of columns to apply
     */
    async applyColumns(columns) {
        // Remove all column classes
        document.body.classList.remove('columns-1', 'columns-2', 'columns-3', 'columns-4', 'columns-5', 'columns-6');
        
        // Add the new column class
        document.body.classList.add(`columns-${columns}`);
        
        // Update the dashboard grid
        const grid = document.getElementById('dashboard-layout');
        if (grid) {
            grid.className = `dashboard-grid columns-${columns}`;
        }
        
        // Update settings
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        
        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    // Update columnsPerRow in localStorage
                    parsed.columnsPerRow = parseInt(columns);
                    localStorage.setItem('dashboardSettings', JSON.stringify(parsed));
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // For server settings, we need to fetch current settings, update columnsPerRow, and save back
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const currentSettings = await response.json();
                    currentSettings.columnsPerRow = parseInt(columns);
                    
                    // Save updated settings to server
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentSettings)
                    });
                }
            } catch (error) {
                console.error('Error saving columns to server:', error);
            }
        }
    }
}

// Export for use in other modules
window.SearchCommandsComponent = SearchCommandsComponent;
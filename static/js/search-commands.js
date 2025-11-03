// Search Commands Component JavaScript
class SearchCommandsComponent {
    constructor(language = null, currentBookmarks = [], allBookmarks = []) {
        this.language = language;
        
        // Initialize :new command handler
        this.newCommandHandler = new SearchCommandNew(language);
        
        // Initialize :remove command handler
        this.removeCommandHandler = new SearchCommandRemove(language);
        
        // Initialize :columns command handler
        this.columnsCommandHandler = new SearchCommandColumns(language);
        
        // Initialize :fontsize command handler
        this.fontSizeCommandHandler = new SearchCommandFontSize(language);
        
        // Initialize :theme command handler
        this.themeCommandHandler = new SearchCommandTheme(language);
        
        // Available commands
        this.availableCommands = {
            'theme': this.handleThemeCommand.bind(this),
            'fontsize': this.handleFontSizeCommand.bind(this),
            'columns': this.handleColumnsCommand.bind(this),
            'remove': this.handleRemoveCommand.bind(this),
            'new': this.handleNewCommand.bind(this)
        };

        // Current page bookmarks and all bookmarks
        this.currentBookmarks = currentBookmarks;
        this.allBookmarks = allBookmarks;
    }

    setLanguage(language) {
        this.language = language;
        if (this.newCommandHandler) {
            this.newCommandHandler.setLanguage(language);
        }
        if (this.removeCommandHandler) {
            this.removeCommandHandler.setLanguage(language);
        }
        if (this.columnsCommandHandler) {
            this.columnsCommandHandler.setLanguage(language);
        }
        if (this.fontSizeCommandHandler) {
            this.fontSizeCommandHandler.setLanguage(language);
        }
        if (this.themeCommandHandler) {
            this.themeCommandHandler.setLanguage(language);
        }
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
        if (this.removeCommandHandler) {
            this.removeCommandHandler.setBookmarks(currentBookmarks, allBookmarks);
        }
    }

    /**
     * Reset internal state (confirmation mode, etc.)
     */
    resetState() {
        // State is now managed by individual command handlers
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
        return this.themeCommandHandler.handle(args);
    }

    /**
     * Handle the :fontsize command
     * @param {Array} args - Arguments after 'fontsize'
     * @returns {Array} Array of font size matches
     */
    handleFontSizeCommand(args) {
        return this.fontSizeCommandHandler.handle(args);
    }

    /**
     * Handle the :columns command
     * @param {Array} args - Arguments after 'columns'
     * @returns {Array} Array of column matches
     */
    handleColumnsCommand(args) {
        return this.columnsCommandHandler.handle(args);
    }

    /**
     * Handle the :new command
     * Opens a modal to create a new bookmark
     * @param {Array} args - Arguments after 'new'
     * @returns {Array} Array with single action to open modal
     */
    handleNewCommand(args) {
        // Update context for the new command handler
        if (this.newCommandHandler && window.dashboardInstance) {
            const currentPageId = window.dashboardInstance.currentPageId || 1;
            const categories = window.dashboardInstance.categories || [];
            const pages = window.dashboardInstance.pages || [];
            this.newCommandHandler.setContext(currentPageId, categories, pages);
        }
        
        return this.newCommandHandler.handle(args);
    }

    /**
     * Handle the :remove command
     * Shows bookmarks from all pages by default, or current page if query contains '#'
     * When a bookmark is selected, shows Yes/No confirmation
     * @param {Array} args - Arguments after 'remove'
     * @returns {Array} Array of bookmark matches or confirmation options
     */
    handleRemoveCommand(args) {
        return this.removeCommandHandler.handle(args);
    }
}

// Export for use in other modules
window.SearchCommandsComponent = SearchCommandsComponent;
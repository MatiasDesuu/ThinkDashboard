// Search Commands Component JavaScript
class SearchCommandsComponent {
    constructor() {
        // Available commands
        this.availableCommands = {
            'theme': this.handleThemeCommand.bind(this)
        };

        // Available themes - will be loaded dynamically
        this.themes = [];
        this.customThemes = {};
        
        // Load themes on initialization
        this.loadThemes();
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
     * Get the display name for a theme ID
     * @param {string} themeId - The theme ID
     * @returns {string} The display name
     */
    getThemeDisplayName(themeId) {
        if (themeId === 'light') return 'Light';
        if (themeId === 'dark') return 'Dark';
        
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
            window.ThemeLoader.applyTheme(theme, showBackgroundDots);
        } else {
            console.warn('ThemeLoader not available');
        }
    }
}

// Export for use in other modules
window.SearchCommandsComponent = SearchCommandsComponent;
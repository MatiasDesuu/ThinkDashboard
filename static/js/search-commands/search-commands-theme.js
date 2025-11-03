/**
 * Search Command: :theme
 * Changes the theme in the dashboard
 */

class SearchCommandTheme {
    constructor(language = null) {
        this.language = language;
        this.themes = [];
        this.customThemes = {};

        // Load themes on initialization
        this.loadThemes();
    }

    setLanguage(language) {
        this.language = language;
    }

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

    handle(args) {
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
}

// Export for use in other modules
window.SearchCommandTheme = SearchCommandTheme;
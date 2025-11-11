/**
 * Search Finders Component
 * Handles finder search queries starting with ?
 */

class SearchFindersComponent {
    constructor(language = null, finders = [], settings = {}) {
        this.language = language;
        this.finders = finders;
        this.settings = settings;
        this.shortcuts = new Map();
        this.buildShortcutsMap();
    }

    setLanguage(language) {
        this.language = language;
    }

    setFinders(finders) {
        this.finders = finders;
        this.buildShortcutsMap();
    }

    setSettings(settings) {
        this.settings = settings;
    }

    buildShortcutsMap() {
        this.shortcuts.clear();
        this.finders.forEach(finder => {
            if (finder.shortcut && finder.shortcut.trim()) {
                this.shortcuts.set(finder.shortcut.toLowerCase(), finder);
            }
        });
    }

    /**
     * Handle a finder query
     * @param {string} query - The full query starting with ?
     * @returns {Array} Array of match objects
     */
    handleQuery(query) {
        if (!query.startsWith('?')) {
            return [];
        }

        const afterQuestion = query.slice(1);
        const parts = afterQuestion.split(' ');
        const shortcut = parts[0].toLowerCase();

        // If just "?", show available finders
        if (query === '?') {
            return this.getAvailableFinders();
        }

        // If there's a space, it's a complete shortcut with search text
        if (parts.length > 1) {
            const finder = this.shortcuts.get(shortcut);
            if (finder) {
                const searchText = parts.slice(1).join(' ');
                return [{
                    name: finder.name,
                    shortcut: `?${finder.shortcut}`,
                    searchText: searchText,
                    url: finder.searchUrl.replace('%s', encodeURIComponent(searchText)),
                    action: () => this.openFinder(finder, searchText),
                    type: 'finder'
                }];
            }
        }

        // Otherwise, show finders whose shortcuts start with the typed letters
        const matchingFinders = this.finders.filter(finder => 
            finder.shortcut.toLowerCase().startsWith(shortcut)
        );

        if (matchingFinders.length > 0) {
            return matchingFinders.map(finder => ({
                name: finder.name,
                shortcut: `?${finder.shortcut.toUpperCase()}`,
                completion: `?${finder.shortcut.toUpperCase()} `,
                type: 'finder-completion'
            }));
        }

        return [];
    }

    /**
     * Get list of available finders
     * @returns {Array} Array of finder matches
     */
    getAvailableFinders() {
        return Array.from(this.shortcuts.values()).map(finder => ({
            name: finder.name,
            shortcut: `?${finder.shortcut.toUpperCase()}`,
            completion: `?${finder.shortcut.toUpperCase()} `,
            type: 'finder-completion'
        }));
    }

    /**
     * Open a finder with the given search text
     * @param {Object} finder
     * @param {string} searchText
     */
    openFinder(finder, searchText) {
        let url = finder.searchUrl;
        
        // Convert search text to lowercase before encoding
        const processedText = searchText.toLowerCase();
        
        if (url.includes('%s')) {
            // Replace %s placeholder with encoded search text
            url = url.replace('%s', encodeURIComponent(processedText));
        } else {
            // If no %s placeholder, append the search text to the URL
            url += encodeURIComponent(processedText);
        }
        
        // Open in new tab if setting is enabled, otherwise same tab
        if (this.settings.openInNewTab) {
            window.open(url, '_blank');
        } else {
            window.location.href = url;
        }
    }
}

// Export for use in other modules
window.SearchFindersComponent = SearchFindersComponent;
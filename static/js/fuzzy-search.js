// Fuzzy Search Component JavaScript
class FuzzySearchComponent {
    constructor(bookmarks, openBookmarkCallback) {
        this.bookmarks = bookmarks;
        this.openBookmarkCallback = openBookmarkCallback;
    }

    updateBookmarks(bookmarks) {
        this.bookmarks = bookmarks;
    }

    /**
     * Prefix match: checks if text starts with query (case-insensitive)
     * @param {string} query - The search query
     * @param {string} text - The text to search in
     * @returns {boolean} True if text starts with query
     */
    fuzzyMatch(query, text) {
        query = query.toLowerCase();
        text = text.toLowerCase();
        return text.startsWith(query);
    }

    /**
     * Handle fuzzy search query
     * @param {string} query - The search query (without the '>' prefix)
     * @returns {Array} Array of match objects with name and action
     */
    handleFuzzy(query) {
        if (!query.trim()) {
            // No matches if no query - wait for user input
            return [];
        }

        const matches = this.bookmarks.filter(bookmark => this.fuzzyMatch(query, bookmark.name));
        return matches.map(bookmark => ({
            name: bookmark.name,
            shortcut: '',
            action: () => this.openBookmarkCallback(bookmark),
            type: 'fuzzy'
        }));
    }
}

// Export for use in other modules
window.FuzzySearchComponent = FuzzySearchComponent;
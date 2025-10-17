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
     * Handle fuzzy search query
     * @param {string} query - The search query (without the '/' prefix)
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

    /**
     * Highlights the matching substring in fuzzy search results
     * @param {string} name - The bookmark name
     * @param {string} query - The fuzzy search query (without '/')
     * @returns {string} HTML string with highlighted matching substring
     */
    highlightFuzzyMatch(name, query) {
        if (!query) return name;
        const lowerName = name.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerName.indexOf(lowerQuery);
        if (index === -1) return name;
        const before = name.substring(0, index);
        const highlighted = name.substring(index, index + query.length);
        const after = name.substring(index + query.length);
        return `${before}<span class="fuzzy-highlight">${highlighted}</span>${after}`;
    }
}

// Export for use in other modules
window.FuzzySearchComponent = FuzzySearchComponent;
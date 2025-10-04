/**
 * Data Module
 * Handles loading and saving of bookmarks, categories, and settings
 */

class ConfigData {
    constructor(storage) {
        this.storage = storage;
    }

    /**
     * Load all data from API
     * @param {boolean} deviceSpecific - Whether to use device-specific settings
     * @returns {Promise<Object>} - Object containing bookmarks, categories, pages, and settings
     */
    async loadData(deviceSpecific) {
        try {
            const [bookmarksRes, categoriesRes, pagesRes, settingsRes] = await Promise.all([
                fetch('/api/bookmarks'),
                fetch('/api/categories'),
                fetch('/api/pages'),
                fetch('/api/settings')
            ]);

            const bookmarks = await bookmarksRes.json();
            const categories = await categoriesRes.json();
            const pages = await pagesRes.json();
            
            // Load settings from localStorage or server based on device-specific flag
            let settings;
            if (deviceSpecific) {
                settings = this.storage.getDeviceSettings() || await settingsRes.json();
            } else {
                settings = await settingsRes.json();
            }

            return { bookmarks, categories, pages, settings };
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Save bookmarks to server
     * @param {Array} bookmarks
     * @param {string} pageId - Optional page ID for page-specific bookmarks
     */
    async saveBookmarks(bookmarks, pageId = null) {
        const url = pageId ? `/api/bookmarks?page=${pageId}` : '/api/bookmarks';
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookmarks)
        });
    }

    /**
     * Load bookmarks for a specific page
     * @param {string} pageId
     * @returns {Promise<Array>}
     */
    async loadBookmarksByPage(pageId) {
        const res = await fetch(`/api/bookmarks?page=${pageId}`);
        return await res.json();
    }

    /**
     * Save categories to server
     * @param {Array} categories
     */
    async saveCategories(categories) {
        await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categories)
        });
    }

    /**
     * Save pages to server
     * @param {Array} pages
     */
    async savePages(pages) {
        await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pages)
        });
    }

    /**
     * Delete a page from server
     * @param {number} pageId
     */
    async deletePage(pageId) {
        const response = await fetch(`/api/pages/${pageId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete page ${pageId}`);
        }
    }

    /**
     * Save settings to server
     * @param {Object} settings
     */
    async saveSettings(settings) {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
    }

    /**
     * Save all configuration
     * @param {Object} data - Contains bookmarks, categories, pages, settings, currentPageId, deviceSpecific flag
     */
    async saveAll(data) {
        const { bookmarks, categories, pages, settings, currentPageId, deviceSpecific } = data;
        
        const savePromises = [
            this.saveBookmarks(bookmarks, currentPageId),
            this.saveCategories(categories),
            this.savePages(pages)
        ];

        // Save settings based on device-specific flag
        if (deviceSpecific) {
            // Save settings to localStorage
            this.storage.saveDeviceSettings(settings);
        } else {
            // Save settings to server
            savePromises.push(this.saveSettings(settings));
        }

        await Promise.all(savePromises);
    }

    /**
     * Load server settings (for switching from device-specific to global)
     * @returns {Promise<Object>}
     */
    async loadServerSettings() {
        const settingsRes = await fetch('/api/settings');
        return await settingsRes.json();
    }
}

// Export for use in other modules
window.ConfigData = ConfigData;

// Status Monitoring JavaScript
class StatusMonitor {
    constructor(settings = {}) {
        this.settings = settings;
        this.statusCache = new Map(); // Cache for status results
        this.checkInterval = null;
        this.isChecking = false;
    }

    updateSettings(settings) {
        this.settings = settings;
        if (!this.settings.showStatus) {
            this.clearAllStatuses();
            this.stopPeriodicChecks();
        } else {
            this.startPeriodicChecks();
        }
    }

    async checkBookmarkStatus(bookmark) {
        if (!this.settings.showStatus || !bookmark.checkStatus) {
            return null;
        }

        const bookmarkElement = document.querySelector(`[data-bookmark-url="${bookmark.url}"]`);
        if (!bookmarkElement) {
            return null;
        }

        // Set checking state - no text, just yellow color
        this.setBookmarkStatus(bookmarkElement, 'checking', '');

        const startTime = performance.now();
        
        try {
            // Use a timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${bookmark.url}?t=${new Date().getTime()}`, {
                method: 'HEAD', // Use HEAD request for faster response
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Cache the result
            this.statusCache.set(bookmark.url, {
                status: 'online',
                ping: responseTime,
                timestamp: Date.now()
            });

            // Update UI
            const pingText = this.settings.showPing ? `${responseTime}ms` : '';
            this.setBookmarkStatus(bookmarkElement, 'online', pingText);

            return { status: 'online', ping: responseTime };

        } catch (error) {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Try with regular GET request if HEAD failed
            try {
                const controller2 = new AbortController();
                const timeoutId2 = setTimeout(() => controller2.abort(), 10000);

                await fetch(`${bookmark.url}?t=${new Date().getTime()}`, {
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: controller2.signal
                });

                clearTimeout(timeoutId2);
                const endTime2 = performance.now();
                const responseTime2 = Math.round(endTime2 - startTime);

                // Cache the result
                this.statusCache.set(bookmark.url, {
                    status: 'online',
                    ping: responseTime2,
                    timestamp: Date.now()
                });

                const pingText = this.settings.showPing ? `${responseTime2}ms` : '';
                this.setBookmarkStatus(bookmarkElement, 'online', pingText);

                return { status: 'online', ping: responseTime2 };

            } catch (finalError) {
                // Cache the result
                this.statusCache.set(bookmark.url, {
                    status: 'offline',
                    ping: null,
                    timestamp: Date.now()
                });

                this.setBookmarkStatus(bookmarkElement, 'offline', '');
                return { status: 'offline', ping: null };
            }
        }
    }

    setBookmarkStatus(bookmarkElement, status, text = '') {
        // Remove existing status classes
        bookmarkElement.classList.remove('status-online', 'status-offline', 'status-checking');
        
        // Add new status class
        bookmarkElement.classList.add(`status-${status}`);

        // Update or create status text element
        let statusElement = bookmarkElement.querySelector('.status-text');
        
        // Get shortcut element to insert status text before it
        const shortcutElement = bookmarkElement.querySelector('.bookmark-shortcut');
        
        if (!statusElement && text && this.settings.showPing) {
            statusElement = document.createElement('span');
            statusElement.className = 'status-text';
            // Insert before shortcut if it exists, otherwise append
            if (shortcutElement) {
                bookmarkElement.insertBefore(statusElement, shortcutElement);
            } else {
                bookmarkElement.appendChild(statusElement);
            }
        }

        if (statusElement) {
            if (text && this.settings.showPing) {
                statusElement.textContent = text;
                statusElement.style.display = 'inline';
            } else {
                statusElement.style.display = 'none';
            }
        }

        // Status indicator dot removed - no longer used
    }

    async checkAllBookmarks(bookmarks) {
        if (!this.settings.showStatus || this.isChecking) {
            return;
        }

        this.isChecking = true;

        // Filter bookmarks that should be checked
        const bookmarksToCheck = bookmarks.filter(bookmark => bookmark.checkStatus);

        // Check bookmarks in batches to avoid overwhelming the network
        const batchSize = 5;
        for (let i = 0; i < bookmarksToCheck.length; i += batchSize) {
            const batch = bookmarksToCheck.slice(i, i + batchSize);
            const promises = batch.map(bookmark => this.checkBookmarkStatus(bookmark));
            
            try {
                await Promise.allSettled(promises);
            } catch (error) {
                console.error('Error checking bookmark batch:', error);
            }

            // Small delay between batches
            if (i + batchSize < bookmarksToCheck.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.isChecking = false;
    }

    clearAllStatuses() {
        // Remove status classes and elements from all bookmarks
        const bookmarkElements = document.querySelectorAll('[data-bookmark-id]');
        bookmarkElements.forEach(element => {
            element.classList.remove('status-online', 'status-offline', 'status-checking');
            
            const statusText = element.querySelector('.status-text');
            if (statusText) {
                statusText.remove();
            }

            const indicator = element.querySelector('.status-indicator');
            if (indicator) {
                indicator.remove();
            }
        });

        this.statusCache.clear();
    }

    startPeriodicChecks(intervalMinutes = 5) {
        this.stopPeriodicChecks();
        
        if (this.settings.showStatus) {
            this.checkInterval = setInterval(() => {
                // Get current bookmarks from the dashboard
                if (window.dashboardInstance && window.dashboardInstance.bookmarks) {
                    this.checkAllBookmarks(window.dashboardInstance.bookmarks);
                }
            }, intervalMinutes * 60 * 1000);
        }
    }

    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    refreshBookmarkStatus(bookmarkId) {
        if (window.dashboardInstance && window.dashboardInstance.bookmarks) {
            const bookmark = window.dashboardInstance.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) {
                this.checkBookmarkStatus(bookmark);
            }
        }
    }

    refreshAllStatuses() {
        if (window.dashboardInstance && window.dashboardInstance.bookmarks) {
            this.checkAllBookmarks(window.dashboardInstance.bookmarks);
        }
    }

    getCachedStatus(bookmarkId) {
        return this.statusCache.get(bookmarkId);
    }

    clearCache() {
        this.statusCache.clear();
    }

    // Method to get status statistics
    getStatusStats(bookmarks) {
        const stats = {
            total: 0,
            checked: 0,
            online: 0,
            offline: 0,
            checking: 0
        };

        if (!bookmarks) return stats;

        bookmarks.forEach(bookmark => {
            stats.total++;
            if (bookmark.checkStatus) {
                stats.checked++;
                const cached = this.statusCache.get(bookmark.url);
                if (cached) {
                    if (cached.status === 'online') {
                        stats.online++;
                    } else if (cached.status === 'offline') {
                        stats.offline++;
                    }
                } else {
                    stats.checking++;
                }
            }
        });

        return stats;
    }

    // Initialize status monitoring
    init(bookmarks) {
        if (!this.settings.showStatus) {
            return;
        }

        // Initial check
        this.checkAllBookmarks(bookmarks);

        // Start periodic checks
        this.startPeriodicChecks();
    }

    // Cleanup method
    destroy() {
        this.stopPeriodicChecks();
        this.clearAllStatuses();
        this.clearCache();
    }
}

// Export for use in other modules
window.StatusMonitor = StatusMonitor;
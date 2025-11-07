// Status Monitoring JavaScript
class StatusMonitor {
    constructor(settings = {}) {
        this.settings = settings;
        this.statusCache = new Map(); // Cache for status results
        this.checkInterval = null;
        this.isChecking = false;
        this.loadingIndicator = document.getElementById('status-loading-indicator');
    }

    updateSettings(settings) {
        const wasStatusEnabled = this.settings.showStatus;
        this.settings = settings;
        if (!this.settings.showStatus) {
            this.clearAllStatuses();
            this.stopPeriodicChecks();
            this.hideLoadingIndicator();
        } else if (!wasStatusEnabled) {
            // Status was just enabled, start periodic checks
            this.startPeriodicChecks();
        }
        
        // Hide loading indicator if the option is disabled
        if (!this.settings.showStatusLoading) {
            this.hideLoadingIndicator();
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

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout (reduced from 8s)

            // Use the server-side ping API which can handle HTTPS certificates
            const response = await fetch(`/api/ping?url=${encodeURIComponent(bookmark.url)}${this.settings.skipFastPing ? "&skipFastPing=1" : ""}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            // Cache the result
            this.statusCache.set(bookmark.url, {
                status: result.status,
                ping: result.ping,
                timestamp: Date.now()
            });

            // Update UI
            const pingText = this.settings.showPing && result.ping ? `${result.ping}ms` : '';
            this.setBookmarkStatus(bookmarkElement, result.status, pingText);

            return { status: result.status, ping: result.ping };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Ping timeout for', bookmark.url);
            } else {
                console.error('Ping error for', bookmark.url, ':', error);
            }

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
        this.showLoadingIndicator();

        // Filter bookmarks that should be checked
        const bookmarksToCheck = bookmarks.filter(bookmark => bookmark.checkStatus);

        // Check ALL bookmarks in parallel for instant loading
        const promises = bookmarksToCheck.map(bookmark => this.checkBookmarkStatus(bookmark));
        
        try {
            // All requests fire at once, results come back as they complete
            await Promise.allSettled(promises);
        } catch (error) {
            console.error('Error checking bookmarks:', error);
        }

        this.isChecking = false;
        this.hideLoadingIndicator();
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

    // Show loading indicator
    showLoadingIndicator() {
        if (this.settings.showStatusLoading && this.loadingIndicator) {
            this.loadingIndicator.classList.add('show');
        }
    }

    // Hide loading indicator
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
        }
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

    // Update bookmarks without clearing cache - only check new/uncached bookmarks
    updateBookmarks(bookmarks) {
        if (!this.settings.showStatus) {
            return;
        }

        // First, apply cached status to existing bookmarks
        this.applyCachedStatuses(bookmarks);

        // Then check only bookmarks that don't have cached status
        const uncachedBookmarks = bookmarks.filter(bookmark => 
            bookmark.checkStatus && !this.statusCache.has(bookmark.url)
        );

        if (uncachedBookmarks.length > 0) {
            // Check uncached bookmarks in the background
            this.checkUncachedBookmarks(uncachedBookmarks);
        }
    }

    // Apply cached statuses to bookmarks that already have them
    applyCachedStatuses(bookmarks) {
        bookmarks.forEach(bookmark => {
            if (bookmark.checkStatus) {
                const cached = this.statusCache.get(bookmark.url);
                if (cached) {
                    const bookmarkElement = document.querySelector(`[data-bookmark-url="${bookmark.url}"]`);
                    if (bookmarkElement) {
                        const pingText = this.settings.showPing && cached.ping ? `${cached.ping}ms` : '';
                        this.setBookmarkStatus(bookmarkElement, cached.status, pingText);
                    }
                }
            }
        });
    }

    // Check only bookmarks that don't have cached status
    async checkUncachedBookmarks(bookmarks) {
        if (this.isChecking) {
            return;
        }

        this.isChecking = true;
        this.showLoadingIndicator();

        // Check ALL uncached bookmarks in parallel for instant loading
        const promises = bookmarks.map(bookmark => this.checkBookmarkStatus(bookmark));
        
        try {
            // All requests fire at once, results come back as they complete
            await Promise.allSettled(promises);
        } catch (error) {
            console.error('Error checking bookmarks:', error);
        }

        this.isChecking = false;
        this.hideLoadingIndicator();
    }

    // Cleanup method
    destroy() {
        this.stopPeriodicChecks();
        this.clearAllStatuses();
        this.clearCache();
        this.hideLoadingIndicator();
    }
}

// Export for use in other modules
window.StatusMonitor = StatusMonitor;
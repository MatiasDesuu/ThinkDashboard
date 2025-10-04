/**
 * HyprMode Module
 * Handles launcher mode functionality for PWA usage
 * When enabled, opens bookmarks in a new tab and closes the dashboard window
 */

class HyprMode {
    constructor() {
        this.enabled = false;
    }

    /**
     * Initialize HyprMode with settings
     * @param {boolean} enabled - Whether HyprMode is enabled
     */
    init(enabled) {
        this.enabled = enabled;
    }

    /**
     * Set HyprMode state
     * @param {boolean} enabled - Whether HyprMode is enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Check if HyprMode is enabled
     * @returns {boolean} - Current HyprMode state
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Handle bookmark click with HyprMode behavior
     * Opens the URL in a new tab and closes the current window
     * @param {string} url - The bookmark URL to open
     */
    handleBookmarkClick(url) {
        if (!this.enabled) {
            return false; // Let normal behavior handle it
        }

        // Open the URL in a new tab
        window.open(url, '_blank', 'noopener,noreferrer');
        
        // Try multiple strategies to close the window
        setTimeout(() => {
            this.closeWindow();
        }, 150);

        return true; // Indicate that HyprMode handled the click
    }

    /**
     * Attempts to close the window using multiple strategies
     */
    closeWindow() {
        // Strategy 1: Standard window.close() - works for popups and some PWAs
        window.close();
        
        // Strategy 2: If running as PWA with display mode standalone
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // Try closing via window.close()
            window.close();
            
            // If still open, try alternative methods
            setTimeout(() => {
                if (!window.closed) {
                    // For Chromium-based PWAs
                    if (window.chrome && window.chrome.app && window.chrome.app.window) {
                        window.chrome.app.window.current().close();
                    }
                }
            }, 50);
        }
        
        // Strategy 3: Try to use the window.opener property trick
        window.open('', '_self', '');
        window.close();
        
        // Strategy 4: For browsers that support it, try closing via about:blank
        setTimeout(() => {
            if (!window.closed) {
                window.location.href = 'about:blank';
                setTimeout(() => {
                    window.close();
                }, 10);
            }
        }, 100);
        
        // Strategy 5: Last resort - redirect to a minimal close page
        setTimeout(() => {
            if (!window.closed) {
                console.log('HyprMode: Using alternative close method...');
                // Create a minimal HTML page that tries to close itself
                document.open();
                document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Closing...</title>
                        <style>
                            body {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: #1a1a1a;
                                color: #fff;
                                font-family: monospace;
                            }
                        </style>
                    </head>
                    <body>
                        <div>You can close this window now</div>
                        <script>
                            // Try to close immediately
                            window.close();
                            // If still open after 500ms, show message
                            setTimeout(function() {
                                if (!window.closed) {
                                    document.body.innerHTML = '<div style="text-align: center;"><h2>Please close this window</h2><p>(Ctrl+W or Cmd+W)</p></div>';
                                }
                            }, 500);
                        </script>
                    </body>
                    </html>
                `);
                document.close();
            }
        }, 200);
    }

    /**
     * Add HyprMode click handler to a bookmark element
     * @param {HTMLElement} element - The bookmark link element
     * @param {string} url - The bookmark URL
     */
    attachToBookmark(element, url) {
        if (!this.enabled) {
            return;
        }

        element.addEventListener('click', (e) => {
            if (this.enabled) {
                e.preventDefault();
                this.handleBookmarkClick(url);
            }
        });
    }
}

// Create a global instance
window.hyprMode = new HyprMode();

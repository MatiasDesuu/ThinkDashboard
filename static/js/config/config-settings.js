/**
 * Settings Module
 * Handles settings UI and configuration
 */

class ConfigSettings {
    constructor() {}

    /**
     * Setup event listeners for all settings controls
     * @param {Object} settings - Reference to settings object
     * @param {Function} callbacks - Object with callback functions
     */
    setupListeners(settings, callbacks) {
        // Theme select
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = settings.theme;
            themeSelect.addEventListener('change', (e) => {
                settings.theme = e.target.value;
                if (callbacks.onThemeChange) callbacks.onThemeChange(settings.theme);
            });
        }

        // Columns input
        const columnsInput = document.getElementById('columns-input');
        if (columnsInput) {
            columnsInput.value = settings.columnsPerRow;
            columnsInput.addEventListener('input', (e) => {
                settings.columnsPerRow = parseInt(e.target.value);
            });
        }

        // Font size select
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect) {
            fontSizeSelect.value = settings.fontSize;
            fontSizeSelect.addEventListener('change', (e) => {
                settings.fontSize = e.target.value;
                if (callbacks.onFontSizeChange) callbacks.onFontSizeChange(settings.fontSize);
            });
        }

        // New tab checkbox
        const newTabCheckbox = document.getElementById('new-tab-checkbox');
        if (newTabCheckbox) {
            newTabCheckbox.checked = settings.openInNewTab;
            newTabCheckbox.addEventListener('change', (e) => {
                settings.openInNewTab = e.target.checked;
            });
        }

        // HyprMode checkbox
        const hyprModeCheckbox = document.getElementById('hypr-mode-checkbox');
        if (hyprModeCheckbox) {
            hyprModeCheckbox.checked = settings.hyprMode || false;
            hyprModeCheckbox.addEventListener('change', (e) => {
                settings.hyprMode = e.target.checked;
                // Disable preview if callback is provided
                if (callbacks.onHyprModeChange) callbacks.onHyprModeChange(settings.hyprMode);
            });
        }

        // Show background dots checkbox
        const showBackgroundDotsCheckbox = document.getElementById('show-background-dots-checkbox');
        if (showBackgroundDotsCheckbox) {
            showBackgroundDotsCheckbox.checked = settings.showBackgroundDots !== false;
            showBackgroundDotsCheckbox.addEventListener('change', (e) => {
                settings.showBackgroundDots = e.target.checked;
                if (callbacks.onBackgroundDotsChange) callbacks.onBackgroundDotsChange(e.target.checked);
            });
        }

        // Show title checkbox
        const showTitleCheckbox = document.getElementById('show-title-checkbox');
        if (showTitleCheckbox) {
            showTitleCheckbox.checked = settings.showTitle;
            showTitleCheckbox.addEventListener('change', (e) => {
                settings.showTitle = e.target.checked;
            });
        }

        // Show date checkbox
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        if (showDateCheckbox) {
            showDateCheckbox.checked = settings.showDate;
            showDateCheckbox.addEventListener('change', (e) => {
                settings.showDate = e.target.checked;
            });
        }

        // Show config button checkbox
        const showConfigButtonCheckbox = document.getElementById('show-config-button-checkbox');
        if (showConfigButtonCheckbox) {
            showConfigButtonCheckbox.checked = settings.showConfigButton;
            showConfigButtonCheckbox.addEventListener('change', (e) => {
                settings.showConfigButton = e.target.checked;
            });
        }

        // Show search button checkbox
        const showSearchButtonCheckbox = document.getElementById('show-search-button-checkbox');
        if (showSearchButtonCheckbox) {
            showSearchButtonCheckbox.checked = settings.showSearchButton;
            showSearchButtonCheckbox.addEventListener('change', (e) => {
                settings.showSearchButton = e.target.checked;
            });
        }

        // Show status checkbox
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        if (showStatusCheckbox) {
            showStatusCheckbox.checked = settings.showStatus;
            showStatusCheckbox.addEventListener('change', (e) => {
                settings.showStatus = e.target.checked;
                if (callbacks.onStatusVisibilityChange) callbacks.onStatusVisibilityChange();
            });
        }

        // Show ping checkbox
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        if (showPingCheckbox) {
            showPingCheckbox.checked = settings.showPing;
            showPingCheckbox.addEventListener('change', (e) => {
                settings.showPing = e.target.checked;
            });
        }

        // Global shortcuts checkbox
        const globalShortcutsCheckbox = document.getElementById('global-shortcuts-checkbox');
        if (globalShortcutsCheckbox) {
            globalShortcutsCheckbox.checked = settings.globalShortcuts || false;
            globalShortcutsCheckbox.addEventListener('change', (e) => {
                settings.globalShortcuts = e.target.checked;
            });
        }
    }

    /**
     * Update settings from UI elements
     * @param {Object} settings - Reference to settings object
     */
    updateFromUI(settings) {
        const themeSelect = document.getElementById('theme-select');
        const columnsInput = document.getElementById('columns-input'); 
        const newTabCheckbox = document.getElementById('new-tab-checkbox');
        const showTitleCheckbox = document.getElementById('show-title-checkbox');
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        const showConfigButtonCheckbox = document.getElementById('show-config-button-checkbox');
        const showSearchButtonCheckbox = document.getElementById('show-search-button-checkbox');
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        const globalShortcutsCheckbox = document.getElementById('global-shortcuts-checkbox');

        if (themeSelect) settings.theme = themeSelect.value;
        if (columnsInput) settings.columnsPerRow = parseInt(columnsInput.value);
        if (newTabCheckbox) settings.openInNewTab = newTabCheckbox.checked;
        if (showTitleCheckbox) settings.showTitle = showTitleCheckbox.checked;
        if (showDateCheckbox) settings.showDate = showDateCheckbox.checked;
        if (showConfigButtonCheckbox) settings.showConfigButton = showConfigButtonCheckbox.checked;
        if (showSearchButtonCheckbox) settings.showSearchButton = showSearchButtonCheckbox.checked;
        if (showStatusCheckbox) settings.showStatus = showStatusCheckbox.checked;
        if (showPingCheckbox) settings.showPing = showPingCheckbox.checked;
        if (globalShortcutsCheckbox) settings.globalShortcuts = globalShortcutsCheckbox.checked;
    }

    /**
     * Apply theme to page
     * @param {string} theme
     */
    applyTheme(theme) {
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(theme);
        document.body.setAttribute('data-theme', theme);
        
        if (window.ThemeLoader) {
            const showBackgroundDots = document.getElementById('show-background-dots-checkbox')?.checked !== false;
            window.ThemeLoader.applyTheme(theme, showBackgroundDots);
        }
    }

    /**
     * Apply font size to page
     * @param {string} fontSize
     */
    applyFontSize(fontSize) {
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add(`font-${fontSize}`);
    }

    /**
     * Apply background dots setting
     * @param {boolean} showBackgroundDots
     */
    applyBackgroundDots(showBackgroundDots) {
        // Use ThemeLoader to apply background dots consistently
        if (window.ThemeLoader) {
            const theme = document.body.getAttribute('data-theme') || 'dark';
            window.ThemeLoader.applyTheme(theme, showBackgroundDots);
        }
        
        // Also set the data attribute for consistency
        if (showBackgroundDots !== false) {
            document.body.setAttribute('data-show-background-dots', 'true');
        } else {
            document.body.setAttribute('data-show-background-dots', 'false');
        }
    }

    /**
     * Update status options visibility
     * @param {boolean} showStatus
     */
    updateStatusOptionsVisibility(showStatus) {
        const statusNested = document.querySelector('.status-settings-nested');
        
        if (statusNested) {
            if (showStatus) {
                statusNested.style.display = 'block';
            } else {
                statusNested.style.display = 'none';
                // Also uncheck ping when status is disabled
                const showPingCheckbox = document.getElementById('show-ping-checkbox');
                if (showPingCheckbox) {
                    showPingCheckbox.checked = false;
                }
            }
        }
    }

    /**
     * Reset settings to defaults
     * @returns {Object} - Default settings
     */
    getDefaults() {
        return {
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            fontSize: 'medium',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showConfigButton: true,
            showSearchButton: true,
            showStatus: false,
            showPing: false,
            globalShortcuts: false
        };
    }
}

// Export for use in other modules
window.ConfigSettings = ConfigSettings;

/**
 * Settings Module
 * Handles settings UI and configuration
 */

class ConfigSettings {
    constructor() {
        this.customThemes = {}; // Store available custom themes (id -> name)
    }

    /**
     * Load available custom themes from API
     */
    async loadCustomThemes() {
        try {
            const response = await fetch('/api/colors/custom-themes');
            if (response.ok) {
                this.customThemes = await response.json();
                // Expose a normalized list of custom theme ids for other modules
                window.CustomThemeIds = Array.isArray(this.customThemes)
                    ? this.customThemes
                    : Object.keys(this.customThemes || {});
                this.populateThemeSelect();
            }
        } catch (error) {
            console.error('Error loading custom themes:', error);
        }
    }

    populateThemeSelect() {
        const themeSelect = document.getElementById('theme-select');
        if (!themeSelect) return;

        const currentValue = themeSelect.value;

        themeSelect.innerHTML = '';

        const darkOption = document.createElement('option');
        darkOption.value = 'dark';
        darkOption.textContent = 'Dark';
        themeSelect.appendChild(darkOption);

        const lightOption = document.createElement('option');
        lightOption.value = 'light';
        lightOption.textContent = 'Light';
        themeSelect.appendChild(lightOption);

        if (this.customThemes && typeof this.customThemes === 'object') {
            Object.keys(this.customThemes).forEach(themeId => {
                const option = document.createElement('option');
                option.value = themeId;
                option.textContent = this.customThemes[themeId] || 'Unnamed Theme';
                themeSelect.appendChild(option);
            });
        }

        if (currentValue) {
            themeSelect.value = currentValue;
        }
    }

    /**
     * Setup event listeners for all settings controls
     * @param {Object} settings - Reference to settings object
     * @param {Function} callbacks - Object with callback functions
     */
    async setupListeners(settings, callbacks) {
        // Load custom themes first
        await this.loadCustomThemes();
        
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

        // Font size selector buttons
        const fontSizeOptions = document.querySelectorAll('.font-size-option');

        if (fontSizeOptions.length > 0) {
            // Normalize legacy alias values (if any) to current map
            const aliasMap = {
                small: 'sm',
                medium: 'm',
                large: 'l'
            };

            let fontSizeValue = settings.fontSize;
            if (fontSizeValue && aliasMap[fontSizeValue]) {
                fontSizeValue = aliasMap[fontSizeValue];
            }

            // Set initial active button
            const initialSize = fontSizeValue || 'm';
            fontSizeOptions.forEach(btn => {
                if (btn.dataset.size === initialSize) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Ensure the current font size is applied immediately
            settings.fontSize = initialSize;
            if (callbacks.onFontSizeChange) callbacks.onFontSizeChange(settings.fontSize);

            // Listen for changes
            fontSizeOptions.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fontSize = e.target.dataset.size;
                    settings.fontSize = fontSize;

                    // Update active state
                    fontSizeOptions.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    if (callbacks.onFontSizeChange) callbacks.onFontSizeChange(settings.fontSize);
                });
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

        // HyprMode info button
        const hyprModeInfoBtn = document.getElementById('hypr-mode-info-btn');
        if (hyprModeInfoBtn) {
            hyprModeInfoBtn.addEventListener('click', () => {
                if (window.AppModal) {
                    window.AppModal.alert({
                        title: 'HyprMode Information',
                        message: 'HyprMode is designed for when ThinkDashboard is installed as a Progressive Web App (PWA). When enabled, clicking on bookmarks will open them in a new browser tab and then automatically close the PWA window, mimicking the behavior of a traditional app launcher.',
                        confirmText: 'Got it'
                    });
                }
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

        // Enable custom title checkbox
        const enableCustomTitleCheckbox = document.getElementById('enable-custom-title-checkbox');
        if (enableCustomTitleCheckbox) {
            enableCustomTitleCheckbox.checked = settings.enableCustomTitle;
            enableCustomTitleCheckbox.addEventListener('change', (e) => {
                settings.enableCustomTitle = e.target.checked;
                this.toggleCustomTitleInput(e.target.checked);
            });
        }

        // Custom title input
        const customTitleInput = document.getElementById('custom-title-input');
        if (customTitleInput) {
            customTitleInput.value = settings.customTitle || '';
            customTitleInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                settings.customTitle = value;
                
                // Auto-enable checkbox when user starts typing (only if not already enabled)
                if (value && !settings.enableCustomTitle) {
                    settings.enableCustomTitle = true;
                    const checkbox = document.getElementById('enable-custom-title-checkbox');
                    if (checkbox) checkbox.checked = true;
                    this.toggleCustomTitleInput(true);
                }
            });
            // Initial visibility
            this.toggleCustomTitleInput(settings.enableCustomTitle);
        }

        // Show page in title checkbox
        const showPageInTitleCheckbox = document.getElementById('show-page-in-title-checkbox');
        if (showPageInTitleCheckbox) {
            showPageInTitleCheckbox.checked = settings.showPageInTitle;
            showPageInTitleCheckbox.addEventListener('change', (e) => {
                settings.showPageInTitle = e.target.checked;
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

        // Animations enabled checkbox
        const animationsEnabledCheckbox = document.getElementById('animations-enabled-checkbox');
        if (animationsEnabledCheckbox) {
            animationsEnabledCheckbox.checked = settings.animationsEnabled !== false;
            animationsEnabledCheckbox.addEventListener('change', (e) => {
                settings.animationsEnabled = e.target.checked;
                if (callbacks.onAnimationsChange) callbacks.onAnimationsChange(e.target.checked);
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

        // Show status loading checkbox
        const showStatusLoadingCheckbox = document.getElementById('show-status-loading-checkbox');
        if (showStatusLoadingCheckbox) {
            showStatusLoadingCheckbox.checked = settings.showStatusLoading;
            showStatusLoadingCheckbox.addEventListener('change', (e) => {
                settings.showStatusLoading = e.target.checked;
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
        const hyprModeCheckbox = document.getElementById('hypr-mode-checkbox');
        const showTitleCheckbox = document.getElementById('show-title-checkbox');
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        const showConfigButtonCheckbox = document.getElementById('show-config-button-checkbox');
        const showSearchButtonCheckbox = document.getElementById('show-search-button-checkbox');
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        const showStatusLoadingCheckbox = document.getElementById('show-status-loading-checkbox');
        const globalShortcutsCheckbox = document.getElementById('global-shortcuts-checkbox');
        const animationsEnabledCheckbox = document.getElementById('animations-enabled-checkbox');
        const enableCustomTitleCheckbox = document.getElementById('enable-custom-title-checkbox');
        const customTitleInput = document.getElementById('custom-title-input');
        const showPageInTitleCheckbox = document.getElementById('show-page-in-title-checkbox');

        if (themeSelect) settings.theme = themeSelect.value;
        if (columnsInput) settings.columnsPerRow = parseInt(columnsInput.value);
        if (newTabCheckbox) settings.openInNewTab = newTabCheckbox.checked;
        if (hyprModeCheckbox) settings.hyprMode = hyprModeCheckbox.checked;
        if (showTitleCheckbox) settings.showTitle = showTitleCheckbox.checked;
        if (showDateCheckbox) settings.showDate = showDateCheckbox.checked;
        if (showConfigButtonCheckbox) settings.showConfigButton = showConfigButtonCheckbox.checked;
        if (showSearchButtonCheckbox) settings.showSearchButton = showSearchButtonCheckbox.checked;
        if (animationsEnabledCheckbox) settings.animationsEnabled = animationsEnabledCheckbox.checked;
        if (showStatusCheckbox) settings.showStatus = showStatusCheckbox.checked;
        if (showPingCheckbox) settings.showPing = showPingCheckbox.checked;
        if (showStatusLoadingCheckbox) settings.showStatusLoading = showStatusLoadingCheckbox.checked;
        if (globalShortcutsCheckbox) settings.globalShortcuts = globalShortcutsCheckbox.checked;
        if (enableCustomTitleCheckbox) settings.enableCustomTitle = enableCustomTitleCheckbox.checked;
        if (customTitleInput) settings.customTitle = customTitleInput.value;
        if (showPageInTitleCheckbox) settings.showPageInTitle = showPageInTitleCheckbox.checked;
    }

    /**
     * Apply theme to page
     * @param {string} theme
     */
    applyTheme(theme) {
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
        
        if (window.ThemeLoader) {
            const showBackgroundDots = document.getElementById('show-background-dots-checkbox')?.checked !== false;
            // Get current font size from body classes
            const currentClasses = Array.from(document.body.classList);
            const currentFontSizeClass = currentClasses.find(cls => cls.startsWith('font-size-'));
            const currentFontSize = currentFontSizeClass ? currentFontSizeClass.replace('font-size-', '') : 'm';
            window.ThemeLoader.applyTheme(theme, showBackgroundDots, currentFontSize);
        }
    }

    /**
     * Apply font size to page
     * @param {string} fontSize
     */
    applyFontSize(fontSize) {
        document.body.classList.remove('font-size-xs', 'font-size-s', 'font-size-sm', 'font-size-m', 'font-size-lg', 'font-size-l', 'font-size-xl');
        document.body.classList.add(`font-size-${fontSize}`);
    }

    /**
     * Apply background dots setting
     * @param {boolean} showBackgroundDots
     */
    applyBackgroundDots(showBackgroundDots) {
        // Use ThemeLoader to apply background dots consistently
        if (window.ThemeLoader) {
            const theme = document.body.getAttribute('data-theme') || 'dark';
            // Get current font size from body classes
            const currentClasses = Array.from(document.body.classList);
            const currentFontSizeClass = currentClasses.find(cls => cls.startsWith('font-size-'));
            const currentFontSize = currentFontSizeClass ? currentFontSizeClass.replace('font-size-', '') : 'm';
            window.ThemeLoader.applyTheme(theme, showBackgroundDots, currentFontSize);
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
     * Toggle custom title input visibility
     * @param {boolean} enabled
     */
    toggleCustomTitleInput(enabled) {
        const customTitleChild = document.getElementById('custom-title-child');
        if (customTitleChild) {
            customTitleChild.style.display = enabled ? 'block' : 'none';
        }
        const showPageChild = document.getElementById('show-page-child');
        if (showPageChild) {
            showPageChild.style.display = enabled ? 'block' : 'none';
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
            fontSize: 'm',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showConfigButton: true,
            showSearchButton: true,
            showStatus: false,
            showPing: false,
            globalShortcuts: true,
            hyprMode: false,
            animationsEnabled: true,
            enableCustomTitle: false,
            customTitle: '',
            showPageInTitle: false
        };
    }

    /**
     * Apply animations setting to page
     * @param {boolean} enabled
     */
    applyAnimations(enabled) {
        if (enabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
    }
}

// Export for use in other modules
window.ConfigSettings = ConfigSettings;

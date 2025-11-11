// Theme Loader - Prevents FOUC (Flash of Unstyled Content)
// This script must be loaded synchronously in the <head> before CSS files
(function() {
    'use strict';
    
    /**
     * Gets the current theme based on device-specific settings or server default
     * @returns {string} The theme name ('dark' or 'light')
     */
    function getTheme() {
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        let theme = 'dark'; // default
        
        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    theme = JSON.parse(settings).theme || 'dark';
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                    theme = 'dark';
                }
            }
        } else {
            // Use server-side theme from html element data attribute
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            if (htmlTheme) {
                theme = htmlTheme;
            }
        }
        
        return theme;
    }
    
    /**
     * Gets the showBackgroundDots setting
     * @returns {boolean} Whether to show background dots
     */
    function getShowBackgroundDots() {
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        let showBackgroundDots = true; // default
        
        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    showBackgroundDots = parsed.showBackgroundDots !== false;
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // Use server-side setting from html element data attribute
            const htmlAttr = document.documentElement.getAttribute('data-show-background-dots');
            if (htmlAttr !== null) {
                showBackgroundDots = htmlAttr === 'true';
            }
        }
        
        return showBackgroundDots;
    }
    
    /**
     * Gets the fontSize setting
     * @returns {string} The font size ('xs', 's', 'sm', 'm', 'lg', 'l', 'xl')
     */
    function getFontSize() {
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        let fontSize = 'm'; // default

        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    fontSize = parsed.fontSize || 'm';
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // Use server-side fontSize from html element data attribute
            const htmlAttr = document.documentElement.getAttribute('data-font-size');
            if (htmlAttr) {
                fontSize = htmlAttr;
            }
        }

        return fontSize;
    }
    
    /**
     * Gets the button text visibility settings
     * @returns {Object} Object with showSearchButtonText, showFindersButtonText, showCommandsButtonText
     */
    function getButtonTextSettings() {
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        let settings = {
            showSearchButtonText: true,
            showFindersButtonText: true,
            showCommandsButtonText: true
        };

        if (deviceSpecific) {
            const dashboardSettings = localStorage.getItem('dashboardSettings');
            if (dashboardSettings) {
                try {
                    const parsed = JSON.parse(dashboardSettings);
                    settings.showSearchButtonText = parsed.showSearchButtonText !== false;
                    settings.showFindersButtonText = parsed.showFindersButtonText !== false;
                    settings.showCommandsButtonText = parsed.showCommandsButtonText !== false;
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // Use server-side settings from html element data attributes
            const searchAttr = document.documentElement.getAttribute('data-show-search-button-text');
            const findersAttr = document.documentElement.getAttribute('data-show-finders-button-text');
            const commandsAttr = document.documentElement.getAttribute('data-show-commands-button-text');
            
            if (searchAttr !== null) settings.showSearchButtonText = searchAttr === 'true';
            if (findersAttr !== null) settings.showFindersButtonText = findersAttr === 'true';
            if (commandsAttr !== null) settings.showCommandsButtonText = commandsAttr === 'true';
        }

        return settings;
    }
    
    /**
     * Applies critical theme styles to prevent FOUC
     * @param {string} theme - The theme to apply ('dark' or 'light')
     * @param {boolean} showBackgroundDots - Whether to show background dots
     * @param {string} fontSize - The font size to apply ('xs', 's', 'sm', 'm', 'lg', 'l', 'xl')
     * @param {Object} buttonTextSettings - Button text visibility settings
     */
    function applyTheme(theme, showBackgroundDots = true, fontSize = 'm', buttonTextSettings = {}) {
        // Remove existing FOUC prevention style if present
        const existingStyle = document.head.querySelector('style[data-fouc-prevention]');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Set data-theme on html element
        document.documentElement.setAttribute('data-theme', theme);
        
        // Set button text attributes on html element immediately
        document.documentElement.setAttribute('data-show-search-button-text', buttonTextSettings.showSearchButtonText);
        document.documentElement.setAttribute('data-show-finders-button-text', buttonTextSettings.showFindersButtonText);
        document.documentElement.setAttribute('data-show-commands-button-text', buttonTextSettings.showCommandsButtonText);
        
        // Create and inject critical CSS using CSS variables
        const style = document.createElement('style');
        style.setAttribute('data-fouc-prevention', 'true');
        
        const backgroundImage = showBackgroundDots 
            ? 'background-image: radial-gradient(var(--background-dots) 1px, transparent 1px) !important; background-size: 15px 15px !important;'
            : 'background-image: none !important;';
        
        // Build responsive button flex rules based on actual settings
        let searchButtonFlex = '';
        let findersButtonFlex = '';
        let commandsButtonFlex = '';
        
        if (buttonTextSettings.showSearchButtonText) {
            searchButtonFlex = `
                body[data-show-search-button-text="true"] #search-button,
                html[data-show-search-button-text="true"] #search-button {
                    flex: 1 !important;
                }`;
        }
        
        if (buttonTextSettings.showFindersButtonText) {
            findersButtonFlex = `
                body[data-show-finders-button-text="true"] #finders-button,
                html[data-show-finders-button-text="true"] #finders-button {
                    flex: 1 !important;
                }`;
        }
        
        if (buttonTextSettings.showCommandsButtonText) {
            commandsButtonFlex = `
                body[data-show-commands-button-text="true"] #commands-button,
                html[data-show-commands-button-text="true"] #commands-button {
                    flex: 1 !important;
                }`;
        }
        
        style.textContent = `
            body { 
                background-color: var(--background-primary) !important;
                color: var(--text-primary) !important;
                ${backgroundImage}
            }
            
            /* Hide button text based on settings immediately */
            body[data-show-search-button-text="false"] #search-button .search-button-text,
            html[data-show-search-button-text="false"] #search-button .search-button-text {
                display: none !important;
            }
            
            body[data-show-finders-button-text="false"] #finders-button .search-button-text,
            html[data-show-finders-button-text="false"] #finders-button .search-button-text {
                display: none !important;
            }
            
            body[data-show-commands-button-text="false"] #commands-button .search-button-text,
            html[data-show-commands-button-text="false"] #commands-button .search-button-text {
                display: none !important;
            }
            
            /* Critical responsive styles to prevent FOUC on mobile */
            @media (max-width: 760px) {
                .button-container {
                    width: calc(100% - 2rem) !important;
                    justify-content: center !important;
                    gap: 0.5rem !important;
                }
                
                .search-button,
                .finders-button,
                .commands-button {
                    flex: none !important;
                }
                ${searchButtonFlex}
                ${findersButtonFlex}
                ${commandsButtonFlex}
                
                .search-container {
                    max-width: 320px !important;
                    width: 95% !important;
                    padding: 1rem 1.25rem 0.75rem 2rem !important;
                }
                
                .search-button {
                    bottom: 1.5rem !important;
                    padding: 0.8rem 1rem !important;
                }
            }
            
            @media (max-width: 575px) {
                .search-container {
                    max-width: 280px !important;
                    width: 90% !important;
                    padding: 0.875rem 1rem 0.625rem 2rem !important;
                }
                
                .search-button {
                    bottom: 1.25rem !important;
                    padding: 0.8rem 1rem !important;
                }
            }
            
            @media (max-width: 479px) {
                .search-container {
                    max-width: 250px !important;
                    width: 85% !important;
                    padding: 0.75rem 0.875rem 0.5rem 2rem !important;
                }
                
                .search-button {
                    bottom: 1rem !important;
                    padding: 0.8rem 1rem !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        
        // Also set body class if body exists (for config page theme switching)
        if (document.body) {
            // Use classList to preserve other classes like font-size
            // Remove all possible theme classes (dark, light, and any custom themes)
            // Remove default theme classes
            document.body.classList.remove('dark', 'light');

            // Remove any known custom theme classes if provided by config
            if (window.CustomThemeIds && Array.isArray(window.CustomThemeIds)) {
                window.CustomThemeIds.forEach(id => {
                    try { document.body.classList.remove(id); } catch (e) {}
                });
            } else {
                // Fallback: remove any class that looks like a theme (not font-size or system)
                Array.from(document.body.classList).forEach(cls => {
                    if (!cls.startsWith('font-size-') && !cls.startsWith('no-')) {
                        if (cls !== 'dark' && cls !== 'light') {
                            document.body.classList.remove(cls);
                        }
                    }
                });
            }
            
            // Add the new theme class
            document.body.classList.add(theme);
            document.body.setAttribute('data-theme', theme);
            
            // Apply background dots class
            if (!showBackgroundDots) {
                document.body.classList.add('no-background-dots');
            } else {
                document.body.classList.remove('no-background-dots');
            }
            
            // Apply font size class
            document.body.classList.remove('font-size-xs', 'font-size-s', 'font-size-sm', 'font-size-m', 'font-size-lg', 'font-size-l', 'font-size-xl');
            document.body.classList.add(`font-size-${fontSize}`);
            
            // Apply button text settings to body
            if (buttonTextSettings) {
                document.body.setAttribute('data-show-search-button-text', buttonTextSettings.showSearchButtonText);
                document.body.setAttribute('data-show-finders-button-text', buttonTextSettings.showFindersButtonText);
                document.body.setAttribute('data-show-commands-button-text', buttonTextSettings.showCommandsButtonText);
            }
        }
    }
    
    // Apply theme and fontSize immediately
    const theme = getTheme();
    const showBackgroundDots = getShowBackgroundDots();
    const fontSize = getFontSize();
    const buttonTextSettings = getButtonTextSettings();
    applyTheme(theme, showBackgroundDots, fontSize, buttonTextSettings);
    
    // Apply button text settings to body to prevent layout shift
    if (document.body) {
        document.body.setAttribute('data-show-search-button-text', buttonTextSettings.showSearchButtonText);
        document.body.setAttribute('data-show-finders-button-text', buttonTextSettings.showFindersButtonText);
        document.body.setAttribute('data-show-commands-button-text', buttonTextSettings.showCommandsButtonText);
    } else {
        // If body doesn't exist yet, wait for DOM and apply
        document.addEventListener('DOMContentLoaded', function() {
            document.body.setAttribute('data-show-search-button-text', buttonTextSettings.showSearchButtonText);
            document.body.setAttribute('data-show-finders-button-text', buttonTextSettings.showFindersButtonText);
            document.body.setAttribute('data-show-commands-button-text', buttonTextSettings.showCommandsButtonText);
        });
    }
    
    // Apply custom font
    document.addEventListener('DOMContentLoaded', function() {
        const enableCustomFont = document.documentElement.getAttribute('data-enable-custom-font') === 'true';
        const customFontPath = document.documentElement.getAttribute('data-custom-font-path');
        if (enableCustomFont && customFontPath) {
            const fontName = 'CustomFont';
            const fontFace = new FontFace(fontName, `url(${customFontPath}?t=${Date.now()})`);
            fontFace.load().then(function(loadedFace) {
                document.fonts.add(loadedFace);
                document.documentElement.style.setProperty('--font-family-main', `'${fontName}', monospace`);
            }).catch(function(error) {
                console.error('Error loading custom font:', error);
            });
        }
    });
    
    // Export functions for use by other scripts (e.g., config.js)
    window.ThemeLoader = {
        getTheme: getTheme,
        getShowBackgroundDots: getShowBackgroundDots,
        getFontSize: getFontSize,
        getButtonTextSettings: getButtonTextSettings,
        applyTheme: applyTheme
    };
})();

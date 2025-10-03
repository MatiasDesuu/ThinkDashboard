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
     * Applies critical theme styles to prevent FOUC
     * @param {string} theme - The theme to apply ('dark' or 'light')
     * @param {boolean} showBackgroundDots - Whether to show background dots
     */
    function applyTheme(theme, showBackgroundDots = true) {
        // Remove existing FOUC prevention style if present
        const existingStyle = document.head.querySelector('style[data-fouc-prevention]');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create and inject critical CSS using CSS variables
        const style = document.createElement('style');
        style.setAttribute('data-fouc-prevention', 'true');
        
        const backgroundImage = showBackgroundDots 
            ? 'background-image: radial-gradient(var(--background-dots) 1px, transparent 1px) !important; background-size: 15px 15px !important;'
            : 'background-image: none !important;';
        
        style.textContent = `
            body { 
                background-color: var(--background-primary) !important;
                color: var(--text-primary) !important;
                ${backgroundImage}
            }
        `;
        
        document.head.appendChild(style);
        
        // Also set body class if body exists (for config page theme switching)
        if (document.body) {
            // Use classList to preserve other classes like font-size
            document.body.classList.remove('dark', 'light');
            document.body.classList.add(theme);
            document.body.setAttribute('data-theme', theme);
            
            // Apply background dots class
            if (!showBackgroundDots) {
                document.body.classList.add('no-background-dots');
            } else {
                document.body.classList.remove('no-background-dots');
            }
        }
    }
    
    // Apply theme immediately
    const theme = getTheme();
    const showBackgroundDots = getShowBackgroundDots();
    applyTheme(theme, showBackgroundDots);
    
    // Export functions for use by other scripts (e.g., config.js)
    window.ThemeLoader = {
        getTheme: getTheme,
        getShowBackgroundDots: getShowBackgroundDots,
        applyTheme: applyTheme
    };
})();

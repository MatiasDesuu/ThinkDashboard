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
            // Use server-side theme from data attribute
            const bodyTheme = document.body?.getAttribute('data-theme');
            if (bodyTheme) {
                theme = bodyTheme;
            }
        }
        
        return theme;
    }
    
    /**
     * Applies critical theme styles to prevent FOUC
     * @param {string} theme - The theme to apply ('dark' or 'light')
     */
    function applyTheme(theme) {
        // Remove existing FOUC prevention style if present
        const existingStyle = document.head.querySelector('style[data-fouc-prevention]');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create and inject critical CSS
        const style = document.createElement('style');
        style.setAttribute('data-fouc-prevention', 'true');
        
        if (theme === 'light') {
            style.textContent = `
                body { 
                    background-color: #F9FAFB !important;
                    color: #1F2937 !important;
                    background-image: radial-gradient(#E5E7EB 1px, transparent 1px) !important;
                    background-size: 15px 15px !important;
                }
            `;
        } else {
            style.textContent = `
                body { 
                    background-color: #000 !important;
                    color: #E5E7EB !important;
                    background-image: radial-gradient(#1F2937 1px, transparent 1px) !important;
                    background-size: 15px 15px !important;
                }
            `;
        }
        
        document.head.appendChild(style);
        
        // Also set body class if body exists (for config page theme switching)
        if (document.body) {
            document.body.className = theme;
            document.body.setAttribute('data-theme', theme);
        }
    }
    
    // Apply theme immediately
    const theme = getTheme();
    applyTheme(theme);
    
    // Export functions for use by other scripts (e.g., config.js)
    window.ThemeLoader = {
        getTheme: getTheme,
        applyTheme: applyTheme
    };
})();

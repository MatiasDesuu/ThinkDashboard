// Colors Management
let colorsData = {
    light: {},
    dark: {},
    custom: {} // Object to store custom themes
};

let customThemesManager = null; // Will be initialized in DOMContentLoaded
let currentPreviewTheme = 'dark'; // Current theme being previewed
let settings = {}; // To store settings data
let language = null; // Language instance for translations

// Apply animations based on settings
function applyAnimations() {
    if (settings.animationsEnabled !== false) {
        document.body.classList.remove('no-animations');
    } else {
        document.body.classList.add('no-animations');
    }
}

// Load settings from API or localStorage
async function loadSettings() {
    try {
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';
        if (deviceSpecific) {
            const deviceSettings = localStorage.getItem('dashboardSettings');
            settings = deviceSettings ? JSON.parse(deviceSettings) : {};
        } else {
            const response = await fetch('/api/settings');
            settings = await response.json();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = {};
    }
}

// Tab Management
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Function to switch to a specific tab
    const switchToTab = (targetTab) => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to target button and corresponding content
        const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Update URL hash
        window.location.hash = `#${targetTab}`;
        
        // Automatically switch theme for preview when selecting dark or light tab
        if (targetTab === 'dark' || targetTab === 'light') {
            switchToTheme(targetTab);
        } else if (targetTab === 'custom') {
            // Reset custom theme selector when entering custom tab
            const selector = document.getElementById('custom-theme-selector');
            if (selector) {
                selector.value = '';
                // Refresh custom select component if it exists
                try {
                    const instance = selector.__customSelectInstance;
                    if (instance && typeof instance.refresh === 'function') {
                        instance.refresh();
                    }
                } catch (e) {
                    // ignore
                }
            }
            if (customThemesManager) {
                customThemesManager.currentSelectedTheme = null;
                customThemesManager.hideThemeColors();
            }
            // Remove preview when entering custom tab without selection
            const previewStyle = document.getElementById('color-preview-style');
            if (previewStyle) {
                previewStyle.remove();
            }
        }
    };

    // Check initial hash and switch to corresponding tab
    const initialHash = window.location.hash.substring(1);
    const validTabs = ['dark', 'light', 'custom'];
    if (validTabs.includes(initialHash)) {
        switchToTab(initialHash);
    } else {
        // If no hash, switch to default tab (dark)
        switchToTab('dark');
    }

    // Add hash change listener
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (validTabs.includes(hash)) {
            switchToTab(hash);
        }
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchToTab(targetTab);
        });
    });
}

// Load colors from API
async function loadColors() {
    try {
        const response = await fetch('/api/colors');
        if (!response.ok) throw new Error('Failed to load colors');
        
        colorsData = await response.json();
        
        // Ensure custom themes object exists
        if (!colorsData.custom) {
            colorsData.custom = {};
        }
        
        populateColorInputs();
        
        // Set initial preview theme based on current body class
        if (document.body.classList.contains('dark')) {
            currentPreviewTheme = 'dark';
        } else if (document.body.classList.contains('light')) {
            currentPreviewTheme = 'light';
        }
        
        // Render custom themes if manager exists
        if (customThemesManager) {
            customThemesManager.render(colorsData.custom);
            customThemesManager.updateThemeSelector(colorsData.custom);
        }
        
        // Apply colors immediately to show current theme colors
        applyColorsToPreview();
    } catch (error) {
        console.error('Error loading colors:', error);
        showNotification(window.t('colors.errorLoadingColors'), 'error');
    }
}

// Populate color inputs with current values
function populateColorInputs() {
    const colorInputs = document.querySelectorAll('input[data-theme][data-prop]');
    
    colorInputs.forEach(input => {
        const theme = input.dataset.theme;
        const prop = input.dataset.prop;
        const value = colorsData[theme][prop];
        
        if (input.type === 'color') {
            // For color pickers, extract hex value if it's a simple color
            if (value && value.startsWith('#')) {
                input.value = value;
            }
            // Update corresponding text input
            const textInput = document.getElementById(`${input.id}-text`);
            if (textInput) {
                textInput.value = value || '';
            }
        } else if (input.type === 'text') {
            // For all text inputs (both paired and standalone)
            input.value = value || '';
        }
    });
}

// Update color value from input
function updateColorValue(theme, prop, value) {
    if (theme === 'custom') {
        // For custom themes, update the currently selected theme
        if (customThemesManager && customThemesManager.currentSelectedTheme) {
            customThemesManager.updateColorValue(colorsData.custom, prop, value);
        }
    } else {
        colorsData[theme][prop] = value;
    }
    applyColorsToPreview();
}

// Apply colors to current page for preview
function applyColorsToPreview() {
    let colors;
    if (currentPreviewTheme === 'custom' && customThemesManager && customThemesManager.currentSelectedTheme) {
        colors = colorsData.custom[customThemesManager.currentSelectedTheme];
    } else if (currentPreviewTheme === 'custom') {
        // If custom but no theme selected, don't apply preview
        return;
    } else {
        colors = colorsData[currentPreviewTheme];
    }
    
    if (!colors) return;
    
    // Remove existing preview style if present
    let previewStyle = document.getElementById('color-preview-style');
    if (previewStyle) {
        previewStyle.remove();
    }
    
    // Create new style element with higher specificity
    previewStyle = document.createElement('style');
    previewStyle.id = 'color-preview-style';
    
    // Generate CSS with the current theme colors
    const css = `
        body {
            --text-primary: ${colors.textPrimary} !important;
            --text-secondary: ${colors.textSecondary} !important;
            --text-tertiary: ${colors.textTertiary} !important;
            --background-primary: ${colors.backgroundPrimary} !important;
            --background-secondary: ${colors.backgroundSecondary} !important;
            --background-dots: ${colors.backgroundDots} !important;
            --background-modal: ${colors.backgroundModal} !important;
            --border-primary: ${colors.borderPrimary} !important;
            --border-secondary: ${colors.borderSecondary} !important;
            --accent-success: ${colors.accentSuccess} !important;
            --accent-warning: ${colors.accentWarning} !important;
            --accent-error: ${colors.accentError} !important;
        }
    `;
    
    previewStyle.textContent = css;
    document.head.appendChild(previewStyle);
}

// Save colors to API
async function saveColors() {
    try {
        const response = await fetch('/api/colors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(colorsData)
        });
        
        if (!response.ok) throw new Error('Failed to save colors');
        
        showNotification(window.t('colors.colorsSaved'), 'success');
        
        // Remove preview style since we're loading the saved version
        const previewStyle = document.getElementById('color-preview-style');
        if (previewStyle) {
            previewStyle.remove();
        }
        
        // Reload the dynamic theme CSS
        reloadThemeCSS();
        
        // Re-apply preview after saving to maintain current preview theme
        applyColorsToPreview();
    } catch (error) {
        console.error('Error saving colors:', error);
        showNotification(window.t('colors.errorSavingColors'), 'error');
    }
}

// Reload the theme CSS to apply changes
function reloadThemeCSS() {
    const link = document.querySelector('link[href="/api/theme.css"]');
    if (link) {
        const newLink = link.cloneNode();
        newLink.href = '/api/theme.css?' + new Date().getTime();
        link.parentNode.replaceChild(newLink, link);
    }
}

// Reset colors to defaults
async function resetColors() {
    const confirmed = await window.AppModal.danger({
        title: window.t('colors.resetColorsTitle'),
        message: window.t('colors.resetColorsMessage'),
        confirmText: window.t('config.reset'),
        cancelText: window.t('config.cancel')
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/colors/reset', {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to reset colors');
        
        colorsData = await response.json();
        populateColorInputs();
        applyColorsToPreview();
        showNotification(window.t('colors.colorsReset'), 'success');
        
        // Remove preview style since we're loading the saved version
        const previewStyle = document.getElementById('color-preview-style');
        if (previewStyle) {
            previewStyle.remove();
        }
        
        // Reload the dynamic theme CSS
        reloadThemeCSS();
        
        // Re-apply preview after resetting to maintain current preview theme
        applyColorsToPreview();
    } catch (error) {
        console.error('Error resetting colors:', error);
        showNotification(window.t('colors.errorResettingColors'), 'error');
    }
}

// Switch to a specific theme for preview
function switchToTheme(theme) {
    currentPreviewTheme = theme;
    applyColorsToPreview();
}

// Make switchToTheme globally accessible
window.switchToTheme = switchToTheme;

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notification.className = `notification notification-${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Add custom theme
function addCustomTheme() {
    if (!customThemesManager) return;
    
    // Get default dark colors to use as template
    const defaultColors = { ...colorsData.dark };
    
    const themeId = customThemesManager.add(colorsData.custom, defaultColors);
    
    if (themeId) {
        customThemesManager.render(colorsData.custom);
        customThemesManager.updateThemeSelector(colorsData.custom);
        
        // Auto-select the new theme
        const selector = document.getElementById('custom-theme-selector');
        if (selector) {
            selector.value = themeId;
            customThemesManager.currentSelectedTheme = themeId;
            customThemesManager.showThemeColors(colorsData.custom[themeId]);
            
            // Switch to custom theme preview
            if (window.switchToTheme) {
                window.switchToTheme('custom');
            }
            
            // Refresh custom select to update display
            try {
                const instance = selector.__customSelectInstance;
                if (instance && typeof instance.refresh === 'function') {
                    instance.refresh();
                }
            } catch (e) {
                // ignore
            }
        }
    }
}

// Remove custom theme
async function removeCustomTheme(themeId) {
    if (!customThemesManager) return;
    
    const removed = await customThemesManager.remove(colorsData.custom, themeId);
    
    if (removed) {
        customThemesManager.render(colorsData.custom);
        customThemesManager.updateThemeSelector(colorsData.custom);
    }
}

// Make functions globally accessible
window.configManager = {
    removeCustomTheme: removeCustomTheme
};

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Load settings and apply animations
    await loadSettings();
    applyAnimations();
    
    // Initialize language and load translations
    language = new ConfigLanguage();
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    await language.loadTranslations(lang);
    window.t = language.t.bind(language);
    
    // Initialize custom themes manager
    customThemesManager = new ConfigCustomThemes(() => {
        // Callback when themes are updated
    }, language.t.bind(language));
    
    // Initialize tabs
    initTabs();
    
    // Load colors on page load
    loadColors().then(() => {
        // Setup custom theme selector after colors are loaded
        if (customThemesManager) {
            customThemesManager.setupThemeSelector(colorsData.custom);
        }
        
        // Show body after everything is loaded and rendered
        document.body.classList.remove('loading');
    }).catch(() => {
        // Show body even if there's an error
        document.body.classList.remove('loading');
    });
    
    // Save button
    document.getElementById('save-colors-btn').addEventListener('click', saveColors);
    
    // Reset button
    document.getElementById('reset-colors-btn').addEventListener('click', resetColors);
    
    // Add custom theme button
    const addCustomThemeBtn = document.getElementById('add-custom-theme-btn');
    if (addCustomThemeBtn) {
        addCustomThemeBtn.addEventListener('click', addCustomTheme);
    }
    
    // Color picker inputs
    document.querySelectorAll('input[type="color"][data-theme][data-prop]').forEach(input => {
        input.addEventListener('input', (e) => {
            const theme = e.target.dataset.theme;
            const prop = e.target.dataset.prop;
            const value = e.target.value;
            
            // Update the corresponding text input
            const textInput = document.getElementById(`${e.target.id}-text`);
            if (textInput) {
                textInput.value = value;
            }
            
            updateColorValue(theme, prop, value);
        });
        
        // Also listen for change event
        input.addEventListener('change', (e) => {
            const theme = e.target.dataset.theme;
            const prop = e.target.dataset.prop;
            const value = e.target.value;
            
            // Update the corresponding text input
            const textInput = document.getElementById(`${e.target.id}-text`);
            if (textInput) {
                textInput.value = value;
            }
            
            updateColorValue(theme, prop, value);
        });
    });
    
    // Text inputs paired with color pickers
    document.querySelectorAll('.color-text-input').forEach(input => {
        const handleColorTextInput = (e) => {
            // Remove only the '-text' suffix at the end of the ID
            const colorPickerId = e.target.id.endsWith('-text') 
                ? e.target.id.slice(0, -5) 
                : e.target.id;
            const colorPicker = document.getElementById(colorPickerId);
            
            if (colorPicker) {
                const theme = colorPicker.dataset.theme;
                const prop = colorPicker.dataset.prop;
                const value = e.target.value;
                
                // Update color picker if it's a valid hex color
                if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
                    colorPicker.value = value;
                }
                
                updateColorValue(theme, prop, value);
            }
        };
        
        input.addEventListener('input', handleColorTextInput);
        input.addEventListener('change', handleColorTextInput);
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleColorTextInput(e);
                input.blur(); // Remove focus to show the change was applied
            }
        });
    });
    
    // Standalone text inputs (like rgba values)
    document.querySelectorAll('.color-text-input-full').forEach(input => {
        const handleFullTextInput = (e) => {
            const theme = e.target.dataset.theme;
            const prop = e.target.dataset.prop;
            const value = e.target.value;
            
            updateColorValue(theme, prop, value);
        };
        
        input.addEventListener('input', handleFullTextInput);
        input.addEventListener('change', handleFullTextInput);
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleFullTextInput(e);
                input.blur(); // Remove focus to show the change was applied
            }
        });
    });
});

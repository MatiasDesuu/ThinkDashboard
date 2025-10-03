// Colors Management
let colorsData = {
    light: {},
    dark: {}
};

// Tab Management
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Load colors from API
async function loadColors() {
    try {
        const response = await fetch('/api/colors');
        if (!response.ok) throw new Error('Failed to load colors');
        
        colorsData = await response.json();
        populateColorInputs();
        
        // Apply colors immediately to show current theme colors
        applyColorsToPreview();
    } catch (error) {
        console.error('Error loading colors:', error);
        showNotification('Failed to load colors', 'error');
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
        } else if (input.type === 'text' && !input.classList.contains('color-text-input')) {
            // For text inputs that aren't paired with color pickers (like rgba values)
            input.value = value || '';
        }
    });
}

// Update color value from input
function updateColorValue(theme, prop, value) {
    colorsData[theme][prop] = value;
    applyColorsToPreview();
}

// Apply colors to current page for preview
function applyColorsToPreview() {
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    const colors = colorsData[currentTheme];
    
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
        body.${currentTheme} {
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
        
        showNotification('Colors saved successfully!', 'success');
        
        // Remove preview style since we're loading the saved version
        const previewStyle = document.getElementById('color-preview-style');
        if (previewStyle) {
            previewStyle.remove();
        }
        
        // Reload the dynamic theme CSS
        reloadThemeCSS();
    } catch (error) {
        console.error('Error saving colors:', error);
        showNotification('Failed to save colors', 'error');
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
        title: 'Reset Colors',
        message: 'Are you sure you want to reset all colors to default values? This action cannot be undone.',
        confirmText: 'Reset',
        cancelText: 'Cancel'
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
        showNotification('Colors reset to defaults', 'success');
        
        // Remove preview style since we're loading the saved version
        const previewStyle = document.getElementById('color-preview-style');
        if (previewStyle) {
            previewStyle.remove();
        }
        
        // Reload the dynamic theme CSS
        reloadThemeCSS();
    } catch (error) {
        console.error('Error resetting colors:', error);
        showNotification('Failed to reset colors', 'error');
    }
}

// Toggle theme preview
function toggleThemePreview() {
    const body = document.body;
    const html = document.documentElement;
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        body.classList.add('light');
        html.setAttribute('data-theme', 'light');
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        html.setAttribute('data-theme', 'dark');
    }
    
    applyColorsToPreview();
}

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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tabs
    initTabs();
    
    // Load colors on page load
    loadColors();
    
    // Save button
    document.getElementById('save-colors-btn').addEventListener('click', saveColors);
    
    // Reset button
    document.getElementById('reset-colors-btn').addEventListener('click', resetColors);
    
    // Preview theme button
    document.getElementById('preview-theme-btn').addEventListener('click', toggleThemePreview);
    
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
    });
    
    // Text inputs paired with color pickers
    document.querySelectorAll('.color-text-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const colorPickerId = e.target.id.replace('-text', '');
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
        });
    });
    
    // Standalone text inputs (like rgba values)
    document.querySelectorAll('.color-text-input-full').forEach(input => {
        input.addEventListener('input', (e) => {
            const theme = e.target.dataset.theme;
            const prop = e.target.dataset.prop;
            const value = e.target.value;
            
            updateColorValue(theme, prop, value);
        });
    });
});

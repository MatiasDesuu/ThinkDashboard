// Config Font - Handles custom font upload and application
class ConfigFont {
    constructor() {
        this.waitForSettings();
    }

    waitForSettings() {
        const check = () => {
            if (window.ConfigManager && window.ConfigManager.settingsData) {
                this.loadCurrentFont();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    }

    loadCurrentFont() {
        const settings = window.ConfigManager.settingsData;
        if (settings.enableCustomFont && settings.customFontPath) {
            this.applyFont(settings.customFontPath);
        }
    }

    applyFont(fontPath) {
        if (!fontPath) return;

        // Create a font-face rule dynamically
        const fontName = 'CustomFont';
        const fontFace = new FontFace(fontName, `url(${fontPath}?t=${Date.now()})`);
        fontFace.load().then((loadedFace) => {
            document.fonts.add(loadedFace);
            // Update the CSS variable to use the custom font
            document.documentElement.style.setProperty('--font-family-main', `'${fontName}', monospace`);
        }).catch((error) => {
            console.error('Error loading custom font:', error);
        });
    }

    resetFont() {
        document.documentElement.style.setProperty('--font-family-main', "'Source Code Pro', monospace");
    }

    async uploadFont(file) {
        const formData = new FormData();
        formData.append('font', file);

        const response = await fetch('/api/font', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload font');
        }

        const result = await response.json();
        return result.path;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ConfigFont = new ConfigFont();
});
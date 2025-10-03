/**
 * Storage Module
 * Handles localStorage for device-specific settings
 */

class ConfigStorage {
    /**
     * Get device-specific settings flag
     * @returns {boolean}
     */
    getDeviceSpecificFlag() {
        return localStorage.getItem('deviceSpecificSettings') === 'true';
    }

    /**
     * Set device-specific settings flag
     * @param {boolean} enabled
     */
    setDeviceSpecificFlag(enabled) {
        localStorage.setItem('deviceSpecificSettings', enabled.toString());
    }

    /**
     * Get device-specific settings from localStorage
     * @returns {Object|null}
     */
    getDeviceSettings() {
        const stored = localStorage.getItem('dashboardSettings');
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * Save device-specific settings to localStorage
     * @param {Object} settings
     */
    saveDeviceSettings(settings) {
        localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    }

    /**
     * Clear device-specific settings from localStorage
     */
    clearDeviceSettings() {
        localStorage.removeItem('dashboardSettings');
    }
}

// Export for use in other modules
window.ConfigStorage = ConfigStorage;

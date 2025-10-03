// Configuration JavaScript
class ConfigManager {
    constructor() {
        this.bookmarks = [];
        this.categories = [];
        this.settings = {
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            fontSize: 'medium',
            showBackgroundDots: true,
            showTitle: true,
            showDate: true,
            showStatus: false,
            showPing: false
        };
        this.deviceSpecific = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupDOM();
        this.setupEventListeners();
        this.renderConfig();
        
        // Initialize custom selects after everything is loaded and values are set
        if (typeof initCustomSelects === 'function') {
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                initCustomSelects();
            }, 0);
        }
    }

    async loadData() {
        try {
            // Check if device-specific settings are enabled
            this.deviceSpecific = this.getDeviceSpecificFlag();

            const [bookmarksRes, categoriesRes, settingsRes] = await Promise.all([
                fetch('/api/bookmarks'),
                fetch('/api/categories'),
                fetch('/api/settings')
            ]);

            this.bookmarks = await bookmarksRes.json();
            this.categories = await categoriesRes.json();
            
            // Load settings from localStorage or server based on device-specific flag
            if (this.deviceSpecific) {
                this.settings = this.getDeviceSettings() || await settingsRes.json();
            } else {
                this.settings = await settingsRes.json();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading configuration', 'error');
        }
    }

    setupDOM() {
        // Apply theme - use classList to preserve other classes
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(this.settings.theme);
        document.body.setAttribute('data-theme', this.settings.theme);
        
        // Use ThemeLoader to apply theme styles and prevent FOUC
        if (window.ThemeLoader) {
            window.ThemeLoader.applyTheme(this.settings.theme, this.settings.showBackgroundDots);
        }
        
        // Apply font size
        this.applyFontSize();
        
        // Apply background dots
        this.applyBackgroundDots();
    }

    applyFontSize() {
        // Remove existing font size classes
        document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
        // Add current font size class
        const fontSize = this.settings.fontSize || 'medium';
        document.body.classList.add(`font-size-${fontSize}`);
    }

    applyBackgroundDots() {
        // Toggle background dots class
        if (this.settings.showBackgroundDots !== false) {
            document.body.classList.remove('no-background-dots');
        } else {
            document.body.classList.add('no-background-dots');
        }
    }

    setupEventListeners() {
        // Theme change
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.setupDOM();
            });
        }

        // Columns change
        const columnsInput = document.getElementById('columns-input');
        if (columnsInput) {
            columnsInput.value = this.settings.columnsPerRow;
            columnsInput.addEventListener('change', (e) => {
                this.settings.columnsPerRow = parseInt(e.target.value);
            });
        }

        // Font size change
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect) {
            fontSizeSelect.value = this.settings.fontSize || 'medium';
            fontSizeSelect.addEventListener('change', (e) => {
                this.settings.fontSize = e.target.value;
                this.applyFontSize();
            });
        }

        // New tab checkbox
        const newTabCheckbox = document.getElementById('new-tab-checkbox');
        if (newTabCheckbox) {
            newTabCheckbox.checked = this.settings.openInNewTab;
            newTabCheckbox.addEventListener('change', (e) => {
                this.settings.openInNewTab = e.target.checked;
            });
        }

        // Show background dots checkbox
        const showBackgroundDotsCheckbox = document.getElementById('show-background-dots-checkbox');
        if (showBackgroundDotsCheckbox) {
            showBackgroundDotsCheckbox.checked = this.settings.showBackgroundDots !== false;
            showBackgroundDotsCheckbox.addEventListener('change', (e) => {
                this.settings.showBackgroundDots = e.target.checked;
                this.applyBackgroundDots();
            });
        }

        // Show title checkbox
        const showTitleCheckbox = document.getElementById('show-title-checkbox');
        if (showTitleCheckbox) {
            showTitleCheckbox.checked = this.settings.showTitle;
            showTitleCheckbox.addEventListener('change', (e) => {
                this.settings.showTitle = e.target.checked;
            });
        }

        // Show date checkbox
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        if (showDateCheckbox) {
            showDateCheckbox.checked = this.settings.showDate;
            showDateCheckbox.addEventListener('change', (e) => {
                this.settings.showDate = e.target.checked;
            });
        }

        // Show config button checkbox
        const showConfigButtonCheckbox = document.getElementById('show-config-button-checkbox');
        if (showConfigButtonCheckbox) {
            showConfigButtonCheckbox.checked = this.settings.showConfigButton;
            showConfigButtonCheckbox.addEventListener('change', (e) => {
                this.settings.showConfigButton = e.target.checked;
            });
        }

        // Device-specific settings checkbox
        const deviceSpecificCheckbox = document.getElementById('device-specific-checkbox');
        if (deviceSpecificCheckbox) {
            deviceSpecificCheckbox.checked = this.deviceSpecific;
            deviceSpecificCheckbox.addEventListener('change', (e) => {
                this.deviceSpecific = e.target.checked;
                this.setDeviceSpecificFlag(this.deviceSpecific);
                if (this.deviceSpecific) {
                    // Save current settings to localStorage when enabling device-specific
                    this.saveDeviceSettings(this.settings);
                    this.showNotification('Device-specific settings enabled. Settings will now be stored locally.', 'success');
                } else {
                    // Clear localStorage when disabling device-specific
                    this.clearDeviceSettings();
                    this.showNotification('Device-specific settings disabled. Current values will be saved to global settings when you click Save.', 'success');
                    // Don't reload settings from server - keep current UI values
                    // The user's current changes will be saved to global settings when they click Save
                }
            });
        }

        // Show status checkbox
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        if (showStatusCheckbox) {
            showStatusCheckbox.checked = this.settings.showStatus;
            showStatusCheckbox.addEventListener('change', (e) => {
                this.settings.showStatus = e.target.checked;
                this.updateStatusOptionsVisibility();
            });
        }

        // Show ping checkbox
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        if (showPingCheckbox) {
            showPingCheckbox.checked = this.settings.showPing;
            showPingCheckbox.addEventListener('change', (e) => {
                this.settings.showPing = e.target.checked;
            });
        }

        // Initial update of status options visibility
        this.updateStatusOptionsVisibility();

        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.addCategory());
        }

        // Add bookmark button
        const addBookmarkBtn = document.getElementById('add-bookmark-btn');
        if (addBookmarkBtn) {
            addBookmarkBtn.addEventListener('click', () => this.addBookmark());
        }

        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChanges());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
    }

    renderConfig() {
        this.renderCategories();
        this.renderBookmarks();
    }

    renderCategories() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = '';

        this.categories.forEach((category, index) => {
            const categoryElement = this.createCategoryElement(category, index);
            container.appendChild(categoryElement);
        });
    }

    createCategoryElement(category, index) {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `
            <input type="text" id="category-name-${index}" name="category-name-${index}" value="${category.name}" placeholder="Category name" data-category-index="${index}" data-field="name">
            <button type="button" class="btn btn-danger" onclick="configManager.removeCategory(${index})">Remove</button>
        `;

        // Add event listener for name changes
        const nameInput = div.querySelector('input[data-field="name"]');
        nameInput.addEventListener('input', (e) => {
            this.categories[index].name = e.target.value;
            this.categories[index].id = this.generateId(e.target.value);
        });

        return div;
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarks-list');
        if (!container) return;

        container.innerHTML = '';

        this.bookmarks.forEach((bookmark, index) => {
            const bookmarkElement = this.createBookmarkElement(bookmark, index);
            container.appendChild(bookmarkElement);
        });
    }

    createBookmarkElement(bookmark, index) {
        const div = document.createElement('div');
        div.className = 'bookmark-item';

        // Create category options
        const categoryOptions = this.categories.map(cat => 
            `<option value="${cat.id}" ${cat.id === bookmark.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');

        div.innerHTML = `
            <input type="text" id="bookmark-name-${index}" name="bookmark-name-${index}" value="${bookmark.name}" placeholder="Bookmark name" data-bookmark-index="${index}" data-field="name">
            <input type="url" id="bookmark-url-${index}" name="bookmark-url-${index}" value="${bookmark.url}" placeholder="https://example.com" data-bookmark-index="${index}" data-field="url">
            <input type="text" id="bookmark-shortcut-${index}" name="bookmark-shortcut-${index}" value="${bookmark.shortcut || ''}" placeholder="Keys (Y, YS, YC)" maxlength="5" data-bookmark-index="${index}" data-field="shortcut">
            <select id="bookmark-category-${index}" name="bookmark-category-${index}" data-bookmark-index="${index}" data-field="category">
                <option value="">No category</option>
                ${categoryOptions}
            </select>
            <div class="bookmark-status-toggle">
                <label class="checkbox-label">
                    <input type="checkbox" id="bookmark-checkStatus-${index}" name="bookmark-checkStatus-${index}" ${bookmark.checkStatus ? 'checked' : ''} data-bookmark-index="${index}" data-field="checkStatus">
                    <span class="checkbox-text">status</span>
                </label>
            </div>
            <button type="button" class="btn btn-danger" onclick="configManager.removeBookmark(${index})">Remove</button>
        `;

        // Add event listeners for field changes
        const inputs = div.querySelectorAll('input, select');
        inputs.forEach(input => {
            const eventType = input.type === 'text' || input.type === 'url' ? 'input' : 'change';
            input.addEventListener(eventType, (e) => {
                const field = e.target.getAttribute('data-field');
                
                if (field === 'checkStatus') {
                    this.bookmarks[index][field] = e.target.checked;
                } else {
                    this.bookmarks[index][field] = e.target.value;
                }
                
                // Update ID when name changes
                if (field === 'name') {
                    this.bookmarks[index].id = this.generateId(e.target.value);
                }
                
                // Convert shortcut to uppercase and allow multiple characters
                if (field === 'shortcut') {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    this.bookmarks[index][field] = e.target.value;
                }
            });
        });

        // Initialize custom select for the category dropdown
        const selectElement = div.querySelector('select');
        if (selectElement && typeof CustomSelect !== 'undefined') {
            // Mark as initialized to prevent double initialization
            selectElement.dataset.customSelectInit = 'true';
            new CustomSelect(selectElement);
        }

        return div;
    }

    addCategory() {
        const newCategory = {
            id: this.generateId(`category-${this.categories.length + 1}`),
            name: `New Category ${this.categories.length + 1}`
        };
        this.categories.push(newCategory);
        this.renderCategories();
        this.renderBookmarks(); // Re-render bookmarks to update category dropdowns
    }

    addBookmark() {
        const newBookmark = {
            id: this.generateId(`bookmark-${this.bookmarks.length + 1}`),
            name: `New Bookmark ${this.bookmarks.length + 1}`,
            url: 'https://example.com',
            shortcut: '',
            category: '',
            checkStatus: false
        };
        this.bookmarks.push(newBookmark);
        this.renderBookmarks();
    }

    async removeCategory(index) {
        const confirmed = await window.AppModal.danger({
            title: 'Remove Category',
            message: 'Are you sure you want to remove this category? This action cannot be undone.',
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return;
        }
        
        this.categories.splice(index, 1);
        this.renderCategories();
        this.renderBookmarks(); // Re-render bookmarks to update category dropdowns
    }

    async removeBookmark(index) {
        const confirmed = await window.AppModal.danger({
            title: 'Remove Bookmark',
            message: 'Are you sure you want to remove this bookmark? This action cannot be undone.',
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return;
        }
        
        this.bookmarks.splice(index, 1);
        this.renderBookmarks();
    }

    async saveChanges() {
        try {
            // Update settings from current UI values before saving
            this.updateSettingsFromUI();

            // Always save bookmarks and categories to server
            const savePromises = [
                fetch('/api/bookmarks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.bookmarks)
                }),
                fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.categories)
                })
            ];

            // Save settings based on device-specific flag
            if (this.deviceSpecific) {
                // Save settings to localStorage
                this.saveDeviceSettings(this.settings);
            } else {
                // Save settings to server
                savePromises.push(
                    fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.settings)
                    })
                );
            }

            await Promise.all(savePromises);
            this.showNotification('Configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showNotification('Error saving configuration', 'error');
        }
    }

    async resetToDefaults() {
        const confirmed = await window.AppModal.danger({
            title: 'Reset Settings',
            message: 'Are you sure you want to reset all settings to defaults? This will remove all your bookmarks and categories. This action cannot be undone.',
            confirmText: 'Reset',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return;
        }

        this.bookmarks = [
            { id: '1', name: 'GitHub', url: 'https://github.com', shortcut: 'G', category: 'development' },
            { id: '2', name: 'GitHub Issues', url: 'https://github.com/issues', shortcut: 'GI', category: 'development' },
            { id: '3', name: 'GitHub Pull Requests', url: 'https://github.com/pulls', shortcut: 'GP', category: 'development' },
            { id: '4', name: 'YouTube', url: 'https://youtube.com', shortcut: 'Y', category: 'media' },
            { id: '5', name: 'YouTube Studio', url: 'https://studio.youtube.com', shortcut: 'YS', category: 'media' },
            { id: '6', name: 'Twitter', url: 'https://twitter.com', shortcut: 'T', category: 'social' },
            { id: '7', name: 'TikTok', url: 'https://tiktok.com', shortcut: 'TT', category: 'social' },
            { id: '8', name: 'Google', url: 'https://google.com', shortcut: '', category: 'search' }
        ];

        this.categories = [
            { id: 'development', name: 'Development' },
            { id: 'media', name: 'Media' },
            { id: 'social', name: 'Social' },
            { id: 'search', name: 'Search' },
            { id: 'utilities', name: 'Utilities' }
        ];

        this.settings = {
            theme: 'dark',
            openInNewTab: true,
            columnsPerRow: 3,
            showTitle: true,
            showDate: true,
            showConfigButton: true
        };

        // Update form elements
        document.getElementById('theme-select').value = this.settings.theme;
        document.getElementById('columns-input').value = this.settings.columnsPerRow;
        document.getElementById('new-tab-checkbox').checked = this.settings.openInNewTab;
        document.getElementById('show-title-checkbox').checked = this.settings.showTitle;
        document.getElementById('show-date-checkbox').checked = this.settings.showDate;
        document.getElementById('show-config-button-checkbox').checked = this.settings.showConfigButton;

        this.setupDOM();
        this.renderConfig();
        this.showNotification('Settings reset to defaults', 'success');
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageSpan = document.getElementById('notification-message');
        
        if (notification && messageSpan) {
            messageSpan.textContent = message;
            notification.className = `notification ${type} show`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    // Update settings object from current UI values
    updateSettingsFromUI() {
        // Read current values from UI elements
        const themeSelect = document.getElementById('theme-select');
        const columnsInput = document.getElementById('columns-input'); 
        const newTabCheckbox = document.getElementById('new-tab-checkbox');
        const showTitleCheckbox = document.getElementById('show-title-checkbox');
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        const showConfigButtonCheckbox = document.getElementById('show-config-button-checkbox');

        if (themeSelect) this.settings.theme = themeSelect.value;
        if (columnsInput) this.settings.columnsPerRow = parseInt(columnsInput.value);
        if (newTabCheckbox) this.settings.openInNewTab = newTabCheckbox.checked;
        if (showTitleCheckbox) this.settings.showTitle = showTitleCheckbox.checked;
        if (showDateCheckbox) this.settings.showDate = showDateCheckbox.checked;
        if (showConfigButtonCheckbox) this.settings.showConfigButton = showConfigButtonCheckbox.checked;
        
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        if (showStatusCheckbox) this.settings.showStatus = showStatusCheckbox.checked;
        if (showPingCheckbox) this.settings.showPing = showPingCheckbox.checked;
    }

    updateStatusOptionsVisibility() {
        const showStatusCheckbox = document.getElementById('show-status-checkbox');
        const statusNested = document.querySelector('.status-settings-nested');
        
        if (showStatusCheckbox && statusNested) {
            if (showStatusCheckbox.checked) {
                statusNested.style.display = 'block';
            } else {
                statusNested.style.display = 'none';
                // Also uncheck ping when status is disabled
                const showPingCheckbox = document.getElementById('show-ping-checkbox');
                if (showPingCheckbox) {
                    showPingCheckbox.checked = false;
                    this.settings.showPing = false;
                }
            }
        }
    }

    // Device-specific settings localStorage methods
    getDeviceSpecificFlag() {
        return localStorage.getItem('deviceSpecificSettings') === 'true';
    }

    setDeviceSpecificFlag(enabled) {
        localStorage.setItem('deviceSpecificSettings', enabled.toString());
    }

    getDeviceSettings() {
        const stored = localStorage.getItem('dashboardSettings');
        return stored ? JSON.parse(stored) : null;
    }

    saveDeviceSettings(settings) {
        localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    }

    clearDeviceSettings() {
        localStorage.removeItem('dashboardSettings');
    }

    async loadServerSettings() {
        try {
            const settingsRes = await fetch('/api/settings');
            this.settings = await settingsRes.json();
            this.renderConfig(); // Re-render to update UI
        } catch (error) {
            console.error('Error loading server settings:', error);
        }
    }
}

// Global reference for button onclick handlers
let configManager;

// Initialize configuration manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    configManager = new ConfigManager();
});
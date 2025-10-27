// Keyboard shortcuts for config page
class ConfigKeyboard {
    constructor() {
        this.tabButtons = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateTabButtons();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Don't handle if user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Don't handle if user is interacting with a select
            if (e.target.tagName === 'SELECT') {
                return;
            }

            // Don't handle if modal is open
            const modals = document.querySelectorAll('.modal.show');
            if (modals.length > 0) {
                return;
            }

            // Don't handle if modifier keys are pressed (except shift)
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            this.handleKeyPress(e);
        });

        // Update tab buttons when DOM changes
        const observer = new MutationObserver(() => {
            this.updateTabButtons();
        });

        const tabsContainer = document.querySelector('.tabs');
        if (tabsContainer) {
            observer.observe(tabsContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    updateTabButtons() {
        this.tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    }

    handleKeyPress(e) {
        const key = e.key.toLowerCase();

        // Handle number keys 1-6 for tab navigation
        if (key >= '1' && key <= '6') {
            const tabIndex = parseInt(key) - 1;
            
            if (tabIndex < this.tabButtons.length) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.tabButtons[tabIndex];
                if (targetTab) {
                    targetTab.click();
                    
                    // Scroll to top of content when switching tabs
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }

        // Handle 's' key for saving
        if (key === 's') {
            e.preventDefault();
            e.stopPropagation();
            
            const saveBtn = document.getElementById('save-btn');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.configKeyboard = new ConfigKeyboard();
    });
} else {
    window.configKeyboard = new ConfigKeyboard();
}

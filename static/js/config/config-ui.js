/**
 * UI Helper Functions
 * Handles tabs, number inputs, and notifications
 */

class ConfigUI {
    constructor() {
        this.initTabs();
        this.initNumberInputControls();
    }

    /**
     * Initialize tab switching functionality
     */
    initTabs() {
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

    /**
     * Initialize number input controls (up/down buttons)
     */
    initNumberInputControls() {
        const upButtons = document.querySelectorAll('.number-input-up');
        const downButtons = document.querySelectorAll('.number-input-down');

        upButtons.forEach(button => {
            button.addEventListener('click', () => {
                const inputId = button.getAttribute('data-input');
                const input = document.getElementById(inputId);
                if (input) {
                    const currentValue = parseInt(input.value) || 0;
                    const max = parseInt(input.max) || Infinity;
                    if (currentValue < max) {
                        input.value = currentValue + 1;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        });

        downButtons.forEach(button => {
            button.addEventListener('click', () => {
                const inputId = button.getAttribute('data-input');
                const input = document.getElementById(inputId);
                if (input) {
                    const currentValue = parseInt(input.value) || 0;
                    const min = parseInt(input.min) || -Infinity;
                    if (currentValue > min) {
                        input.value = currentValue - 1;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        });
    }

    /**
     * Show notification message
     * @param {string} message - The message to display
     * @param {string} type - Type of notification ('success' or 'error')
     */
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        if (!notification || !notificationMessage) return;

        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Update status options visibility based on showStatus setting
     * @param {boolean} showStatus - Whether status is enabled
     */
    updateStatusOptionsVisibility(showStatus) {
        const showPingCheckbox = document.getElementById('show-ping-checkbox');
        const showPingLabel = showPingCheckbox ? showPingCheckbox.closest('.checkbox-tree-item') : null;
        
        if (showPingLabel) {
            showPingLabel.style.display = showStatus ? 'flex' : 'none';
        }
    }
}

// Export for use in other modules
window.ConfigUI = ConfigUI;

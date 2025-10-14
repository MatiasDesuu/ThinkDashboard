/**
 * Custom Terminal-Style Select Component
 * Converts standard <select> elements into custom terminal-themed dropdowns
 */

class CustomSelect {
    constructor(selectElement) {
        this.originalSelect = selectElement;
        this.wrapper = null;
        this.trigger = null;
        this.optionsContainer = null;
        this.isOpen = false;
        this.openedWithKeyboard = false;
        
        this.init();
    }

    init() {
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';
        
        // Create custom select structure
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';
        
        // Create trigger
        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        this.trigger.tabIndex = 0;
        
        const selectedText = document.createElement('span');
        selectedText.className = 'custom-select-text';
        selectedText.textContent = this.getSelectedOptionText();
        
        const arrow = document.createElement('span');
        arrow.className = 'custom-select-arrow';
        arrow.textContent = '▼';
        
        this.trigger.appendChild(selectedText);
        this.trigger.appendChild(arrow);
        
        // Create options container
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'custom-select-options';
        
        this.populateOptions();
        
        // Assemble structure
        customSelect.appendChild(this.trigger);
        customSelect.appendChild(this.optionsContainer);
        this.wrapper.appendChild(customSelect);
        
        // Insert wrapper before original select
        this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect);
        this.wrapper.appendChild(this.originalSelect);
        
        // Setup event listeners
        this.setupEventListeners();
    }

    getSelectedOptionText() {
        const selectedOption = this.originalSelect.options[this.originalSelect.selectedIndex];
        return selectedOption ? selectedOption.textContent : '';
    }

    populateOptions() {
        this.optionsContainer.innerHTML = '';
        
        Array.from(this.originalSelect.options).forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-select-option';
            optionDiv.textContent = option.textContent;
            optionDiv.dataset.value = option.value;
            optionDiv.dataset.index = index;
            optionDiv.tabIndex = -1; // Prevent tab navigation to options
            
            if (option.selected) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(index);
            });
            
            this.optionsContainer.appendChild(optionDiv);
        });
    }

    selectOption(index) {
        // Update original select
        this.originalSelect.selectedIndex = index;
        
        // Trigger change event on original select
        const event = new Event('change', { bubbles: true });
        this.originalSelect.dispatchEvent(event);
        
        // Update UI
        this.updateTriggerText();
        this.updateSelectedOption();
        this.close();
        
        // Reset keyboard flag
        this.openedWithKeyboard = false;
    }

    updateTriggerText() {
        const selectedText = this.trigger.querySelector('.custom-select-text');
        selectedText.textContent = this.getSelectedOptionText();
    }

    updateSelectedOption() {
        const options = this.optionsContainer.querySelectorAll('.custom-select-option');
        options.forEach((option, index) => {
            if (index === this.originalSelect.selectedIndex) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    highlightOption(index) {
        const options = this.optionsContainer.querySelectorAll('.custom-select-option');
        options.forEach((option, i) => {
            if (i === index) {
                option.classList.add('highlighted');
                // Scroll the highlighted option into view
                option.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
                option.classList.remove('highlighted');
            }
        });
    }

    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.wrapper.querySelector('.custom-select').classList.add('open');
        
        // Remove tabindex from trigger when open to allow tab navigation to work
        this.trigger.tabIndex = -1;
        
        // Highlight the currently selected option or first option based on how it was opened
        if (this.openedWithKeyboard) {
            // When opened with keyboard, highlight the selected option
            this.highlightOption(this.originalSelect.selectedIndex);
        } else {
            // When opened with mouse/enter/space, highlight the selected option
            this.highlightOption(this.originalSelect.selectedIndex);
        }
        
        // Close other selects
        document.querySelectorAll('.custom-select.open').forEach(other => {
            const otherWrapper = other.closest('.custom-select-wrapper');
            if (!otherWrapper) return;
            if (otherWrapper === this.wrapper) return;

            // If the original select stored an instance, call its close() to keep state in sync
            const origSelect = otherWrapper.querySelector('select');
            try {
                if (origSelect && origSelect.__customSelectInstance && typeof origSelect.__customSelectInstance.close === 'function') {
                    origSelect.__customSelectInstance.close();
                } else {
                    other.classList.remove('open');
                }
            } catch (e) {
                other.classList.remove('open');
            }
        });
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.wrapper.querySelector('.custom-select').classList.remove('open');
        
        // Restore tabindex to trigger
        this.trigger.tabIndex = 0;
        
        // Remove highlight from all options
        const options = this.optionsContainer.querySelectorAll('.custom-select-option');
        options.forEach(option => option.classList.remove('highlighted'));
        
        // Reset keyboard flag
        this.openedWithKeyboard = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    setupEventListeners() {
        // Toggle on trigger pointerdown
        this.trigger.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Keyboard navigation
        this.trigger.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                const options = this.optionsContainer.querySelectorAll('.custom-select-option');
                let currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('highlighted'));
                
                // If no option is highlighted, use the selected one
                if (currentIndex === -1) {
                    currentIndex = this.originalSelect.selectedIndex;
                }
                
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % options.length;
                        this.highlightOption(nextIndex);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
                        this.highlightOption(prevIndex);
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.selectOption(currentIndex);
                        break;
                    case 'Escape':
                        this.close();
                        break;
                }
            } else {
                // Handle opening with keyboard when closed
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        e.stopPropagation();
                        this.openedWithKeyboard = false;
                        this.toggle();
                        break;
                    case 'ArrowDown':
                        if (!this.isOpen) {
                            e.preventDefault();
                            this.openedWithKeyboard = true;
                            this.open();
                        }
                        break;
                    case 'ArrowUp':
                        if (!this.isOpen) {
                            e.preventDefault();
                            this.openedWithKeyboard = true;
                            this.open();
                        }
                        break;
                }
            }
        });

        // Handle tab when open (close dropdown and allow normal tab navigation)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isOpen) {
                e.preventDefault();
                this.close();
                // Use setTimeout to ensure the dropdown is fully closed before moving focus
                setTimeout(() => {
                    // Find the next focusable element after the original select
                    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
                    const allFocusable = Array.from(document.querySelectorAll(focusableElements));
                    const selectIndex = allFocusable.indexOf(this.originalSelect);
                    if (selectIndex >= 0 && selectIndex < allFocusable.length - 1) {
                        allFocusable[selectIndex + 1].focus();
                    }
                }, 0);
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Update when original select changes programmatically
        this.originalSelect.addEventListener('change', () => {
            this.updateTriggerText();
            this.updateSelectedOption();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    // Method to update options if the original select changes
    refresh() {
        this.populateOptions();
        this.updateTriggerText();
    }

    // Destroy the custom select and restore original
    destroy() {
        this.wrapper.parentNode.insertBefore(this.originalSelect, this.wrapper);
        this.wrapper.remove();
    }
}

// Auto-initialize all select elements with a specific class or data attribute
function initCustomSelects(selector = 'select:not([data-no-custom])') {
    const selects = document.querySelectorAll(selector);
    const instances = [];
    
    selects.forEach(select => {
        // Skip if already initialized
        if (select.dataset.customSelectInit) return;
        
        select.dataset.customSelectInit = 'true';
        const instance = new CustomSelect(select);
        // Keep a reference to the CustomSelect instance on the original element
        try { select.__customSelectInstance = instance; } catch (e) { /* ignore */ }
        instances.push(instance);
    });
    
    return instances;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CustomSelect, initCustomSelects };
}

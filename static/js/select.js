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

    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.wrapper.querySelector('.custom-select').classList.add('open');
        
        // Close other selects
        document.querySelectorAll('.custom-select.open').forEach(select => {
            if (select !== this.wrapper.querySelector('.custom-select')) {
                select.classList.remove('open');
            }
        });
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.wrapper.querySelector('.custom-select').classList.remove('open');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    setupEventListeners() {
        // Toggle on trigger click
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Update when original select changes programmatically
        this.originalSelect.addEventListener('change', () => {
            this.updateTriggerText();
            this.updateSelectedOption();
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
        instances.push(instance);
    });
    
    return instances;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CustomSelect, initCustomSelects };
}

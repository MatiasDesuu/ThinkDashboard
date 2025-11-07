/**
 * Finders Module
 * Handles finder management (create, render, remove, reorder)
 */

class ConfigFinders {
    constructor(t) {
        this.t = t; // Translation function
        this.finderReorder = null;
    }

    /**
     * Render finders list
     * @param {Array} finders
     */
    render(finders) {
        const container = document.getElementById('finders-list');
        if (!container) return;

        container.innerHTML = '';

        finders.forEach((finder, index) => {
            const finderElement = this.createFinderElement(finder, index, finders);
            container.appendChild(finderElement);
        });
    }

    /**
     * Create a finder DOM element
     * @param {Object} finder
     * @param {number} index
     * @param {Array} finders - Reference to finders array
     * @returns {HTMLElement}
     */
    createFinderElement(finder, index, finders) {
        const div = document.createElement('div');
        div.className = 'finder-item js-item is-idle';
        div.setAttribute('data-finder-index', index);
        div.setAttribute('data-finder-key', index);

        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" id="finder-name-${index}" name="finder-name-${index}" value="${finder.name}" placeholder="${this.t('config.finderNamePlaceholder')}" data-finder-key="${index}" data-field="name">
            <input type="url" id="finder-url-${index}" name="finder-url-${index}" value="${finder.searchUrl}" placeholder="${this.t('config.finderUrlPlaceholder')}" data-finder-key="${index}" data-field="searchUrl">
            <input type="text" id="finder-shortcut-${index}" name="finder-shortcut-${index}" value="${finder.shortcut || ''}" placeholder="${this.t('config.finderShortcutPlaceholder')}" maxlength="10" data-finder-key="${index}" data-field="shortcut">
            <button type="button" class="btn btn-danger" onclick="configManager.removeFinder(${index})">${this.t('config.remove')}</button>
        `;

        // Store reference to the actual finder object
        div._finderRef = finder;
        
        // Add event listeners for field changes
        const inputs = div.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                finder[field] = e.target.value;
                
                // Convert shortcut to lowercase for finders
                if (field === 'shortcut') {
                    e.target.value = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
                    finder[field] = e.target.value;
                }
            });
        });

        return div;
    }

    /**
     * Initialize finder reordering
     * @param {Array} finders
     * @param {Function} onReorder - Callback when reorder happens
     */
    initReorder(finders, onReorder) {
        // Destroy previous instance if it exists
        if (this.finderReorder) {
            this.finderReorder.destroy();
        }
        
        // Initialize drag-and-drop reordering
        this.finderReorder = new DragReorder({
            container: '#finders-list',
            itemSelector: '.finder-item',
            handleSelector: '.js-drag-handle',
            onReorder: (newOrder) => {
                const newFinders = [];
                newOrder.forEach((item) => {
                    const finder = item.element._finderRef;
                    if (finder) {
                        newFinders.push(finder);
                    }
                });
                
                onReorder(newFinders);
            }
        });
    }

    /**
     * Add a new finder
     * @param {Array} finders
     * @returns {Object} - The new finder
     */
    add(finders) {
        const newFinder = {
            name: `${this.t('config.newFinderPrefix')} ${finders.length + 1}`,
            searchUrl: 'https://example.com/?q=%s',
            shortcut: ''
        };
        finders.push(newFinder);
        return newFinder;
    }

    /**
     * Remove a finder (with confirmation)
     * @param {Array} finders
     * @param {number} index
     * @returns {Promise<boolean>} - Whether the finder was removed
     */
    async remove(finders, index) {
        const confirmed = await window.AppModal.danger({
            title: this.t('config.removeFinderTitle'),
            message: this.t('config.removeFinderMessage'),
            confirmText: this.t('config.remove'),
            cancelText: this.t('config.cancel')
        });
        
        if (!confirmed) {
            return false;
        }
        
        finders.splice(index, 1);
        return true;
    }
}

// Export for use in other modules
window.ConfigFinders = ConfigFinders;
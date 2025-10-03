/**
 * Categories Module
 * Handles category management (create, render, remove, reorder)
 */

class ConfigCategories {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // Callback when categories are updated
        this.categoryReorder = null;
    }

    /**
     * Render categories list
     * @param {Array} categories
     * @param {Function} generateId - Function to generate ID from name
     */
    render(categories, generateId) {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = '';

        categories.forEach((category, index) => {
            const categoryElement = this.createCategoryElement(category, index, categories, generateId);
            container.appendChild(categoryElement);
        });
    }

    /**
     * Create a category DOM element
     * @param {Object} category
     * @param {number} index
     * @param {Array} categories - Reference to categories array
     * @param {Function} generateId
     * @returns {HTMLElement}
     */
    createCategoryElement(category, index, categories, generateId) {
        const div = document.createElement('div');
        div.className = 'category-item js-item is-idle';
        div.setAttribute('data-category-index', index);
        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" id="category-name-${index}" name="category-name-${index}" value="${category.name}" placeholder="Category name" data-category-index="${index}" data-field="name">
            <button type="button" class="btn btn-danger" onclick="configManager.removeCategory(${index})">Remove</button>
        `;

        // Add event listener for name changes
        const nameInput = div.querySelector('input[data-field="name"]');
        nameInput.addEventListener('input', (e) => {
            categories[index].name = e.target.value;
            categories[index].id = generateId(e.target.value);
        });

        return div;
    }

    /**
     * Initialize category reordering
     * @param {Array} categories
     * @param {Function} onReorder - Callback when reorder happens
     */
    initReorder(categories, onReorder) {
        // Destroy previous instance if it exists
        if (this.categoryReorder) {
            this.categoryReorder.destroy();
        }
        
        // Initialize drag-and-drop reordering
        this.categoryReorder = new DragReorder({
            container: '#categories-list',
            itemSelector: '.category-item',
            handleSelector: '.js-drag-handle',
            onReorder: (newOrder) => {
                // Update categories array based on new order
                const newCategories = [];
                newOrder.forEach((item) => {
                    const categoryIndex = parseInt(item.element.getAttribute('data-category-index'));
                    newCategories.push(categories[categoryIndex]);
                });
                
                onReorder(newCategories);
            }
        });
    }

    /**
     * Add a new category
     * @param {Array} categories
     * @param {Function} generateId
     * @returns {Object} - The new category
     */
    add(categories, generateId) {
        const newCategory = {
            id: generateId(`category-${categories.length + 1}`),
            name: `New Category ${categories.length + 1}`
        };
        categories.push(newCategory);
        return newCategory;
    }

    /**
     * Remove a category (with confirmation)
     * @param {Array} categories
     * @param {number} index
     * @returns {Promise<boolean>} - Whether the category was removed
     */
    async remove(categories, index) {
        const confirmed = await window.AppModal.danger({
            title: 'Remove Category',
            message: 'Are you sure you want to remove this category? This action cannot be undone.',
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return false;
        }
        
        categories.splice(index, 1);
        return true;
    }
}

// Export for use in other modules
window.ConfigCategories = ConfigCategories;

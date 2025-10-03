/**
 * Pages Module
 * Handles page management (create, render, remove, reorder)
 */

class ConfigPages {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // Callback when pages are updated
        this.pageReorder = null;
    }

    /**
     * Render pages list
     * @param {Array} pages
     * @param {Function} generateId - Function to generate ID from name
     */
    render(pages, generateId) {
        const container = document.getElementById('pages-list');
        if (!container) return;

        container.innerHTML = '';

        pages.forEach((page, index) => {
            const pageElement = this.createPageElement(page, index, pages, generateId);
            container.appendChild(pageElement);
        });
    }

    /**
     * Render pages in page selector dropdown
     * @param {Array} pages
     * @param {string} currentPageId - Currently selected page ID
     */
    renderPageSelector(pages, currentPageId) {
        const selector = document.getElementById('page-selector');
        if (!selector) return;

        selector.innerHTML = '';

        pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.id;
            option.textContent = page.name;
            if (page.id === currentPageId) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }

    /**
     * Create a page DOM element
     * @param {Object} page
     * @param {number} index
     * @param {Array} pages - Reference to pages array
     * @param {Function} generateId
     * @returns {HTMLElement}
     */
    createPageElement(page, index, pages, generateId) {
        const div = document.createElement('div');
        div.className = 'page-item js-item is-idle';
        div.setAttribute('data-page-index', index);
        
        const isDefaultPage = page.id === 'default';
        const removeButton = isDefaultPage 
            ? '<button type="button" class="btn btn-danger" disabled title="Cannot remove default page">Remove</button>'
            : `<button type="button" class="btn btn-danger" onclick="configManager.removePage(${index})">Remove</button>`;
        
        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" id="page-name-${index}" name="page-name-${index}" value="${page.name}" placeholder="Page name" data-page-index="${index}" data-field="name">
            ${removeButton}
        `;

        // Add event listener for name changes (allow editing all pages now)
        const nameInput = div.querySelector('input[data-field="name"]');
        nameInput.addEventListener('input', (e) => {
            pages[index].name = e.target.value;
            // Only update ID if not the default page
            if (!isDefaultPage) {
                pages[index].id = generateId(e.target.value);
            }
        });

        return div;
    }

    /**
     * Initialize page reordering
     * @param {Array} pages
     * @param {Function} onReorder - Callback when reorder happens
     */
    initReorder(pages, onReorder) {
        // Destroy previous instance if it exists
        if (this.pageReorder) {
            this.pageReorder.destroy();
        }
        
        // Initialize drag-and-drop reordering
        this.pageReorder = new DragReorder({
            container: '#pages-list',
            itemSelector: '.page-item',
            handleSelector: '.js-drag-handle',
            onReorder: (newOrder) => {
                // Update pages array based on new order
                const newPages = [];
                newOrder.forEach((item) => {
                    const pageIndex = parseInt(item.element.getAttribute('data-page-index'));
                    newPages.push(pages[pageIndex]);
                });
                
                onReorder(newPages);
            }
        });
    }

    /**
     * Add a new page
     * @param {Array} pages
     * @param {Function} generateId
     * @returns {Object} - The new page
     */
    add(pages, generateId) {
        const newPage = {
            id: generateId(`page-${pages.length + 1}`),
            name: `page ${pages.length + 1}`
        };
        pages.push(newPage);
        return newPage;
    }

    /**
     * Remove a page
     * @param {Array} pages
     * @param {number} index
     * @returns {boolean} - Whether removal was successful
     */
    remove(pages, index) {
        if (index >= 0 && index < pages.length) {
            // Don't allow removing the default page
            if (pages[index].id === 'default') {
                return false;
            }
            pages.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Destroy reorder instance
     */
    destroy() {
        if (this.pageReorder) {
            this.pageReorder.destroy();
            this.pageReorder = null;
        }
    }
}

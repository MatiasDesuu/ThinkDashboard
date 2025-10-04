/**
 * Bookmarks Module
 * Handles bookmark ma        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" id="bookmark-name-${index}" name="bookmark-name-${index}" value="${bookmark.name}" placeholder="Bookmark name" data-bookmark-index="${index}" data-field="name">
            <input type="url" id="bookmark-url-${index}" name="bookmark-url-${index}" value="${bookmark.url}" placeholder="https://example.com" data-bookmark-index="${index}" data-field="url">
            <input type="text" id="bookmark-shortcut-${index}" name="bookmark-shortcut-${index}" value="${bookmark.shortcut || ''}" placeholder="Letters only (Y, GH, YT)" maxlength="5" data-bookmark-index="${index}" data-field="shortcut">
            <select id="bookmark-category-${index}" name="bookmark-category-${index}" data-bookmark-index="${index}" data-field="category">
                <option value="">No category</option>
                ${categoryOptions}
            </select>`(create, render, remove, reorder)
 */

class ConfigBookmarks {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // Callback when bookmarks are updated
        this.bookmarkReorder = null;
    }

    /**
     * Render bookmarks list
     * @param {Array} bookmarks
     * @param {Array} categories
     */
    render(bookmarks, categories) {
        const container = document.getElementById('bookmarks-list');
        if (!container) return;

        container.innerHTML = '';

        bookmarks.forEach((bookmark, index) => {
            const bookmarkElement = this.createBookmarkElement(bookmark, index, bookmarks, categories);
            container.appendChild(bookmarkElement);
        });
    }

    /**
     * Create a bookmark DOM element
     * @param {Object} bookmark
     * @param {number} index
     * @param {Array} bookmarks - Reference to bookmarks array
     * @param {Array} categories
     * @returns {HTMLElement}
     */
    createBookmarkElement(bookmark, index, bookmarks, categories) {
        const div = document.createElement('div');
        div.className = 'bookmark-item js-item is-idle';
        div.setAttribute('data-bookmark-index', index);
        // Use index as a stable identifier since bookmarks don't have IDs
        div.setAttribute('data-bookmark-key', index);

        // Create category options
        const categoryOptions = categories.map(cat => 
            `<option value="${cat.id}" ${cat.id === bookmark.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');

        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" id="bookmark-name-${index}" name="bookmark-name-${index}" value="${bookmark.name}" placeholder="Bookmark name" data-bookmark-key="${index}" data-field="name">
            <input type="url" id="bookmark-url-${index}" name="bookmark-url-${index}" value="${bookmark.url}" placeholder="https://example.com" data-bookmark-key="${index}" data-field="url">
            <input type="text" id="bookmark-shortcut-${index}" name="bookmark-shortcut-${index}" value="${bookmark.shortcut || ''}" placeholder="Keys (Y, YS, YC)" maxlength="5" data-bookmark-key="${index}" data-field="shortcut">
            <select id="bookmark-category-${index}" name="bookmark-category-${index}" data-bookmark-key="${index}" data-field="category">
                <option value="">No category</option>
                ${categoryOptions}
            </select>
            <div class="bookmark-status-toggle">
                <label class="checkbox-label">
                    <input type="checkbox" id="bookmark-checkStatus-${index}" name="bookmark-checkStatus-${index}" ${bookmark.checkStatus ? 'checked' : ''} data-bookmark-key="${index}" data-field="checkStatus">
                    <span class="checkbox-text">status</span>
                </label>
            </div>
            <button type="button" class="btn btn-danger" onclick="configManager.removeBookmark(${index})">Remove</button>
        `;

        // Store reference to the actual bookmark object
        div._bookmarkRef = bookmark;
        
        // Add event listeners for field changes
        const inputs = div.querySelectorAll('input, select');
        inputs.forEach(input => {
            const eventType = input.type === 'text' || input.type === 'url' ? 'input' : 'change';
            input.addEventListener(eventType, (e) => {
                const field = e.target.getAttribute('data-field');
                
                // Update the bookmark object directly via stored reference
                if (field === 'checkStatus') {
                    bookmark[field] = e.target.checked;
                } else {
                    bookmark[field] = e.target.value;
                }
                
                // Convert shortcut to uppercase and allow only letters (no numbers)
                if (field === 'shortcut') {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    bookmark[field] = e.target.value;
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

    /**
     * Initialize bookmark reordering
     * @param {Array} bookmarks
     * @param {Function} onReorder - Callback when reorder happens
     */
    initReorder(bookmarks, onReorder) {
        // Destroy previous instance if it exists
        if (this.bookmarkReorder) {
            this.bookmarkReorder.destroy();
        }
        
        // Initialize drag-and-drop reordering
        this.bookmarkReorder = new DragReorder({
            container: '#bookmarks-list',
            itemSelector: '.bookmark-item',
            handleSelector: '.js-drag-handle',
            onReorder: (newOrder) => {
                // Update bookmarks array based on new order
                // Use stored bookmark references instead of indices
                const newBookmarks = [];
                newOrder.forEach((item) => {
                    // Get the bookmark object stored on the DOM element
                    const bookmark = item.element._bookmarkRef;
                    if (bookmark) {
                        newBookmarks.push(bookmark);
                    }
                });
                
                onReorder(newBookmarks);
            }
        });
    }

    /**
     * Add a new bookmark
     * @param {Array} bookmarks
     * @returns {Object} - The new bookmark
     */
    add(bookmarks) {
        const newBookmark = {
            name: `New Bookmark ${bookmarks.length + 1}`,
            url: 'https://example.com',
            shortcut: '',
            category: '',
            checkStatus: false
        };
        bookmarks.push(newBookmark);
        return newBookmark;
    }

    /**
     * Remove a bookmark (with confirmation)
     * @param {Array} bookmarks
     * @param {number} index
     * @returns {Promise<boolean>} - Whether the bookmark was removed
     */
    async remove(bookmarks, index) {
        const confirmed = await window.AppModal.danger({
            title: 'Remove Bookmark',
            message: 'Are you sure you want to remove this bookmark? This action cannot be undone.',
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) {
            return false;
        }
        
        bookmarks.splice(index, 1);
        return true;
    }
}

// Export for use in other modules
window.ConfigBookmarks = ConfigBookmarks;

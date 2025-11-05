/**
 * Bookmarks Module
 * Handles bookmark management (create, render, remove, reorder)
 */

class ConfigBookmarks {
    constructor(t) {
        this.t = t; // Translation function
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
        const cats = Array.isArray(categories) ? categories : [];
        const categoryOptions = cats.map(cat => 
            `<option value="${cat.id}" ${cat.id === bookmark.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');

        div.innerHTML = `
            <span class="drag-handle js-drag-handle" title="Drag to reorder">⠿</span>
            <button type="button" class="btn btn-secondary btn-small" onclick="configManager.moveBookmark(${index})" title="${this.t('config.moveBookmark')}">→</button>
            <input type="text" id="bookmark-name-${index}" name="bookmark-name-${index}" value="${bookmark.name}" placeholder="${this.t('config.bookmarkNamePlaceholder')}" data-bookmark-key="${index}" data-field="name">
            <input type="url" id="bookmark-url-${index}" name="bookmark-url-${index}" value="${bookmark.url}" placeholder="${this.t('config.bookmarkUrlPlaceholder')}" data-bookmark-key="${index}" data-field="url">
            <input type="text" id="bookmark-shortcut-${index}" name="bookmark-shortcut-${index}" value="${bookmark.shortcut || ''}" placeholder="${this.t('config.bookmarkShortcutPlaceholder')}" maxlength="5" data-bookmark-key="${index}" data-field="shortcut">
            <div class="bookmark-icon-upload">
                <input type="file" id="bookmark-icon-${index}" name="bookmark-icon-${index}" accept="image/*" style="display: none;" data-bookmark-key="${index}">
                <button type="button" class="btn btn-secondary btn-small ${bookmark.icon ? 'has-icon' : ''}" onclick="document.getElementById('bookmark-icon-${index}').click()" title="${this.t('config.uploadIconTooltip')}">↑</button>
                ${bookmark.icon ? `<button type="button" class="btn btn-danger btn-small btn-clear-icon" onclick="window.configBookmarks.clearIcon(${index})" title="${this.t('config.clearIcon')}">×</button>` : ''}
            </div>
            <select id="bookmark-category-${index}" name="bookmark-category-${index}" data-bookmark-key="${index}" data-field="category">
                <option value="">${this.t('config.noCategory')}</option>
                ${categoryOptions}
            </select>
            <div class="bookmark-status-toggle">
                <label class="checkbox-label">
                    <input type="checkbox" id="bookmark-checkStatus-${index}" name="bookmark-checkStatus-${index}" ${bookmark.checkStatus ? 'checked' : ''} data-bookmark-key="${index}" data-field="checkStatus">
                    <span class="checkbox-text">${this.t('config.status')}</span>
                </label>
            </div>
            <button type="button" class="btn btn-danger" onclick="configManager.removeBookmark(${index})">${this.t('config.remove')}</button>
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

        // Add event listener for icon upload
        const iconInput = div.querySelector(`#bookmark-icon-${index}`);
        const iconButton = div.querySelector('.bookmark-icon-upload button');
        if (iconInput && iconButton) {
            iconInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('icon', file);

                    try {
                        const response = await fetch('/api/icon', {
                            method: 'POST',
                            body: formData
                        });
                        const result = await response.json();
                        if (result.status === 'success') {
                            bookmark.icon = result.icon;
                            iconButton.classList.add('has-icon');
                            
                            // Add clear button if it doesn't exist
                            let clearButton = div.querySelector('.btn-clear-icon');
                            if (!clearButton) {
                                clearButton = document.createElement('button');
                                clearButton.type = 'button';
                                clearButton.className = 'btn btn-danger btn-small btn-clear-icon';
                                clearButton.onclick = () => window.configBookmarks.clearIcon(index);
                                clearButton.title = window.configBookmarks ? window.configBookmarks.t('config.clearIcon') : 'Clear icon';
                                clearButton.textContent = '×';
                                iconButton.parentNode.appendChild(clearButton);
                            }
                        } else {
                            alert('Error uploading icon');
                        }
                    } catch (error) {
                        console.error('Error uploading icon:', error);
                        alert('Error uploading icon');
                    }
                }
            });
        }

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
            name: `${this.t('config.newBookmarkPrefix')} ${bookmarks.length + 1}`,
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
            title: this.t('config.removeBookmarkTitle'),
            message: this.t('config.removeBookmarkMessage'),
            confirmText: this.t('config.remove'),
            cancelText: this.t('config.cancel')
        });
        
        if (!confirmed) {
            return false;
        }
        
        bookmarks.splice(index, 1);
        return true;
    }

    /**
     * Clear the icon from a bookmark
     * @param {number} index - The index of the bookmark to clear the icon from
     */
    clearIcon(index) {
        // Find the bookmark element
        const bookmarkElement = document.querySelector(`[data-bookmark-index="${index}"]`);
        if (!bookmarkElement || !bookmarkElement._bookmarkRef) {
            return;
        }

        const bookmark = bookmarkElement._bookmarkRef;
        
        // Clear the icon
        bookmark.icon = '';
        
        // Update the button styling
        const iconButton = bookmarkElement.querySelector('.bookmark-icon-upload button');
        if (iconButton) {
            iconButton.classList.remove('has-icon');
        }
        
        // Remove the clear button
        const clearButton = bookmarkElement.querySelector('.btn-clear-icon');
        if (clearButton) {
            clearButton.remove();
        }
    }
}

// Export for use in other modules
window.ConfigBookmarks = ConfigBookmarks;

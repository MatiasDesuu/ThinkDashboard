/**
 * DragReorder - A simple drag-and-drop reordering system using native HTML5 API
 * 
 * Usage:
 * const reorder = new DragReorder({
 *   container: '#my-list',           // Container selector
 *   itemSelector: '.my-item',        // Item selector (optional, defaults to children)
 *   handleSelector: '.drag-handle',  // Drag handle selector (optional, makes entire item draggable if not provided)
 *   onReorder: (newOrder) => {       // Callback when order changes
 *     console.log('New order:', newOrder);
 *   }
 * });
 */

class DragReorder {
    constructor(options = {}) {
        this.container = typeof options.container === 'string' 
            ? document.querySelector(options.container) 
            : options.container;
        
        if (!this.container) {
            console.error('DragReorder: Container not found');
            return;
        }

        this.itemSelector = options.itemSelector || null;
        this.handleSelector = options.handleSelector || null;
        this.onReorder = options.onReorder || null;
        this.itemClass = 'reorder-item';
        this.selected = null;
        this.isTouch = 'ontouchstart' in window;
        
        // Bind handlers
        this.touchStartHandler = (e) => this.touchStart(e);
        this.touchMoveHandler = (e) => this.touchMove(e);
        this.touchEndHandler = (e) => this.touchEnd(e);
        this.preventDrop = (e) => e.preventDefault();
        
        this.init();
    }

    init() {
        // Add reorder-container class to container
        this.container.classList.add('reorder-container');
        
        // Initialize items
        this.refreshItems();
    }

    refreshItems() {
        // Add item class and idle class, make handles draggable or add touch listeners
        this.getAllItems().forEach(item => {
            if (!item.classList.contains(this.itemClass)) {
                item.classList.add(this.itemClass);
            }
            if (!item.classList.contains('is-idle')) {
                item.classList.add('is-idle');
            }
            const element = this.handleSelector ? item.querySelector(this.handleSelector) : item;
            if (element) {
                if (this.isTouch) {
                    element.addEventListener('touchstart', this.touchStartHandler, { passive: false });
                    element.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
                    element.addEventListener('touchend', this.touchEndHandler);
                } else {
                    element.draggable = true;
                    element.ondragstart = (e) => this.dragStart(e);
                    element.ondragend = (e) => this.dragEnd(e);
                }
            }
            // Add dragover to item for mouse drag
            if (!this.isTouch) {
                item.ondragover = (e) => this.dragOver(e);
            }
        });
    }

    dragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        this.selected = e.target.closest(`.${this.itemClass}`);
        this.selected.classList.remove('is-idle');
        this.selected.classList.add('is-draggable');
        
        // Prevent scrolling on touch devices
        this.disablePageScroll();
        
        // Prevent dropping anywhere else
        document.addEventListener('dragover', this.preventDrop, { passive: false });
    }

    dragOver(e) {
        e.preventDefault();
        const targetItem = e.target.closest(`.${this.itemClass}`);
        if (!targetItem || targetItem === this.selected) return;
        if (this.isBefore(this.selected, targetItem)) {
            targetItem.parentNode.insertBefore(this.selected, targetItem);
        } else {
            targetItem.parentNode.insertBefore(this.selected, targetItem.nextSibling);
        }
    }

    dragEnd() {
        this.selected.classList.remove('is-draggable');
        this.selected.classList.add('is-idle');
        this.enablePageScroll();
        document.removeEventListener('dragover', this.preventDrop);
        this.selected = null;
        // Call the onReorder callback with the new order
        if (this.onReorder && typeof this.onReorder === 'function') {
            this.onReorder(this.getNewOrder());
        }
    }

    touchStart(e) {
        e.preventDefault();
        this.selected = e.target.closest(`.${this.itemClass}`);
        this.selected.classList.remove('is-idle');
        this.selected.classList.add('is-draggable');
        this.disablePageScroll();
    }
    touchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const targetItem = document.elementFromPoint(touch.clientX, touch.clientY).closest(`.${this.itemClass}`);
        if (targetItem && targetItem !== this.selected && targetItem.parentNode === this.selected.parentNode) {
            if (this.isBefore(this.selected, targetItem)) {
                targetItem.parentNode.insertBefore(this.selected, targetItem);
            } else {
                targetItem.parentNode.insertBefore(this.selected, targetItem.nextSibling);
            }
        }
    }

    touchEnd(e) {
        this.selected.classList.remove('is-draggable');
        this.selected.classList.add('is-idle');
        this.enablePageScroll();
        this.selected = null;
        // Call the onReorder callback with the new order
        if (this.onReorder && typeof this.onReorder === 'function') {
            this.onReorder(this.getNewOrder());
        }
    }

    isBefore(el1, el2) {
        let cur;
        if (el2.parentNode === el1.parentNode) {
            for (cur = el1.previousSibling; cur; cur = cur.previousSibling) {
                if (cur === el2) return true;
            }
        }
        return false;
    }

    disablePageScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
    }

    enablePageScroll() {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
    }

    getAllItems() {
        if (this.itemSelector) {
            return Array.from(this.container.querySelectorAll(this.itemSelector));
        }
        return Array.from(this.container.children);
    }

    getNewOrder() {
        const items = this.getAllItems();
        return items.map((item, index) => ({
            element: item,
            index: index,
            dataIndex: item.getAttribute('data-index') || index
        }));
    }

    // Public method to destroy the instance
    destroy() {
        this.enablePageScroll();
        this.container.classList.remove('reorder-container');
        
        // Remove classes and listeners from items
        this.getAllItems().forEach(item => {
            item.classList.remove(this.itemClass, 'is-idle', 'is-draggable');
            const element = this.handleSelector ? item.querySelector(this.handleSelector) : item;
            if (element) {
                if (this.isTouch) {
                    element.removeEventListener('touchstart', this.touchStartHandler);
                    element.removeEventListener('touchmove', this.touchMoveHandler);
                    element.removeEventListener('touchend', this.touchEndHandler);
                } else {
                    element.draggable = false;
                    element.ondragstart = null;
                    element.ondragend = null;
                }
            }
            if (!this.isTouch) {
                item.ondragover = null;
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragReorder;
}

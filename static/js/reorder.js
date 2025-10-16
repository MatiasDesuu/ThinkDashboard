/**
 * DragReorder - A reusable drag-and-drop reordering system
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
        this.itemClass = options.itemClass || 'reorder-item';
        this.idleClass = 'is-idle';
        this.draggableClass = 'is-draggable';
        
        this.draggableItem = null;
        this.pointerStartY = 0;
        this.itemsGap = 0;
        
        this.init();
    }

    init() {
        // Add reorder-container class to container
        this.container.classList.add('reorder-container');
        
        // Add event listeners
        this.container.addEventListener('mousedown', (e) => this.dragStart(e));
        this.container.addEventListener('touchstart', (e) => this.dragStart(e), { passive: false });
        
        document.addEventListener('mouseup', () => this.dragEnd());
        document.addEventListener('touchend', () => this.dragEnd());
        
        // Initialize items
        this.refreshItems();
    }

    refreshItems() {
        // Add item class and idle class to all items
        this.getAllItems().forEach(item => {
            if (!item.classList.contains(this.itemClass)) {
                item.classList.add(this.itemClass);
            }
            if (!item.classList.contains(this.idleClass)) {
                item.classList.add(this.idleClass);
            }
        });
    }

    dragStart(e) {
        // Check if we're clicking on a handle or directly on an item
        let targetItem = null;
        
        if (this.handleSelector) {
            // If handle selector is provided, only drag when clicking the handle
            if (e.target.matches(this.handleSelector) || e.target.closest(this.handleSelector)) {
                const handle = e.target.matches(this.handleSelector) ? e.target : e.target.closest(this.handleSelector);
                targetItem = handle.closest(`.${this.itemClass}`);
            }
        } else {
            // If no handle selector, make entire item draggable
            targetItem = e.target.closest(`.${this.itemClass}`);
        }
        
        if (!targetItem || !this.container.contains(targetItem)) return;
        
        // Prevent default touch behavior to avoid scrolling
        e.preventDefault();
        
        this.draggableItem = targetItem;
        this.pointerStartY = e.clientY || e.touches[0].clientY;
        
        this.setItemsGap();
        this.disablePageScroll();
        this.initDraggableItem();
        this.initItemsState();
        
        this.boundDrag = (e) => this.drag(e);
        document.addEventListener('mousemove', this.boundDrag);
        document.addEventListener('touchmove', this.boundDrag, { passive: false });
    }

    setItemsGap() {
        const idleItems = this.getIdleItems();
        if (idleItems.length <= 1) {
            this.itemsGap = 0;
            return;
        }
        
        const item1Rect = idleItems[0].getBoundingClientRect();
        const item2Rect = idleItems[1].getBoundingClientRect();
        
        this.itemsGap = Math.abs(item1Rect.bottom - item2Rect.top);
    }

    disablePageScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
    }

    initItemsState() {
        const allItems = this.getAllItems();
        const draggableIndex = allItems.indexOf(this.draggableItem);
        
        this.getIdleItems().forEach((item) => {
            const itemIndex = allItems.indexOf(item);
            if (draggableIndex > itemIndex) {
                item.setAttribute('data-is-above', '');
            }
        });
    }

    initDraggableItem() {
        this.draggableItem.classList.remove(this.idleClass);
        this.draggableItem.classList.add(this.draggableClass);
    }

    drag(e) {
        if (!this.draggableItem) return;
        
        e.preventDefault();
        
        const clientY = e.clientY || e.touches[0].clientY;
        const pointerOffsetY = clientY - this.pointerStartY;
        
        this.draggableItem.style.transform = `translateY(${pointerOffsetY}px)`;
        
        this.updateIdleItemsStateAndPosition();
    }

    updateIdleItemsStateAndPosition() {
        const draggableItemRect = this.draggableItem.getBoundingClientRect();
        const draggableItemY = draggableItemRect.top + draggableItemRect.height / 2;
        
        // Update state
        this.getIdleItems().forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            const itemY = itemRect.top + itemRect.height / 2;
            
            if (this.isItemAbove(item)) {
                if (draggableItemY <= itemY) {
                    item.setAttribute('data-is-toggled', '');
                } else {
                    item.removeAttribute('data-is-toggled');
                }
            } else {
                if (draggableItemY >= itemY) {
                    item.setAttribute('data-is-toggled', '');
                } else {
                    item.removeAttribute('data-is-toggled');
                }
            }
        });
        
        // Update position
        this.getIdleItems().forEach((item) => {
            if (this.isItemToggled(item)) {
                const direction = this.isItemAbove(item) ? 1 : -1;
                item.style.transform = `translateY(${direction * (draggableItemRect.height + this.itemsGap)}px)`;
            } else {
                item.style.transform = '';
            }
        });
    }

    dragEnd() {
        if (!this.draggableItem) return;
        
        const newOrder = this.applyNewOrder();
        this.cleanup();
        
        // Call the onReorder callback with the new order
        if (this.onReorder && typeof this.onReorder === 'function') {
            this.onReorder(newOrder);
        }
    }

    applyNewOrder() {
        const allItems = this.getAllItems();
        const reorderedItems = [];
        
        allItems.forEach((item, index) => {
            if (item === this.draggableItem) {
                return;
            }
            if (!this.isItemToggled(item)) {
                reorderedItems[index] = item;
                return;
            }
            const newIndex = this.isItemAbove(item) ? index + 1 : index - 1;
            reorderedItems[newIndex] = item;
        });
        
        for (let index = 0; index < allItems.length; index++) {
            const item = reorderedItems[index];
            if (typeof item === 'undefined') {
                reorderedItems[index] = this.draggableItem;
            }
        }
        
        // Append items in new order
        reorderedItems.forEach((item) => {
            this.container.appendChild(item);
        });
        
        // Return the new order as indices or data attributes
        return reorderedItems.map((item, index) => ({
            element: item,
            index: index,
            dataIndex: item.getAttribute('data-index') || index
        }));
    }

    cleanup() {
        this.itemsGap = 0;
        this.unsetDraggableItem();
        this.unsetItemState();
        this.enablePageScroll();
        
        if (this.boundDrag) {
            document.removeEventListener('mousemove', this.boundDrag);
            document.removeEventListener('touchmove', this.boundDrag);
            this.boundDrag = null;
        }
    }

    unsetDraggableItem() {
        if (this.draggableItem) {
            this.draggableItem.style.transform = '';
            this.draggableItem.classList.remove(this.draggableClass);
            this.draggableItem.classList.add(this.idleClass);
            this.draggableItem = null;
        }
    }

    unsetItemState() {
        this.getIdleItems().forEach((item) => {
            item.removeAttribute('data-is-above');
            item.removeAttribute('data-is-toggled');
            item.style.transform = '';
        });
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

    getIdleItems() {
        return this.getAllItems().filter((item) => item.classList.contains(this.idleClass));
    }

    isItemAbove(item) {
        return item.hasAttribute('data-is-above');
    }

    isItemToggled(item) {
        return item.hasAttribute('data-is-toggled');
    }

    // Public method to destroy the instance
    destroy() {
        document.removeEventListener('mouseup', () => this.dragEnd());
        document.removeEventListener('touchend', () => this.dragEnd());
        
        if (this.boundDrag) {
            document.removeEventListener('mousemove', this.boundDrag);
            document.removeEventListener('touchmove', this.boundDrag);
        }
        
        this.container.classList.remove('reorder-container');
        
        // Remove classes from items
        this.getAllItems().forEach(item => {
            item.classList.remove(this.itemClass, this.idleClass, this.draggableClass);
            item.removeAttribute('data-is-above');
            item.removeAttribute('data-is-toggled');
            item.style.transform = '';
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragReorder;
}

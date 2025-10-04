// Keyboard Navigation Component for Dashboard
class KeyboardNavigation {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentIndex = -1; // -1 means no element selected
        this.navigableElements = [];
        this.isEnabled = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Update navigable elements when dashboard renders
        this.scheduleUpdate();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Don't handle if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Don't handle if search is active
            if (this.dashboard.searchComponent && this.dashboard.searchComponent.isActive()) {
                return;
            }

            // Don't handle if modifier keys are pressed (except Shift for now)
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            this.handleKeyPress(e);
        });

        // Update navigable elements when dashboard changes
        const observer = new MutationObserver(() => {
            this.scheduleUpdate();
        });

        const dashboardLayout = document.getElementById('dashboard-layout');
        if (dashboardLayout) {
            observer.observe(dashboardLayout, {
                childList: true,
                subtree: true
            });
        }
    }

    scheduleUpdate() {
        // Debounce updates to avoid excessive recalculations
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.updateNavigableElements();
        }, 100);
    }

    updateNavigableElements() {
        // Get all bookmark links in the dashboard
        const bookmarkElements = document.querySelectorAll('.bookmark-link');
        this.navigableElements = Array.from(bookmarkElements);
        
        // Reset current index if it's out of bounds
        if (this.currentIndex >= this.navigableElements.length) {
            this.currentIndex = -1;
        }
    }

    handleKeyPress(e) {
        const key = e.key;

        switch(key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateDown();
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                this.navigateUp();
                break;
            
            case 'ArrowRight':
                e.preventDefault();
                this.navigateRight();
                break;
            
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateLeft();
                break;
            
            case 'Enter':
            case ' ': // Space key
                e.preventDefault();
                this.selectCurrentElement();
                break;
            
            case 'Escape':
                e.preventDefault();
                this.clearSelection();
                break;
        }
    }

    navigateDown() {
        this.updateNavigableElements();
        
        if (this.navigableElements.length === 0) return;

        // Get current element position
        const currentElement = this.navigableElements[this.currentIndex];
        
        if (this.currentIndex === -1) {
            // No element selected, select the first one
            this.currentIndex = 0;
        } else {
            // Find the element below the current one
            const nextIndex = this.findElementBelow(currentElement);
            
            if (nextIndex !== -1) {
                this.currentIndex = nextIndex;
            } else {
                // If no element below, go to first element
                this.currentIndex = 0;
            }
        }
        
        this.highlightCurrentElement();
    }

    navigateUp() {
        this.updateNavigableElements();
        
        if (this.navigableElements.length === 0) return;

        // Get current element position
        const currentElement = this.navigableElements[this.currentIndex];
        
        if (this.currentIndex === -1) {
            // No element selected, select the last one
            this.currentIndex = this.navigableElements.length - 1;
        } else {
            // Find the element above the current one
            const prevIndex = this.findElementAbove(currentElement);
            
            if (prevIndex !== -1) {
                this.currentIndex = prevIndex;
            } else {
                // If no element above, go to last element
                this.currentIndex = this.navigableElements.length - 1;
            }
        }
        
        this.highlightCurrentElement();
    }

    navigateRight() {
        this.updateNavigableElements();
        
        if (this.navigableElements.length === 0) return;

        if (this.currentIndex === -1) {
            // No element selected, select the first one
            this.currentIndex = 0;
        } else {
            // Find the next element to the right on the same row
            const currentElement = this.navigableElements[this.currentIndex];
            const nextIndex = this.findElementRight(currentElement);
            
            if (nextIndex !== -1) {
                this.currentIndex = nextIndex;
            } else {
                // If no element to the right, wrap to beginning of next row or first element
                this.currentIndex = (this.currentIndex + 1) % this.navigableElements.length;
            }
        }
        
        this.highlightCurrentElement();
    }

    navigateLeft() {
        this.updateNavigableElements();
        
        if (this.navigableElements.length === 0) return;

        if (this.currentIndex === -1) {
            // No element selected, select the last one
            this.currentIndex = this.navigableElements.length - 1;
        } else {
            // Find the previous element to the left on the same row
            const currentElement = this.navigableElements[this.currentIndex];
            const prevIndex = this.findElementLeft(currentElement);
            
            if (prevIndex !== -1) {
                this.currentIndex = prevIndex;
            } else {
                // If no element to the left, wrap to end
                this.currentIndex = (this.currentIndex - 1 + this.navigableElements.length) % this.navigableElements.length;
            }
        }
        
        this.highlightCurrentElement();
    }

    findElementBelow(currentElement) {
        if (!currentElement) return 0;
        
        const currentRect = currentElement.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        
        let bestMatch = -1;
        let minDistance = Infinity;
        
        this.navigableElements.forEach((element, index) => {
            if (index === this.currentIndex) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            // Only consider elements below the current one
            if (rect.top > currentRect.bottom - 10) {
                const verticalDistance = rect.top - currentRect.bottom;
                const horizontalDistance = Math.abs(centerX - currentCenterX);
                
                // Prioritize vertical proximity, but consider horizontal alignment
                const distance = verticalDistance + (horizontalDistance * 0.5);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = index;
                }
            }
        });
        
        return bestMatch;
    }

    findElementAbove(currentElement) {
        if (!currentElement) return this.navigableElements.length - 1;
        
        const currentRect = currentElement.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        
        let bestMatch = -1;
        let minDistance = Infinity;
        
        this.navigableElements.forEach((element, index) => {
            if (index === this.currentIndex) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            // Only consider elements above the current one
            if (rect.bottom < currentRect.top + 10) {
                const verticalDistance = currentRect.top - rect.bottom;
                const horizontalDistance = Math.abs(centerX - currentCenterX);
                
                // Prioritize vertical proximity, but consider horizontal alignment
                const distance = verticalDistance + (horizontalDistance * 0.5);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = index;
                }
            }
        });
        
        return bestMatch;
    }

    findElementRight(currentElement) {
        if (!currentElement) return 0;
        
        const currentRect = currentElement.getBoundingClientRect();
        const currentCenterY = currentRect.top + currentRect.height / 2;
        
        let bestMatch = -1;
        let minDistance = Infinity;
        
        this.navigableElements.forEach((element, index) => {
            if (index === this.currentIndex) return;
            
            const rect = element.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            
            // Only consider elements to the right on approximately the same row
            if (rect.left > currentRect.right - 10) {
                const horizontalDistance = rect.left - currentRect.right;
                const verticalDistance = Math.abs(centerY - currentCenterY);
                
                // Only consider if roughly on the same row (within element height)
                if (verticalDistance < currentRect.height) {
                    if (horizontalDistance < minDistance) {
                        minDistance = horizontalDistance;
                        bestMatch = index;
                    }
                }
            }
        });
        
        return bestMatch;
    }

    findElementLeft(currentElement) {
        if (!currentElement) return this.navigableElements.length - 1;
        
        const currentRect = currentElement.getBoundingClientRect();
        const currentCenterY = currentRect.top + currentRect.height / 2;
        
        let bestMatch = -1;
        let minDistance = Infinity;
        
        this.navigableElements.forEach((element, index) => {
            if (index === this.currentIndex) return;
            
            const rect = element.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            
            // Only consider elements to the left on approximately the same row
            if (rect.right < currentRect.left + 10) {
                const horizontalDistance = currentRect.left - rect.right;
                const verticalDistance = Math.abs(centerY - currentCenterY);
                
                // Only consider if roughly on the same row (within element height)
                if (verticalDistance < currentRect.height) {
                    if (horizontalDistance < minDistance) {
                        minDistance = horizontalDistance;
                        bestMatch = index;
                    }
                }
            }
        });
        
        return bestMatch;
    }

    highlightCurrentElement() {
        // Remove previous highlights
        this.navigableElements.forEach(element => {
            element.classList.remove('keyboard-selected');
        });
        
        // Highlight current element
        if (this.currentIndex >= 0 && this.currentIndex < this.navigableElements.length) {
            const currentElement = this.navigableElements[this.currentIndex];
            currentElement.classList.add('keyboard-selected');
            
            // Scroll into view if needed
            currentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }

    selectCurrentElement() {
        if (this.currentIndex >= 0 && this.currentIndex < this.navigableElements.length) {
            const currentElement = this.navigableElements[this.currentIndex];
            
            // Trigger a click on the element
            currentElement.click();
        }
    }

    clearSelection() {
        this.navigableElements.forEach(element => {
            element.classList.remove('keyboard-selected');
        });
        
        this.currentIndex = -1;
    }

    // Public methods
    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        this.clearSelection();
    }

    isNavigating() {
        return this.currentIndex !== -1;
    }

    // Reset selection to first element (useful when changing pages)
    resetToFirst() {
        this.clearSelection();
        this.updateNavigableElements();
    }
}

// Export for use in other modules
window.KeyboardNavigation = KeyboardNavigation;

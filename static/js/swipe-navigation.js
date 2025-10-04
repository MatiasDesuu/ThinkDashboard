// Swipe Navigation for Page Switching
class SwipeNavigation {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50; // Minimum distance for a swipe to be detected
        this.maxVerticalMovement = 100; // Maximum vertical movement to still be considered a horizontal swipe
        this.isScrolling = false;
        
        this.init();
    }

    init() {
        // Add touch event listeners to the body
        document.body.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.body.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        document.body.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // Also add mouse events for testing on desktop
        document.body.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.body.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.body.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.isScrolling = false;
    }

    handleTouchMove(e) {
        // Detect if user is scrolling vertically
        const currentY = e.changedTouches[0].screenY;
        const diffY = Math.abs(currentY - this.touchStartY);
        
        if (diffY > 10) {
            this.isScrolling = true;
        }
    }

    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        this.handleSwipe();
    }

    handleMouseDown(e) {
        // Only track mouse events if not clicking on buttons or links
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
            return;
        }
        
        this.touchStartX = e.screenX;
        this.touchStartY = e.screenY;
        this.isScrolling = false;
        this.isMouseDown = true;
    }

    handleMouseMove(e) {
        if (!this.isMouseDown) return;
        
        const currentY = e.screenY;
        const diffY = Math.abs(currentY - this.touchStartY);
        
        if (diffY > 10) {
            this.isScrolling = true;
        }
    }

    handleMouseUp(e) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        this.touchEndX = e.screenX;
        this.touchEndY = e.screenY;
        this.handleSwipe();
    }

    handleSwipe() {
        // Don't process if user was scrolling vertically
        if (this.isScrolling) {
            return;
        }

        const horizontalDistance = this.touchEndX - this.touchStartX;
        const verticalDistance = Math.abs(this.touchEndY - this.touchStartY);

        // Check if the swipe is primarily horizontal
        if (verticalDistance > this.maxVerticalMovement) {
            return;
        }

        // Check if swipe distance is sufficient
        if (Math.abs(horizontalDistance) < this.minSwipeDistance) {
            return;
        }

        // Determine swipe direction and navigate
        if (horizontalDistance > 0) {
            // Swipe right - go to previous page
            this.navigateToPreviousPage();
        } else {
            // Swipe left - go to next page
            this.navigateToNextPage();
        }
    }

    navigateToNextPage() {
        const pages = this.dashboard.pages;
        const currentIndex = pages.findIndex(p => p.id === this.dashboard.currentPageId);
        
        if (currentIndex === -1 || currentIndex === pages.length - 1) {
            // Already at last page, wrap to first
            if (pages.length > 0) {
                this.switchToPage(pages[0]);
            }
        } else {
            // Go to next page
            this.switchToPage(pages[currentIndex + 1]);
        }
    }

    navigateToPreviousPage() {
        const pages = this.dashboard.pages;
        const currentIndex = pages.findIndex(p => p.id === this.dashboard.currentPageId);
        
        if (currentIndex === -1 || currentIndex === 0) {
            // Already at first page, wrap to last
            if (pages.length > 0) {
                this.switchToPage(pages[pages.length - 1]);
            }
        } else {
            // Go to previous page
            this.switchToPage(pages[currentIndex - 1]);
        }
    }

    switchToPage(page) {
        if (!page) return;

        // Update navigation buttons
        const container = document.getElementById('page-navigation');
        if (container) {
            const buttons = container.querySelectorAll('.page-nav-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            const pageIndex = this.dashboard.pages.findIndex(p => p.id === page.id);
            if (pageIndex !== -1 && buttons[pageIndex]) {
                buttons[pageIndex].classList.add('active');
            }
        }

        // Load the page
        this.dashboard.loadPageBookmarks(page.id);
        this.dashboard.updatePageTitle(page.name);
    }
}

// Export for use in dashboard.js
window.SwipeNavigation = SwipeNavigation;

// Swipe Navigation for Page Switching
class SwipeNavigation {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
        this.minSwipeDistance = 40; // Reduced minimum distance for easier detection
        this.swipeVelocityThreshold = 0.3; // Velocity threshold for quick swipes
        this.isSwiping = false;
        this.swipeStartTime = 0;
        
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
        this.touchStartX = e.changedTouches[0].clientX;
        this.touchStartY = e.changedTouches[0].clientY;
        this.touchMoveX = this.touchStartX;
        this.touchMoveY = this.touchStartY;
        this.isSwiping = null; // null = not determined, true = horizontal, false = vertical
        this.swipeStartTime = Date.now();
    }

    handleTouchMove(e) {
        if (this.isSwiping === false) return; // Already determined to be vertical scroll
        
        this.touchMoveX = e.changedTouches[0].clientX;
        this.touchMoveY = e.changedTouches[0].clientY;
        
        const diffX = Math.abs(this.touchMoveX - this.touchStartX);
        const diffY = Math.abs(this.touchMoveY - this.touchStartY);
        
        // Determine swipe direction on first significant movement
        if (this.isSwiping === null && (diffX > 10 || diffY > 10)) {
            // If horizontal movement is greater, it's a swipe
            // If vertical movement is greater, it's a scroll
            this.isSwiping = diffX > diffY;
        }
    }

    handleTouchEnd(e) {
        // Only process if this was determined to be a horizontal swipe
        if (this.isSwiping !== true) {
            return;
        }
        
        this.touchEndX = e.changedTouches[0].clientX;
        this.touchEndY = e.changedTouches[0].clientY;
        this.handleSwipe();
    }

    handleMouseDown(e) {
        // Only track mouse events if not clicking on buttons or links
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
            return;
        }
        
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        this.touchMoveX = this.touchStartX;
        this.touchMoveY = this.touchStartY;
        this.isSwiping = null;
        this.isMouseDown = true;
        this.swipeStartTime = Date.now();
    }

    handleMouseMove(e) {
        if (!this.isMouseDown) return;
        if (this.isSwiping === false) return;
        
        this.touchMoveX = e.clientX;
        this.touchMoveY = e.clientY;
        
        const diffX = Math.abs(this.touchMoveX - this.touchStartX);
        const diffY = Math.abs(this.touchMoveY - this.touchStartY);
        
        // Determine swipe direction on first significant movement
        if (this.isSwiping === null && (diffX > 10 || diffY > 10)) {
            this.isSwiping = diffX > diffY;
        }
    }

    handleMouseUp(e) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        // Only process if this was determined to be a horizontal swipe
        if (this.isSwiping !== true) {
            return;
        }
        
        this.touchEndX = e.clientX;
        this.touchEndY = e.clientY;
        this.handleSwipe();
    }

    handleSwipe() {
        const horizontalDistance = this.touchEndX - this.touchStartX;
        const swipeTime = Date.now() - this.swipeStartTime;
        const velocity = Math.abs(horizontalDistance) / swipeTime; // pixels per millisecond

        // Accept swipe if:
        // 1. Distance is greater than minimum, OR
        // 2. Velocity is high enough (quick swipe)
        const distanceOk = Math.abs(horizontalDistance) >= this.minSwipeDistance;
        const velocityOk = velocity >= this.swipeVelocityThreshold;

        if (!distanceOk && !velocityOk) {
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

class Modal {
    constructor(language = null) {
        this.language = language;
        this.createModalHTML();
        this.setupEventListeners();
    }

    createModalHTML() {
        if (document.getElementById('app-modal')) {
            return; // Modal already exists
        }

        const modalHTML = `
            <div id="app-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <span class="modal-title" id="modal-title"></span>
                    </div>
                    <div class="modal-body">
                        <p class="modal-text" id="modal-text"></p>
                    </div>
                    <div class="modal-actions" id="modal-actions">
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('app-modal');
    }

    setupEventListeners() {
        // Close modal when clicking overlay
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('modal-overlay')) {
                this.hide();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
                this.hide();
            }
        });
    }

    show(options) {
        const {
            title = this.language ? this.language.t('dashboard.confirmTitle') : 'Confirm',
            message = this.language ? this.language.t('dashboard.confirmMessage') : 'Are you sure?',
            htmlMessage = null,
            confirmText = this.language ? this.language.t('dashboard.confirmTitle') : 'Confirm',
            cancelText = this.language ? this.language.t('dashboard.cancel') : 'Cancel',
            confirmClass = '',
            onConfirm = () => {},
            onCancel = () => {},
            showCancel = true
        } = options;

        // Set content
        document.getElementById('modal-title').textContent = title;
        if (htmlMessage !== null) {
            document.getElementById('modal-text').innerHTML = htmlMessage;
        } else {
            document.getElementById('modal-text').textContent = message;
        }

        // Clear and set actions
        const actionsContainer = document.getElementById('modal-actions');
        actionsContainer.innerHTML = '';

        // Confirm button (styled like search matches)
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button ${confirmClass}`;
        confirmButton.innerHTML = `
            <span class="modal-button-name">${confirmText}</span>
        `;
        confirmButton.onclick = () => {
            this.hide();
            onConfirm();
        };
        actionsContainer.appendChild(confirmButton);

        // Cancel button
        if (showCancel) {
            const cancelButton = document.createElement('button');
            cancelButton.className = 'modal-button';
            cancelButton.innerHTML = `
                <span class="modal-button-name">${cancelText}</span>
            `;
            cancelButton.onclick = () => {
                this.hide();
                onCancel();
            };
            actionsContainer.appendChild(cancelButton);
        }

        // Show modal
        this.modal.classList.add('show');
        
        // Focus on confirm button for keyboard navigation
        setTimeout(() => {
            confirmButton.focus();
        }, 100);
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    // Convenience methods for common modal types
    confirm(options) {
        return new Promise((resolve) => {
            this.show({
                ...options,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    alert(options) {
        return new Promise((resolve) => {
            this.show({
                ...options,
                showCancel: false,
                confirmText: options.confirmText || (this.language ? this.language.t('dashboard.ok') : 'OK'),
                onConfirm: () => resolve(true)
            });
        });
    }

    danger(options) {
        return this.confirm({
            ...options,
            confirmClass: 'danger'
        });
    }

    // Method to update language after initialization
    setLanguage(language) {
        this.language = language;
    }
}

// Create global modal instance
window.AppModal = new Modal();
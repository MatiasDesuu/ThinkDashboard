/**
 * Backup Module
 * Handles data backup and export functionality
 */

class ConfigBackup {
    constructor(t) {
        this.t = t; // Translation function
        this.init();
    }

    /**
     * Initialize the backup functionality
     */
    init() {
        const backupBtn = document.getElementById('backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.createBackup());
        }

        // Backup info button
        const backupInfoBtn = document.getElementById('backup-info-btn');
        if (backupInfoBtn) {
            backupInfoBtn.addEventListener('click', () => {
                if (window.AppModal) {
                    window.AppModal.alert({
                        title: this.t('config.backupInfoTitle'),
                        message: this.t('config.backupInfo'),
                        confirmText: this.t('config.backupInfoConfirm')
                    });
                }
            });
        }

        // Import functionality
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });

            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImportFile(file);
                }
            });
        }

        // Import info button
        const importInfoBtn = document.getElementById('import-info-btn');
        if (importInfoBtn) {
            importInfoBtn.addEventListener('click', () => {
                if (window.AppModal) {
                    const importInfo = this.t('config.importInfo');
                    const parts = importInfo.split('\n\n');
                    const htmlMessage = parts[0] + '<br><br><span class="danger">' + parts[1] + '</span>';
                    window.AppModal.alert({
                        title: this.t('config.importInfoTitle'),
                        htmlMessage: htmlMessage,
                        confirmText: this.t('config.importInfoConfirm')
                    });
                }
            });
        }
    }

    /**
     * Create and download a backup of all data
     */
    async createBackup() {
        const backupBtn = document.getElementById('backup-btn');
        if (!backupBtn) return;

        try {
            // Disable button to prevent multiple clicks
            backupBtn.disabled = true;

            // Fetch the backup
            const response = await fetch('/api/backup', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Backup failed: ${response.statusText}`);
            }

            // Create download
            const now = new Date();
            const timestamp = now.toISOString().replace('T', '_').replace(/\..+/, '').replace(':', '-').replace(':', '-');
            const filename = `thinkdashboard-backup-${timestamp}.zip`;
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show success message
            if (typeof configManager !== 'undefined' && configManager.ui) {
                configManager.ui.showNotification(this.t('config.backupCreated') || 'Backup created successfully!', 'success');
            }

        } catch (error) {
            console.error('Backup error:', error);
            // Show error message
            if (typeof configManager !== 'undefined' && configManager.ui) {
                configManager.ui.showNotification(this.t('config.backupError') || 'Failed to create backup. Please try again.', 'error');
            }
        } finally {
            // Re-enable button
            backupBtn.disabled = false;
        }
    }

    /**
     * Handle the selected import file
     * @param {File} file
     */
    async handleImportFile(file) {
        try {
            if (!file.name.endsWith('.zip')) {
                if (typeof configManager !== 'undefined' && configManager.ui) {
                    configManager.ui.showNotification(this.t('config.importInvalidFile'), 'error');
                }
                return;
            }

            const zip = await JSZip.loadAsync(file);
            const files = Object.keys(zip.files);

            // Check for required files
            const requiredFiles = ['settings.json', 'colors.json', 'pages.json'];
            const hasBookmarks = files.some(filename => filename.startsWith('bookmarks-') && filename.endsWith('.json'));

            const hasRequiredFiles = requiredFiles.every(requiredFile => 
                files.includes(requiredFile)
            );

            if (!hasRequiredFiles || !hasBookmarks) {
                if (typeof configManager !== 'undefined' && configManager.ui) {
                    configManager.ui.showNotification(this.t('config.importInvalidFile'), 'error');
                }
                return;
            }

            // Clear the file input immediately after validation
            const importFile = document.getElementById('import-file');
            if (importFile) {
                importFile.value = '';
            }

            // Show confirmation modal
            if (window.AppModal) {
                const confirmed = await window.AppModal.confirm({
                    title: this.t('config.importConfirmTitle'),
                    message: this.t('config.importConfirmMessage'),
                    confirmText: this.t('config.importConfirm'),
                    cancelText: this.t('config.cancelImport'),
                    confirmClass: 'danger'
                });

                if (confirmed) {
                    await this.performImport(zip);
                }
            }

        } catch (error) {
            console.error('Import validation error:', error);
            if (typeof configManager !== 'undefined' && configManager.ui) {
                configManager.ui.showNotification(this.t('config.importError'), 'error');
            }
        } finally {
            // Clear the file input so it can detect the same file again
            const importFile = document.getElementById('import-file');
            if (importFile) {
                importFile.value = '';
            }
        }
    }

    /**
     * Perform the import operation
     * @param {JSZip} zip
     */
    async performImport(zip) {
        try {
            const formData = new FormData();

            // Extract and add files to FormData
            const files = zip.files;
            for (const [filename, zipEntry] of Object.entries(files)) {
                if (!zipEntry.dir) {
                    const content = await zipEntry.async('blob');
                    formData.append('files', content, filename);
                }
            }

            // Send to backend
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Import failed: ${response.statusText}`);
            }

            // Show success message
            if (typeof configManager !== 'undefined' && configManager.ui) {
                configManager.ui.showNotification(this.t('config.importSuccess'), 'success');
            }

            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            if (typeof configManager !== 'undefined' && configManager.ui) {
                configManager.ui.showNotification(this.t('config.importError'), 'error');
            }
        }
    }
}
/**
 * Search Command: :columns
 * Changes the number of columns in the dashboard
 */

class SearchCommandColumns {
    constructor(language = null) {
        this.language = language;
        this.columnMap = ['1', '2', '3', '4', '5', '6'];
        this.columnDisplayNames = {
            '1': this.language ? this.language.t('dashboard.oneColumn') : '1 Column',
            '2': this.language ? this.language.t('dashboard.twoColumns') : '2 Columns',
            '3': this.language ? this.language.t('dashboard.threeColumns') : '3 Columns',
            '4': this.language ? this.language.t('dashboard.fourColumns') : '4 Columns',
            '5': this.language ? this.language.t('dashboard.fiveColumns') : '5 Columns',
            '6': this.language ? this.language.t('dashboard.sixColumns') : '6 Columns'
        };
    }

    setLanguage(language) {
        this.language = language;
        // Update display names when language changes
        this.columnDisplayNames = {
            '1': this.language ? this.language.t('dashboard.oneColumn') : '1 Column',
            '2': this.language ? this.language.t('dashboard.twoColumns') : '2 Columns',
            '3': this.language ? this.language.t('dashboard.threeColumns') : '3 Columns',
            '4': this.language ? this.language.t('dashboard.fourColumns') : '4 Columns',
            '5': this.language ? this.language.t('dashboard.fiveColumns') : '5 Columns',
            '6': this.language ? this.language.t('dashboard.sixColumns') : '6 Columns'
        };
    }

    handle(args) {
        // If args has one empty string, treat as no args
        const effectiveArgs = (args.length === 1 && args[0] === '') ? [] : args;

        if (effectiveArgs.length === 0) {
            // Show all column options
            return this.columnMap.map(column => {
                const displayName = this.columnDisplayNames[column] || `${column} Columns`;
                return {
                    name: displayName,
                    shortcut: `:columns`,
                    action: () => this.applyColumns(column),
                    type: 'command'
                };
            });
        } else {
            // Show matching column options
            const columnQuery = effectiveArgs.join(' ').toLowerCase();
            const matchingColumns = this.columnMap.filter(column => {
                const displayName = this.columnDisplayNames[column] || `${column} Columns`;
                return displayName.toLowerCase().startsWith(columnQuery) || column.startsWith(columnQuery);
            });

            return matchingColumns.map(column => {
                const displayName = this.columnDisplayNames[column] || `${column} Columns`;
                return {
                    name: displayName,
                    shortcut: `:columns`,
                    action: () => this.applyColumns(column),
                    type: 'command'
                };
            });
        }
    }

    /**
     * Apply a column count
     * @param {string} columns - The number of columns to apply
     */
    async applyColumns(columns) {
        // Remove all column classes
        document.body.classList.remove('columns-1', 'columns-2', 'columns-3', 'columns-4', 'columns-5', 'columns-6');

        // Add the new column class
        document.body.classList.add(`columns-${columns}`);

        // Update the dashboard grid
        const grid = document.getElementById('dashboard-layout');
        if (grid) {
            grid.className = `dashboard-grid columns-${columns}`;
        }

        // Update settings
        const deviceSpecific = localStorage.getItem('deviceSpecificSettings') === 'true';

        if (deviceSpecific) {
            const settings = localStorage.getItem('dashboardSettings');
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    // Update columnsPerRow in localStorage
                    parsed.columnsPerRow = parseInt(columns);
                    localStorage.setItem('dashboardSettings', JSON.stringify(parsed));
                } catch (e) {
                    console.error('Error parsing dashboard settings:', e);
                }
            }
        } else {
            // For server settings, we need to fetch current settings, update columnsPerRow, and save back
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const currentSettings = await response.json();
                    currentSettings.columnsPerRow = parseInt(columns);

                    // Save updated settings to server
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentSettings)
                    });
                }
            } catch (error) {
                console.error('Error saving columns to server:', error);
            }
        }
    }
}

// Export for use in other modules
window.SearchCommandColumns = SearchCommandColumns;
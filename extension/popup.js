// ThinkDashboard Bookmark Saver Extension

let confirmationCallback = null;

function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds for success/error, keep for info
    if (type !== 'info') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

function hideMessage() {
    document.getElementById('message').style.display = 'none';
}

function showConfirmation(text, onYes) {
    document.getElementById('confirmation-text').innerHTML = text;
    document.getElementById('confirmation').classList.remove('hidden');
    confirmationCallback = onYes;
    
    // Add click outside to close
    document.getElementById('confirmation').addEventListener('click', handleConfirmationClick);
}

function hideConfirmation() {
    document.getElementById('confirmation').classList.add('hidden');
    document.getElementById('confirmation').removeEventListener('click', handleConfirmationClick);
    confirmationCallback = null;
}

function handleConfirmationClick(event) {
    if (event.target.id === 'confirmation') {
        hideConfirmation();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + '-tab').classList.add('active');

            // Load data for the tab
            hideMessage();
            if (tabName === 'save') {
                loadSaveTab();
            } else if (tabName === 'settings') {
                loadSettingsTab();
            }
        });
    });

    // Load initial data
    loadSettings();
    loadSaveTab();

    // Save form
    document.getElementById('save-form').addEventListener('submit', saveBookmark);

    // Page select change to load categories
    document.getElementById('page-select').addEventListener('change', async (event) => {
        const pageId = event.target.value;
        if (pageId) {
            await loadCategories(pageId);
        }
    });

    // Default page select change to load categories for settings
    document.getElementById('default-page').addEventListener('change', async (event) => {
        const pageId = event.target.value;
        if (pageId) {
            await loadCategoriesForSettings(pageId);
        }
    });

    // Settings form
    document.getElementById('settings-form').addEventListener('submit', saveSettings);
    
    // Reload pages button
    document.getElementById('reload-pages-btn').addEventListener('click', async () => {
        const serverUrl = document.getElementById('server-url').value;
        await loadPages(serverUrl);
    });
    
    // Reset settings button
    document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
    
    // Confirmation buttons
    document.getElementById('confirm-yes').addEventListener('click', async () => {
        if (confirmationCallback) {
            await confirmationCallback();
        }
        hideConfirmation();
    });
    
    document.getElementById('confirm-no').addEventListener('click', () => {
        hideConfirmation();
    });
});

async function loadSettings() {
    const settings = await chrome.storage.sync.get(['serverUrl', 'defaultPage', 'defaultCategory']);
    document.getElementById('server-url').value = settings.serverUrl || '';
    // Default page and category will be loaded when settings tab is opened
}

async function loadSaveTab() {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        document.getElementById('bookmark-name').value = tab.title;
        document.getElementById('bookmark-url').value = tab.url;

        // Load pages
        await loadPages();
    } catch (error) {
        console.error('Error loading save tab:', error);
    }
}

async function loadPages(providedServerUrl) {
    let serverUrl = providedServerUrl;
    if (!serverUrl) {
        const settings = await chrome.storage.sync.get(['serverUrl']);
        serverUrl = settings.serverUrl;
    }

    if (!serverUrl) {
        showMessage('Please set the ThinkDashboard URL in settings first.', 'info');
        return;
    }

    try {
        const response = await fetch(new URL('/api/pages', serverUrl));
        if (!response.ok) throw new Error('Failed to fetch pages');

        const pages = await response.json();
        const pageSelect = document.getElementById('page-select');
        const defaultPageSelect = document.getElementById('default-page');

        // Clear existing options
        pageSelect.innerHTML = '';
        defaultPageSelect.innerHTML = '';

        pages.forEach(page => {
            const option1 = new Option(page.name, page.id);
            const option2 = new Option(page.name, page.id);
            pageSelect.appendChild(option1);
            defaultPageSelect.appendChild(option2);
        });

        // Set default page
        const defaultSettings = await chrome.storage.sync.get(['defaultPage']);
        if (defaultSettings.defaultPage) {
            pageSelect.value = defaultSettings.defaultPage;
        }

        // Load default page for settings
        if (defaultSettings.defaultPage) {
            defaultPageSelect.value = defaultSettings.defaultPage;
        }
        
        hideMessage(); // Hide any previous error message
        
        // Load categories for the default page
        if (defaultSettings.defaultPage) {
            await loadCategories(defaultSettings.defaultPage);
            
            // Set default category if available
            const categorySettings = await chrome.storage.sync.get(['defaultCategory']);
            if (categorySettings.defaultCategory) {
                document.getElementById('category-select').value = categorySettings.defaultCategory;
            }
        }
    } catch (error) {
        console.error('Error loading pages:', error);
        showMessage('Failed to load pages. Check your server URL.', 'error');
    }
}

async function loadSettingsTab() {
    // Pages are loaded manually via the reload button, but we can load if already configured
    const settings = await chrome.storage.sync.get(['serverUrl']);
    if (settings.serverUrl) {
        await loadPages();
        const defaultSettings = await chrome.storage.sync.get(['defaultPage', 'defaultCategory']);
        if (defaultSettings.defaultPage) {
            await loadCategoriesForSettings(defaultSettings.defaultPage);
            if (defaultSettings.defaultCategory) {
                document.getElementById('default-category').value = defaultSettings.defaultCategory;
            }
        }
    }
}

async function loadCategoriesForSettings(pageId) {
    const settings = await chrome.storage.sync.get(['serverUrl']);
    const serverUrl = settings.serverUrl;

    if (!serverUrl) {
        return;
    }

    try {
        const response = await fetch(new URL(`/api/categories?page=${pageId}`, serverUrl));
        if (!response.ok) throw new Error('Failed to fetch categories');

        const categories = await response.json();
        const categorySelect = document.getElementById('default-category');

        // Clear existing options
        categorySelect.innerHTML = '';

        // Add default empty option
        const defaultOption = new Option('No Category', '');
        categorySelect.appendChild(defaultOption);

        categories.forEach(category => {
            const option = new Option(category.name, category.id);
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories for settings:', error);
    }
}

async function loadCategories(pageId) {
    const settings = await chrome.storage.sync.get(['serverUrl']);
    const serverUrl = settings.serverUrl;

    if (!serverUrl) {
        return; // No server URL, can't load
    }

    try {
        const response = await fetch(new URL(`/api/categories?page=${pageId}`, serverUrl));
        if (!response.ok) throw new Error('Failed to fetch categories');

        const categories = await response.json();
        const categorySelect = document.getElementById('category-select');

        // Clear existing options
        categorySelect.innerHTML = '';

        // Add default empty option
        const defaultOption = new Option('No Category', '');
        categorySelect.appendChild(defaultOption);

        categories.forEach(category => {
            const option = new Option(category.name, category.id);
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        // Don't show error message, just leave empty
    }
}

async function saveBookmark(event) {
    event.preventDefault();

    const settings = await chrome.storage.sync.get(['serverUrl']);
    const serverUrl = settings.serverUrl;

    if (!serverUrl) {
        showMessage('Please set the ThinkDashboard URL in settings first.', 'error');
        return;
    }

    const name = document.getElementById('bookmark-name').value;
    const url = document.getElementById('bookmark-url').value;
    const pageId = document.getElementById('page-select').value;
    const category = document.getElementById('category-select').value;

    // Check for duplicate URL
    try {
        const bookmarksResponse = await fetch(new URL(`/api/bookmarks?page=${pageId}`, serverUrl));
        if (bookmarksResponse.ok) {
            const bookmarks = await bookmarksResponse.json();
            const duplicate = bookmarks.find(bookmark => bookmark.url === url);
            if (duplicate) {
                showConfirmation(`This URL already exists in this page as <strong>"${duplicate.name}"</strong>.<br><span class="highlight">Do you want to save it anyway?</span>`, async () => {
                    await performSave(serverUrl, pageId, name, url, category);
                });
                return; // Wait for confirmation
            }
        }
    } catch (error) {
        console.error('Error checking for duplicates:', error);
        // Continue anyway
    }

    // No duplicate, save directly
    await performSave(serverUrl, pageId, name, url, category);
}

async function saveSettings(event) {
    event.preventDefault();

    const serverUrl = document.getElementById('server-url').value;
    const defaultPage = document.getElementById('default-page').value;
    const defaultCategory = document.getElementById('default-category').value;

    await chrome.storage.sync.set({
        serverUrl: serverUrl,
        defaultPage: defaultPage,
        defaultCategory: defaultCategory
    });

    showMessage('Settings saved!', 'success');
}

async function performSave(serverUrl, pageId, name, url, category) {
    try {
        const response = await fetch(new URL('/api/bookmarks/add', serverUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page: parseInt(pageId),
                bookmark: {
                    name: name,
                    url: url,
                    category: category,
                    shortcut: '',
                    checkStatus: false
                }
            })
        });

        if (!response.ok) throw new Error('Failed to save bookmark');

        showMessage('Bookmark saved successfully!', 'success');
        setTimeout(() => window.close(), 1000);
    } catch (error) {
        console.error('Error saving bookmark:', error);
        showMessage('Failed to save bookmark. Check console for details.', 'error');
    }
}

async function resetSettings() {
    // Clear all stored settings
    await chrome.storage.sync.clear();
    
    // Reset form fields
    document.getElementById('server-url').value = '';
    document.getElementById('default-page').innerHTML = '';
    document.getElementById('default-category').innerHTML = '';
    
    // Clear pages in save tab as well
    document.getElementById('page-select').innerHTML = '';
    document.getElementById('category-select').innerHTML = '';
    
    showMessage('Settings reset!', 'info');
}
# ThinkDashboard Bookmark Saver Extension

A browser extension that allows you to save bookmarks directly to your ThinkDashboard pages.

## Features

- **Save Tab**: Automatically detects the current page title and URL, allows editing the name, and saves to a selected ThinkDashboard page.
- **Settings**: Configure the ThinkDashboard server URL and set a default page for saving bookmarks.
- **TUI Style**: Matches the terminal-inspired design of ThinkDashboard.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder from this repository
4. The extension should now be installed and visible in your extensions list

## Usage

1. Click the extension icon in your browser toolbar
2. In the **Settings** tab:
   - Enter your ThinkDashboard server URL (e.g., `http://localhost:8080`)
   - Select your default page for saving bookmarks
   - Click "Save Settings"
3. In the **Save** tab:
   - The current page title and URL will be pre-filled
   - Edit the name if desired
   - Select the page to save to (or use default)
   - Click "Save Bookmark"

## API Integration

The extension communicates with ThinkDashboard via the following API endpoints:

- `GET /api/pages` - Retrieves available pages
- `POST /api/bookmarks/add` - Adds a new bookmark to a page

## Development

To modify the extension:

- Edit `popup.html` for structure
- Edit `popup.css` for styling (uses CSS variables for theming)
- Edit `popup.js` for functionality

Make sure to reload the extension in `chrome://extensions/` after changes.

## Requirements

- ThinkDashboard server running and accessible
- Chrome browser (or compatible Chromium-based browser)
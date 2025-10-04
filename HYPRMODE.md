# HyprMode Feature Documentation

## Overview
HyprMode is a launcher mode designed for using ThinkDashboard as a standalone PWA (Progressive Web App) on desktop. When enabled, clicking on a bookmark will open it in the default browser and then automatically close the dashboard window.

## Use Case
This feature is perfect for users who want to use ThinkDashboard as a quick launcher:
1. Launch the dashboard as a PWA/standalone app
2. Click on a bookmark
3. The bookmark opens in the default browser
4. The PWA window automatically closes

## Implementation Details

### Files Modified/Created

#### 1. `/static/js/hypr-mode.js` (NEW)
- Standalone module that handles HyprMode functionality
- Opens URLs in new tabs using `window.open()`
- Automatically closes the current window after opening the bookmark
- Includes safety checks for window closing

#### 2. `/templates/config.html`
- Added new checkbox option "HyprMode (Launcher mode for PWA)"
- Includes descriptive text explaining the feature
- Located in the general settings section

#### 3. `/static/js/config/config-settings.js`
- Added event listener for HyprMode checkbox
- Saves/loads HyprMode state from settings

#### 4. `/static/js/dashboard.js`
- Added `hyprMode: false` to default settings
- Added `initializeHyprMode()` method
- Modified `createBookmarkElement()` to handle HyprMode clicks
- HyprMode takes precedence over normal "open in new tab" behavior

#### 5. `/templates/dashboard.html` & `/templates/config.html`
- Included `hypr-mode.js` script before main dashboard/config scripts

#### 6. `/data/settings.json`
- Added `"hyprMode": false` as default setting

## How It Works

### When HyprMode is Disabled (Default)
- Bookmarks behave normally
- If "Open links in new tab" is enabled, links open in new tab
- Window remains open

### When HyprMode is Enabled
1. User clicks on a bookmark
2. `hyprMode.handleBookmarkClick()` is called
3. URL opens in a new browser tab with `window.open()`
4. After 100ms delay, `window.close()` is called
5. The dashboard window closes (works in PWA/standalone mode)

## Technical Notes

### Window Closing Behavior
- `window.close()` works reliably for:
  - PWA windows (standalone mode)
  - Popup windows
  - Windows opened by JavaScript
  
- May not work for:
  - Regular browser tabs (requires user confirmation)
  - Tabs opened by the user directly

### Safety Features
- 100ms delay ensures the new tab opens before closing
- Console logging for debugging
- Graceful fallback if window can't be closed

## Configuration

Users can enable/disable HyprMode in the configuration page:
1. Go to `/config`
2. In the "general" tab
3. Check/uncheck "HyprMode (Launcher mode for PWA)"
4. Click "Save Changes"

## Browser Compatibility

This feature is designed to work best with:
- Chrome/Edge (as installed PWA)
- Firefox (as standalone window)
- Any browser that supports `window.open()` and `window.close()`

## Future Enhancements

Potential improvements:
- Add keyboard shortcut to toggle HyprMode
- Visual indicator when HyprMode is active
- Option to delay window closing
- Option to minimize instead of close

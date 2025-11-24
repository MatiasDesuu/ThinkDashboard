# ThinkDashboard MCP Server

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)


A Model Context Protocol (MCP) server for **[ThinkDashboard](https://github.com/MatiasDesuu/ThinkDashboard)**, allowing a compatible AI assistant to interact directly with your bookmarks and settings using natural language.


## Available Tools

The MCP server provides the following tools to a connected AI model, grouped by functionality:

### Bookmark Management

- **`search_bookmarks`**: Search for bookmarks by name, URL, category, or shortcut
- **`list_pages`**: List all available pages
- **`get_page_bookmarks`**: Get all bookmarks from a specific page
- **`add_bookmark`**: Add a new bookmark to any page and category
- **`delete_bookmark`**: Delete a bookmark by name

### Category Management

- **`list_categories`**: List all categories for a page
- **`add_category`**: Add a new category to a page
- **`rename_category`**: Rename an existing category
- **`delete_category`**: Delete a category (bookmarks are moved to "others")
- **`reorder_categories`**: Change the display order of categories

### Page Management

- **`create_page`**: Create a new page with a custom name
- **`delete_page`**: Delete a page (except page 1)
- **`reorder_pages`**: Change the display order of pages

### Theme & Appearance

- **`get_colors`**: Get the current color theme configuration
- **`update_theme_colors`**: Update colors for light, dark, or custom themes
- **`reset_theme_colors`**: Reset theme colors to their defaults

### Utilities

- **`get_settings`**: View all ThinkDashboard settings
- **`search_with_finder`**: Use configured search engines to construct search URLs
- **`ping_url`**: Check if a URL is accessible and measure response time




## Installation

### Prerequisites

- Node.js 18 or higher
- A running instance of ThinkDashboard (default: `http://localhost:8080`)

### 1. Install Dependencies

Navigate to the server directory and install packages:

```bash
cd mcp-server
npm install
```

### 2. Configure Your MCP Client (Example: Claude Desktop)

This server must be registered with an MCP-compatible client application. The following instructions are for the Claude Desktop client.

**Claude Desktop Config File Locations:**

- **MacOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "thinkdashboard": {
      "command": "node",
      "args": [
        "/absolute/path/to/Dashboard/mcp-server/index.js"
      ],
      "env": {
        "THINKDASHBOARD_URL": "http://localhost:8080"
      }
    }
  }
}
```

**Important:**

- You must use an **absolute path** for the `index.js` file
- If your ThinkDashboard runs on a different URL or port, update the `THINKDASHBOARD_URL` environment variable

### 3. Restart Your AI Client

After modifying the configuration, restart your client application (e.g., Claude Desktop) for the changes to take effect.

## Usage Examples

Once configured, you can ask your AI assistant to perform actions:

- *"Search for all my GitHub bookmarks."*
- *"Add a new bookmark to my 'Dev' page: name 'Anthropic Docs', URL 'https://docs.anthropic.com', category 'Documentation'."*
- *"List all categories on my 'Work' page."*
- *"Create a new page called 'AI Resources'."*
- *"Update the dark theme's primary text color to #FFFFFF."*
- *"Check if https://github.com is accessible."*

## Troubleshooting

### MCP Server Not Found

- Verify the path in your client's configuration file is absolute and correct
- Ensure Node.js is installed and in your system's PATH
- Check your client's logs for any errors

### Connection Errors

- Ensure ThinkDashboard is running on the URL specified in `THINKDASHBOARD_URL`
- Check for network connectivity or firewall rules blocking the connection

### Manual Server Test

You can test the server directly from your terminal:

```bash
cd mcp-server
THINKDASHBOARD_URL=http://localhost:8080 node index.js
```

**Expected output:** `ThinkDashboard MCP Server running on stdio`

## Development

To add or modify tools:

1. Edit `index.js` to add new handler methods
2. Update the tool definitions in the `ListToolsRequestSchema` handler
3. Restart your AI client to load the new server configuration

## Further Documentation

This server is an implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). For more detailed information on MCP, how it works, and how to build your own servers, please refer to the official MCP documentation.

## License

MIT
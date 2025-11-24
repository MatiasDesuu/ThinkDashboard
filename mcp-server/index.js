#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ThinkDashboard MCP Server
// Provides tools to interact with ThinkDashboard bookmarks

const DEFAULT_SERVER_URL = process.env.THINKDASHBOARD_URL || "http://localhost:8080";

class ThinkDashboardServer {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.server = new Server(
      {
        name: "thinkdashboard-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_bookmarks",
          description: "Search for bookmarks by name, URL, or category. Returns matching bookmarks across all pages.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query to match against bookmark names, URLs, or categories",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "list_pages",
          description: "List all available pages in ThinkDashboard with their IDs and names.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_page_bookmarks",
          description: "Get all bookmarks from a specific page, organized by categories.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID to fetch bookmarks from",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "add_bookmark",
          description: "Add a new bookmark to ThinkDashboard. Specify the page, category, name, URL, and optional keyboard shortcut.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID to add the bookmark to",
              },
              category: {
                type: "string",
                description: "Category name for the bookmark",
              },
              name: {
                type: "string",
                description: "Display name for the bookmark",
              },
              url: {
                type: "string",
                description: "URL for the bookmark",
              },
              shortcut: {
                type: "string",
                description: "Optional keyboard shortcut (e.g., 'gh', 'tw')",
              },
            },
            required: ["page_id", "category", "name", "url"],
          },
        },
        {
          name: "delete_bookmark",
          description: "Delete a bookmark from a specific page by its name.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID containing the bookmark",
              },
              name: {
                type: "string",
                description: "Name of the bookmark to delete",
              },
            },
            required: ["page_id", "name"],
          },
        },
        {
          name: "list_categories",
          description: "List all categories for a specific page.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID to fetch categories from",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "add_category",
          description: "Add a new category to a specific page.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID to add the category to",
              },
              name: {
                type: "string",
                description: "Name of the new category",
              },
            },
            required: ["page_id", "name"],
          },
        },
        {
          name: "rename_category",
          description: "Rename an existing category on a page.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID containing the category",
              },
              old_name: {
                type: "string",
                description: "Current name of the category",
              },
              new_name: {
                type: "string",
                description: "New name for the category",
              },
            },
            required: ["page_id", "old_name", "new_name"],
          },
        },
        {
          name: "delete_category",
          description: "Delete a category from a page. All bookmarks in this category will be moved to a default 'Uncategorized' category.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID containing the category",
              },
              name: {
                type: "string",
                description: "Name of the category to delete",
              },
            },
            required: ["page_id", "name"],
          },
        },
        {
          name: "reorder_categories",
          description: "Change the display order of categories on a page.",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID containing the categories",
              },
              category_names: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Array of category names in the desired order",
              },
            },
            required: ["page_id", "category_names"],
          },
        },
        {
          name: "get_settings",
          description: "Get current ThinkDashboard settings including theme, language, UI preferences, etc.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_with_finder",
          description: "Use a configured search engine (finder) to construct a search URL. Returns the URL for the search query.",
          inputSchema: {
            type: "object",
            properties: {
              finder_name: {
                type: "string",
                description: "Name of the search engine/finder to use (e.g., 'Google', 'GitHub')",
              },
              query: {
                type: "string",
                description: "Search query",
              },
            },
            required: ["finder_name", "query"],
          },
        },
        {
          name: "create_page",
          description: "Create a new page in ThinkDashboard with a specific name.",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name for the new page",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "delete_page",
          description: "Delete a page from ThinkDashboard by its ID. Cannot delete page 1 (main page).",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "number",
                description: "The page ID to delete (cannot be 1)",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "reorder_pages",
          description: "Reorder pages in ThinkDashboard by providing a new order of page IDs.",
          inputSchema: {
            type: "object",
            properties: {
              page_ids: {
                type: "array",
                items: {
                  type: "number",
                },
                description: "Array of page IDs in the desired order",
              },
            },
            required: ["page_ids"],
          },
        },
        {
          name: "get_colors",
          description: "Get the current color theme configuration including light, dark, and custom themes.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "update_theme_colors",
          description: "Update colors for a specific theme (light, dark, or custom). Provide color values in hex format.",
          inputSchema: {
            type: "object",
            properties: {
              theme_type: {
                type: "string",
                description: "Type of theme to update: 'light', 'dark', or a custom theme ID",
              },
              colors: {
                type: "object",
                description: "Object with color properties to update (e.g., textPrimary, backgroundPrimary)",
              },
            },
            required: ["theme_type", "colors"],
          },
        },
        {
          name: "reset_theme_colors",
          description: "Reset light and dark theme colors to default values. Custom themes are preserved.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "ping_url",
          description: "Check if a URL is accessible and measure response time. Useful for verifying bookmark availability.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL to ping/check",
              },
            },
            required: ["url"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_bookmarks":
            return await this.searchBookmarks(args.query);

          case "list_pages":
            return await this.listPages();

          case "get_page_bookmarks":
            return await this.getPageBookmarks(args.page_id);

          case "add_bookmark":
            return await this.addBookmark(args);

          case "delete_bookmark":
            return await this.deleteBookmark(args.page_id, args.name);

          case "list_categories":
            return await this.listCategories(args.page_id);

          case "add_category":
            return await this.addCategory(args.page_id, args.name);

          case "rename_category":
            return await this.renameCategory(args.page_id, args.old_name, args.new_name);

          case "delete_category":
            return await this.deleteCategory(args.page_id, args.name);

          case "reorder_categories":
            return await this.reorderCategories(args.page_id, args.category_names);

          case "get_settings":
            return await this.getSettings();

          case "search_with_finder":
            return await this.searchWithFinder(args.finder_name, args.query);

          case "create_page":
            return await this.createPage(args.name);

          case "delete_page":
            return await this.deletePage(args.page_id);

          case "reorder_pages":
            return await this.reorderPages(args.page_ids);

          case "get_colors":
            return await this.getColors();

          case "update_theme_colors":
            return await this.updateThemeColors(args.theme_type, args.colors);

          case "reset_theme_colors":
            return await this.resetThemeColors();

          case "ping_url":
            return await this.pingURL(args.url);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async fetchAPI(endpoint) {
    const response = await fetch(`${this.serverUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  }

  async postAPI(endpoint, data) {
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  }

  async deleteAPI(endpoint, data) {
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  }

  async searchBookmarks(query) {
    const pages = await this.fetchAPI("/api/pages");
    const results = [];
    const queryLower = query.toLowerCase();

    for (const page of pages) {
      const bookmarks = await this.fetchAPI(`/api/bookmarks?page=${page.id}`);

      for (const bookmark of bookmarks || []) {
        const matchesName = bookmark.name.toLowerCase().includes(queryLower);
        const matchesURL = bookmark.url.toLowerCase().includes(queryLower);
        const matchesCategory = bookmark.category && bookmark.category.toLowerCase().includes(queryLower);
        const matchesShortcut = bookmark.shortcut && bookmark.shortcut.toLowerCase().includes(queryLower);

        if (matchesName || matchesURL || matchesCategory || matchesShortcut) {
          results.push({
            page: page.name,
            page_id: page.id,
            category: bookmark.category || "",
            name: bookmark.name,
            url: bookmark.url,
            shortcut: bookmark.shortcut || "",
          });
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async listPages() {
    const pages = await this.fetchAPI("/api/pages");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(pages, null, 2),
        },
      ],
    };
  }

  async getPageBookmarks(pageId) {
    const data = await this.fetchAPI(`/api/bookmarks?page=${pageId}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  async addBookmark({ page_id, category, name, url, shortcut = "" }) {
    // First, get current bookmarks for the page
    const bookmarks = await this.fetchAPI(`/api/bookmarks?page=${page_id}`);

    // Add the new bookmark to the array
    bookmarks.push({
      name,
      url,
      shortcut,
      category,
      checkStatus: false,
    });

    // Save back
    await this.postAPI(`/api/bookmarks?page=${page_id}`, bookmarks);

    return {
      content: [
        {
          type: "text",
          text: `Bookmark "${name}" added successfully to page ${page_id}, category "${category}"`,
        },
      ],
    };
  }

  async deleteBookmark(pageId, name) {
    // First, get current bookmarks for the page
    const bookmarks = await this.fetchAPI(`/api/bookmarks?page=${pageId}`);

    const index = bookmarks.findIndex(b => b.name === name);

    if (index === -1) {
      throw new Error(`Bookmark "${name}" not found on page ${pageId}`);
    }

    // Remove the bookmark
    bookmarks.splice(index, 1);

    // Save back
    await this.postAPI(`/api/bookmarks?page=${pageId}`, bookmarks);

    return {
      content: [
        {
          type: "text",
          text: `Bookmark "${name}" deleted successfully from page ${pageId}`,
        },
      ],
    };
  }

  async listCategories(pageId) {
    const data = await this.fetchAPI(`/api/categories?page=${pageId}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  async addCategory(pageId, name) {
    // Get current categories
    const categories = await this.fetchAPI(`/api/categories?page=${pageId}`);

    // Generate a unique ID for the category (lowercase, no spaces)
    const categoryId = name.toLowerCase().replace(/\s+/g, '-');

    // Check if category already exists
    const exists = categories.find(cat => cat.name === name || cat.id === categoryId);
    if (exists) {
      throw new Error(`Category "${name}" already exists on page ${pageId}`);
    }

    // Add new category
    categories.push({
      id: categoryId,
      name: name,
    });

    // Save back
    await this.postAPI(`/api/categories?page=${pageId}`, categories);

    return {
      content: [
        {
          type: "text",
          text: `Category "${name}" added successfully to page ${pageId}`,
        },
      ],
    };
  }

  async renameCategory(pageId, oldName, newName) {
    // Get current categories
    const categories = await this.fetchAPI(`/api/categories?page=${pageId}`);

    // Find the category to rename
    const category = categories.find(cat => cat.name === oldName);
    if (!category) {
      throw new Error(`Category "${oldName}" not found on page ${pageId}`);
    }

    // Generate new ID
    const newId = newName.toLowerCase().replace(/\s+/g, '-');

    // Check if new name already exists
    const exists = categories.find(cat => cat.name === newName && cat.id !== category.id);
    if (exists) {
      throw new Error(`Category "${newName}" already exists on page ${pageId}`);
    }

    // Store the original ID for tracking
    const originalId = category.id;

    // Update category
    category.name = newName;
    category.id = newId;
    category.originalId = originalId;

    // Save back
    await this.postAPI(`/api/categories?page=${pageId}`, categories);

    // Update bookmarks in this category
    const bookmarks = await this.fetchAPI(`/api/bookmarks?page=${pageId}`);
    let updated = false;
    for (const bookmark of bookmarks) {
      if (bookmark.category === originalId) {
        bookmark.category = newId;
        updated = true;
      }
    }

    if (updated) {
      await this.postAPI(`/api/bookmarks?page=${pageId}`, bookmarks);
    }

    return {
      content: [
        {
          type: "text",
          text: `Category "${oldName}" renamed to "${newName}" on page ${pageId}. ${updated ? 'Bookmarks updated.' : 'No bookmarks to update.'}`,
        },
      ],
    };
  }

  async deleteCategory(pageId, name) {
    // Get current categories
    const categories = await this.fetchAPI(`/api/categories?page=${pageId}`);

    // Find the category to delete
    const categoryIndex = categories.findIndex(cat => cat.name === name);
    if (categoryIndex === -1) {
      throw new Error(`Category "${name}" not found on page ${pageId}`);
    }

    const categoryId = categories[categoryIndex].id;

    // Remove the category
    categories.splice(categoryIndex, 1);

    // Save categories
    await this.postAPI(`/api/categories?page=${pageId}`, categories);

    // Move bookmarks to "Uncategorized" or "others"
    const bookmarks = await this.fetchAPI(`/api/bookmarks?page=${pageId}`);
    let movedCount = 0;
    for (const bookmark of bookmarks) {
      if (bookmark.category === categoryId || bookmark.category === name) {
        bookmark.category = "others";
        movedCount++;
      }
    }

    if (movedCount > 0) {
      await this.postAPI(`/api/bookmarks?page=${pageId}`, bookmarks);
    }

    return {
      content: [
        {
          type: "text",
          text: `Category "${name}" deleted from page ${pageId}. ${movedCount} bookmark(s) moved to "others".`,
        },
      ],
    };
  }

  async reorderCategories(pageId, categoryNames) {
    // Get current categories
    const categories = await this.fetchAPI(`/api/categories?page=${pageId}`);

    // Create a map for quick lookup
    const categoryMap = new Map(categories.map(cat => [cat.name, cat]));

    // Build reordered array
    const reorderedCategories = categoryNames.map(name => {
      const category = categoryMap.get(name);
      if (!category) {
        throw new Error(`Category "${name}" not found on page ${pageId}`);
      }
      return category;
    });

    // Save the new order
    await this.postAPI(`/api/categories?page=${pageId}`, reorderedCategories);

    return {
      content: [
        {
          type: "text",
          text: `Categories reordered successfully on page ${pageId}: [${categoryNames.join(", ")}]`,
        },
      ],
    };
  }

  async getSettings() {
    const settings = await this.fetchAPI("/api/settings");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(settings, null, 2),
        },
      ],
    };
  }

  async searchWithFinder(finderName, query) {
    const finders = await this.fetchAPI("/api/finders");
    const finder = finders.find(f => f.name.toLowerCase() === finderName.toLowerCase());

    if (!finder) {
      throw new Error(`Finder "${finderName}" not found. Available finders: ${finders.map(f => f.name).join(", ")}`);
    }

    // API uses "searchUrl" field name
    const searchURL = finder.searchUrl.replace("%s", encodeURIComponent(query));

    return {
      content: [
        {
          type: "text",
          text: `Search URL: ${searchURL}`,
        },
      ],
    };
  }

  async createPage(name) {
    // Get current pages to find next available ID
    const pages = await this.fetchAPI("/api/pages");

    // Find the highest page ID
    const maxId = pages.reduce((max, page) => Math.max(max, page.id), 0);
    const newId = maxId + 1;

    // Create new page object
    const newPage = {
      id: newId,
      name: name,
    };

    // Add to pages array and save
    pages.push(newPage);
    await this.postAPI("/api/pages", pages);

    return {
      content: [
        {
          type: "text",
          text: `Page "${name}" created successfully with ID ${newId}`,
        },
      ],
    };
  }

  async deletePage(pageId) {
    if (pageId === 1) {
      throw new Error("Cannot delete the main page (page 1)");
    }

    const response = await fetch(`${this.serverUrl}/api/pages/${pageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete page: ${response.statusText}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Page ${pageId} deleted successfully`,
        },
      ],
    };
  }

  async reorderPages(pageIds) {
    // Get current pages
    const pages = await this.fetchAPI("/api/pages");

    // Create a map for quick lookup
    const pageMap = new Map(pages.map(p => [p.id, p]));

    // Build reordered array
    const reorderedPages = pageIds.map(id => {
      const page = pageMap.get(id);
      if (!page) {
        throw new Error(`Page with ID ${id} not found`);
      }
      return page;
    });

    // Save the new order
    await this.postAPI("/api/pages", reorderedPages);

    return {
      content: [
        {
          type: "text",
          text: `Pages reordered successfully: [${pageIds.join(", ")}]`,
        },
      ],
    };
  }

  async getColors() {
    const colors = await this.fetchAPI("/api/colors");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(colors, null, 2),
        },
      ],
    };
  }

  async updateThemeColors(themeType, colors) {
    // Get current colors
    const currentColors = await this.fetchAPI("/api/colors");

    // Update the specified theme
    if (themeType === "light") {
      currentColors.light = { ...currentColors.light, ...colors };
    } else if (themeType === "dark") {
      currentColors.dark = { ...currentColors.dark, ...colors };
    } else {
      // Custom theme
      if (!currentColors.custom) {
        currentColors.custom = {};
      }
      if (!currentColors.custom[themeType]) {
        currentColors.custom[themeType] = {};
      }
      currentColors.custom[themeType] = { ...currentColors.custom[themeType], ...colors };
    }

    // Save updated colors
    await this.postAPI("/api/colors", currentColors);

    return {
      content: [
        {
          type: "text",
          text: `Theme "${themeType}" colors updated successfully`,
        },
      ],
    };
  }

  async resetThemeColors() {
    const response = await fetch(`${this.serverUrl}/api/colors/reset`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to reset colors: ${response.statusText}`);
    }

    const resetColors = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Theme colors reset to defaults. Custom themes preserved.\n${JSON.stringify(resetColors, null, 2)}`,
        },
      ],
    };
  }

  async pingURL(url) {
    try {
      const response = await fetch(`${this.serverUrl}/api/ping?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error(`Ping failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to ping ${url}: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("ThinkDashboard MCP Server running on stdio");
  }
}

const server = new ThinkDashboardServer(DEFAULT_SERVER_URL);
server.run().catch(console.error);

# ThinkDashboard

A lightweight, self-hosted bookmark dashboard built with Go and vanilla JavaScript.

## Features

- **Minimalist Design**: Clean, text-based interface inspired by terminal aesthetics
- **Keyboard Shortcuts**: Assign single-key shortcuts to quickly open bookmarks
- **Customizable Categories**: Organize bookmarks into categories
- **Theme Support**: Dark and light themes
- **Color Customization**: Fully customizable color scheme for both light and dark themes
- **Responsive Design**: Works on desktop and mobile devices
- **Self-hosted**: Runs as a single binary with embedded assets
- **Docker Support**: Easy deployment with Docker

## Screenshots

### Dashboard
The main dashboard displays your bookmarks organized by categories with a clean, minimalist design.

### Configuration
Access the configuration page at `/config` to manage your bookmarks, categories, and settings.

### Color Customization
Access the color customization page at `/colors` to personalize all colors in the application. Changes are saved in `data/colors.json` and can be reset to defaults at any time.

## Quick Start

### Using Go

1. Clone the repository:
```bash
git clone <repository-url>
cd thinkdashboard
```

2. Install dependencies:
```bash
go mod tidy
```

3. Run the application:
```bash
go run .
```

4. Open your browser and navigate to `http://localhost:8080`

### Using Docker

1. Build the Docker image:
```bash
docker build -t thinkdashboard .
```

2. Run the container:
```bash
docker run -p 8080:8080 -v $(pwd)/data:/app/data thinkdashboard
```

3. Open your browser and navigate to `http://localhost:8080`

## Configuration

Access the configuration page by navigating to `/config` or clicking the "config" link in the top-right corner of the dashboard.

### Settings

- **Theme**: Choose between dark and light themes
- **Columns per row**: Adjust the number of columns in the dashboard grid (1-6)
- **Open in new tab**: Configure whether links open in new tabs

### Categories

Create and manage categories to organize your bookmarks. Each category will be displayed as a section on the dashboard.

### Bookmarks

Add, edit, and remove bookmarks. Each bookmark can have:
- **Name**: Display name for the bookmark
- **URL**: The web address to open
- **Shortcut**: Optional single-key shortcut (A-Z, 0-9)
- **Category**: Which category the bookmark belongs to

## Keyboard Shortcuts

Assign single-key shortcuts to your bookmarks for quick access. Simply press the assigned key on the dashboard to open the bookmark.

## Data Storage

Configuration data is stored in JSON files in the `data/` directory:
- `bookmarks.json`: Your bookmarks
- `categories.json`: Your categories
- `settings.json`: Application settings

## Environment Variables

- `PORT`: Server port (default: 8080)

## Development

The project structure:
```
├── main.go              # Application entry point
├── handlers.go          # HTTP request handlers
├── models.go           # Data models and file storage
├── templates/          # HTML templates
│   ├── dashboard.html  # Main dashboard page
│   └── config.html     # Configuration page
└── static/            # Static assets
    ├── css/           # Stylesheets
    │   ├── dashboard.css
    │   └── config.css
    └── js/            # JavaScript files
        ├── dashboard.js
        └── config.js
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
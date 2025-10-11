# ThinkDashboard

A lightweight, self-hosted bookmark dashboard built with Go and vanilla JavaScript.

## Features

- **Minimalist Design**: Clean, text-based interface
- **Keyboard Shortcuts**: Assign keys shortcuts to quickly open bookmarks
- **Customizable Categories**: Organize bookmarks into categories
- **Theme Support**: Dark and light themes
- **Color Customization**: Fully customizable color scheme for both light and dark themes
- **Responsive Design**: Works on desktop and mobile devices

## Screenshots

<p align="center">
    <img src="screenshots/1.png" width="45%" style="border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.2);margin:8px;">
    <img src="screenshots/2.png" width="45%" style="border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.2);margin:8px;">
    <img src="screenshots/3.png" width="45%" style="border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.2);margin:8px;">
    <img src="screenshots/5.png" width="45%" style="border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.2);margin:8px;">
    <em>📱 Mobile view</em>
    <br>
    <img src="screenshots/4.png" width="25%" style="border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.2);margin:8px;">
    <br>
</p>

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


## Keyboard Shortcuts

Assign keys shortcuts to your bookmarks for quick access. Simply press the assigned keys on the dashboard to open the bookmark.

## Data Storage

Configuration data is stored in JSON files in the `data/` directory:
- `bookmarks-X.json`: Your bookmarks (each page will have the corresponded number, bookmarks-1.json, bookmarks-2.json, etc.)
- `colors.json`: Your theme colors
- `pages.json`: Pages order
- `settings.json`: Application settings


## License

This project is licensed under the MIT License - see the LICENSE file for details.
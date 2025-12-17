# GOTTA.BIKE Ladder Chrome Extension

A Chrome extension for capturing and working with data from [ladder.cycleracing.club](https://ladder.cycleracing.club) - the Zwift racing league ladder.

## Checkout GOTTA.BIKE sauce mod
While useful on its own, this is designed to be used in connection with the GOITTA.BIKE sauce mod.
- [GOTTA.BIKE Sacue](https://github.com/vincentdavis/GOTTA_BIKE_sauce)

## Features

- **Page Type Detection** - Automatically detects the type of ladder page you're viewing (Team, Fixture, Fixtures, Rider, Division, etc.)
- **Team Data Capture** - Extract team roster data including rider stats, power data, and rankings
- **Fixtures Filtering** - Set your team name in settings to see only your team's upcoming fixtures
- **Quick Navigation** - Navigate directly to fixtures page from anywhere
- **Data Export** - Download captured data as JSON or CSV

## Installation

### From Release

1. Download the latest release zip from [Releases](https://github.com/vincentdavis/GOTTA_BIKE_club_laddder_ext/releases)
2. Unzip the file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the `GOTTA_BIKE_ladder` folder

### From Source

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Load the extension from `build/GOTTA_BIKE_ladder` folder

## Usage

### Settings

Click the gear icon to access settings:
- **Team Name** - Enter your team name (or partial name) for fixture filtering

### On Team Pages

When viewing a team page (`/rider/team/n/{id}`):
- Click "Capture Data" to extract team information
- Download as JSON or CSV
- CSV includes all rider power stats

### On Fixtures Page

When viewing the fixtures list (`/rider/fixtures/active`):
- Your team's fixtures are automatically shown (if team name is set in settings)
- Click a fixture to navigate to its match page

### On Fixture Page

When viewing a single fixture (`/rider/fixture/{id}`):
- Both teams are displayed
- Click "View" to navigate to a team's page and download their data

### Quick Navigation

- Click "Go to Fixtures" to navigate directly to the active fixtures page
- When not on ladder.cycleracing.club, click the link icon to open fixtures in a new tab

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

This creates a versioned zip file in the `build/` directory.

### Project Structure

```
src/
├── manifest.json       # Extension manifest
├── popup/
│   ├── popup.html      # Main popup UI
│   ├── popup.js        # Popup logic
│   ├── popup.css       # Popup styles
│   ├── settings.html   # Settings page
│   ├── settings.js     # Settings logic
│   └── settings.css    # Settings styles
├── content/
│   └── content.js      # Content script for data extraction
├── background/
│   └── service-worker.js
└── icons/
    └── *.png           # Extension icons
```

## Versioning

Releases use date-based versioning: `year.month.day.count`

Example: `2025.12.17.1` (first release on December 17, 2025)

## License

MIT License - see [LICENSE.txt](LICENSE.txt)

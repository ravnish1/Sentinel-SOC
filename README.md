# Cyber Threat Dashboard

Cyber Threat Dashboard is a React + Vite single-page application that presents a security operations center style interface for monitoring live threats, incident logs, and platform settings. It includes a command-center dashboard, a threat logs page with filtering, and a settings page for tuning response behavior and integrations.

## Features

- Live threat overview with summary stats, attack volume sparkline, and entity tracking.
- Incident stream with search, severity filters, and verdict filters.
- Security settings panel for presets, alert routing, retention, and detection policy switches.
- India-focused map visualization with active threat pins.
- Mock threat engine that continuously updates stats, logs, and chart data for a dynamic feel.

## Tech Stack

- React 19
- React Router DOM
- Recharts
- Lucide React icons
- Vite

## Project Structure

- `src/App.jsx` routes between the dashboard, threat logs, and settings pages.
- `src/components/` contains the dashboard UI building blocks.
- `src/pages/` contains the full-page views for logs and settings.
- `src/hooks/useThreatEngine.js` generates the live mock telemetry.
- `public/india-map.png` provides the map background used on the dashboard.

## Requirements

- Node.js 18 or newer
- npm

## Installation

```bash
npm install
```

## Running Locally

Start the Vite development server:

```bash
npm run dev
```

Vite will print a local URL in the terminal, usually http://localhost:5173.

## Build for Production

```bash
npm run build
```

This creates an optimized production bundle in the `dist/` directory.

## Preview the Production Build

```bash
npm run preview
```

## What the App Shows

- Dashboard: threat summary cards, a geospatial India map, a live activity feed, attack volume trends, and a threat entity table.
- Threat Logs: searchable incident rows with severity and verdict filters plus action buttons.
- Settings: configurable security presets, routing options, retention controls, and integration status cards.

## Notes

- The data in this project is mock data and refreshes in the browser to simulate a live security console.
- If you change the map asset, keep the file at `public/india-map.png` or update the image path in `src/components/IndiaMap.jsx`.

# Quick Startup Guide

This guide is a short companion to the main repository README. If you want the full overview, architecture, API list, and troubleshooting steps, use [README.md](README.md).

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- Optional: Supabase project for live persistence

## Environment Variables

Create these files before starting the app.

### Frontend: `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:4000
```

### Backend: `backend/.env`

```env
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is required for backend writes when RLS is enabled.

## Install Dependencies

From the repository root:

```bash
npm run install:all
```

## Run the App

### Recommended on Windows
Use separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

### Or run both together

```bash
npm run dev:all
```

## Build and Test

```bash
npm run build
npm run build:all
npm run test
npm run test:watch
```

## What to Open

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Notes

- The frontend can fall back to mock data if the backend is unavailable.
- The main README is the source of truth for full documentation.

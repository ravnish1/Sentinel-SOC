# Cyber Threat Dashboard

A production-minded cybersecurity SOC dashboard built for real-time monitoring, threat analysis, and incident response. The app combines a live threat data pipeline with a dense analyst-first UI, a searchable incident table, an AI analyst panel, a global threat map, and a collapsible operations sidebar.

## What’s Included

- Real-time threat ingestion with Socket.IO updates
- SOC dashboard with compact metrics, a global threat map, live activity feed, and incident drill-downs
- Threat logs page with filters, search, CSV export, and live hunt actions
- Settings page for local dashboard preferences and API utilities
- Express backend with Supabase PostgreSQL integration
- JWT-protected write routes and RLS-aware database access
- Backend integration tests with Jest and Supertest
- Fallback demo mode when the backend is unavailable

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- Socket.IO client
- Recharts
- Lucide React

### Backend
- Node.js
- Express 5
- Socket.IO
- Supabase JavaScript client
- Jest
- Supertest

### Database
- Supabase PostgreSQL
- Row Level Security (RLS)
- Service-role write access for backend ingestion

## Repository Layout

```text
Cyber-threat-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── data/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── poller.js
│   ├── feeds/
│   ├── middleware/
│   ├── __tests__/
│   └── package.json
├── docs/
│   ├── backend.txt
│   ├── implementation plan.txt
│   └── planning-backend.txt
├── README.md
└── package.json
```

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Supabase project if you want live backend persistence

## Environment Setup

Create environment files before running the app.

### Frontend
Create `frontend/.env`:

```bash
VITE_BACKEND_URL=http://localhost:4000
```

If you omit this variable, the frontend defaults to `http://localhost:4000`.

### Backend
Create `backend/.env`:

```bash
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is required for backend writes when RLS is enabled.

## Installation

From the repository root:

```bash
npm run install:all
```

This installs dependencies for the root workspace, `frontend/`, and `backend/`.

## Running the App

### Option 1: Run both apps together

```bash
npm run dev:all
```

On Windows, if you prefer fewer shell edge cases, you can also start them in separate terminals.

### Option 2: Run in separate terminals

Terminal 1:

```bash
npm run dev:backend
```

Backend runs on `http://localhost:4000`.

Terminal 2:

```bash
npm run dev:frontend
```

Frontend runs on `http://localhost:5173` by default.

## Build

### Frontend production build

```bash
npm run build
```

### Build both frontend and backend

```bash
npm run build:all
```

## Testing

Run backend integration tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

## Available Scripts

Run these from the repository root:

```bash
npm run install:all   # Install root, frontend, and backend dependencies
npm run dev:all       # Start frontend and backend together
npm run dev:backend    # Start only the backend server
npm run dev:frontend   # Start only the frontend dev server
npm run build          # Build the frontend
npm run build:all      # Build frontend and backend
npm run preview        # Preview the frontend production build
npm run test           # Run backend tests
npm run test:watch     # Run backend tests in watch mode
npm start              # Start the backend server in production mode
```

## Key Features

### Dashboard
- Top metric cards for vulnerabilities, incidents, compliance, remediation time, and signal integrity
- Global threat map with interactive hotspots
- Ranked region activity bars
- AI analyst summary with suggested actions
- Live activity feed with sorting and severity filters
- Threat logs table with search, filters, and incident drill-down
- Command palette support with `Ctrl + K`

### Threat Logs
- Searchable incident table
- Severity and verdict-style filtering
- Live Hunt trigger for immediate ingestion
- CSV export for filtered rows
- Detail panel for selected incidents

### Sidebar Navigation
- Collapsible desktop sidebar
- Mobile bottom navigation
- Modules for Dashboard, Findings, Incidents, Compliance, Vault, Integrations, and Settings
- New Task CTA for quick command palette access

## Data Flow

```text
Frontend useThreatEngine hook
    ↓
GET /api/threats
    ↓
Socket.IO threatUpdate events
    ↓
Dashboard, logs, and AI analyst panels update in real time
```

For live hunt actions:

```text
Trigger Hunt button
    ↓
POST /api/poller/run
    ↓
Backend poller fetches threats
    ↓
Insert into Supabase PostgreSQL
    ↓
Emit threatUpdate via Socket.IO
```

## Backend API

### Public Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/threats` | List recent threats |
| GET | `/api/threats/:id` | Fetch a single threat |
| POST | `/api/poller/run` | Run a live ingestion cycle |

### Auth-Protected Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/threats` | Create a threat |
| PUT | `/api/threats/:id` | Update a threat |
| DELETE | `/api/threats/:id` | Delete a threat |

Protected routes require a Bearer JWT in the `Authorization` header.

## Database Notes

The backend expects a `threats` table in Supabase with RLS enabled. The backend uses a service-role key for writes, while the frontend reads through public API endpoints.

Important fields used by the app include:
- `id`
- `indicator`
- `type`
- `source`
- `timestamp`
- `raw_json`
- `created_at`
- `updated_at`

## Fallback Mode

If the backend is offline or the API cannot be reached:
- The frontend loads mock threat data
- The dashboard shows a fallback connection state
- The UI remains usable for design review and local interaction

## Deployment

### Frontend
Build the frontend and deploy the generated files from `frontend/dist/` to any static hosting provider.

### Backend
The backend can run on a Node host, container platform, or VM with the required environment variables.

Example Docker build for the backend:

```bash
cd backend
docker build -t cyber-threat-dashboard-backend .
```

## Troubleshooting

### Frontend shows fallback data
- Check that the backend is running on the expected port
- Verify `VITE_BACKEND_URL` in `frontend/.env`
- Confirm the browser can reach `http://localhost:4000`

### Backend fails to start
- Verify all Supabase environment variables are set
- Check that the service role key is valid
- Make sure the target port is not already in use

### Tests fail
- Run `npm install` in the repository root if dependencies are missing
- Make sure the backend test dependencies are installed
- Check the test output for missing environment variables

## Notes

- The project is designed as a SOC dashboard, not a landing page
- The UI is optimized for analyst workflows and long monitoring sessions
- Planning notes in `docs/` are historical references and may not match the final app state
- The frontend is intentionally resilient and can operate in fallback mode if the backend is unavailable

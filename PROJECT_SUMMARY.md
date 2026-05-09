# GreenOps — Technical Reference

## 1. WHAT THE APP DOES

GreenOps is a mobile-first operations dashboard for a small landscaping business. It lets the owner log jobs with full cost breakdowns (revenue, labor hours, materials, fuel), track overhead expenses with inline edit and delete, optimize the daily driving route using OR-Tools TSP and Mapbox APIs, and view financial performance through a Dashboard tab (monthly stat cards, revenue-vs-profit bar chart, expense pie chart, job and expense lists) and a dedicated Reports tab (weekly daily-profit bar chart color-coded by margin, monthly weekly-profit bar chart, expense breakdown pie, and ranked jobs by margin with low-margin warnings). An AI assistant tab powered by Claude Haiku answers business questions using real-time context including monthly summaries, weekly breakdowns, top/bottom jobs by margin, and expense totals by category. The app supports light and dark mode with localStorage persistence and includes a Web Speech API microphone button for hands-free voice queries.

---

## 2. COMPLETE FILE STRUCTURE

```
landscaping-app/
├── main.py                    Flask app entry point; all API routes defined here
├── requirements.txt           Python dependencies
├── Procfile                   Gunicorn start command for Render
├── render.yaml                Render.com deployment config
├── nixpacks.toml              Railway build config (system deps for ortools)
├── .env                       Local environment variables (not committed)
│
├── models/
│   └── db.py                  SQLAlchemy models: Client, Job, Expense
│
├── routes/
│   ├── financials.py          P&L calculation functions (job profit, monthly summary, weekly/monthly reports)
│   └── optimize.py            Mapbox geocoding + OR-Tools TSP route optimizer
│
├── agents/
│   └── claude_agent.py        Anthropic API client; sends business context to Claude Haiku
│
└── frontend/
    ├── package.json           React + Vite + Recharts dependencies
    ├── vite.config.js         Vite config
    ├── index.html             HTML entry point
    ├── .env.production        VITE_API_URL pointing to Render backend
    └── src/
        ├── main.jsx           React entry point
        └── App.jsx            Full single-file React app (all components)
```

---

## 3. TECH STACK

| Layer | Library / Service | Role |
|---|---|---|
| Backend language | Python 3.11 | Server runtime |
| Web framework | Flask 3.x | HTTP routing, JSON API |
| CORS | flask-cors | Allow frontend origin |
| ORM | Flask-SQLAlchemy 3.x | Database models and queries |
| Database | SQLite (via SQLAlchemy) | Persistent local storage |
| Route solver | Google OR-Tools 9.9 | TSP solver for optimal job order |
| Maps / Geocoding | Mapbox Geocoding API | Address → lat/lng conversion |
| Maps / Matrix | Mapbox Matrix API | Drive-time estimates between stops |
| AI | Anthropic API (claude-haiku-4-5-20251001) | Natural-language business Q&A |
| Env vars | python-dotenv | Load `.env` in development |
| WSGI server | Gunicorn | Production HTTP server |
| Frontend framework | React 18 | UI component tree |
| Build tool | Vite | Dev server + production build |
| Charts | Recharts | BarChart, PieChart with Cell coloring |
| Voice input | Web Speech API (built-in) | Mic button in Ask Claude tab |
| Hosting — backend | Render.com (free tier) | Python web service |
| Hosting — frontend | Vercel | Static site from Vite build |

---

## 4. ALL API ENDPOINTS

### Jobs

| Method | Path | Body / Params | Returns |
|---|---|---|---|
| GET | `/api/jobs` | — | Array of all jobs, newest first |
| POST | `/api/jobs` | `{client_name, address, revenue, labor_hours, materials_cost, fuel_cost, date, status, lat, lng}` | Created job object |
| GET | `/api/jobs/<id>` | — | Single job object |
| PUT | `/api/jobs/<id>` | Any job fields to update | Updated job object |
| DELETE | `/api/jobs/<id>` | — | `{"deleted": true}` |

### Financials

| Method | Path | Params | Returns |
|---|---|---|---|
| GET | `/api/financials/job/<id>` | `hourly_rate` (default 25) | Per-job P&L: revenue, costs, profit, margin_pct |
| GET | `/api/financials/summary` | `month` (YYYY-MM), `hourly_rate` | Monthly totals + job breakdown + expense_by_category |

### Expenses

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/expenses` | — | Array of all expenses, newest first |
| POST | `/api/expenses` | `{description, amount, category, date}` | Created expense object |
| PUT | `/api/expenses/<id>` | Any expense fields to update | Updated expense object |
| DELETE | `/api/expenses/<id>` | — | `{"deleted": true}` |

### Reports

| Method | Path | Params | Returns |
|---|---|---|---|
| GET | `/api/reports/weekly` | `date` (YYYY-MM-DD, any day in target week), `hourly_rate` | `{week_start, week_end, days: [{date, day, revenue, profit, margin_pct, job_count}], total_revenue, total_profit}` |
| GET | `/api/reports/monthly` | `month` (YYYY-MM), `hourly_rate` | `{month, weekly_breakdown, top_jobs, bottom_jobs, expense_by_category, total_revenue, total_profit}` |

### Route & AI

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/optimize-route` | `{start_address, job_addresses: [], current_location?: {lat, lng}}` | `{optimized_stops, total_stops, estimated_total_drive_minutes, apple_maps_url}` |
| POST | `/api/ask` | `{question, month?, hourly_rate?}` | `{"answer": "..."}` |

---

## 5. DATABASE MODELS

### Job (`jobs` table)

| Field | Type | Notes |
|---|---|---|
| id | Integer | Primary key |
| client_name | String(120) | Required |
| address | String(255) | Required |
| revenue | Float | Default 0.0 |
| labor_hours | Float | Default 0.0 |
| materials_cost | Float | Default 0.0 |
| fuel_cost | Float | Default 0.0 |
| date | String(20) | Stored as `"YYYY-MM-DD"` |
| status | String(30) | `"scheduled"` / `"in_progress"` / `"complete"` |
| lat | Float | Nullable; GPS latitude |
| lng | Float | Nullable; GPS longitude |
| notes | Text | Nullable |
| created_at | DateTime | Auto-set to UTC now |

### Expense (`expenses` table)

| Field | Type | Notes |
|---|---|---|
| id | Integer | Primary key |
| description | String(255) | Required |
| amount | Float | Required |
| category | String(60) | Default `"general"` |
| date | String(20) | Stored as `"YYYY-MM-DD"` |
| created_at | DateTime | Auto-set to UTC now |

### Client (`clients` table)

| Field | Type | Notes |
|---|---|---|
| id | Integer | Primary key |
| name | String(120) | Required |
| address | String(255) | Nullable |
| phone | String(20) | Nullable |
| email | String(120) | Nullable |
| notes | Text | Nullable |
| created_at | DateTime | Auto-set to UTC now |

---

## 6. ENVIRONMENT VARIABLES

### Backend (set in Render dashboard → Environment, and in local `.env`)

| Key | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Haiku; get from console.anthropic.com |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public token for geocoding and matrix APIs |
| `PORT` | Injected automatically by Render; defaults to 5000 locally |
| `PYTHON_VERSION` | Set to `3.11.0` in `render.yaml` |

### Frontend (set in Vercel dashboard → Settings → Environment Variables, and in `frontend/.env.production`)

| Key | Description |
|---|---|
| `VITE_API_URL` | Full URL of the backend API, e.g. `https://greenops-landscaping.onrender.com/api` |

**Important:** In `main.py`, `load_dotenv(override=True)` must be called before any other imports so `claude_agent.py` reads the correct key at module load time.

---

## 7. DEPLOYMENT URLS

| Service | URL |
|---|---|
| Backend (Render) | `https://greenops-landscaping.onrender.com` |
| Frontend (Vercel) | Deployed from `frontend/` directory; set `VITE_API_URL` to the Render URL above |

**How they connect:** The Vite frontend reads `import.meta.env.VITE_API_URL` at build time (set in Vercel env vars or `frontend/.env.production`) and uses it as the base URL for all `fetch()` calls. Flask has `flask-cors` enabled globally so the Vercel origin is allowed.

**Render cold starts:** The free Render plan spins down after 15 minutes of inactivity. The first request after idle takes 30–60 seconds.

---

## 8. CURRENT STATE — COMPLETE FEATURES

- **Dashboard tab:** Monthly stat cards (revenue, net profit, jobs, total expenses), revenue-vs-profit bar chart per job, expense breakdown pie chart, recent jobs list, expenses list with inline edit and delete (✏️ / 🗑️ with confirmation)
- **Reports tab:** Weekly view (daily net profit bar chart, color-coded by margin ≥20%/10-20%/<10%, day breakdown table); monthly view (weekly profit bar chart with below-20% warning banner, expense pie chart, top 3 and bottom 3 jobs by margin)
- **Route Optimizer tab:** Multi-stop address input, optional GPS start location, OR-Tools TSP optimization, Mapbox drive-time estimates, Apple Maps deep link
- **Add Job tab:** Form to create a new job with all cost fields
- **Ask Claude tab:** Free-text input, suggestion chip shortcuts, Web Speech API mic button with pulse animation, answers from Claude Haiku with enriched context (monthly summary, weekly breakdown, weekly P&L, top/bottom jobs by margin, expense totals by category)
- **Light / dark mode** toggle with localStorage persistence and 0.2s CSS transitions
- **Backend deployed** on Render with Gunicorn (2 workers, 120s timeout)
- **Frontend deployed** on Vercel pointing to Render backend

---

## 9. KNOWN ISSUES / NEXT STEPS

- **Render cold starts:** Free tier idles after 15 min; first request is slow. Upgrade to paid plan or add a cron ping to keep it warm.
- **No authentication:** The API has no auth; anyone with the URL can read/write data. Add JWT or an API key header before sharing the URL publicly.
- **SQLite on Render:** Render's free filesystem is ephemeral — data resets on each deploy. Migrate to PostgreSQL (Render offers a free PG instance) for persistence.
- **No AddExpense form:** Expenses can be added via direct API call but there is no UI form yet. Add an "Add Expense" form similar to Add Job.
- **Client model unused:** The `Client` table exists in the schema but is not wired to any API endpoint or UI.
- **Reports weekly date picker:** The weekly report always shows the current week. Add a week navigator (previous/next week arrows).
- **Hourly rate hardcoded:** The `hourly_rate` is fixed at $25 in all frontend fetch calls. Add a settings screen to configure it.
- **No offline support:** The app requires the Render backend to be reachable; there is no offline/cache fallback.

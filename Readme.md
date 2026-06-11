# MarunnUndo (മരുന്നുണ്ടോ?) 🩺

MarunnUndo is a real-time proximity pharmacy finder map interface tailored for Kerala. It allows users to pinpoint nearby pharmacies, see which ones are verified or synced, filter them in real-time, and query medicine stock availability directly through a pre-filled WhatsApp messaging template.

---

## 🔄 End-to-End System Architecture

```
[ User Smartphone / Browser Frontend ]
      │
      ▼ (1. Captures GPS Coordinates: e.g., 9.9312, 76.2673)
[ Backend Routing Engine (FastAPI) ]
      │
      ├─► (2. Check Proximity Cache) ──► [ Supabase / SQLite Database ]
      │                                             │
      ├─► (3. Cache Miss: Sync Fetch) ──► [ OSM Overpass API ] ──► (Instant Return)
      │
      └─► (4. Background Thread) ──────► [ Playwright Scraper Agent ] ──► (Save Cache)
```

---

## 🛠️ Tech Stack & Features

1. **Frontend**:
   - Single Page App (`index.html`, `style.css`, `app.js`) in the project root.
   - Full-screen interactive maps powered by **Leaflet.js** using CartoDB Positron premium tiles (clean white/grey look).
   - Custom **Medical Blue & White** theme with responsive sidebars, beautiful animations, and mobile layout adaptivity.
   - Browser Geolocation API integration to center on user location automatically.
   - Dynamic real-time text filter matching names/addresses.
   - Dynamic WhatsApp integration: prefills the query based on what you typed in the search bar (e.g. *"Hi, do you have stock for Insulin?"*).
   - Clipboard copy fallback for pharmacies without a registered phone number.

2. **Backend Router & Caching**:
   - Python **FastAPI** web server (`backend/main.py`).
   - Dual-database compatibility: automatically runs using a local **SQLite** file (`marunnundo.db`) and switches to **Supabase PostgreSQL** if `SUPABASE_URL` and `SUPABASE_KEY` are provided.
   - High-performance **Haversine distance** calculation in SQL to filter locations within a 5km radius.
   - **Overpass API (OpenStreetMap)** integration to instantly fetch verified coordinates, names, and addresses.
   - **Playwright Crawler** running as an asynchronous background task to scrape local business listings from Google Maps, caching them to prevent future rate-limits.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Python 3.12+
- Node.js (for browser testing / local tools, optional)

### 1. Initialize Virtual Environment & Install Dependencies
Run the following commands in the project root directory:

```bash
# Create virtual environment
python3 -m venv venv

# Activate and install python packages
./venv/bin/pip install -r backend/requirements.txt

# Install Playwright browser dependencies (for the Google Maps scraper worker)
./venv/bin/playwright install chromium
```

### 2. Configure Environment (Optional)
A `.env` file is generated in `backend/.env`. If you want to connect to a live Supabase project, populate these variables:

```ini
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

*Note: If these are left blank, MarunnUndo will automatically create and use a local SQLite database (`marunnundo.db`) in the root directory.*

### 3. Run the Backend API Server
Start the Uvicorn server:

```bash
./venv/bin/uvicorn backend.main:app --reload --port 8000
```

The server will initialize the database schema and start listening on:
- API endpoint: [http://localhost:8000/api/pharmacies](http://localhost:8000/api/pharmacies)
- Frontend client: [http://localhost:8000](http://localhost:8000)

Open [http://localhost:8000](http://localhost:8000) in your web browser. It will ask for location access, center on your location, and list pharmacies.

---

## ☁️ Vercel Deployment (Frontend)

To deploy the frontend to Vercel:

1. **Import the repository** into Vercel.
2. Vercel automatically detects the static HTML/CSS/JS files in the root folder and hosts them as a static site.
3. **Configure the Backend URL**:
   Before deploying, edit `app.js` (line 3) to configure your deployed backend API URL (e.g., hosted on Render or Railway):
   ```javascript
   const API_BASE = "https://your-backend-service.onrender.com";
   ```
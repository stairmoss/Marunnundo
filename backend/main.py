import os
from fastapi import FastAPI, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import (
    init_db,
    has_scanned_nearby,
    get_pharmacies_in_radius,
    save_pharmacies,
    save_scan
)
from backend.scraper import fetch_from_overpass, scrape_from_google_maps

app = FastAPI(title="MarunnUndo API", description="Real-time pharmacy caching API")

# Configure CORS so Vercel frontend or local files can query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    init_db()

async def run_google_maps_scraper(lat: float, lon: float):
    """
    Background worker that runs the Playwright Google Maps scraper.
    """
    print(f"[Background Worker] Starting scraper for coordinates ({lat}, {lon})")
    try:
        gmaps_stores = await scrape_from_google_maps(lat, lon)
        if gmaps_stores:
            save_pharmacies(gmaps_stores)
            print(f"[Background Worker] Saved {len(gmaps_stores)} scraped stores to cache.")
        else:
            print("[Background Worker] Scraper returned no results.")
    except Exception as e:
        print(f"[Background Worker] Scraper error: {e}")

@app.get("/api/pharmacies")
async def get_pharmacies(
    lat: float = Query(..., description="Latitude of location"),
    lon: float = Query(..., description="Longitude of location"),
    radius: float = Query(5.0, description="Radius in kilometers"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Validate coordinate range
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
        
    print(f"[API] Request received: lat={lat}, lon={lon}, radius={radius}km")
    
    # 1. Check if the region has been scanned within 5km in the last 24 hours
    is_cached = has_scanned_nearby(lat, lon, radius_km=radius)
    
    if is_cached:
        print("[API] Cache HIT. Returning stored pharmacies.")
        stores = get_pharmacies_in_radius(lat, lon, radius)
        return {
            "cached": True,
            "count": len(stores),
            "results": stores
        }
        
    print("[API] Cache MISS. Fetching fresh OSM data and scheduling Google scraper...")
    
    # 2. Fetch OSM Overpass pharmacies synchronously (fast)
    osm_stores = fetch_from_overpass(lat, lon, radius_km=radius)
    if osm_stores:
        save_pharmacies(osm_stores)
        
    # 3. Save scan log immediately to prevent concurrent duplicate scraping tasks
    save_scan(lat, lon)
    
    # 4. Schedule Google Maps scraper in background (asynchronously)
    background_tasks.add_task(run_google_maps_scraper, lat, lon)
    
    # 5. Retrieve whatever we have stored so far (which now includes OSM stores) and return it
    stores = get_pharmacies_in_radius(lat, lon, radius)
    return {
        "cached": False,
        "count": len(stores),
        "results": stores
    }

@app.get("/api/status")
def get_status():
    return {
        "status": "healthy",
        "service": "MarunnUndo Routing Engine"
    }

# Frontend Static File Serving
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Serve style.css, app.js, and static assets from root
@app.get("/")
def serve_home():
    index_path = os.path.join(ROOT_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to MarunnUndo API. Frontend files are missing."}

@app.get("/style.css")
def serve_css():
    css_path = os.path.join(ROOT_DIR, "style.css")
    if os.path.exists(css_path):
        return FileResponse(css_path, media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")

@app.get("/app.js")
def serve_js():
    js_path = os.path.join(ROOT_DIR, "app.js")
    if os.path.exists(js_path):
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="app.js not found")

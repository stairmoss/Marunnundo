import re
import urllib.parse
import httpx
import asyncio
from playwright.async_api import async_playwright

def fetch_from_overpass(lat: float, lon: float, radius_km: float = 5.0) -> list:
    """
    Track A: Queries OpenStreetMap Overpass API for pharmacies within radius_km.
    This is extremely fast and reliable.
    """
    print(f"[Overpass] Fetching pharmacies near ({lat}, {lon}) within {radius_km}km...")
    radius_meters = int(radius_km * 1000)
    
    # Overpass QL query targeting pharmacies (nodes, ways, relations)
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="pharmacy"](around:{radius_meters},{lat},{lon});
      way["amenity"="pharmacy"](around:{radius_meters},{lat},{lon});
      relation["amenity"="pharmacy"](around:{radius_meters},{lat},{lon});
    );
    out center;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    headers = {
        "User-Agent": "MarunnUndoProximityFinder/1.0 (contact@marunnundo.in)",
        "Accept": "application/json"
    }
    try:
        response = httpx.post(url, data={"data": query}, headers=headers, timeout=30.0)
        if response.status_code != 200:
            print(f"[Overpass] Error: status code {response.status_code}")
            return []
            
        data = response.json()
        elements = data.get("elements", [])
        pharmacies = []
        
        for elem in elements:
            # Get coordinates
            elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
            elem_lon = elem.get("lon") or elem.get("center", {}).get("lon")
            if not elem_lat or not elem_lon:
                continue
                
            tags = elem.get("tags", {})
            name = tags.get("name") or tags.get("brand") or "Unnamed Pharmacy"
            
            # Format address
            addr_parts = []
            if tags.get("addr:housenumber"):
                addr_parts.append(tags.get("addr:housenumber"))
            if tags.get("addr:street"):
                addr_parts.append(tags.get("addr:street"))
            if tags.get("addr:place"):
                addr_parts.append(tags.get("addr:place"))
            if tags.get("addr:city"):
                addr_parts.append(tags.get("addr:city"))
            if tags.get("addr:postcode"):
                addr_parts.append(tags.get("addr:postcode"))
                
            address = ", ".join(addr_parts) if addr_parts else tags.get("addr:full") or "Kerala, India"
            phone = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:whatsapp") or ""
            
            pharmacies.append({
                "id": f"osm_{elem.get('id')}",
                "name": name,
                "latitude": float(elem_lat),
                "longitude": float(elem_lon),
                "address": address,
                "phone": phone,
                "source": "Ecosystem Sync"
            })
            
        print(f"[Overpass] Successfully fetched {len(pharmacies)} pharmacies.")
        return pharmacies
    except Exception as e:
        print(f"[Overpass] Request failed: {e}")
        return []

async def scrape_from_google_maps(lat: float, lon: float) -> list:
    """
    Track B: Uses Playwright browser automation to scrape Google Maps local results.
    """
    print(f"[Scraper] Scraping Google Maps for pharmacies near ({lat}, {lon})...")
    
    # Formulate Google Maps search query
    query = f"medical shops near {lat}, {lon}, Kerala"
    search_url = f"https://www.google.com/maps/search/{urllib.parse.quote(query)}"
    
    pharmacies = []
    
    try:
        async with async_playwright() as p:
            # Launch headless browser with user agent
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            
            # Set viewport size and user agent to avoid blocking
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            
            # Navigate to the page
            await page.goto(search_url, timeout=30000, wait_until="domcontentloaded")
            
            # Wait for any search results to render
            # In Google Maps, cards usually contain links pointing to maps/place/...
            try:
                await page.wait_for_selector('a[href*="/maps/place/"]', timeout=8000)
            except Exception:
                print("[Scraper] Timeout waiting for Google Maps place cards. Standard page might not have results.")
                # We can dump page text for debugging
                await browser.close()
                return []
                
            # Scroll the sidebar panel to load more results if possible
            # Google Maps results panel usually has role="feed" or is scrollable
            feed_selector = 'div[role="feed"]'
            if await page.locator(feed_selector).count() > 0:
                for _ in range(3):
                    await page.locator(feed_selector).evaluate("el => el.scrollBy(0, 1000)")
                    await asyncio.sleep(0.5)
            
            # Find place links
            cards = await page.locator('a[href*="/maps/place/"]').all()
            print(f"[Scraper] Found {len(cards)} cards on Google Maps page.")
            
            # Regex patterns to extract coordinates from URL
            regex_data = re.compile(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)')
            regex_at = re.compile(r'@(-?\d+\.\d+),(-?\d+\.\d+)')
            
            count = 0
            for card in cards:
                try:
                    href = await card.get_attribute("href")
                    if not href:
                        continue
                        
                    # Extract coordinates
                    coords_match = regex_data.search(href) or regex_at.search(href)
                    if not coords_match:
                        continue
                        
                    card_lat = float(coords_match.group(1))
                    card_lon = float(coords_match.group(2))
                    
                    # Extract name
                    # Typically the link has an aria-label with the name, e.g. "Lala Pharmacy"
                    aria_label = await card.get_attribute("aria-label")
                    if aria_label:
                        name = aria_label.strip()
                    else:
                        name = await card.inner_text()
                        name = name.split('\n')[0].strip() or "Unknown Medicals"
                    
                    # Clean name (remove ratings/reviews suffix like "4.2(15)")
                    name = re.sub(r'\s*\d+\.\d+\s*\(.*?\)', '', name).strip()
                    
                    # Create a unique ID using the name and coords
                    place_id = f"gmaps_{abs(hash(name + f'{card_lat},{card_lon}'))}"
                    
                    # Try to extract details from the card container parent
                    parent_text = ""
                    try:
                        # Find parent container text
                        # In Google Maps, cards have text with address and phone
                        parent_text = await page.evaluate(
                            "(el) => el.closest('div[role=\"article\"]') ? el.closest('div[role=\"article\"]').innerText : ''",
                            card
                        )
                    except Exception:
                        pass
                        
                    # Parse address and phone from parent text
                    address = "Kerala, India"
                    phone = ""
                    
                    if parent_text:
                        lines = [line.strip() for line in parent_text.split('\n') if line.strip()]
                        # The first line is usually the name. Let's look for address-like terms or phone patterns
                        # Phone numbers in India usually look like +91 9xxx, 04xx, etc.
                        phone_match = re.search(r'(\+91\s*\d{10}|\b\d{5}\s*\d{5}\b|\b0\d{2,4}\s*\d{6,8}\b)', parent_text)
                        if phone_match:
                            phone = phone_match.group(1).replace(" ", "")
                            
                        # Extract Address: items with digits, commas, or street indicators
                        address_lines = []
                        for line in lines[1:]:
                            if any(word in line.lower() for word in ["road", "street", "junction", "near", "opposite", "bldg", "shop", "floor", "market", "kerala"]):
                                if not re.search(r'^\d+\.\d+\s*\(', line) and not phone_match: # skip rating line
                                    address_lines.append(line)
                        if address_lines:
                            address = ", ".join(address_lines[:2])
                            
                    pharmacies.append({
                        "id": place_id,
                        "name": name,
                        "latitude": card_lat,
                        "longitude": card_lon,
                        "address": address,
                        "phone": phone,
                        "source": "Verified"
                    })
                    count += 1
                    if count >= 10:  # Cap at 10 results from maps scraper to keep speed reasonable
                        break
                except Exception as card_err:
                    print(f"[Scraper] Error parsing card: {card_err}")
                    continue
                    
            await browser.close()
            
    except Exception as e:
        print(f"[Scraper] Playwright browser automation failed: {e}")
        
    print(f"[Scraper] Scraped {len(pharmacies)} pharmacies from Google Maps.")
    return pharmacies

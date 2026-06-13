// MarunnUndo Client Application
// Zero-Backend, Serverless, OpenStreetMap-Only

let map;
let userMarker;
let storeMarkers = [];
let allStores = [];
let userCoords = { lat: 9.9312, lon: 76.2673 }; // Default Kochi, Kerala

// DOM Elements
const searchInput = document.getElementById('medicine-search');
const placeInput = document.getElementById('place-search');
const statusDot = document.getElementById('location-dot');
const statusText = document.getElementById('status-text');
const coordDisplay = document.getElementById('coord-display');
const btnScan = document.getElementById('btn-scan');
const resultsCount = document.getElementById('results-count');
const listPlaceholder = document.getElementById('list-placeholder');
const pharmaciesList = document.getElementById('pharmacies-list');

// Custom SVG Icons in Medical Blue / Theme colors
const blueMarkerIcon = L.divIcon({
  html: `
    <div class="custom-pin">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" 
              fill="var(--primary)" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    </div>
  `,
  className: 'custom-div-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -32]
});

const userMarkerIcon = L.divIcon({
  html: `
    <div class="user-pulse-marker">
      <div class="pulse-ring"></div>
      <div class="inner-dot"></div>
    </div>
  `,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Translation Lookup Table
const i18n = {
  en: {
    "app-title": "MarunnUndo",
    "app-subtitle": "മരുന്നുണ്ടോ?",
    "tagline": "Verify medicine stock at nearby pharmacies instantly.",
    "place-search-placeholder": "Search place/city (e.g., Aluva, Trivandrum)...",
    "medicine-search-placeholder": "Type medicine name (e.g., Insulin)...",
    "status-detecting": "Finding location (takes up to 15s)...",
    "status-loading-osm": "Loading directly from OpenStreetMap.",
    "status-osm-failed": "OSM query failed. Check connection.",
    "status-searching": "Searching...",
    "status-not-found": "Place not found. Try another name.",
    "status-search-failed": "Search failed. Check connection.",
    "btn-scan": "Use Current Location",
    "results-title": "Nearby Pharmacies",
    "list-placeholder": "Please allow location access to discover shops.",
    "list-placeholder-scanning": "Scanning area... Please wait.",
    "list-placeholder-empty": "No pharmacies found in this area. Try scanning another spot.",
    "list-placeholder-error": "Unable to fetch pharmacies. Check connection.",
    "footer-text": "MarunnUndo Made for Kerala.",
    "detail-category-ph": "Pharmacy / Medical Store",
    "detail-whatsapp": "WhatsApp",
    "detail-directions": "Directions",
    "detail-copy": "Copy Query",
    "detail-call": "Call",
    "detail-address-label": "Address",
    "detail-phone-label": "Phone (Important)",
    "detail-hours-label": "Hours",
    "detail-hours-missing": "Not available",
    "detail-phone-missing": "Missing phone number",
    "detail-address-missing": "Address not available",
    "results-count-suffix": " found",
    "available": "Available",
    "missing": "Missing",
    "copied-toast": "Copied! ✓"
  },
  ml: {
    "app-title": "മരുന്നുണ്ടോ",
    "app-subtitle": "MarunnUndo?",
    "tagline": "സമീപത്തുള്ള ഫാർമസികളിൽ മരുന്ന് സ്റ്റോക്ക് ഉണ്ടോ എന്ന് പരിശോധിക്കുക.",
    "place-search-placeholder": "സ്ഥലം തെരയുക (ഉദാ: ആലുവ, തിരുവനന്തപുരം)...",
    "medicine-search-placeholder": "മരുന്നിന്റെ പേര് നൽകുക (ഉദാ: Insulin)...",
    "status-detecting": "ലൊക്കേഷൻ കണ്ടെത്തുന്നു (15 സെക്കന്റ് വരെ എടുത്തേക്കാം)...",
    "status-loading-osm": "OpenStreetMap-ൽ നിന്നും ലോഡ് ചെയ്യുന്നു.",
    "status-osm-failed": "ലൊക്കേഷൻ കണ്ടെത്താൻ സാധിച്ചില്ല. കണക്ഷൻ പരിശോധിക്കുക.",
    "status-searching": "തിരയുന്നു...",
    "status-not-found": "സ്ഥലം കണ്ടെത്താനായില്ല. മറ്റൊന്ന് ശ്രമിക്കുക.",
    "status-search-failed": "തിരച്ചിൽ പരാജയപ്പെട്ടു. കണക്ഷൻ പരിശോധിക്കുക.",
    "btn-scan": "എന്റെ ലൊക്കേഷൻ ഉപയോഗിക്കുക",
    "results-title": "സമീപത്തുള്ള ഫാർമസികൾ",
    "list-placeholder": "സ്ഥലങ്ങൾ കാണാൻ ലൊക്കേഷൻ അനുമതി നൽകുക.",
    "list-placeholder-scanning": "പരിശോധിക്കുന്നു... ദയവായി കാത്തിരിക്കുക.",
    "list-placeholder-empty": "ഈ ഭാഗത്ത് ഫാർമസികൾ കണ്ടെത്താനായില്ല. മറ്റൊരിടത്ത് ശ്രമിക്കുക.",
    "list-placeholder-error": "ഫാർമസികൾ ലഭ്യമാക്കാൻ സാധിച്ചില്ല. ഇന്റർനെറ്റ് പരിശോധിക്കുക.",
    "footer-text": "മരുന്നുണ്ടോ - കേരളത്തിനായി നിർമ്മിച്ചത്.",
    "detail-category-ph": "ഫാർമസി / മെഡിക്കൽ സ്റ്റോർ",
    "detail-whatsapp": "വാട്സാപ്പ്",
    "detail-directions": "വഴി കാണിക്കുക",
    "detail-copy": "കോപ്പി ചെയ്യുക",
    "detail-call": "വിളിക്കുക",
    "detail-address-label": "മേൽവിലാസം",
    "detail-phone-label": "ഫോൺ നമ്പർ",
    "detail-hours-label": "പ്രവർത്തന സമയം",
    "detail-hours-missing": "ലഭ്യമല്ല",
    "detail-phone-missing": "ഫോൺ നമ്പർ ലഭ്യമല്ല",
    "detail-address-missing": "മേൽവിലാസം ലഭ്യമല്ല",
    "results-count-suffix": " എണ്ണം കണ്ടെത്തി",
    "available": "ലഭ്യമാണ്",
    "missing": "ലഭ്യമല്ല",
    "copied-toast": "കോപ്പി ചെയ്തു! ✓"
  }
};

// State Variables for Lang/Theme
let currentLang = 'en';
try {
  currentLang = localStorage.getItem('marunnundo_lang') || 'en';
} catch (e) {
  console.warn('localStorage read failed:', e);
}

let currentTheme = 'light';
try {
  currentTheme = localStorage.getItem('marunnundo_theme') || 'light';
} catch (e) {
  console.warn('localStorage read failed:', e);
}

// App Initialization
function initApp() {
  applyTheme(currentTheme);
  translatePage(currentLang);
  
  initMap(userCoords.lat, userCoords.lon);
  requestUserLocation();
  
  // Set up event listeners
  const statusIndicator = document.querySelector('.status-indicator');
  if (statusIndicator) {
    statusIndicator.addEventListener('click', requestUserLocation);
  }
  searchInput.addEventListener('input', filterStores);
  placeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchLocation(placeInput.value.trim());
    }
  });
  btnScan.addEventListener('click', requestUserLocation);
  
  // Theme Toggle Click
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }
  
  // Language Toggle Click
  const btnLang = document.getElementById('btn-lang');
  if (btnLang) {
    btnLang.addEventListener('click', () => {
      const nextLang = currentLang === 'en' ? 'ml' : 'en';
      translatePage(nextLang);
      
      // Re-render stores to update localized text
      renderStores(allStores);
    });
  }
  
  // Close details panel listener
  const btnCloseDetail = document.getElementById('btn-close-detail');
  if (btnCloseDetail) {
    btnCloseDetail.addEventListener('click', hideStoreDetails);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Apply theme to document element
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  
  const sunIcon = document.querySelector('#btn-theme .sun-icon');
  const moonIcon = document.querySelector('#btn-theme .moon-icon');
  
  if (theme === 'dark') {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
  
  try {
    localStorage.setItem('marunnundo_theme', theme);
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

// Translate page tags
function translatePage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('lang', lang);
  
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      elem.textContent = i18n[lang][key];
    }
  });
  
  // Placeholders
  const placeSearch = document.getElementById('place-search');
  if (placeSearch && i18n[lang] && i18n[lang]['place-search-placeholder']) {
    placeSearch.placeholder = i18n[lang]['place-search-placeholder'];
  }
  
  const medicineSearch = document.getElementById('medicine-search');
  if (medicineSearch && i18n[lang] && i18n[lang]['medicine-search-placeholder']) {
    medicineSearch.placeholder = i18n[lang]['medicine-search-placeholder'];
  }
  
  // Language button label
  const langLabel = document.querySelector('#btn-lang .lang-label');
  if (langLabel) {
    langLabel.textContent = lang === 'en' ? 'മലയാളം' : 'English';
  }
  
  // Update list placeholder text dynamically
  if (allStores.length === 0) {
    const isScanning = listPlaceholder.textContent.includes("Scanning") || listPlaceholder.textContent.includes("പരിശോധിക്കുന്നു");
    if (isScanning) {
      listPlaceholder.textContent = i18n[lang]['list-placeholder-scanning'];
    } else {
      listPlaceholder.textContent = i18n[lang]['list-placeholder'];
    }
  }
  
  try {
    localStorage.setItem('marunnundo_lang', lang);
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

// Initialize Leaflet Map
function initMap(lat, lon) {
  const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  });

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  });

  map = L.map('map', {
    zoomControl: false,
    layers: [streetLayer]
  }).setView([lat, lon], 14);
  
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Satellite Toggle Control (Google Maps style)
  const layerToggle = L.Control.extend({
    options: {
      position: 'bottomright'
    },
    onAdd: function (map) {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-layer-control');
      container.style.backgroundColor = 'white';
      container.style.width = '62px';
      container.style.height = '62px';
      container.style.borderRadius = '8px';
      container.style.border = '2.5px solid white';
      container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
      container.style.cursor = 'pointer';
      container.style.overflow = 'hidden';
      container.style.position = 'relative';
      container.style.transition = 'transform 0.15s ease, border-color 0.15s ease';
      container.title = 'Switch Map View';
      
      const img = L.DomUtil.create('div', 'layer-thumbnail', container);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.backgroundSize = 'cover';
      img.style.backgroundPosition = 'center';
      
      const label = L.DomUtil.create('div', 'layer-label', container);
      label.style.position = 'absolute';
      label.style.bottom = '0';
      label.style.left = '0';
      label.style.right = '0';
      label.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
      label.style.color = 'white';
      label.style.fontSize = '9px';
      label.style.fontWeight = '700';
      label.style.textAlign = 'center';
      label.style.padding = '2px 0';
      label.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      let currentMode = 'street';
      
      const updateControl = () => {
        if (currentMode === 'street') {
          img.style.backgroundImage = "url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/30/45')";
          label.textContent = 'Satellite';
        } else {
          img.style.backgroundImage = "url('https://a.basemaps.cartocdn.com/light_all/6/30/45.png')";
          label.textContent = 'Map';
        }
      };
      
      updateControl();
      
      L.DomEvent.disableClickPropagation(container);
      
      L.DomEvent.on(container, 'mouseover', () => {
        container.style.transform = 'scale(1.06)';
        container.style.borderColor = '#1a73e8';
      });
      L.DomEvent.on(container, 'mouseout', () => {
        container.style.transform = 'scale(1)';
        container.style.borderColor = 'white';
      });
      
      L.DomEvent.on(container, 'click', () => {
        if (currentMode === 'street') {
          map.removeLayer(streetLayer);
          map.addLayer(satelliteLayer);
          currentMode = 'satellite';
        } else {
          map.removeLayer(satelliteLayer);
          map.addLayer(streetLayer);
          currentMode = 'street';
        }
        updateControl();
      });
      
      return container;
    }
  });
  
  map.addControl(new layerToggle());

  // Click map to set custom scan center
  map.on('click', (e) => {
    userCoords.lat = e.latlng.lat;
    userCoords.lon = e.latlng.lng;
    
    updateStatus("scanning", i18n[currentLang]["status-searching"]);
    coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
    
    updateUserMarker(userCoords.lat, userCoords.lon);
    fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
  });
}

// Request Geolocation from Browser
function requestUserLocation() {
  statusText.textContent = i18n[currentLang]["status-detecting"];
  
  if (!navigator.geolocation) {
    updateStatus("denied", "Geolocation not supported");
    alert(currentLang === 'ml' ? 
      "ഈ ഫയൽ സെർവറിലല്ല ഓപ്പൺ ചെയ്തിരിക്കുന്നത്. ദയവായി ഇത് Vercel ലേക്ക് അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കിൽ ഒരു ലോക്കൽ സെർവറിൽ റൺ ചെയ്യുക." :
      "Your browser is blocking geolocation because this file is opened locally (via file://). Please open it via a web server (like Vercel, Netlify, or VS Code Live Server) to allow GPS location access!");
    fallbackToDefaultLocation();
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      usePosition(position, "Real Location");
    },
    (error) => {
      console.warn("High-accuracy geolocation failed...", error.message);
      if (error.code === 1) { // PERMISSION_DENIED
        updateStatus("denied", currentLang === 'ml' ? "ലൊക്കേഷൻ അനുമതി നിഷേധിച്ചു" : "Location permission denied.");
        alert(currentLang === 'ml' ? 
          "ലൊക്കേഷൻ അനുമതി നിഷേധിച്ചു. ദയവായി നിങ്ങളുടെ ബ്രൗസറിന്റെ അഡ്രസ്സ് ബാറിലെ ലോക്ക് (Lock) ഐക്കണിൽ ക്ലിക്ക് ചെയ്ത് ലൊക്കേഷൻ അനുവദിക്കുക (Allow), ശേഷം വീണ്ടും ശ്രമിക്കുക." : 
          "Location permission denied. Please click the lock icon in your browser's address bar to change Location to 'Allow', then tap the status bar to retry!");
        fallbackToDefaultLocation();
        return;
      }
      
      console.log("Trying low-accuracy fallback...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          usePosition(position, "Approx Location");
        },
        (lowAccError) => {
          console.warn("Low-accuracy geolocation failed, using fallback...", lowAccError.message);
          updateStatus("denied", currentLang === 'ml' ? "ലൊക്കേഷൻ പരാജയപ്പെട്ടു" : "Location detection failed.");
          fallbackToDefaultLocation();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function usePosition(position, label) {
  userCoords.lat = position.coords.latitude;
  userCoords.lon = position.coords.longitude;
  
  updateStatus("active", i18n[currentLang]["status-loading-osm"]);
  coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
  
  updateUserMarker(userCoords.lat, userCoords.lon);
  map.setView([userCoords.lat, userCoords.lon], 14);
  
  btnScan.removeAttribute('disabled');
  fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
}

function fallbackToDefaultLocation() {
  coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (Default)`;
  updateUserMarker(userCoords.lat, userCoords.lon);
  map.setView([userCoords.lat, userCoords.lon], 13);
  btnScan.removeAttribute('disabled');
  fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
}

// Search location using Nominatim Geocoding API
async function searchLocation(query) {
  if (!query) return;
  
  updateStatus("scanning", i18n[currentLang]["status-searching"]);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ", Kerala, India")}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MarunnUndoProximityFinder/1.0"
      }
    });
    
    if (!response.ok) throw new Error("Search server error");
    
    const results = await response.json();
    if (results && results.length > 0) {
      const lat = parseFloat(results[0].lat);
      const lon = parseFloat(results[0].lon);
      
      userCoords.lat = lat;
      userCoords.lon = lon;
      
      const displayName = results[0].display_name.split(',')[0];
      updateStatus("active", displayName);
      coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
      
      updateUserMarker(userCoords.lat, userCoords.lon);
      map.setView([userCoords.lat, userCoords.lon], 14);
      fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
    } else {
      updateStatus("denied", i18n[currentLang]["status-not-found"]);
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
    updateStatus("denied", i18n[currentLang]["status-search-failed"]);
  }
}

// Update Geolocation Status UI
function updateStatus(type, text) {
  statusText.textContent = text;
  statusDot.className = "status-dot";
  
  if (type === "active") {
    statusDot.classList.add("active");
  } else if (type === "denied") {
    statusDot.classList.add("denied");
  } else if (type === "scanning") {
    statusDot.classList.add("pulse");
  }
}

// Update/Create user position marker
function updateUserMarker(lat, lon) {
  if (userMarker) {
    userMarker.setLatLng([lat, lon]);
  } else {
    userMarker = L.marker([lat, lon], { icon: userMarkerIcon }).addTo(map);
  }
}

// Filter out unnamed or generic placeholder names
function isValidPharmacyName(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  
  if (lower.length < 2) return false;
  
  const placeholders = [
    "unnamed", "unnamed pharmacy", "pharmacy", "medical store", "medicals",
    "മെഡിക്കൽ സ്റ്റോർ", "മെഡിക്കൽസ്", "ഫാർമസി", "കട", "ഷോപ്പ്", "மருந்தகம்"
  ];
  
  if (placeholders.includes(lower)) return false;
  if (lower.startsWith("unnamed")) return false;
  if (/^\d+$/.test(lower)) return false;
  
  return true;
}

// Fetch pharmacies directly from OSM Overpass
async function fetchNearbyPharmacies(lat, lon) {
  updateStatus("scanning", i18n[currentLang]["status-searching"]);
  listPlaceholder.textContent = i18n[currentLang]["list-placeholder-scanning"];
  pharmaciesList.style.display = "none";
  listPlaceholder.style.display = "block";
  hideStoreDetails();
  
  try {
    const osmStores = await fetchDirectFromOverpass(lat, lon);
    allStores = osmStores;
    console.log(`Loaded ${allStores.length} stores directly from Overpass API.`);
    renderStores(allStores);
    updateStatus("active", i18n[currentLang]["status-loading-osm"]);
  } catch (error) {
    console.error("Direct Overpass fetch failed:", error);
    updateStatus("denied", i18n[currentLang]["status-osm-failed"]);
    listPlaceholder.textContent = i18n[currentLang]["list-placeholder-error"];
  }
}

async function fetchDirectFromOverpass(lat, lon) {
  const radiusMeters = 5000; // 5km
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
      way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
    );
    out center;
  `;
  
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
  ];
  
  let data = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${endpoint}`);
      
      data = await response.json();
      break; // Success! Exit loop.
    } catch (err) {
      console.warn(`Overpass fetch failed on ${endpoint}:`, err);
      lastError = err;
    }
  }

  if (!data) {
    throw new Error("All Overpass API endpoints failed. Last error: " + (lastError ? lastError.message : "Unknown"));
  }
  
  const elements = data.elements || [];
  
  // Filter coordinates and valid names
  const validElements = elements.filter(elem => {
    const lat = elem.lat || (elem.center && elem.center.lat);
    const lon = elem.lon || (elem.center && elem.center.lon);
    const hasCoords = lat !== undefined && lon !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
    if (!hasCoords) return false;
    
    const tags = elem.tags || {};
    const name = tags.name || tags.brand || "";
    return isValidPharmacyName(name);
  });
  
  return validElements.map(elem => {
    const elemLat = elem.lat || (elem.center && elem.center.lat);
    const elemLon = elem.lon || (elem.center && elem.center.lon);
    const tags = elem.tags || {};
    const name = tags.name || tags.brand || "Unnamed Pharmacy";
    
    // Address building
    const addrParts = [];
    if (tags["addr:housenumber"]) addrParts.push(tags["addr:housenumber"]);
    if (tags["addr:street"]) addrParts.push(tags["addr:street"]);
    if (tags["addr:place"]) addrParts.push(tags["addr:place"]);
    if (tags["addr:city"]) addrParts.push(tags["addr:city"]);
    if (tags["addr:postcode"]) addrParts.push(tags["addr:postcode"]);
    
    const address = addrParts.length ? addrParts.join(", ") : tags["addr:full"] || "Kerala, India";
    const phone = tags.phone || tags["contact:phone"] || tags["contact:whatsapp"] || "";
    const opening_hours = tags.opening_hours || "";
    
    // Location fields for targeted Google search
    const district = tags["addr:district"] || tags["is_in:district"] || "";
    const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
    const place = tags["addr:place"] || tags["addr:suburb"] || "";
    const state = tags["addr:state"] || "Kerala";
    
    const distance = calculateHaversineDistance(lat, lon, elemLat, elemLon);
    
    return {
      id: "osm_" + elem.id,
      name: name,
      latitude: parseFloat(elemLat),
      longitude: parseFloat(elemLon),
      address: address,
      phone: phone,
      opening_hours: opening_hours,
      source: "Verified OSM",
      distance: parseFloat(distance.toFixed(2)),
      district: district,
      city: city,
      place: place,
      state: state
    };
  }).sort((a, b) => a.distance - b.distance);
}

// Calculate Haversine distance
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Build a precise Google Business Profile search URL
// Query format: "Store Name" pharmacy Place District Kerala
function buildGoogleBizUrl(store) {
  const lat = store.latitude;
  const lon = store.longitude;
  const name = store.name;

  // Strategy: use Google Maps /search with the exact OSM coordinates as the anchor.
  // The /@lat,lon,17z part zooms to street level at that pin — Google picks the
  // business card for the branch AT that location, not all branches named similarly.
  // This is the most reliable way to land on the exact shop's Business Profile.
  return `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lon},17z`;
}


// Render pharmacies list and markers
function renderStores(storesList) {
  storeMarkers.forEach(m => map.removeLayer(m));
  storeMarkers = [];
  
  if (storesList.length === 0) {
    listPlaceholder.textContent = i18n[currentLang]["list-placeholder-empty"];
    listPlaceholder.style.display = "block";
    pharmaciesList.style.display = "none";
    resultsCount.textContent = "0" + i18n[currentLang]["results-count-suffix"];
    return;
  }
  
  listPlaceholder.style.display = "none";
  pharmaciesList.style.display = "block";
  pharmaciesList.innerHTML = "";
  resultsCount.textContent = storesList.length + i18n[currentLang]["results-count-suffix"];
  
  const medicineName = searchInput.value.trim();
  
  storesList.forEach((store) => {
    // Add Marker
    const marker = L.marker([store.latitude, store.longitude], { icon: blueMarkerIcon })
                    .addTo(map);
    
    marker.on('click', () => {
      showStoreDetails(store);
    });
    
    storeMarkers.push(marker);
    
    // Add List Card
    const li = createListItemHTML(store, medicineName);
    
    // Click listener for the card
    li.addEventListener('click', (e) => {
      if (e.target.closest('.card-actions')) {
        return;
      }
      focusStore(store.latitude, store.longitude, store.id);
    });
    
    pharmaciesList.appendChild(li);
  });
}

// Format list card item
function createListItemHTML(store, medicineName) {
  const li = document.createElement('li');
  li.className = 'pharmacy-card';
  
  const whatsappUrl = buildWhatsAppLink(store.phone, store.name, medicineName);
  const sourceClass = "source-verified";
  
  let actionHTML = "";
  if (store.phone) {
    actionHTML = `
      <a href="${whatsappUrl}" target="_blank" class="card-wa-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.161.001 6.136 1.233 8.375 3.474 2.238 2.24 3.467 5.218 3.465 8.385-.005 6.537-5.33 11.861-11.86 11.861-2.008-.002-3.98-.513-5.732-1.488L0 24zm6.549-2.834c1.659.985 3.298 1.487 5.247 1.489 5.485 0 9.948-4.462 9.952-9.948.002-2.658-1.03-5.158-2.905-7.034C17.025 3.797 14.53 2.766 11.862 2.765c-5.487 0-9.95 4.463-9.954 9.95-.001 1.849.48 3.655 1.393 5.243l-.95 3.468 3.706-.96zm12.593-7.558c-.347-.174-2.057-1.011-2.375-1.127-.318-.116-.549-.174-.78.174-.231.347-.894 1.127-1.096 1.358-.202.231-.404.26-.75.087-.347-.174-1.464-.539-2.787-1.72-1.03-1.03-1.724-2.148-1.926-2.494-.203-.347-.022-.534.151-.708.156-.156.347-.405.52-.607.173-.203.231-.347.347-.578.115-.231.057-.434-.029-.607-.087-.173-.78-1.879-1.069-2.572-.28-.674-.564-.582-.78-.593-.202-.011-.434-.012-.665-.012-.231 0-.607.087-.924.434-.318.347-1.213 1.185-1.213 2.89 0 1.705 1.242 3.352 1.416 3.583.173.231 2.445 3.734 5.922 5.234.827.357 1.472.569 1.975.729.831.264 1.587.227 2.185.138.666-.1 2.057-.838 2.346-1.647.289-.809.289-1.502.202-1.647-.087-.145-.318-.232-.665-.405z"/>
        </svg>
        <span>WhatsApp</span>
      </a>
    `;
  } else {
    actionHTML = '';
  }

  const statusLabel = store.phone ? i18n[currentLang]["available"] : i18n[currentLang]["missing"];
  
  li.innerHTML = `
    <div class="card-body">
      <div class="card-header-row">
        <h4>${store.name}</h4>
        <span class="badge ${sourceClass}">${store.source}</span>
      </div>
      <p class="card-meta">📍 ${store.distance} km away • 📞 ${statusLabel}</p>
      <p class="card-address">${store.address}</p>
    </div>
    <div class="card-actions">
      ${actionHTML}
      <button class="card-explore-btn" data-store-id="${store.id}" title="Explore this pharmacy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <span>Explore</span>
      </button>
    </div>
  `;

  // Attach explore button handler after innerHTML is set
  const exploreBtn = li.querySelector('.card-explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showStoreDetails(store);
    });
  }
  
  return li;
}

// Generate pre-filled WhatsApp link
function buildWhatsAppLink(phone, storeName, medicineName) {
  let cleanPhone = (phone || "").replace(/[^\d+]/g, '');
  if (cleanPhone && !cleanPhone.startsWith('+')) {
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // Indian prefix
    }
  }
  const textMessage = buildStockMessage(storeName, medicineName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
}

// Generate actual message payload
function buildStockMessage(storeName, medicineName) {
  const medicine = medicineName ? `"${medicineName}"` : "medicines";
  return `Hi ${storeName}, do you have stock for ${medicine}? Please let me know. Thanks!`;
}

// Helper to escape string quotes for JS execution contexts
function escapeJS(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Clipboard copying utility
window.copyToClipboard = function(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = btnElement.innerHTML;
    const label = btnElement.querySelector('.action-label') || btnElement.querySelector('span');
    if (label) {
      const originalText = label.textContent;
      label.textContent = i18n[currentLang]['copied-toast'];
      btnElement.classList.add('copied');
      setTimeout(() => {
        label.textContent = originalText;
        btnElement.classList.remove('copied');
      }, 2000);
    } else {
      btnElement.innerHTML = `<span>${i18n[currentLang]['copied-toast']}</span>`;
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.innerHTML = originalHTML;
        btnElement.classList.remove('copied');
      }, 2000);
    }
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
};

// Filter stores locally on text input change
function filterStores() {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = allStores.filter(store => {
    return store.name.toLowerCase().includes(query) || 
           store.address.toLowerCase().includes(query) ||
           (store.phone && store.phone.includes(query));
  });
  renderStores(filtered);
}

// Fly map camera to store when clicking card
window.focusStore = function(lat, lon, id) {
  map.flyTo([lat, lon], 16, { animate: true, duration: 1.5 });
  const store = allStores.find(s => s.id === id);
  if (store) {
    showStoreDetails(store);
  }
};

// ─── Google Data Enrichment ───

// ─── Slide-in Detail Panel ─────────────────────────────────────────────────

function showStoreDetails(store) {
  const detailPanel = document.getElementById('detail-panel');
  if (!detailPanel) return;

  // ── 1. Populate immediately with OSM data ──
  // Provide a quick-search button if data is missing, instead of just saying "--"
  const missingPhoneBtn = `<button class="quick-search-btn" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(store.name + ' Kerala phone number')}', '_blank', 'noopener,noreferrer')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Search Web</button>`;
  
  const missingHoursBtn = `<button class="quick-search-btn" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(store.name + ' Kerala opening hours')}', '_blank', 'noopener,noreferrer')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Check Hours</button>`;

  document.getElementById('detail-phone').innerHTML = store.phone ? store.phone : missingPhoneBtn;
  document.getElementById('detail-hours').innerHTML = store.opening_hours ? store.opening_hours : missingHoursBtn;

  document.getElementById('detail-store-name').textContent = store.name;
  const categoryElem = document.getElementById('detail-category');
  if (categoryElem) categoryElem.textContent = i18n[currentLang]['detail-category-ph'];

  document.getElementById('detail-address').textContent =
    store.address || i18n[currentLang]['detail-address-missing'];

  // ── 2. Wire up action buttons ──
  const btnWhatsapp   = document.getElementById('detail-btn-whatsapp');
  const btnCall       = document.getElementById('detail-btn-call');
  const btnDirections = document.getElementById('detail-btn-directions');
  const medicineName  = searchInput.value.trim();

  const wirePhoneButtons = (phone) => {
    if (phone) {
      btnWhatsapp.removeAttribute('disabled'); btnWhatsapp.classList.remove('disabled');
      btnWhatsapp.onclick = () => window.open(buildWhatsAppLink(phone, store.name, medicineName), '_blank');
      btnCall.removeAttribute('disabled'); btnCall.classList.remove('disabled');
      btnCall.onclick = () => { window.location.href = `tel:${phone}`; };
    } else {
      btnWhatsapp.setAttribute('disabled', 'true'); btnWhatsapp.classList.add('disabled'); btnWhatsapp.onclick = null;
      btnCall.setAttribute('disabled', 'true'); btnCall.classList.add('disabled'); btnCall.onclick = null;
    }
  };

  wirePhoneButtons(store.phone);
  btnDirections.onclick = () => window.open(buildGoogleBizUrl(store), '_blank');

  const btnGoogleBiz = document.getElementById('detail-btn-google-biz');
  if (btnGoogleBiz) btnGoogleBiz.onclick = () => window.open(buildGoogleBizUrl(store), '_blank');

  detailPanel.classList.remove('hidden');
}

function hideStoreDetails() {
  const detailPanel = document.getElementById('detail-panel');
  if (detailPanel) {
    detailPanel.classList.add('hidden');
  }
}

// Trigger manual rescan centered on current map position
function handleManualScan() {
  const center = map.getCenter();
  userCoords.lat = center.lat;
  userCoords.lon = center.lng;
  
  coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
  updateUserMarker(userCoords.lat, userCoords.lon);
  fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
}

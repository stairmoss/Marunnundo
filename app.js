// MarunnUndo Client Application

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

// Custom SVG Icons in Medical Blue
const blueMarkerIcon = L.divIcon({
  html: `
    <div class="custom-pin">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" 
              fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/>
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

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  initMap(userCoords.lat, userCoords.lon);
  requestUserLocation();
  
  // Set up event listeners
  searchInput.addEventListener('input', filterStores);
  placeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchLocation(placeInput.value.trim());
    }
  });
  btnScan.addEventListener('click', handleManualScan);
});

// Initialize Leaflet Map
function initMap(lat, lon) {
  // CartoDB Positron: Clean, minimal light grey & white tiles
  map = L.map('map', {
    zoomControl: false
  }).setView([lat, lon], 14);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);
  
  // Reposition zoom control to bottom right
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Click map to set custom scan center
  map.on('click', (e) => {
    userCoords.lat = e.latlng.lat;
    userCoords.lon = e.latlng.lng;
    
    updateStatus("scanning", "Scanning selected location...");
    coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (Selected)`;
    
    updateUserMarker(userCoords.lat, userCoords.lon);
    fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
  });
}

// Request Geolocation from Browser
function requestUserLocation() {
  statusText.textContent = "Requesting geolocation access...";
  
  if (!navigator.geolocation) {
    updateStatus("denied", "Geolocation not supported by browser.");
    fallbackToDefaultLocation();
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCoords.lat = position.coords.latitude;
      userCoords.lon = position.coords.longitude;
      
      updateStatus("active", "Location synchronized successfully");
      coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
      
      // Update User Marker on Map
      updateUserMarker(userCoords.lat, userCoords.lon);
      map.setView([userCoords.lat, userCoords.lon], 14);
      
      // Enable Manual Scan Button
      btnScan.removeAttribute('disabled');
      
      // Fetch Nearby Stores
      fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
    },
    (error) => {
      console.warn("Geolocation error:", error.message);
      updateStatus("denied", "Location access denied. Using fallback.");
      fallbackToDefaultLocation();
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
  );
}

// Fallback to Kochi coords if location fails
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
  
  updateStatus("scanning", `Searching for "${query}"...`);
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
      updateStatus("active", `Showing: ${displayName}`);
      coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (Searched)`;
      
      // Update map center and search
      updateUserMarker(userCoords.lat, userCoords.lon);
      map.setView([userCoords.lat, userCoords.lon], 14);
      fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
    } else {
      updateStatus("denied", "Place not found. Try another name.");
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
    updateStatus("denied", "Search failed. Check connection.");
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
    userMarker.setPopupContent("<b>Scan Center Location</b>");
  } else {
    userMarker = L.marker([lat, lon], { icon: userMarkerIcon }).addTo(map);
    userMarker.bindPopup("<b>Scan Center Location</b>").openPopup();
  }
}

// Fetch pharmacies directly from OSM Overpass (No-Database / Serverless Mode)
async function fetchNearbyPharmacies(lat, lon) {
  updateStatus("scanning", "Scanning nearby pharmacies...");
  listPlaceholder.textContent = "Scanning area... Please wait.";
  pharmaciesList.style.display = "none";
  listPlaceholder.style.display = "block";
  
  try {
    const osmStores = await fetchDirectFromOverpass(lat, lon);
    allStores = osmStores;
    console.log(`Loaded ${allStores.length} stores directly from Overpass API.`);
    renderStores(allStores);
    updateStatus("active", "Loaded directly from OpenStreetMap.");
  } catch (error) {
    console.error("Direct Overpass fetch failed:", error);
    updateStatus("denied", "OSM query failed. Check your internet connection.");
    listPlaceholder.textContent = "Unable to fetch pharmacies. Check your internet connection.";
  }
}

// Fetch directly from OSM Overpass (No-Database / Backend-less Mode fallback)
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
  
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  
  if (!response.ok) throw new Error("Overpass API server responded with error " + response.status);
  
  const data = await response.json();
  const elements = data.elements || [];
  
  // Filter out any elements lacking valid coordinates
  const validElements = elements.filter(elem => {
    const lat = elem.lat || (elem.center && elem.center.lat);
    const lon = elem.lon || (elem.center && elem.center.lon);
    return lat !== undefined && lon !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
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
    
    const distance = calculateHaversineDistance(lat, lon, elemLat, elemLon);
    
    return {
      id: "osm_" + elem.id,
      name: name,
      latitude: parseFloat(elemLat),
      longitude: parseFloat(elemLon),
      address: address,
      phone: phone,
      source: "Ecosystem Sync",
      distance: parseFloat(distance.toFixed(2))
    };
  }).sort((a, b) => a.distance - b.distance);
}

// Calculate Haversine distance in client browser
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



// Render pharmacies on map and list
function renderStores(storesList) {
  // Clear existing markers
  storeMarkers.forEach(m => map.removeLayer(m));
  storeMarkers = [];
  
  if (storesList.length === 0) {
    listPlaceholder.textContent = "No pharmacies found in this area. Try scanning another spot.";
    listPlaceholder.style.display = "block";
    pharmaciesList.style.display = "none";
    resultsCount.textContent = "0 found";
    return;
  }
  
  listPlaceholder.style.display = "none";
  pharmaciesList.style.display = "block";
  pharmaciesList.innerHTML = "";
  resultsCount.textContent = `${storesList.length} found`;
  
  // Get active medicine name search
  const medicineName = searchInput.value.trim();
  
  storesList.forEach((store, index) => {
    // Add Marker to Map
    const marker = L.marker([store.latitude, store.longitude], { icon: blueMarkerIcon })
                    .addTo(map);
    
    // Bind Popup content
    const popupContent = createPopupHTML(store, medicineName);
    marker.bindPopup(popupContent);
    storeMarkers.push(marker);
    
    // Add List Item
    const li = createListItemHTML(store, index, medicineName);
    pharmaciesList.appendChild(li);
  });
}

// Format custom popup content
function createPopupHTML(store, medicineName) {
  const whatsappUrl = buildWhatsAppLink(store.phone, store.name, medicineName);
  const sourceClass = store.source === "Verified" ? "source-verified" : "source-sync";
  
  // Custom button behavior based on phone existence
  let contactBtnHTML = "";
  if (store.phone) {
    contactBtnHTML = `
      <a href="${whatsappUrl}" target="_blank" class="popup-wa-btn">
        <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.161.001 6.136 1.233 8.375 3.474 2.238 2.24 3.467 5.218 3.465 8.385-.005 6.537-5.33 11.861-11.86 11.861-2.008-.002-3.98-.513-5.732-1.488L0 24zm6.549-2.834c1.659.985 3.298 1.487 5.247 1.489 5.485 0 9.948-4.462 9.952-9.948.002-2.658-1.03-5.158-2.905-7.034C17.025 3.797 14.53 2.766 11.862 2.765c-5.487 0-9.95 4.463-9.954 9.95-.001 1.849.48 3.655 1.393 5.243l-.95 3.468 3.706-.96zm12.593-7.558c-.347-.174-2.057-1.011-2.375-1.127-.318-.116-.549-.174-.78.174-.231.347-.894 1.127-1.096 1.358-.202.231-.404.26-.75.087-.347-.174-1.464-.539-2.787-1.72-1.03-1.03-1.724-2.148-1.926-2.494-.203-.347-.022-.534.151-.708.156-.156.347-.405.52-.607.173-.203.231-.347.347-.578.115-.231.057-.434-.029-.607-.087-.173-.78-1.879-1.069-2.572-.28-.674-.564-.582-.78-.593-.202-.011-.434-.012-.665-.012-.231 0-.607.087-.924.434-.318.347-1.213 1.185-1.213 2.89 0 1.705 1.242 3.352 1.416 3.583.173.231 2.445 3.734 5.922 5.234.827.357 1.472.569 1.975.729.831.264 1.587.227 2.185.138.666-.1 2.057-.838 2.346-1.647.289-.809.289-1.502.202-1.647-.087-.145-.318-.232-.665-.405z"/>
        </svg>
        WhatsApp Verification
      </a>
    `;
  } else {
    const copyText = buildStockMessage(store.name, medicineName);
    contactBtnHTML = `
      <button onclick="copyToClipboard('${escapeJS(copyText)}', this)" class="popup-wa-btn secondary-btn">
        Copy Stock Query Message
      </button>
    `;
  }
  
  return `
    <div class="store-popup">
      <div class="popup-title-row">
        <h4>${store.name}</h4>
        <span class="badge ${sourceClass}">${store.source}</span>
      </div>
      <p class="popup-distance">📍 ${store.distance} km away</p>
      <p class="popup-addr">${store.address}</p>
      ${contactBtnHTML}
    </div>
  `;
}

// Format list item
function createListItemHTML(store, index, medicineName) {
  const li = document.createElement('li');
  li.className = 'pharmacy-card';
  
  const whatsappUrl = buildWhatsAppLink(store.phone, store.name, medicineName);
  const sourceClass = store.source === "Verified" ? "source-verified" : "source-sync";
  
  // Custom button depending on phone number
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
    const copyText = buildStockMessage(store.name, medicineName);
    actionHTML = `
      <button onclick="copyToClipboard('${escapeJS(copyText)}', this)" class="card-wa-btn copy-btn">
        <span>Copy Query</span>
      </button>
    `;
  }
  
  li.innerHTML = `
    <div class="card-body" onclick="focusStore(${store.latitude}, ${store.longitude}, ${index})">
      <div class="card-header-row">
        <h4>${store.name}</h4>
        <span class="badge ${sourceClass}">${store.source}</span>
      </div>
      <p class="card-meta">📍 ${store.distance} km away ${store.phone ? '• 📞 Available' : '• 📞 Missing'}</p>
      <p class="card-address">${store.address}</p>
    </div>
    <div class="card-actions">
      ${actionHTML}
    </div>
  `;
  
  return li;
}

// Generate pre-filled WhatsApp link
function buildWhatsAppLink(phone, storeName, medicineName) {
  // Format phone number (defaults to Indian code if missing country prefix)
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
    btnElement.innerHTML = `<span>Copied! ✓</span>`;
    btnElement.classList.add('copied');
    
    setTimeout(() => {
      btnElement.innerHTML = originalHTML;
      btnElement.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
};

// Filter stores locally on text input change
function filterStores() {
  const query = searchInput.value.toLowerCase().trim();
  
  // Filter all loaded stores matching name or address
  const filtered = allStores.filter(store => {
    return store.name.toLowerCase().includes(query) || 
           store.address.toLowerCase().includes(query) ||
           (store.phone && store.phone.includes(query));
  });
  
  // Update map markers and list items
  renderStores(filtered);
}

// Fly map camera to store when clicking card
window.focusStore = function(lat, lon, index) {
  map.flyTo([lat, lon], 16, { animate: true, duration: 1.5 });
  
  // Open the marker's popup
  if (storeMarkers[index]) {
    setTimeout(() => {
      storeMarkers[index].openPopup();
    }, 1500);
  }
};

// Trigger manual rescan centered on current map position
function handleManualScan() {
  const center = map.getCenter();
  userCoords.lat = center.lat;
  userCoords.lon = center.lng;
  
  coordDisplay.textContent = `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (Scanned)`;
  
  // Update User Marker to new map center
  updateUserMarker(userCoords.lat, userCoords.lon);
  
  // Trigger scan query
  fetchNearbyPharmacies(userCoords.lat, userCoords.lon);
}

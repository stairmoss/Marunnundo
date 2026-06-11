# MarunnUndo (മരുന്നുണ്ടോ?) 🩺

MarunnUndo is a **100% serverless, zero-backend, zero-database** real-time proximity pharmacy finder map interface custom-built for Kerala. It is designed to run entirely in the browser, making hosting completely free, maintenance-free, and incredibly easy to deploy on platforms like **Vercel**, **Netlify**, or **GitHub Pages** with a single click.

Users can pinpoint nearby pharmacies, locate them on a clean, responsive map, filter listings in real-time, and query medicine stock availability directly through a pre-filled WhatsApp messaging template.

---

## 🔄 How It Works (Serverless Architecture)

Unlike traditional mapping apps that require complex backend scraping workers and databases, MarunnUndo interacts directly with geospatial servers from the client:

```
[ User Browser Frontend ]
      │
      ├─► (1. Captures GPS Coordinates via browser Geolocation API)
      │
      ├─► (2. Queries OpenStreetMap's live Overpass API directly via HTTPS POST)
      │
      └─► (3. Calculates Haversine distance, sorts, and renders markers & list locally)
```

---

## 🛠️ Features & Stack

1. **Leaflet.js Mapping Canvas**:
   - Renders maps instantly using **CartoDB Positron** minimal tiles for a premium gray/white aesthetic.
2. **Medical Blue & White Styling**:
   - Clean, modern CSS with smooth animations, custom location markers, and responsive sidebars that adapt to a bottom drawer on mobile devices.
3. **No-Setup Live Proximity Search**:
   - Fetches live coordinates, names, addresses, and phone numbers of nearby pharmacies within a 5km radius directly from OpenStreetMap.
4. **Smart WhatsApp stock check**:
   - Pre-fills a template based on whatever medicine you search for (e.g. searching *"Insulin"* formats: `"Hi [Pharmacy Name], do you have stock for "Insulin"? Please let me know. Thanks!"`).
5. **Clipboard Copy Fallback**:
   - Provides a fallback button to copy the prefilled template to the clipboard for stores lacking registered contact numbers.

---

## 🚀 Quick Start & Development

Since there is no backend, you don't need to install Python, virtual environments, or databases!

1. Clone this repository.
2. Open `index.html` directly in any web browser (e.g. double-click or use VS Code Live Server).
3. Grant location permissions, or use the "Scan This Area" button to search pharmacies around Kochi.

---

## ☁️ Vercel Deployment

Deploying this website takes less than 30 seconds:

1. Push your repository to GitHub.
2. Connect your GitHub account to **Vercel** (https://vercel.com).
3. Select this repository and click **Deploy**.
4. Vercel will automatically host `index.html`, `style.css`, and `app.js` as a static website.
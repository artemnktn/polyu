# Hong Kong 3D Map

Interactive 3D map of Hong Kong built with MapLibre GL JS.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Features

- 3D tilt and **2D / 3D** toggle
- Zoom, pan, rotate (⌘ / Ctrl + drag to rotate bearing)
- **Midland 2018** transactions as points at their coordinates (`data/midland_2018_cleaned.geojson`), colour by price per sq ft
- Grey monochrome basemap and semi-transparent 3D buildings

## Data

Place `midland_2018_cleaned.geojson` in `data/` (GeoJSON points with building, floor, price, etc.).

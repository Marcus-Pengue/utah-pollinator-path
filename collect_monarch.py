#!/usr/bin/env python3
"""
Monarch Watch Data Collector
Scrapes monarch sighting/tagging data for Utah region
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/monarch_cache"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_journey_north():
    """Journey North has monarch sighting maps"""
    url = "https://journeynorth.org/sightings/querylist.html?map=monarch-adult-fall&year=2025&season=fall"
    # This returns HTML, would need to parse or use their API
    return []

def fetch_from_inaturalist():
    """Get monarch observations from iNat (already have this data)"""
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "taxon_id": 48662,  # Danaus plexippus (Monarch)
        "swlat": 36.9, "swlng": -114.1,
        "nelat": 42.0, "nelng": -109.0,
        "quality_grade": "research,needs_id",
        "per_page": 200,
        "order_by": "observed_on"
    }
    
    all_obs = []
    page = 1
    
    while page <= 50:
        params["page"] = page
        r = requests.get(url, params=params, timeout=30)
        data = r.json()
        results = data.get("results", [])
        if not results:
            break
        all_obs.extend(results)
        page += 1
        log(f"  Page {page}: {len(all_obs)} monarchs")
    
    return all_obs

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    log("=== Monarch Data Collection ===")
    
    # Get monarch observations from iNat
    log("Fetching Utah monarch observations...")
    observations = fetch_from_inaturalist()
    
    # Convert to GeoJSON
    features = []
    for obs in observations:
        coords = obs.get("geojson", {}).get("coordinates", [None, None])
        if not coords[0]:
            continue
        
        obs_date = obs.get("observed_on", "")
        year, month, day = None, None, None
        if obs_date:
            parts = obs_date.split("-")
            year = int(parts[0]) if len(parts) > 0 else None
            month = int(parts[1]) if len(parts) > 1 else None
            day = int(parts[2]) if len(parts) > 2 else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": coords},
            "properties": {
                "id": f"monarch_{obs['id']}",
                "species": "Monarch",
                "scientific_name": "Danaus plexippus",
                "iconic_taxon": "Insecta",
                "observed_on": obs_date,
                "year": year, "month": month, "day": day,
                "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                "source": "inaturalist_monarch",
                "life_stage": obs.get("annotations", [{}])[0].get("value") if obs.get("annotations") else None,
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(features),
        "species": "Danaus plexippus (Monarch)",
        "features": features
    }
    
    with open(f"{OUTPUT_DIR}/utah_monarchs.json", "w") as f:
        json.dump(output, f)
    
    # Stats by month
    months = {}
    for f in features:
        m = f["properties"].get("month")
        if m:
            months[m] = months.get(m, 0) + 1
    
    log(f"\n=== Done: {len(features)} monarch observations ===")
    log("By month:")
    for m in sorted(months.keys()):
        log(f"  {m}: {months[m]}")

if __name__ == "__main__":
    main()

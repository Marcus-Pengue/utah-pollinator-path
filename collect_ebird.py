#!/usr/bin/env python3
"""
eBird Utah Collector - CSV format
"""

import requests
import json
import csv
import io
import time
import os
from datetime import datetime

API_KEY = "6q98opkr6qrc"
OUTPUT_DIR = "data/ebird_cache"
HEADERS = {"X-eBirdApiToken": API_KEY}
REGION = "US-UT"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_hotspots():
    """Get all eBird hotspots in Utah (CSV)"""
    url = f"https://api.ebird.org/v2/ref/hotspot/{REGION}"
    r = requests.get(url, headers=HEADERS)
    reader = csv.reader(io.StringIO(r.text))
    hotspots = []
    for row in reader:
        if len(row) >= 6:
            hotspots.append({
                "locId": row[0],
                "country": row[1],
                "region": row[2],
                "subregion": row[3],
                "lat": float(row[4]) if row[4] else None,
                "lng": float(row[5]) if row[5] else None,
                "name": row[6] if len(row) > 6 else "",
            })
    return hotspots

def fetch_recent(days_back=30):
    """Get recent observations (JSON)"""
    url = f"https://api.ebird.org/v2/data/obs/{REGION}/recent"
    r = requests.get(url, headers=HEADERS, params={"back": days_back})
    return r.json()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    log("=== eBird Utah Collection ===")
    
    # 1. Hotspots
    log("Fetching hotspots...")
    hotspots = fetch_hotspots()
    with open(f"{OUTPUT_DIR}/hotspots.json", "w") as f:
        json.dump(hotspots, f, indent=2)
    log(f"  {len(hotspots)} hotspots")
    
    # 2. Recent observations
    log("Fetching recent observations...")
    recent = fetch_recent(30)
    log(f"  {len(recent)} observations")
    
    # 3. Convert to GeoJSON (matching your existing format)
    features = []
    for obs in recent:
        if obs.get("lat") and obs.get("lng"):
            obs_date = obs.get("obsDt", "")
            year, month, day = None, None, None
            if obs_date:
                parts = obs_date.split(" ")[0].split("-")
                year = int(parts[0]) if len(parts) > 0 else None
                month = int(parts[1]) if len(parts) > 1 else None
                day = int(parts[2]) if len(parts) > 2 else None
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [obs["lng"], obs["lat"]]
                },
                "properties": {
                    "id": f"ebird_{obs.get('subId', '')}_{obs.get('speciesCode', '')}",
                    "species": obs.get("comName"),
                    "scientific_name": obs.get("sciName"),
                    "iconic_taxon": "Aves",
                    "observed_on": obs_date.split(" ")[0] if obs_date else None,
                    "year": year,
                    "month": month,
                    "day": day,
                    "photo_url": None,
                    "source": "ebird",
                    # eBird extras
                    "count": obs.get("howMany"),
                    "location_name": obs.get("locName"),
                    "location_id": obs.get("locId"),
                    "species_code": obs.get("speciesCode"),
                }
            })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(features),
        "source": "eBird",
        "features": features
    }
    
    with open(f"{OUTPUT_DIR}/utah_ebird.json", "w") as f:
        json.dump(output, f)
    
    size = os.path.getsize(f"{OUTPUT_DIR}/utah_ebird.json") / 1024
    log(f"=== Done: {len(features)} obs ({size:.1f} KB) ===")

if __name__ == "__main__":
    main()

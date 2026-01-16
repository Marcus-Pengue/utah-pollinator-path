#!/usr/bin/env python3
"""
Mushroom Observer - Fungi observations
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/mushroom_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_fungi.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Mushroom Observer Collection ===")
    
    url = "https://mushroomobserver.org/api2/observations"
    all_features = []
    page = 1
    
    while page <= 20:
        params = {
            "south": 36.9, "north": 42.0,
            "west": -114.1, "east": -109.0,
            "detail": "high",
            "format": "json",
            "page": page
        }
        
        log(f"Fetching page {page}...")
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        
        results = data.get("results", [])
        if not results:
            break
        
        for rec in results:
            lat = rec.get("latitude")
            lng = rec.get("longitude")
            
            if not lat or not lng:
                continue
            
            obs_date = rec.get("date", "")
            year = int(obs_date[:4]) if obs_date and len(obs_date) >= 4 and obs_date[:4].isdigit() else None
            
            name = rec.get("name", {})
            species = name.get("name", "Unknown") if isinstance(name, dict) else str(name) if name else "Unknown"
            
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "properties": {
                    "id": f"mushroom_{rec.get('id', '')}",
                    "species": species,
                    "scientific_name": species,
                    "observed_on": obs_date,
                    "year": year,
                    "source": "mushroom_observer",
                    "iconic_taxon": "Fungi"
                }
            })
        
        log(f"  +{len(results)} (total: {len(all_features)})")
        page += 1
        
        if len(results) < 100:
            break
    
    output = {
        "type": "FeatureCollection",
        "metadata": {"collected": datetime.now().isoformat(), "source": "Mushroom Observer"},
        "features": all_features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(all_features)} fungi records ===")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
EDDMapS - Early Detection & Distribution Mapping System
Invasive species occurrence data
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/eddmaps_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_invasives.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== EDDMapS Invasive Species Collection ===")
    
    url = "https://api.bugwood.org/rest/api/occurrence.json"
    
    all_features = []
    offset = 0
    limit = 1000
    
    while True:
        params = {
            "stateProvince": "Utah",
            "limit": limit,
            "start": offset
        }
        
        log(f"Fetching offset {offset}...")
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        
        columns = data.get("columns", [])
        rows = data.get("data", [])
        
        if not rows:
            break
        
        # Map columns to indices
        col_idx = {col: i for i, col in enumerate(columns)}
        
        for row in rows:
            lat = row[col_idx.get("latitude", 2)]
            lng = row[col_idx.get("longitude", 3)]
            
            if not lat or not lng:
                continue
            
            try:
                lat = float(str(lat).strip())
                lng = float(lng)
            except:
                continue
            
            obs_date = row[col_idx.get("obsdate", 13)] if "obsdate" in col_idx else None
            year = None
            if obs_date and isinstance(obs_date, str):
                year = int(obs_date[:4]) if obs_date[:4].isdigit() else None
            
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "id": f"eddmaps_{row[col_idx.get('objectid', 0)]}",
                    "species": row[col_idx.get("scientificname", 7)],
                    "scientific_name": row[col_idx.get("scientificname", 7)],
                    "observed_on": obs_date[:10] if obs_date else None,
                    "year": year,
                    "source": "eddmaps",
                    "iconic_taxon": "Invasive"
                }
            })
        
        offset += len(rows)
        log(f"  +{len(rows)} (total: {len(all_features)})")
        
        total = data.get("recordsTotal", 0)
        if offset >= total:
            break
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "EDDMapS - Invasive Species",
            "region": "Utah"
        },
        "features": all_features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(all_features)} invasive species records ===")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
OBIS - Ocean Biodiversity Information System
Great Salt Lake and Utah aquatic species
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/obis_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_obis.json"

# Utah bounding box
UTAH_WKT = "POLYGON((-114.1 36.9,-109 36.9,-109 42,-114.1 42,-114.1 36.9))"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== OBIS Aquatic Species Collection ===")
    
    url = "https://api.obis.org/v3/occurrence"
    all_features = []
    offset = 0
    
    while True:
        params = {
            "geometry": UTAH_WKT,
            "size": 1000,
            "skip": offset
        }
        
        log(f"Fetching offset {offset}...")
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        
        results = data.get("results", [])
        if not results:
            break
        
        for rec in results:
            lat = rec.get("decimalLatitude")
            lng = rec.get("decimalLongitude")
            if not lat or not lng:
                continue
            
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "id": f"obis_{rec.get('id', '')}",
                    "species": rec.get("scientificName", "Unknown"),
                    "scientific_name": rec.get("scientificName", ""),
                    "family": rec.get("family", ""),
                    "order": rec.get("order", ""),
                    "class": rec.get("class", ""),
                    "phylum": rec.get("phylum", ""),
                    "year": rec.get("year"),
                    "month": rec.get("month"),
                    "dataset": rec.get("dataset_id", ""),
                    "source": "obis",
                    "iconic_taxon": "Aquatic"
                }
            })
        
        offset += len(results)
        log(f"  +{len(results)} (total: {len(all_features)})")
        
        total = data.get("total", 0)
        if offset >= total:
            break
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "OBIS - Ocean Biodiversity Information System",
            "region": "Utah"
        },
        "features": all_features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(all_features)} aquatic species records ===")

if __name__ == "__main__":
    main()

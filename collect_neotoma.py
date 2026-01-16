#!/usr/bin/env python3
"""
Neotoma Paleoecology Database
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/neotoma_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_neotoma.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Neotoma Paleoecology Collection ===")
    
    url = "https://api.neotomadb.org/v2.0/data/sites"
    params = {"loc": "POLYGON((-114.1 36.9,-109 36.9,-109 42,-114.1 42,-114.1 36.9))", "limit": 9999}
    
    log("Fetching sites...")
    r = requests.get(url, params=params, timeout=120)
    sites = r.json().get("data", [])
    log(f"  Found {len(sites)} sites")
    
    features = []
    for site in sites:
        # Parse geography JSON string
        geo_str = site.get("geography", "")
        if not geo_str:
            continue
        try:
            geo = json.loads(geo_str) if isinstance(geo_str, str) else geo_str
            coords = geo.get("coordinates", [])
            if len(coords) < 2:
                continue
            lng, lat = coords[0], coords[1]
        except:
            continue
        
        # Get dataset types from collection units
        datasets = []
        for cu in site.get("collectionunits", []):
            for ds in cu.get("datasets", []):
                datasets.append(ds.get("datasettype", ""))
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "id": f"neotoma_{site.get('siteid', '')}",
                "name": site.get("sitename", "Unknown"),
                "description": site.get("sitedescription", ""),
                "altitude": site.get("altitude"),
                "dataset_types": list(set(datasets)),
                "source": "neotoma",
                "iconic_taxon": "Paleo"
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "metadata": {"collected": datetime.now().isoformat(), "source": "Neotoma Paleoecology"},
        "features": features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(features)} paleo sites ===")

if __name__ == "__main__":
    main()

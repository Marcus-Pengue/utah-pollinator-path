#!/usr/bin/env python3
"""
BISON - USGS Biodiversity Information Serving Our Nation
Aggregates museum collections, federal surveys, state wildlife data
Filters out iNaturalist to avoid duplicates
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/bison_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_bison.json"
PROGRESS_FILE = f"{OUTPUT_DIR}/progress.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def save_progress(features, offset):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump({"features": features, "offset": offset}, f)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            d = json.load(f)
            return d.get("features", []), d.get("offset", 0)
    return [], 0

def fetch_bison():
    """Fetch Utah biodiversity records from BISON"""
    url = "https://bison.usgs.gov/api/search.json"
    
    features, offset = load_progress()
    log(f"Resuming from offset {offset}, existing: {len(features)}")
    
    # Provider IDs to EXCLUDE (iNaturalist-sourced)
    exclude_providers = ["440", "inat"]  # iNaturalist provider ID
    
    while True:
        params = {
            "state": "Utah",
            "count": 1000,
            "start": offset
        }
        
        try:
            log(f"Fetching offset {offset}...")
            r = requests.get(url, params=params, timeout=60)
            
            if r.status_code != 200:
                log(f"  Error {r.status_code}")
                break
            
            data = r.json()
            records = data.get("data", [])
            
            if not records:
                break
            
            added = 0
            for rec in records:
                # Skip iNaturalist records
                provider = str(rec.get("providerId", "")).lower()
                provider_name = str(rec.get("provider", "")).lower()
                if "inat" in provider or "inat" in provider_name or "inaturalist" in provider_name:
                    continue
                
                lat = rec.get("decimalLatitude")
                lng = rec.get("decimalLongitude")
                if not lat or not lng:
                    continue
                
                year = rec.get("year")
                month = rec.get("month")
                day = rec.get("day")
                
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                    "properties": {
                        "id": f"bison_{rec.get('occurrenceID', rec.get('bisonID', ''))}",
                        "species": rec.get("vernacularName") or rec.get("scientificName", "Unknown"),
                        "scientific_name": rec.get("scientificName", ""),
                        "family": rec.get("family", ""),
                        "order": rec.get("order", ""),
                        "class": rec.get("class", ""),
                        "kingdom": rec.get("kingdom", ""),
                        "basis_of_record": rec.get("basisOfRecord", ""),
                        "provider": rec.get("provider", ""),
                        "institution": rec.get("institutionCode", ""),
                        "collection": rec.get("collectionCode", ""),
                        "observed_on": f"{year}-{month:02d}-{day:02d}" if year and month and day else None,
                        "year": year,
                        "month": month,
                        "source": "bison"
                    }
                })
                added += 1
            
            offset += len(records)
            log(f"  +{added} unique (total: {len(features)}, offset: {offset})")
            
            # Save every 5000
            if len(features) % 5000 < 1000:
                save_progress(features, offset)
            
            total = data.get("total", 0)
            if offset >= total:
                break
                
            time.sleep(0.3)
            
        except Exception as e:
            log(f"  Error: {e}")
            save_progress(features, offset)
            time.sleep(5)
    
    return features

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== BISON Wildlife Data Collection (non-iNat) ===")
    
    features = fetch_bison()
    
    # Dedupe
    seen = set()
    unique = []
    for f in features:
        fid = f["properties"]["id"]
        if fid not in seen:
            seen.add(fid)
            unique.append(f)
    
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "USGS BISON (excluding iNaturalist)",
            "region": "Utah"
        },
        "features": unique
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(geojson, f)
    
    log(f"=== Done: {len(unique)} BISON records ===")

if __name__ == "__main__":
    main()

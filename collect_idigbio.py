#!/usr/bin/env python3
"""
iDigBio - Integrated Digitized Biocollections
Museum specimen records from natural history collections
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/idigbio_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_idigbio.json"
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

def fetch_records():
    url = "https://search.idigbio.org/v2/search/records/"
    
    features, offset = load_progress()
    log(f"Resuming from offset {offset}, existing: {len(features)}")
    
    while True:
        params = {
            "rq": json.dumps({"stateprovince": "Utah"}),
            "limit": 1000,
            "offset": offset
        }
        
        try:
            log(f"Fetching offset {offset}...")
            r = requests.get(url, params=params, timeout=60)
            
            if r.status_code != 200:
                log(f"  Error {r.status_code}")
                break
            
            data = r.json()
            items = data.get("items", [])
            
            if not items:
                break
            
            for item in items:
                idx = item.get("indexTerms", {})
                lat = idx.get("geopoint", {}).get("lat")
                lng = idx.get("geopoint", {}).get("lon")
                
                if not lat or not lng:
                    continue
                
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "properties": {
                        "id": f"idigbio_{item.get('uuid', '')}",
                        "species": idx.get("scientificname", "Unknown"),
                        "scientific_name": idx.get("scientificname", ""),
                        "family": idx.get("family", ""),
                        "order": idx.get("order", ""),
                        "class": idx.get("class", ""),
                        "kingdom": idx.get("kingdom", ""),
                        "institution": idx.get("institutioncode", ""),
                        "collection": idx.get("collectioncode", ""),
                        "basis_of_record": idx.get("basisofrecord", ""),
                        "year": idx.get("datecollected", "")[:4] if idx.get("datecollected") else None,
                        "source": "idigbio"
                    }
                })
            
            offset += len(items)
            log(f"  +{len(items)} (total: {len(features)})")
            
            if len(features) % 5000 < 1000:
                save_progress(features, offset)
            
            total = data.get("itemCount", 0)
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
    log("=== iDigBio Museum Specimens Collection ===")
    
    features = fetch_records()
    
    # Dedupe
    seen = set()
    unique = []
    for f in features:
        fid = f["properties"]["id"]
        if fid not in seen:
            seen.add(fid)
            unique.append(f)
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "iDigBio - Integrated Digitized Biocollections",
            "region": "Utah"
        },
        "features": unique
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(unique)} museum specimens ===")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Xeno-canto v3 API - Bird audio recordings with locations
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/xenocanto_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_bird_audio.json"
API_KEY = "61eec5b5b330553d764fcaf4bf61846614c50c72"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_recordings(query, page=1):
    """Fetch recordings from Xeno-canto v3"""
    url = "https://xeno-canto.org/api/3/recordings"
    params = {
        "query": query,
        "page": page,
        "key": API_KEY
    }
    r = requests.get(url, params=params, timeout=30)
    if r.status_code == 200:
        return r.json()
    else:
        log(f"  Error {r.status_code}: {r.text[:200]}")
        return {}

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Xeno-canto v3 Bird Audio Collection ===")
    
    # Try location-based query for Utah
    queries = [
        "loc:utah",
        "loc:\"salt lake\"",
        "loc:provo",
        "loc:ogden",
        "loc:moab",
        "loc:\"st george\"",
        "loc:logan",
        "loc:\"cedar city\"",
        "loc:\"park city\"",
        "loc:vernal",
    ]
    
    all_recordings = []
    seen_ids = set()
    
    for query in queries:
        log(f"Query: {query}")
        page = 1
        
        while page <= 20:
            data = fetch_recordings(query, page)
            
            recordings = data.get("recordings", [])
            if not recordings:
                break
            
            for rec in recordings:
                rec_id = rec.get("id")
                if rec_id not in seen_ids:
                    seen_ids.add(rec_id)
                    all_recordings.append(rec)
            
            log(f"  Page {page}: +{len(recordings)} (total unique: {len(all_recordings)})")
            
            num_pages = int(data.get("numPages", 1))
            if page >= num_pages:
                break
            
            page += 1
            time.sleep(0.5)
        
        time.sleep(1)
    
    # Convert to GeoJSON
    features = []
    species_counts = {}
    
    for rec in all_recordings:
        lat = rec.get("lat")
        lng = rec.get("lon")
        if not lat or not lng:
            continue
        
        try:
            lat = float(lat)
            lng = float(lng)
        except:
            continue
        
        species = rec.get("en", "Unknown")
        sci_name = (rec.get("gen", "") + " " + rec.get("sp", "")).strip()
        species_counts[species] = species_counts.get(species, 0) + 1
        
        date = rec.get("date", "")
        year, month, day = None, None, None
        if date:
            parts = date.split("-")
            year = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else None
            month = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            day = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "id": f"xc_{rec.get('id')}",
                "species": species,
                "scientific_name": sci_name,
                "iconic_taxon": "Aves",
                "observed_on": date,
                "year": year,
                "month": month,
                "day": day,
                "source": "xenocanto",
                "audio_url": rec.get("file"),
                "recordist": rec.get("rec"),
                "type": rec.get("type"),
                "quality": rec.get("q"),
                "location": rec.get("loc"),
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "Xeno-canto v3 API",
            "region": "Utah"
        },
        "features": features
    }
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(features)} recordings ===")
    log("Top species:")
    for sp, c in sorted(species_counts.items(), key=lambda x: -x[1])[:10]:
        log(f"  {sp}: {c}")

if __name__ == "__main__":
    main()

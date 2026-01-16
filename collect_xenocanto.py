#!/usr/bin/env python3
"""
Xeno-canto - Bird audio recordings with locations
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/xenocanto_cache"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_recordings(page=1):
    """Fetch Utah bird recordings"""
    url = "https://xeno-canto.org/api/2/recordings"
    params = {
        "query": "box:36.9,-114.1,42.0,-109.0",  # Utah bbox
        "page": page
    }
    r = requests.get(url, params=params, timeout=30)
    if r.status_code == 200:
        return r.json()
    return {}

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Xeno-canto Bird Audio Collection ===")
    
    all_recordings = []
    page = 1
    
    while True:
        log(f"Fetching page {page}...")
        data = fetch_recordings(page)
        
        recordings = data.get("recordings", [])
        if not recordings:
            break
        
        all_recordings.extend(recordings)
        log(f"  {len(all_recordings)} total recordings")
        
        num_pages = int(data.get("numPages", 1))
        if page >= num_pages:
            break
        
        page += 1
        time.sleep(1)
    
    # Convert to GeoJSON
    features = []
    species_counts = {}
    
    for rec in all_recordings:
        lat = rec.get("lat")
        lng = rec.get("lng")
        if not lat or not lng:
            continue
        
        species = rec.get("en", "Unknown")
        sci_name = rec.get("gen", "") + " " + rec.get("sp", "")
        species_counts[species] = species_counts.get(species, 0) + 1
        
        date = rec.get("date", "")
        year, month, day = None, None, None
        if date:
            parts = date.split("-")
            year = int(parts[0]) if len(parts) > 0 else None
            month = int(parts[1]) if len(parts) > 1 else None
            day = int(parts[2]) if len(parts) > 2 else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "id": f"xc_{rec.get('id')}",
                "species": species,
                "scientific_name": sci_name.strip(),
                "iconic_taxon": "Aves",
                "observed_on": date,
                "year": year, "month": month, "day": day,
                "source": "xenocanto",
                "audio_url": rec.get("file"),
                "recordist": rec.get("rec"),
                "type": rec.get("type"),  # song, call, etc
                "quality": rec.get("q"),
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(features),
        "species_counts": dict(sorted(species_counts.items(), key=lambda x: -x[1])),
        "features": features
    }
    
    with open(f"{OUTPUT_DIR}/utah_bird_audio.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(features)} recordings ===")
    log("Top species:")
    for sp, c in sorted(species_counts.items(), key=lambda x: -x[1])[:10]:
        log(f"  {sp}: {c}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Native Bees Full - Chunks by year to bypass 10k limit
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/native_bees_cache"
PROGRESS_FILE = f"{OUTPUT_DIR}/bees_progress.json"

# Families that hit 10k limit
BEE_TAXA = [
    (630955, "Andrenidae"),
    (47222, "Halictidae"),
]

YEARS = range(2010, 2026)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed": [], "features": []}

def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)

def fetch_bees_year(taxon_id, year):
    url = "https://api.inaturalist.org/v1/observations"
    all_obs = []
    page = 1
    
    while page <= 50:
        params = {
            "taxon_id": taxon_id,
            "swlat": 36.9, "swlng": -114.1,
            "nelat": 42.0, "nelng": -109.0,
            "quality_grade": "research,needs_id",
            "year": year,
            "per_page": 200,
            "page": page,
        }
        
        r = requests.get(url, params=params, timeout=30)
        if r.status_code != 200:
            break
        
        results = r.json().get("results", [])
        if not results:
            break
        
        all_obs.extend(results)
        page += 1
        time.sleep(1)
    
    return all_obs

def obs_to_feature(obs, family):
    coords = obs.get("geojson", {}).get("coordinates", [None, None])
    if not coords[0]:
        return None
    
    taxon = obs.get("taxon", {})
    obs_date = obs.get("observed_on", "")
    year, month, day = None, None, None
    if obs_date:
        parts = obs_date.split("-")
        year = int(parts[0]) if len(parts) > 0 else None
        month = int(parts[1]) if len(parts) > 1 else None
        day = int(parts[2]) if len(parts) > 2 else None
    
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coords},
        "properties": {
            "id": f"bee_{obs['id']}",
            "species": taxon.get("preferred_common_name") or taxon.get("name", ""),
            "scientific_name": taxon.get("name", ""),
            "family": family,
            "iconic_taxon": "Insecta",
            "observed_on": obs_date,
            "year": year, "month": month, "day": day,
            "source": "native_bees_full",
        }
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    progress = load_progress()
    
    log("=== Native Bees Full Collection ===")
    log(f"Existing: {len(progress['features'])} features")
    
    for taxon_id, family in BEE_TAXA:
        for year in YEARS:
            key = f"{taxon_id}_{year}"
            if key in progress["completed"]:
                continue
            
            log(f"{family} {year}...")
            obs = fetch_bees_year(taxon_id, year)
            
            for o in obs:
                feat = obs_to_feature(o, family)
                if feat:
                    progress["features"].append(feat)
            
            progress["completed"].append(key)
            save_progress(progress)
            log(f"  +{len(obs)} (total: {len(progress['features']):,})")
    
    # Dedupe and save
    log("Deduplicating...")
    seen = set()
    unique = []
    for f in progress["features"]:
        fid = f["properties"]["id"]
        if fid not in seen:
            seen.add(fid)
            unique.append(f)
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(unique),
        "features": unique
    }
    
    with open(f"{OUTPUT_DIR}/utah_native_bees_full.json", "w") as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(unique):,} native bee observations ===")

if __name__ == "__main__":
    main()

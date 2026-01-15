#!/usr/bin/env python3
"""
Bumble Bee Watch - via iNaturalist project
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/bumblebee_cache"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_bumble_bees():
    """Fetch bumble bee observations from iNaturalist (Bombus genus)"""
    url = "https://api.inaturalist.org/v1/observations"
    all_obs = []
    page = 1
    
    while page <= 50:
        params = {
            "taxon_id": 52775,  # Bombus (bumble bees)
            "swlat": 36.9, "swlng": -114.1,
            "nelat": 42.0, "nelng": -109.0,
            "quality_grade": "research,needs_id",
            "per_page": 200,
            "page": page,
            "order_by": "observed_on"
        }
        
        r = requests.get(url, params=params, timeout=30)
        if r.status_code != 200:
            break
            
        results = r.json().get("results", [])
        if not results:
            break
            
        all_obs.extend(results)
        log(f"  Page {page}: {len(all_obs)} bumble bees")
        page += 1
        time.sleep(1)
    
    return all_obs

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Bumble Bee Watch Collection ===")
    
    log("Fetching Utah bumble bee observations...")
    observations = fetch_bumble_bees()
    
    features = []
    species_counts = {}
    
    for obs in observations:
        coords = obs.get("geojson", {}).get("coordinates", [None, None])
        if not coords[0]:
            continue
        
        taxon = obs.get("taxon", {})
        species_name = taxon.get("name", "Bombus sp.")
        common_name = taxon.get("preferred_common_name", "Bumble bee")
        
        species_counts[species_name] = species_counts.get(species_name, 0) + 1
        
        obs_date = obs.get("observed_on", "")
        year, month, day = None, None, None
        if obs_date:
            parts = obs_date.split("-")
            year = int(parts[0]) if len(parts) > 0 else None
            month = int(parts[1]) if len(parts) > 1 else None
            day = int(parts[2]) if len(parts) > 2 else None
        
        photos = obs.get("photos", [])
        photo_url = photos[0]["url"].replace("square", "medium") if photos else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": coords},
            "properties": {
                "id": f"bbw_{obs['id']}",
                "species": common_name,
                "scientific_name": species_name,
                "iconic_taxon": "Insecta",
                "observed_on": obs_date,
                "year": year,
                "month": month,
                "day": day,
                "photo_url": photo_url,
                "source": "bumblebee_watch",
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(features),
        "species_counts": dict(sorted(species_counts.items(), key=lambda x: -x[1])),
        "features": features
    }
    
    with open(f"{OUTPUT_DIR}/utah_bumble_bees.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(features)} bumble bee observations ===")
    log("Species breakdown:")
    for sp, count in sorted(species_counts.items(), key=lambda x: -x[1])[:10]:
        log(f"  {sp}: {count}")

if __name__ == "__main__":
    main()

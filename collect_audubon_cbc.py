#!/usr/bin/env python3
"""
Audubon Christmas Bird Count - via iNat project data
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/audubon_cache"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_winter_birds():
    """Fetch winter bird observations (Dec-Feb) from Utah"""
    url = "https://api.inaturalist.org/v1/observations"
    all_obs = []
    
    # December through February across multiple years
    for year in range(2018, 2026):
        for month in [12, 1, 2]:
            actual_year = year if month == 12 else year + 1
            if actual_year > 2025:
                continue
                
            log(f"  Fetching {actual_year}-{month:02d}...")
            page = 1
            
            while page <= 10:
                params = {
                    "taxon_id": 3,  # Aves
                    "swlat": 36.9, "swlng": -114.1,
                    "nelat": 42.0, "nelng": -109.0,
                    "quality_grade": "research",
                    "month": month,
                    "year": actual_year,
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

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Winter Bird Count Collection ===")
    
    log("Fetching Utah winter birds (Dec-Feb, 2018-2025)...")
    observations = fetch_winter_birds()
    log(f"Total fetched: {len(observations)}")
    
    features = []
    species_counts = {}
    
    for obs in observations:
        coords = obs.get("geojson", {}).get("coordinates", [None, None])
        if not coords[0]:
            continue
        
        taxon = obs.get("taxon", {})
        species = taxon.get("preferred_common_name", "Unknown")
        sci_name = taxon.get("name", "")
        species_counts[species] = species_counts.get(species, 0) + 1
        
        obs_date = obs.get("observed_on", "")
        year, month, day = None, None, None
        if obs_date:
            parts = obs_date.split("-")
            year = int(parts[0]) if len(parts) > 0 else None
            month = int(parts[1]) if len(parts) > 1 else None
            day = int(parts[2]) if len(parts) > 2 else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": coords},
            "properties": {
                "id": f"winter_{obs['id']}",
                "species": species,
                "scientific_name": sci_name,
                "iconic_taxon": "Aves",
                "observed_on": obs_date,
                "year": year, "month": month, "day": day,
                "source": "winter_bird_count",
            }
        })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(features),
        "species_counts": dict(sorted(species_counts.items(), key=lambda x: -x[1])),
        "features": features
    }
    
    with open(f"{OUTPUT_DIR}/utah_winter_birds.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(features)} winter bird observations ===")
    log("Top 10 species:")
    for sp, c in sorted(species_counts.items(), key=lambda x: -x[1])[:10]:
        log(f"  {sp}: {c}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Native Bees - All bee families from Utah (not just Bombus)
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/native_bees_cache"

# Bee families (Apoidea excluding honey bees)
BEE_TAXA = [
    (630955, "Andrenidae"),      # Mining bees
    (47222, "Halictidae"),       # Sweat bees
    (47223, "Megachilidae"),     # Leafcutter bees
    (47225, "Colletidae"),       # Plasterer bees
    (630954, "Melittidae"),      # Melittid bees
]

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_bees(taxon_id, taxon_name):
    url = "https://api.inaturalist.org/v1/observations"
    all_obs = []
    page = 1
    
    while page <= 50:
        params = {
            "taxon_id": taxon_id,
            "swlat": 36.9, "swlng": -114.1,
            "nelat": 42.0, "nelng": -109.0,
            "quality_grade": "research,needs_id",
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
    log("=== Native Bee Collection ===")
    
    all_features = []
    family_counts = {}
    species_counts = {}
    
    for taxon_id, family in BEE_TAXA:
        log(f"Fetching {family}...")
        observations = fetch_bees(taxon_id, family)
        family_counts[family] = len(observations)
        log(f"  {len(observations)} observations")
        
        for obs in observations:
            coords = obs.get("geojson", {}).get("coordinates", [None, None])
            if not coords[0]:
                continue
            
            taxon = obs.get("taxon", {})
            species = taxon.get("name", family)
            common = taxon.get("preferred_common_name", "")
            species_counts[species] = species_counts.get(species, 0) + 1
            
            obs_date = obs.get("observed_on", "")
            year, month, day = None, None, None
            if obs_date:
                parts = obs_date.split("-")
                year = int(parts[0]) if len(parts) > 0 else None
                month = int(parts[1]) if len(parts) > 1 else None
                day = int(parts[2]) if len(parts) > 2 else None
            
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": coords},
                "properties": {
                    "id": f"bee_{obs['id']}",
                    "species": common or species,
                    "scientific_name": species,
                    "family": family,
                    "iconic_taxon": "Insecta",
                    "observed_on": obs_date,
                    "year": year, "month": month, "day": day,
                    "source": "native_bees",
                }
            })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(all_features),
        "family_counts": family_counts,
        "species_counts": dict(sorted(species_counts.items(), key=lambda x: -x[1])[:50]),
        "features": all_features
    }
    
    with open(f"{OUTPUT_DIR}/utah_native_bees.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(all_features)} native bee observations ===")
    log("By family:")
    for fam, c in sorted(family_counts.items(), key=lambda x: -x[1]):
        log(f"  {fam}: {c}")

if __name__ == "__main__":
    main()

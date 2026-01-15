#!/usr/bin/env python3
"""
Journey North - Monarch & Hummingbird Migration Sightings
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/journey_north_cache"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_sightings(species, year):
    """Fetch sightings from Journey North API"""
    # Journey North uses a map tile system
    # We can scrape their GeoJSON endpoints
    
    species_map = {
        "monarch": "monarch-adult",
        "monarch_milkweed": "milkweed",
        "hummingbird": "hummingbird",
        "robin": "robin",
        "tulip": "tulip",
    }
    
    code = species_map.get(species, species)
    url = f"https://maps.journeynorth.org/api/geojson/{code}/{year}"
    
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            return r.json().get("features", [])
    except Exception as e:
        log(f"  Error: {e}")
    
    return []

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Journey North Collection ===")
    
    all_features = []
    
    # Fetch multiple species and years
    species_list = ["monarch", "monarch_milkweed", "hummingbird"]
    years = range(2020, 2026)
    
    for species in species_list:
        for year in years:
            log(f"Fetching {species} {year}...")
            features = fetch_sightings(species, year)
            
            # Filter to Utah region
            utah_features = []
            for f in features:
                coords = f.get("geometry", {}).get("coordinates", [])
                if coords and len(coords) >= 2:
                    lng, lat = coords[0], coords[1]
                    if 36.9 <= lat <= 42.0 and -114.1 <= lng <= -109.0:
                        # Standardize format
                        props = f.get("properties", {})
                        obs_date = props.get("date", "")
                        year_val, month_val, day_val = None, None, None
                        if obs_date:
                            parts = obs_date.split("-")
                            year_val = int(parts[0]) if len(parts) > 0 else None
                            month_val = int(parts[1]) if len(parts) > 1 else None
                            day_val = int(parts[2]) if len(parts) > 2 else None
                        
                        utah_features.append({
                            "type": "Feature",
                            "geometry": f["geometry"],
                            "properties": {
                                "id": f"jn_{species}_{props.get('id', '')}",
                                "species": species.replace("_", " ").title(),
                                "scientific_name": None,
                                "iconic_taxon": "Insecta" if "monarch" in species else "Aves",
                                "observed_on": obs_date,
                                "year": year_val,
                                "month": month_val,
                                "day": day_val,
                                "source": "journey_north",
                                "notes": props.get("comments", ""),
                            }
                        })
            
            if utah_features:
                log(f"  {len(utah_features)} Utah sightings")
                all_features.extend(utah_features)
            
            time.sleep(0.5)
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(all_features),
        "features": all_features
    }
    
    with open(f"{OUTPUT_DIR}/utah_journey_north.json", "w") as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(all_features)} sightings ===")

if __name__ == "__main__":
    main()

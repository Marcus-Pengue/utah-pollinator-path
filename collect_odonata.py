#!/usr/bin/env python3
"""
Odonata Collector - Dragonflies & Damselflies
Important wetland/water quality indicators
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/odonata_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_odonata.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_odonata():
    """Fetch dragonfly and damselfly observations"""
    url = "https://api.inaturalist.org/v1/observations"
    
    all_features = []
    
    # Odonata suborders
    taxa = [
        47792,   # Anisoptera (Dragonflies)
        47793,   # Zygoptera (Damselflies)
    ]
    
    for taxon_id in taxa:
        taxon_name = "Dragonflies" if taxon_id == 47792 else "Damselflies"
        log(f"Fetching {taxon_name}...")
        
        for year in range(2010, 2026):
            page = 1
            year_count = 0
            
            while page <= 20:
                params = {
                    "taxon_id": taxon_id,
                    "swlat": 36.9, "swlng": -114.1,
                    "nelat": 42.0, "nelng": -109.0,
                    "quality_grade": "research,needs_id",
                    "year": year,
                    "per_page": 200,
                    "page": page
                }
                
                try:
                    r = requests.get(url, params=params, timeout=30)
                    if r.status_code != 200:
                        break
                    
                    data = r.json()
                    results = data.get("results", [])
                    if not results:
                        break
                    
                    for obs in results:
                        loc = obs.get("location", "")
                        if not loc or "," not in loc:
                            continue
                        lat, lng = loc.split(",")
                        
                        taxon = obs.get("taxon", {})
                        observed = obs.get("observed_on", "")
                        
                        all_features.append({
                            "type": "Feature",
                            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                            "properties": {
                                "id": obs.get("id"),
                                "species": taxon.get("preferred_common_name", "Unknown"),
                                "scientific_name": taxon.get("name", ""),
                                "suborder": taxon_name,
                                "iconic_taxon": "Odonata",
                                "observed_on": observed,
                                "year": int(observed[:4]) if observed else None,
                                "month": int(observed[5:7]) if observed and len(observed) > 6 else None,
                                "source": "inaturalist"
                            }
                        })
                    
                    year_count += len(results)
                    page += 1
                    time.sleep(0.3)
                    
                except Exception as e:
                    log(f"  Error: {e}")
                    break
            
            if year_count > 0:
                log(f"  {year}: +{year_count} (total: {len(all_features)})")
        
        time.sleep(1)
    
    return all_features

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Utah Odonata Collection ===")
    
    features = fetch_odonata()
    
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
        "features": unique,
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "iNaturalist Odonata",
            "region": "Utah"
        }
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(geojson, f)
    
    log(f"=== Done: {len(unique)} odonata observations ===")

if __name__ == "__main__":
    main()

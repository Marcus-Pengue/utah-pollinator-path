#!/usr/bin/env python3
"""
EXPANDED Collection - Gets ALL Utah observations
- More taxa groups (Mollusca, Fish, etc.)
- Queries by year to bypass 10k limit
- Includes all quality grades

Run: caffeinate -i python3 collect_all_expanded.py
"""

import requests
import json
import time
import os
from datetime import datetime

OUTPUT_DIR = "data/expanded_cache"
RATE_LIMIT_DELAY = 0.8

BOUNDS = {
    "swlat": 36.9, "swlng": -114.1,
    "nelat": 42.0, "nelng": -109.0
}

# EXPANDED taxon list - includes more groups
TAXONS = [
    {"id": 3, "name": "Aves"},           # Birds
    {"id": 47158, "name": "Insecta"},    # Insects
    {"id": 47126, "name": "Plantae"},    # Plants
    {"id": 40151, "name": "Mammalia"},   # Mammals
    {"id": 47170, "name": "Fungi"},      # Fungi
    {"id": 47119, "name": "Arachnida"},  # Spiders
    {"id": 26036, "name": "Reptilia"},   # Reptiles
    {"id": 20978, "name": "Amphibia"},   # Amphibians
    {"id": 47115, "name": "Mollusca"},   # Snails, slugs
    {"id": 47178, "name": "Actinopterygii"},  # Fish
    {"id": 48222, "name": "Chromista"},  # Algae etc
    {"id": 47686, "name": "Protozoa"},   # Protozoans
    {"id": 47534, "name": "Annelida"},   # Worms
    {"id": 47120, "name": "Crustacea"},  # Crustaceans
    {"id": 81769, "name": "Myriapoda"},  # Centipedes etc
    {"id": 47273, "name": "Cnidaria"},   # Jellyfish (unlikely in Utah but complete)
]

# GBIF keys for expanded taxa
GBIF_TAXONS = [
    (212, "Aves"), (216, "Insecta"), (6, "Plantae"),
    (359, "Mammalia"), (5, "Fungi"), (367, "Arachnida"),
    (358, "Reptilia"), (131, "Amphibia"), (52, "Mollusca"),
    (204, "Actinopterygii"), (7, "Chromista"), (1, "Animalia_other"),
]

os.makedirs(OUTPUT_DIR, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")
    with open(f"{OUTPUT_DIR}/collection.log", "a") as f:
        f.write(f"[{ts}] {msg}\n")

def load_checkpoint():
    """Load existing data to resume collection."""
    cp_path = f"{OUTPUT_DIR}/checkpoint.json"
    if os.path.exists(cp_path):
        with open(cp_path, 'r') as f:
            return json.load(f)
    return {"inat": {}, "gbif": {}, "features": []}

def save_checkpoint(data):
    with open(f"{OUTPUT_DIR}/checkpoint.json", 'w') as f:
        json.dump(data, f)

def collect_inat_by_year(taxon_id, taxon_name, year, existing_count=0):
    """Collect iNaturalist observations for one taxon + year."""
    features = []
    page = 1
    per_page = 200
    
    while True:
        params = {
            "taxon_id": taxon_id,
            "swlat": BOUNDS["swlat"], "swlng": BOUNDS["swlng"],
            "nelat": BOUNDS["nelat"], "nelng": BOUNDS["nelng"],
            "quality_grade": "research,needs_id,casual",
            "per_page": per_page,
            "page": page,
            "d1": f"{year}-01-01",
            "d2": f"{year}-12-31",
            "order_by": "observed_on"
        }
        
        try:
            resp = requests.get("https://api.inaturalist.org/v1/observations", 
                              params=params, timeout=60)
            data = resp.json()
            results = data.get("results", [])
            
            if not results:
                break
            
            for obs in results:
                if obs.get("location"):
                    try:
                        lat, lng = map(float, obs["location"].split(","))
                        features.append({
                            "type": "Feature",
                            "geometry": {"type": "Point", "coordinates": [lng, lat]},
                            "properties": {
                                "id": f"inat_{obs['id']}",
                                "species": obs.get("taxon", {}).get("name", ""),
                                "common_name": obs.get("taxon", {}).get("preferred_common_name", ""),
                                "iconic_taxon": taxon_name,
                                "year": year,
                                "month": int(obs.get("observed_on", "")[5:7]) if obs.get("observed_on") and len(obs.get("observed_on", "")) >= 7 else None,
                                "source": "iNaturalist",
                                "quality": obs.get("quality_grade", "")
                            }
                        })
                    except:
                        pass
            
            if page % 10 == 0:
                log(f"  iNat {taxon_name} {year} p{page}: {len(features)} new")
            
            if len(results) < per_page or page >= 50:  # 50 pages = 10k limit
                break
                
            page += 1
            time.sleep(RATE_LIMIT_DELAY)
            
        except Exception as e:
            log(f"  Error: {e}")
            time.sleep(5)
            if page > 1:
                break
            continue
    
    return features

def collect_gbif_taxon(taxon_key, taxon_name, max_records=100000):
    """Collect GBIF observations for one taxon."""
    features = []
    offset = 0
    limit = 300
    
    # Get total first
    params = {
        "taxonKey": taxon_key,
        "decimalLatitude": f"{BOUNDS['swlat']},{BOUNDS['nelat']}",
        "decimalLongitude": f"{BOUNDS['swlng']},{BOUNDS['nelng']}",
        "hasCoordinate": "true",
        "limit": 1
    }
    
    try:
        resp = requests.get("https://api.gbif.org/v1/occurrence/search", 
                          params=params, timeout=30)
        total = resp.json().get("count", 0)
        log(f"  GBIF {taxon_name}: {total:,} available")
    except:
        total = 50000
    
    while offset < min(total, max_records):
        params = {
            "taxonKey": taxon_key,
            "decimalLatitude": f"{BOUNDS['swlat']},{BOUNDS['nelat']}",
            "decimalLongitude": f"{BOUNDS['swlng']},{BOUNDS['nelng']}",
            "hasCoordinate": "true",
            "limit": limit,
            "offset": offset
        }
        
        try:
            resp = requests.get("https://api.gbif.org/v1/occurrence/search",
                              params=params, timeout=60)
            results = resp.json().get("results", [])
            
            if not results:
                break
            
            for obs in results:
                if obs.get("decimalLatitude") and obs.get("decimalLongitude"):
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [obs["decimalLongitude"], obs["decimalLatitude"]]
                        },
                        "properties": {
                            "id": f"gbif_{obs.get('gbifID', obs.get('key', ''))}",
                            "species": obs.get("species", obs.get("scientificName", "")),
                            "common_name": obs.get("vernacularName", ""),
                            "iconic_taxon": taxon_name,
                            "year": obs.get("year"),
                            "month": obs.get("month"),
                            "source": "GBIF"
                        }
                    })
            
            offset += limit
            
            if offset % 3000 == 0:
                log(f"  GBIF {taxon_name}: {len(features):,} collected")
            
            time.sleep(0.5)
            
        except Exception as e:
            log(f"  GBIF Error at {offset}: {e}")
            time.sleep(5)
            continue
    
    return features

def main():
    log("=" * 60)
    log("EXPANDED COLLECTION - ALL UTAH OBSERVATIONS")
    log("=" * 60)
    
    all_features = []
    
    # Years to collect (iNaturalist started ~2008, most data 2015+)
    years = list(range(2008, 2026))
    
    # iNaturalist by taxon + year
    log("\n=== iNaturalist Collection ===")
    for taxon in TAXONS:
        log(f"\nTaxon: {taxon['name']}")
        taxon_features = []
        
        for year in years:
            year_features = collect_inat_by_year(taxon["id"], taxon["name"], year)
            taxon_features.extend(year_features)
            
            if year_features:
                log(f"  {year}: {len(year_features):,} observations")
        
        all_features.extend(taxon_features)
        log(f"  Total {taxon['name']}: {len(taxon_features):,}")
        
        # Save checkpoint after each taxon
        save_checkpoint({"features": all_features, "last_taxon": taxon["name"]})
    
    # GBIF collection
    log("\n=== GBIF Collection ===")
    for taxon_key, taxon_name in GBIF_TAXONS:
        log(f"\nCollecting GBIF: {taxon_name}")
        gbif_features = collect_gbif_taxon(taxon_key, taxon_name)
        all_features.extend(gbif_features)
        log(f"  Total GBIF {taxon_name}: {len(gbif_features):,}")
        save_checkpoint({"features": all_features, "last_gbif": taxon_name})
    
    # Deduplicate
    log("\n=== Deduplicating ===")
    log(f"Before: {len(all_features):,}")
    
    seen = set()
    unique = []
    for f in all_features:
        coords = f["geometry"]["coordinates"]
        props = f["properties"]
        key = (round(coords[0], 4), round(coords[1], 4), 
               props.get("year"), props.get("species", "")[:30])
        if key not in seen:
            seen.add(key)
            unique.append(f)
    
    log(f"After: {len(unique):,}")
    
    # Save final
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "features": unique
    }
    
    output_path = f"{OUTPUT_DIR}/utah_expanded_cache.json"
    with open(output_path, "w") as f:
        json.dump(output, f)
    
    size_mb = os.path.getsize(output_path) / (1024*1024)
    
    log("\n" + "=" * 60)
    log("COLLECTION COMPLETE")
    log(f"Total observations: {len(unique):,}")
    log(f"File size: {size_mb:.1f} MB")
    log(f"Output: {output_path}")
    log("=" * 60)

if __name__ == "__main__":
    main()

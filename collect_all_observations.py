#!/usr/bin/env python3
"""
Overnight Observation Collector
Fetches ALL available observations from iNaturalist + GBIF for the Utah region.

Run with: caffeinate -i python3 collect_all_observations.py

Estimated: 500k-2M observations over 8-12 hours
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
OUTPUT_DIR = "data/full_cache"
RATE_LIMIT_DELAY = 1.0  # seconds between requests

# Utah bounding box (expanded)
BOUNDS = {
    "swlat": 36.9,   # South Utah
    "swlng": -114.1, # West Utah  
    "nelat": 42.0,   # North Utah
    "nelng": -109.0  # East Utah
}

# All taxon groups
TAXONS = [
    {"id": 3, "name": "Aves"},
    {"id": 47158, "name": "Insecta"},
    {"id": 47126, "name": "Plantae"},
    {"id": 40151, "name": "Mammalia"},
    {"id": 47170, "name": "Fungi"},
    {"id": 47119, "name": "Arachnida"},
    {"id": 26036, "name": "Reptilia"},
    {"id": 20978, "name": "Amphibia"},
]

# GBIF taxon keys
GBIF_TAXONS = [
    (212, "Aves"),
    (216, "Insecta"),
    (6, "Plantae"),
    (359, "Mammalia"),
    (358, "Reptilia"),
    (131, "Amphibia"),
    (5, "Fungi"),
    (367, "Arachnida"),
]

def setup():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")
    with open(f"{OUTPUT_DIR}/collection.log", "a") as f:
        f.write(f"[{timestamp}] {msg}\n")

def fetch_inat_page(taxon_id, page, per_page=200):
    """Fetch a page of iNaturalist observations."""
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "taxon_id": taxon_id,
        "swlat": BOUNDS["swlat"],
        "swlng": BOUNDS["swlng"],
        "nelat": BOUNDS["nelat"],
        "nelng": BOUNDS["nelng"],
        "quality_grade": "research,needs_id",
        "per_page": per_page,
        "page": page,
        "order_by": "observed_on"
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log(f"  Error fetching page {page}: {e}")
        return None

def fetch_gbif_page(taxon_key, offset, limit=300):
    """Fetch a page of GBIF observations."""
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "taxonKey": taxon_key,
        "decimalLatitude": f"{BOUNDS['swlat']},{BOUNDS['nelat']}",
        "decimalLongitude": f"{BOUNDS['swlng']},{BOUNDS['nelng']}",
        "hasCoordinate": True,
        "limit": limit,
        "offset": offset
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log(f"  Error fetching GBIF offset {offset}: {e}")
        return None

def collect_inat_taxon(taxon_id, taxon_name):
    """Collect all observations for a taxon from iNaturalist."""
    log(f"Collecting iNaturalist: {taxon_name}")
    
    all_obs = []
    page = 1
    total_available = None
    
    while True:
        data = fetch_inat_page(taxon_id, page)
        if not data:
            time.sleep(5)  # Wait and retry
            data = fetch_inat_page(taxon_id, page)
            if not data:
                break
        
        if total_available is None:
            total_available = data.get("total_results", 0)
            log(f"  Total available: {total_available:,}")
        
        results = data.get("results", [])
        if not results:
            break
            
        for obs in results:
            if obs.get("geojson"):
                all_obs.append({
                    "type": "Feature",
                    "geometry": obs["geojson"],
                    "properties": {
                        "id": obs.get("id"),
                        "species": obs.get("species_guess"),
                        "scientific_name": obs.get("taxon", {}).get("name"),
                        "iconic_taxon": taxon_name,
                        "observed_on": obs.get("observed_on"),
                        "year": int(obs["observed_on"][:4]) if obs.get("observed_on") else None,
                        "month": int(obs["observed_on"][5:7]) if obs.get("observed_on") and len(obs["observed_on"]) >= 7 else None,
                        "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                        "source": "inaturalist"
                    }
                })
        
        log(f"  Page {page}: {len(results)} obs, total collected: {len(all_obs):,}")
        
        # iNaturalist limits to 10,000 results per query
        if page * 200 >= min(total_available, 10000):
            break
            
        page += 1
        time.sleep(RATE_LIMIT_DELAY)
    
    return all_obs

def collect_gbif_taxon(taxon_key, taxon_name):
    """Collect all observations for a taxon from GBIF."""
    log(f"Collecting GBIF: {taxon_name}")
    
    all_obs = []
    offset = 0
    limit = 300
    total_available = None
    
    while True:
        data = fetch_gbif_page(taxon_key, offset, limit)
        if not data:
            time.sleep(5)
            data = fetch_gbif_page(taxon_key, offset, limit)
            if not data:
                break
        
        if total_available is None:
            total_available = data.get("count", 0)
            log(f"  Total available: {total_available:,}")
        
        results = data.get("results", [])
        if not results:
            break
            
        for rec in results:
            lat = rec.get("decimalLatitude")
            lng = rec.get("decimalLongitude")
            if lat and lng:
                year = rec.get("year")
                month = rec.get("month")
                all_obs.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "properties": {
                        "id": f"gbif-{rec.get('key')}",
                        "species": rec.get("vernacularName") or rec.get("species"),
                        "scientific_name": rec.get("scientificName"),
                        "iconic_taxon": taxon_name,
                        "observed_on": rec.get("eventDate"),
                        "year": year,
                        "month": month,
                        "source": "gbif",
                        "institution": rec.get("institutionCode")
                    }
                })
        
        log(f"  Offset {offset}: {len(results)} obs, total collected: {len(all_obs):,}")
        
        if offset + limit >= total_available:
            break
            
        offset += limit
        time.sleep(RATE_LIMIT_DELAY)
    
    return all_obs

def main():
    setup()
    log("=" * 60)
    log("Starting full observation collection")
    log(f"Output directory: {OUTPUT_DIR}")
    log("=" * 60)
    
    all_features = []
    stats = {"inat": {}, "gbif": {}}
    
    # Collect from iNaturalist
    log("\n--- iNaturalist ---")
    for taxon in TAXONS:
        obs = collect_inat_taxon(taxon["id"], taxon["name"])
        all_features.extend(obs)
        stats["inat"][taxon["name"]] = len(obs)
        
        # Save checkpoint
        with open(f"{OUTPUT_DIR}/checkpoint_inat_{taxon['name'].lower()}.json", "w") as f:
            json.dump(obs, f)
        
        log(f"  Saved checkpoint: {len(obs):,} {taxon['name']}")
        time.sleep(2)
    
    # Collect from GBIF
    log("\n--- GBIF ---")
    for taxon_key, taxon_name in GBIF_TAXONS:
        obs = collect_gbif_taxon(taxon_key, taxon_name)
        all_features.extend(obs)
        stats["gbif"][taxon_name] = len(obs)
        
        # Save checkpoint
        with open(f"{OUTPUT_DIR}/checkpoint_gbif_{taxon_name.lower()}.json", "w") as f:
            json.dump(obs, f)
        
        log(f"  Saved checkpoint: {len(obs):,} {taxon_name}")
        time.sleep(2)
    
    # Deduplicate by coordinates + date
    log("\n--- Deduplicating ---")
    seen = set()
    unique_features = []
    for f in all_features:
        coords = tuple(f["geometry"]["coordinates"])
        date = f["properties"].get("observed_on", "")
        key = (coords, date)
        if key not in seen:
            seen.add(key)
            unique_features.append(f)
    
    log(f"Before dedup: {len(all_features):,}")
    log(f"After dedup: {len(unique_features):,}")
    
    # Build year distribution
    year_dist = {}
    taxon_dist = {}
    for f in unique_features:
        y = f["properties"].get("year")
        t = f["properties"].get("iconic_taxon", "Other")
        if y:
            year_dist[y] = year_dist.get(y, 0) + 1
        taxon_dist[t] = taxon_dist.get(t, 0) + 1
    
    # Save final cache
    cache = {
        "type": "FeatureCollection",
        "generated": datetime.utcnow().isoformat(),
        "total_observations": len(unique_features),
        "year_distribution": dict(sorted(year_dist.items())),
        "taxon_distribution": dict(sorted(taxon_dist.items(), key=lambda x: -x[1])),
        "stats": stats,
        "features": unique_features
    }
    
    output_file = f"{OUTPUT_DIR}/utah_full_cache.json"
    with open(output_file, "w") as f:
        json.dump(cache, f)
    
    file_size = os.path.getsize(output_file) / (1024 * 1024)
    
    log("\n" + "=" * 60)
    log("COLLECTION COMPLETE")
    log(f"Total observations: {len(unique_features):,}")
    log(f"File size: {file_size:.1f} MB")
    log(f"Output: {output_file}")
    log("=" * 60)
    
    # Print summary
    print("\nTaxon Distribution:")
    for t, c in sorted(taxon_dist.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c:,}")

if __name__ == "__main__":
    main()

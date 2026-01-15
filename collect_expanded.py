#!/usr/bin/env python3
"""
Expanded Utah Wildlife Collector - Research Grade
Chunks by year+month, resumable, matches existing GeoJSON structure.
Run: nohup caffeinate -i python3 collect_expanded.py &
"""

import requests
import json
import time
import os
from datetime import datetime

OUTPUT_DIR = "data/expanded_cache"
PROGRESS_FILE = f"{OUTPUT_DIR}/progress.json"
RATE_LIMIT = 1.0

BOUNDS = {"swlat": 36.9, "swlng": -114.1, "nelat": 42.0, "nelng": -109.0}

INAT_TAXA = [
    (47158, "Insecta"), (47126, "Plantae"), (3, "Aves"),
    (40151, "Mammalia"), (47170, "Fungi"), (47119, "Arachnida"),
    (26036, "Reptilia"), (20978, "Amphibia"),
]

YEARS = range(2015, 2026)
MONTHS = range(1, 13)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed": [], "features": []}

def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")
    with open(f"{OUTPUT_DIR}/collection.log", "a") as f:
        f.write(f"[{ts}] {msg}\n")

def parse_observation(o):
    """Convert iNat observation to GeoJSON feature with research fields"""
    coords = o.get("geojson", {}).get("coordinates", [None, None])
    if not coords[0] or not coords[1]:
        return None
    
    taxon = o.get("taxon") or {}
    observed = o.get("observed_on") or ""
    
    # Parse date parts
    year, month, day = None, None, None
    if observed:
        parts = observed.split("-")
        year = int(parts[0]) if len(parts) > 0 else None
        month = int(parts[1]) if len(parts) > 1 else None
        day = int(parts[2]) if len(parts) > 2 else None
    
    # Get photo
    photos = o.get("photos") or []
    photo_url = photos[0]["url"].replace("square", "medium") if photos else None
    
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coords},
        "properties": {
            # IDs
            "id": o.get("id"),
            "uuid": o.get("uuid"),
            "source": "inaturalist",
            
            # Taxonomy (expanded)
            "species": taxon.get("preferred_common_name"),
            "scientific_name": taxon.get("name"),
            "taxon_id": taxon.get("id"),
            "taxon_rank": taxon.get("rank"),
            "iconic_taxon": taxon.get("iconic_taxon_name"),
            "family": taxon.get("family"),
            "genus": taxon.get("genus"),
            "kingdom": taxon.get("kingdom"),
            "phylum": taxon.get("phylum"),
            "class": taxon.get("class"),
            "order": taxon.get("order"),
            
            # Time (expanded for phenology)
            "observed_on": observed,
            "year": year,
            "month": month,
            "day": day,
            "time_observed": o.get("time_observed_at"),
            "created_at": o.get("created_at"),
            
            # Location
            "place_guess": o.get("place_guess"),
            "positional_accuracy": o.get("positional_accuracy"),
            
            # Data quality
            "quality_grade": o.get("quality_grade"),
            "num_id_agreements": o.get("num_identification_agreements"),
            "num_id_disagreements": o.get("num_identification_disagreements"),
            
            # Observer (for bias analysis)
            "user_id": o.get("user", {}).get("id"),
            "user_login": o.get("user", {}).get("login"),
            "user_observations_count": o.get("user", {}).get("observations_count"),
            
            # Media
            "photo_url": photo_url,
            "photos_count": len(photos),
        }
    }

def fetch_chunk(taxon_id, year, month):
    """Fetch all observations for taxon/year/month"""
    features = []
    page = 1
    d1 = f"{year}-{month:02d}-01"
    d2 = f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01"
    
    while page <= 50:
        params = {
            "taxon_id": taxon_id, "d1": d1, "d2": d2,
            "swlat": BOUNDS["swlat"], "swlng": BOUNDS["swlng"],
            "nelat": BOUNDS["nelat"], "nelng": BOUNDS["nelng"],
            "quality_grade": "research,needs_id",
            "per_page": 200, "page": page
        }
        try:
            r = requests.get("https://api.inaturalist.org/v1/observations", 
                           params=params, timeout=30)
            r.raise_for_status()
            results = r.json().get("results", [])
            if not results:
                break
            for o in results:
                feat = parse_observation(o)
                if feat:
                    features.append(feat)
            page += 1
            time.sleep(RATE_LIMIT)
        except Exception as e:
            log(f"  Error page {page}: {e}")
            time.sleep(5)
            break
    return features

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    progress = load_progress()
    
    log("="*60)
    log("EXPANDED COLLECTION - RESUMABLE")
    log(f"Existing features: {len(progress['features']):,}")
    log(f"Completed chunks: {len(progress['completed'])}")
    log("="*60)
    
    total_chunks = len(INAT_TAXA) * len(YEARS) * len(MONTHS)
    
    for taxon_id, taxon_name in INAT_TAXA:
        for year in YEARS:
            for month in MONTHS:
                key = f"{taxon_id}_{year}_{month}"
                if key in progress["completed"]:
                    continue
                
                log(f"{taxon_name} {year}-{month:02d} ({len(progress['completed'])}/{total_chunks})")
                features = fetch_chunk(taxon_id, year, month)
                progress["features"].extend(features)
                progress["completed"].append(key)
                save_progress(progress)
                
                if features:
                    log(f"  +{len(features)} (total: {len(progress['features']):,})")
    
    # Final export
    log("\nBuilding final GeoJSON...")
    
    # Deduplicate
    seen = set()
    unique = []
    for f in progress["features"]:
        k = f["properties"]["id"]
        if k not in seen:
            seen.add(k)
            unique.append(f)
    
    # Build stats
    taxon_dist = {}
    year_dist = {}
    for f in unique:
        t = f["properties"].get("iconic_taxon") or "Other"
        y = f["properties"].get("year")
        taxon_dist[t] = taxon_dist.get(t, 0) + 1
        if y:
            year_dist[y] = year_dist.get(y, 0) + 1
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(unique),
        "taxon_distribution": dict(sorted(taxon_dist.items(), key=lambda x: -x[1])),
        "year_distribution": dict(sorted(year_dist.items())),
        "features": unique
    }
    
    outpath = f"{OUTPUT_DIR}/utah_expanded.json"
    with open(outpath, "w") as f:
        json.dump(output, f)
    
    size_mb = os.path.getsize(outpath) / (1024*1024)
    
    log("="*60)
    log(f"COMPLETE: {len(unique):,} observations")
    log(f"File: {outpath} ({size_mb:.1f} MB)")
    log("="*60)

if __name__ == "__main__":
    main()

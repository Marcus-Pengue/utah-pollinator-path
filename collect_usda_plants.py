#!/usr/bin/env python3
"""
USDA Plants Collector - Utah native plants
For plant-pollinator associations
"""

import requests
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "data/usda_cache"

# Key pollinator plants for Utah
POLLINATOR_PLANTS = [
    "Asclepias speciosa",      # Showy Milkweed
    "Asclepias tuberosa",      # Butterfly Weed
    "Solidago canadensis",     # Canada Goldenrod
    "Helianthus annuus",       # Sunflower
    "Cleome serrulata",        # Rocky Mountain Bee Plant
    "Ericameria nauseosa",     # Rubber Rabbitbrush
    "Chrysothamnus viscidiflorus",  # Yellow Rabbitbrush
    "Sphaeralcea coccinea",    # Scarlet Globemallow
    "Penstemon eatonii",       # Firecracker Penstemon
    "Aquilegia coerulea",      # Colorado Columbine
    "Monarda fistulosa",       # Wild Bergamot
    "Gaillardia aristata",     # Blanket Flower
    "Phacelia hastata",        # Silverleaf Phacelia
    "Eriogonum umbellatum",    # Sulfur Buckwheat
    "Balsamorhiza sagittata",  # Arrowleaf Balsamroot
]

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_from_inat(scientific_name):
    """Get Utah observations of a plant from iNaturalist"""
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "taxon_name": scientific_name,
        "swlat": 36.9, "swlng": -114.1,
        "nelat": 42.0, "nelng": -109.0,
        "quality_grade": "research",
        "per_page": 200,
    }
    r = requests.get(url, params=params, timeout=30)
    if r.status_code == 200:
        return r.json().get("results", [])
    return []

def fetch_plant_info(scientific_name):
    """Get plant details from USDA"""
    # USDA doesn't have a clean API, use iNat taxon info
    url = "https://api.inaturalist.org/v1/taxa"
    params = {"q": scientific_name, "rank": "species"}
    r = requests.get(url, params=params, timeout=30)
    if r.status_code == 200:
        results = r.json().get("results", [])
        if results:
            return results[0]
    return {}

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Utah Pollinator Plants Collection ===")
    
    all_features = []
    plant_stats = {}
    
    for plant in POLLINATOR_PLANTS:
        log(f"Fetching: {plant}")
        
        # Get observations
        obs = fetch_from_inat(plant)
        plant_stats[plant] = len(obs)
        
        # Get plant info
        info = fetch_plant_info(plant)
        common_name = info.get("preferred_common_name", "")
        
        for o in obs:
            coords = o.get("geojson", {}).get("coordinates", [None, None])
            if not coords[0]:
                continue
            
            obs_date = o.get("observed_on", "")
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
                    "id": f"plant_{o['id']}",
                    "species": common_name,
                    "scientific_name": plant,
                    "iconic_taxon": "Plantae",
                    "observed_on": obs_date,
                    "year": year, "month": month, "day": day,
                    "source": "inaturalist_plants",
                    "pollinator_value": "high",
                }
            })
        
        time.sleep(1)  # Rate limit
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(all_features),
        "plant_counts": plant_stats,
        "features": all_features
    }
    
    with open(f"{OUTPUT_DIR}/utah_pollinator_plants.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(all_features)} plant observations ===")
    log("By species:")
    for p, c in sorted(plant_stats.items(), key=lambda x: -x[1]):
        log(f"  {p}: {c}")

if __name__ == "__main__":
    main()

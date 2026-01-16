#!/usr/bin/env python3
"""
NPS Species Lists - National Park Service biodiversity data
"""

import requests
import xml.etree.ElementTree as ET
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/nps_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_nps_species.json"

UTAH_PARKS = [
    ("ZION", "Zion National Park", 37.3, -113.0),
    ("BRCA", "Bryce Canyon National Park", 37.6, -112.2),
    ("ARCH", "Arches National Park", 38.7, -109.6),
    ("CANY", "Canyonlands National Park", 38.3, -109.9),
    ("CARE", "Capitol Reef National Park", 38.3, -111.3),
    ("CEBR", "Cedar Breaks National Monument", 37.6, -112.8),
    ("DINO", "Dinosaur National Monument", 40.4, -109.3),
    ("GOSP", "Golden Spike National Historical Park", 41.6, -112.5),
    ("GLCA", "Glen Canyon National Recreation Area", 37.1, -111.5),
    ("HOVE", "Hovenweep National Monument", 37.4, -109.1),
    ("NABR", "Natural Bridges National Monument", 37.6, -110.0),
    ("TICO", "Timpanogos Cave National Monument", 40.4, -111.7),
]

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_park_species(park_code):
    """Fetch species checklist for a park (returns XML)"""
    url = f"https://irmaservices.nps.gov/v3/rest/npspecies/checklist/{park_code}/"
    
    try:
        r = requests.get(url, timeout=60)
        if r.status_code == 200:
            root = ET.fromstring(r.text)
            species = []
            for item in root.findall('.//SpeciesListItem'):
                sp = {}
                for child in item:
                    if child.text:
                        sp[child.tag] = child.text
                species.append(sp)
            return species
    except Exception as e:
        log(f"  Error: {e}")
    return []

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== NPS Species Lists Collection ===")
    
    all_features = []
    
    for park_code, park_name, lat, lng in UTAH_PARKS:
        log(f"Fetching {park_name}...")
        species_list = fetch_park_species(park_code)
        
        if not species_list:
            log(f"  No data")
            continue
        
        log(f"  Found {len(species_list)} species")
        
        for sp in species_list:
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "id": f"nps_{park_code}_{sp.get('TaxaCode', '')}",
                    "species": sp.get("CommonNames", sp.get("ScientificName", "Unknown")),
                    "scientific_name": sp.get("ScientificName", ""),
                    "family": sp.get("Family", ""),
                    "order": sp.get("Order", ""),
                    "category": sp.get("Category", ""),
                    "park_code": park_code,
                    "park_name": park_name,
                    "source": "nps_species",
                    "iconic_taxon": sp.get("Category", "")
                }
            })
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "National Park Service Species Lists",
            "region": "Utah Parks"
        },
        "features": all_features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(all_features)} park species records ===")

if __name__ == "__main__":
    main()

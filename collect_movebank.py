#!/usr/bin/env python3
"""
Movebank Regional Data Collector - Utah + Rocky Mountain region
"""

import requests
import json
import csv
import io
import os
from datetime import datetime

OUTPUT_DIR = "data/movebank_cache"
USERNAME = "Utah-Pollinator-Path"
PASSWORD = os.environ.get("MBPASS", "")

# Regional studies (Utah + neighboring states)
REGIONAL_STUDIES = [
    42705082,      # American Avocet Great Salt Lake
    1720694224,    # USU Coyote Puma Fishlake
    193545363,     # Site fidelity cougars coyotes
    317134988,     # SLC Airport Raptor
    1700206712,    # ICARUS HawkWatch International
    452845647,     # USFWS rehab'd eagle survival
    240931758,     # ABoVE Golden Eagles
    1031368076,    # Beringia South Bald Eagles
    1030730514,    # Teton Kestrel Project
    223650899,     # Teton Rough-legged Hawk
    1153416521,    # Wyoming Short-eared Owls
    204253,        # Swainson's Hawks
    980229,        # Prairie Falcon
    42451582,      # Long-billed Curlew Intermountain
    1377708730,    # Long-billed Curlew Western Wyoming
    1450495172,    # Northern Black Swift
    3132015164,    # Teton Cougar Project
    1153369719,    # Elk National Elk Refuge
    5436053823,    # Pronghorn Laramie
    2478177417,    # Pronghorn Wyoming/Colorado
    2478104452,    # Feral horse Wyoming/Colorado
    7123415731,    # Bighorn sheep Mule deer
]

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_study_info(study_id):
    url = "https://www.movebank.org/movebank/service/direct-read"
    params = {"entity_type": "study", "study_id": study_id}
    r = requests.get(url, params=params, auth=(USERNAME, PASSWORD))
    if r.status_code == 200:
        reader = csv.DictReader(io.StringIO(r.text))
        for row in reader:
            return row
    return {}

def fetch_study_data(study_id):
    url = "https://www.movebank.org/movebank/service/direct-read"
    params = {
        "entity_type": "event",
        "study_id": study_id,
        "sensor_type_id": 653,
        "attributes": "timestamp,location_lat,location_long,individual_id"
    }
    r = requests.get(url, params=params, auth=(USERNAME, PASSWORD), timeout=120)
    if r.status_code == 200 and r.text.strip():
        try:
            return list(csv.DictReader(io.StringIO(r.text)))
        except:
            return []
    return []

def fetch_individuals(study_id):
    url = "https://www.movebank.org/movebank/service/direct-read"
    params = {"entity_type": "individual", "study_id": study_id}
    r = requests.get(url, params=params, auth=(USERNAME, PASSWORD))
    if r.status_code == 200:
        return {row.get("id"): row for row in csv.DictReader(io.StringIO(r.text))}
    return {}

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not PASSWORD:
        log("Set MBPASS env var")
        return
    
    log("=== Movebank Regional Collection ===")
    
    all_features = []
    study_stats = {}
    
    for study_id in REGIONAL_STUDIES:
        info = fetch_study_info(study_id)
        name = info.get("name", str(study_id))[:50]
        log(f"Fetching: {name}")
        
        individuals = fetch_individuals(study_id)
        events = fetch_study_data(study_id)
        study_stats[name] = len(events)
        
        if not events:
            log(f"  No data (may need permission)")
            continue
        
        log(f"  {len(events)} GPS points")
        
        for e in events:
            lat = e.get("location_lat")
            lng = e.get("location_long")
            if not lat or not lng:
                continue
            
            ind_id = e.get("individual_id")
            ind_info = individuals.get(ind_id, {})
            ts = e.get("timestamp", "")
            
            year, month, day = None, None, None
            if ts and len(ts) >= 10:
                parts = ts[:10].split("-")
                year = int(parts[0]) if len(parts) > 0 else None
                month = int(parts[1]) if len(parts) > 1 else None
                day = int(parts[2]) if len(parts) > 2 else None
            
            all_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "properties": {
                    "id": f"mb_{study_id}_{ind_id}_{ts}",
                    "species": ind_info.get("taxon_canonical_name"),
                    "scientific_name": ind_info.get("taxon_canonical_name"),
                    "iconic_taxon": "Mammalia",
                    "observed_on": ts[:10] if ts else None,
                    "year": year, "month": month, "day": day,
                    "source": "movebank",
                    "study_id": study_id,
                    "study_name": name,
                }
            })
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(all_features),
        "study_stats": study_stats,
        "features": all_features
    }
    
    with open(f"{OUTPUT_DIR}/utah_regional_movebank.json", "w") as f:
        json.dump(output, f)
    
    log(f"\n=== Done: {len(all_features)} GPS points from {len(study_stats)} studies ===")

if __name__ == "__main__":
    main()

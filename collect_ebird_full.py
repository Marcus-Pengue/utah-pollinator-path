#!/usr/bin/env python3
"""
eBird Full Historical Collector - loops through all hotspots
Run in background: nohup caffeinate -i python3 collect_ebird_full.py &
"""

import requests
import json
import csv
import io
import time
import os
from datetime import datetime

API_KEY = "6q98opkr6qrc"
OUTPUT_DIR = "data/ebird_cache"
PROGRESS_FILE = f"{OUTPUT_DIR}/ebird_progress.json"
HEADERS = {"X-eBirdApiToken": API_KEY}

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")
    with open(f"{OUTPUT_DIR}/ebird_collection.log", "a") as f:
        f.write(f"[{ts}] {msg}\n")

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed_hotspots": [], "features": []}

def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)

def fetch_hotspots():
    url = "https://api.ebird.org/v2/ref/hotspot/US-UT"
    r = requests.get(url, headers=HEADERS)
    hotspots = []
    for row in csv.reader(io.StringIO(r.text)):
        if len(row) >= 6:
            hotspots.append({
                "locId": row[0],
                "lat": float(row[4]) if row[4] else None,
                "lng": float(row[5]) if row[5] else None,
                "name": row[6] if len(row) > 6 else "",
            })
    return hotspots

def fetch_hotspot_observations(loc_id):
    """Get all observations for a hotspot"""
    url = f"https://api.ebird.org/v2/data/obs/{loc_id}/recent"
    params = {"back": 30}  # API max is 30 days for this endpoint
    r = requests.get(url, headers=HEADERS, params=params)
    if r.status_code == 200:
        return r.json()
    return []

def obs_to_feature(obs):
    obs_date = obs.get("obsDt", "")
    year, month, day = None, None, None
    if obs_date:
        parts = obs_date.split(" ")[0].split("-")
        year = int(parts[0]) if len(parts) > 0 else None
        month = int(parts[1]) if len(parts) > 1 else None
        day = int(parts[2]) if len(parts) > 2 else None
    
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [obs.get("lng"), obs.get("lat")]},
        "properties": {
            "id": f"ebird_{obs.get('subId', '')}_{obs.get('speciesCode', '')}",
            "species": obs.get("comName"),
            "scientific_name": obs.get("sciName"),
            "iconic_taxon": "Aves",
            "observed_on": obs_date.split(" ")[0] if obs_date else None,
            "year": year, "month": month, "day": day,
            "photo_url": None,
            "source": "ebird",
            "count": obs.get("howMany"),
            "location_name": obs.get("locName"),
            "location_id": obs.get("locId"),
        }
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    progress = load_progress()
    
    log("=== eBird Full Collection ===")
    log(f"Existing: {len(progress['features'])} obs")
    
    hotspots = fetch_hotspots()
    log(f"Total hotspots: {len(hotspots)}")
    
    for i, hs in enumerate(hotspots):
        loc_id = hs["locId"]
        if loc_id in progress["completed_hotspots"]:
            continue
        
        log(f"[{i+1}/{len(hotspots)}] {hs['name'][:40]}")
        
        obs_list = fetch_hotspot_observations(loc_id)
        for obs in obs_list:
            if obs.get("lat") and obs.get("lng"):
                progress["features"].append(obs_to_feature(obs))
        
        progress["completed_hotspots"].append(loc_id)
        save_progress(progress)
        
        time.sleep(0.5)  # Rate limit
    
    # Dedupe and save final
    log("Deduplicating...")
    seen = set()
    unique = []
    for f in progress["features"]:
        fid = f["properties"]["id"]
        if fid not in seen:
            seen.add(fid)
            unique.append(f)
    
    output = {
        "type": "FeatureCollection",
        "generated": datetime.now().isoformat(),
        "total_observations": len(unique),
        "features": unique
    }
    
    with open(f"{OUTPUT_DIR}/utah_ebird_full.json", "w") as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(unique)} unique observations ===")

if __name__ == "__main__":
    main()

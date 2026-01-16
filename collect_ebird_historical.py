#!/usr/bin/env python3
"""
eBird Historical Collector - loops through dates
Gets much more data than the 30-day recent endpoint
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta

API_KEY = "6q98opkr6qrc"
OUTPUT_DIR = "data/ebird_cache"
PROGRESS_FILE = f"{OUTPUT_DIR}/ebird_historical_progress.json"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_ebird_historical.json"
HEADERS = {"X-eBirdApiToken": API_KEY}

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"last_date": "2024-12-31", "features": []}

def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)

def fetch_date(year, month, day):
    """Fetch all Utah observations for a specific date"""
    url = f"https://api.ebird.org/v2/data/obs/US-UT/historic/{year}/{month}/{day}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code == 200:
            return r.json()
    except:
        pass
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
            "id": f"ebird_hist_{obs.get('subId', '')}_{obs.get('speciesCode', '')}",
            "species": obs.get("comName"),
            "scientific_name": obs.get("sciName"),
            "iconic_taxon": "Aves",
            "observed_on": obs_date.split(" ")[0] if obs_date else None,
            "year": year, "month": month, "day": day,
            "source": "ebird_historical",
            "count": obs.get("howMany"),
            "location_name": obs.get("locName"),
            "location_id": obs.get("locId"),
        }
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== eBird Historical Collection ===")
    
    progress = load_progress()
    features = progress.get("features", [])
    seen_ids = {f["properties"]["id"] for f in features}
    
    # Go back 5 years
    end_date = datetime(2024, 12, 31)
    start_date = datetime(2020, 1, 1)
    
    # Resume from last date
    last = progress.get("last_date", "2024-12-31")
    current = datetime.strptime(last, "%Y-%m-%d") - timedelta(days=1)
    
    log(f"Starting from {current.strftime('%Y-%m-%d')}, existing: {len(features)}")
    
    days_processed = 0
    while current >= start_date:
        year, month, day = current.year, current.month, current.day
        
        obs_list = fetch_date(year, month, day)
        added = 0
        
        for obs in obs_list:
            feat = obs_to_feature(obs)
            if feat["properties"]["id"] not in seen_ids:
                seen_ids.add(feat["properties"]["id"])
                features.append(feat)
                added += 1
        
        if added > 0:
            log(f"  {current.strftime('%Y-%m-%d')}: +{added} (total: {len(features)})")
        
        days_processed += 1
        
        # Save every 30 days
        if days_processed % 30 == 0:
            progress = {"last_date": current.strftime("%Y-%m-%d"), "features": features}
            save_progress(progress)
        
        current -= timedelta(days=1)
        time.sleep(0.2)  # Rate limit
    
    # Final save
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "eBird Historical API",
            "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        },
        "features": features
    }
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(features)} historical eBird records ===")

if __name__ == "__main__":
    main()

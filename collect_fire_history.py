#!/usr/bin/env python3
"""
Fire Perimeter History - NIFC/GeoMAC
Wildfire boundaries affect habitat patterns
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/fire_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_fire_history.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_fire_perimeters():
    """Fetch historical fire perimeters from NIFC"""
    url = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query"
    
    all_features = []
    
    params = {
        "where": "1=1",
        "geometry": "-114.1,36.9,-109.0,42.0",
        "geometryType": "esriGeometryEnvelope",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "true",
        "f": "geojson",
        "resultOffset": 0,
        "resultRecordCount": 1000
    }
    
    offset = 0
    while True:
        params["resultOffset"] = offset
        log(f"Fetching fires (offset {offset})...")
        
        try:
            r = requests.get(url, params=params, timeout=60)
            if r.status_code != 200:
                break
            
            data = r.json()
            features = data.get("features", [])
            
            if not features:
                break
            
            all_features.extend(features)
            log(f"  +{len(features)} (total: {len(all_features)})")
            
            offset += len(features)
            if len(features) < 1000:
                break
                
        except Exception as e:
            log(f"  Error: {e}")
            break
    
    return all_features

def parse_date(val):
    """Parse date from various formats"""
    if not val:
        return None, None
    if isinstance(val, int):
        # Epoch milliseconds
        try:
            dt = datetime.fromtimestamp(val / 1000)
            return dt.year, dt.strftime("%Y-%m-%d")
        except:
            return None, None
    if isinstance(val, str):
        return int(val[:4]) if val[:4].isdigit() else None, val[:10]
    return None, None

def process_features(features):
    """Convert to standardized format"""
    processed = []
    
    for f in features:
        props = f.get("properties", {})
        geom = f.get("geometry")
        
        if not geom:
            continue
        
        coords = geom.get("coordinates", [])
        if geom["type"] == "Polygon" and coords:
            ring = coords[0] if coords else []
            if ring:
                avg_lng = sum(p[0] for p in ring) / len(ring)
                avg_lat = sum(p[1] for p in ring) / len(ring)
            else:
                continue
        elif geom["type"] == "MultiPolygon" and coords:
            ring = coords[0][0] if coords and coords[0] else []
            if ring:
                avg_lng = sum(p[0] for p in ring) / len(ring)
                avg_lat = sum(p[1] for p in ring) / len(ring)
            else:
                continue
        else:
            continue
        
        year, date_str = parse_date(props.get("attr_FireDiscoveryDateTime"))
        
        processed.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [avg_lng, avg_lat]},
            "properties": {
                "id": f"fire_{props.get('attr_IncidentName', 'unknown')}_{year or 'unk'}",
                "name": props.get("attr_IncidentName", "Unknown"),
                "year": year,
                "observed_on": date_str,
                "acres": props.get("attr_IncidentSize"),
                "cause": props.get("attr_FireCause"),
                "source": "nifc_fire",
                "iconic_taxon": "Fire"
            }
        })
    
    return processed

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== Fire Perimeter History Collection ===")
    
    features = fetch_fire_perimeters()
    processed = process_features(features)
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "NIFC Interagency Fire Perimeters",
            "region": "Utah"
        },
        "features": processed
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(processed)} fire perimeters ===")

if __name__ == "__main__":
    main()

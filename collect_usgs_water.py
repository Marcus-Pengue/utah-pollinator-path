#!/usr/bin/env python3
"""
USGS Water Data - Stream gauges and water quality
Important for habitat analysis (water proximity)
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/usgs_water_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_stream_gauges.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_sites():
    """Fetch all USGS monitoring sites in Utah"""
    url = "https://waterservices.usgs.gov/nwis/site/"
    params = {
        "format": "rdb",
        "stateCd": "UT",
        "siteType": "ST,SP,LK",  # Streams, Springs, Lakes
        "hasDataTypeCd": "iv,dv",  # Has instantaneous or daily values
        "siteStatus": "all"
    }
    
    log("Fetching USGS sites...")
    r = requests.get(url, params=params, timeout=60)
    
    sites = []
    lines = r.text.split('\n')
    headers = None
    
    for line in lines:
        if line.startswith('#') or not line.strip():
            continue
        if line.startswith('agency_cd'):
            headers = line.split('\t')
            continue
        if line.startswith('5s') or not headers:
            continue
        
        parts = line.split('\t')
        if len(parts) < len(headers):
            continue
        
        row = dict(zip(headers, parts))
        
        lat = row.get('dec_lat_va', '')
        lng = row.get('dec_long_va', '')
        if not lat or not lng:
            continue
        
        try:
            sites.append({
                "site_no": row.get('site_no', ''),
                "name": row.get('station_nm', ''),
                "lat": float(lat),
                "lng": float(lng),
                "site_type": row.get('site_tp_cd', ''),
                "county": row.get('county_cd', ''),
                "huc": row.get('huc_cd', ''),  # Hydrologic unit code
                "drain_area": row.get('drain_area_va', ''),
                "altitude": row.get('alt_va', ''),
            })
        except ValueError:
            continue
    
    log(f"  Found {len(sites)} monitoring sites")
    return sites

def fetch_current_conditions():
    """Fetch current streamflow data"""
    url = "https://waterservices.usgs.gov/nwis/iv/"
    params = {
        "format": "json",
        "stateCd": "UT",
        "parameterCd": "00060,00065",  # Discharge, Gage height
        "siteStatus": "active"
    }
    
    log("Fetching current conditions...")
    r = requests.get(url, params=params, timeout=60)
    data = r.json()
    
    conditions = {}
    for ts in data.get('value', {}).get('timeSeries', []):
        site_code = ts.get('sourceInfo', {}).get('siteCode', [{}])[0].get('value', '')
        var_name = ts.get('variable', {}).get('variableName', '')
        values = ts.get('values', [{}])[0].get('value', [])
        
        if values:
            latest = values[-1]
            if site_code not in conditions:
                conditions[site_code] = {}
            conditions[site_code][var_name] = {
                "value": latest.get('value'),
                "datetime": latest.get('dateTime')
            }
    
    log(f"  Got conditions for {len(conditions)} sites")
    return conditions

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== USGS Water Data Collection ===")
    
    sites = fetch_sites()
    conditions = fetch_current_conditions()
    
    # Convert to GeoJSON
    features = []
    for site in sites:
        props = {
            "id": f"usgs_{site['site_no']}",
            "name": site['name'],
            "site_no": site['site_no'],
            "site_type": site['site_type'],
            "county": site['county'],
            "huc": site['huc'],
            "drain_area_sqmi": site['drain_area'],
            "altitude_ft": site['altitude'],
            "source": "usgs_water",
            "iconic_taxon": "Hydrology"
        }
        
        # Add current conditions if available
        if site['site_no'] in conditions:
            props['current_conditions'] = conditions[site['site_no']]
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [site['lng'], site['lat']]},
            "properties": props
        })
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "USGS National Water Information System",
            "region": "Utah"
        },
        "features": features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(features)} water monitoring sites ===")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
HawkCount - Raptor migration monitoring data
Unique hawk watch site counts from HMANA
"""

import requests
import json
import os
import re
from datetime import datetime
from bs4 import BeautifulSoup

OUTPUT_DIR = "data/hawkcount_cache"
OUTPUT_FILE = f"{OUTPUT_DIR}/utah_hawkcount.json"

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_utah_sites():
    """Get Utah hawk watch sites"""
    url = "https://hawkcount.org/sitesel.php"
    r = requests.get(url, timeout=30)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    sites = []
    # Find Utah sites in the dropdown/list
    for option in soup.find_all('option'):
        text = option.text
        value = option.get('value', '')
        if 'Utah' in text or 'UT' in text:
            sites.append({'name': text, 'id': value})
    
    # Also check for direct links
    for link in soup.find_all('a', href=True):
        if 'Utah' in link.text or 'UT' in link.text:
            sites.append({'name': link.text, 'url': link['href']})
    
    return sites

def fetch_site_data(site_id):
    """Fetch count data for a specific site"""
    url = f"https://hawkcount.org/siteinfo.php?ression={site_id}"
    try:
        r = requests.get(url, timeout=30)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Extract location info
        text = soup.get_text()
        
        # Try to find coordinates
        lat_match = re.search(r'Lat(?:itude)?[:\s]+(-?\d+\.?\d*)', text)
        lng_match = re.search(r'Lon(?:gitude)?[:\s]+(-?\d+\.?\d*)', text)
        
        lat = float(lat_match.group(1)) if lat_match else None
        lng = float(lng_match.group(1)) if lng_match else None
        
        return {'lat': lat, 'lng': lng, 'raw': text[:1000]}
    except Exception as e:
        log(f"  Error: {e}")
        return None

def fetch_all_sites_list():
    """Get comprehensive site list"""
    url = "https://hawkcount.org/sitesel.php"
    r = requests.get(url, timeout=30)
    
    # Parse the page for all sites
    sites = []
    
    # Look for state=UT pattern
    matches = re.findall(r'ression=([A-Z]{2}-[A-Z]{2}[^"\'&\s]*)', r.text)
    utah_matches = [m for m in matches if 'US-UT' in m or m.startswith('UT')]
    
    log(f"Found {len(utah_matches)} Utah site codes")
    return utah_matches

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== HawkCount Raptor Migration Collection ===")
    
    # Known Utah hawk watch sites with coordinates
    utah_sites = [
        {"name": "Goshute Mountains", "lat": 40.466, "lng": -114.283, "id": "goshutes"},
        {"name": "Wellsville Mountains", "lat": 41.567, "lng": -111.933, "id": "wellsville"},
        {"name": "Dinosaur National Monument", "lat": 40.437, "lng": -109.305, "id": "dinosaur"},
    ]
    
    # Try to fetch more from website
    log("Fetching site list...")
    site_codes = fetch_all_sites_list()
    
    # Fetch recent counts from HawkCount daily summaries
    features = []
    
    for site in utah_sites:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [site["lng"], site["lat"]]},
            "properties": {
                "id": f"hawkcount_{site['id']}",
                "name": site["name"],
                "source": "hawkcount",
                "iconic_taxon": "Aves",
                "site_type": "hawk_watch"
            }
        })
    
    # Try API for daily counts
    log("Fetching daily count data...")
    for year in range(2020, 2026):
        url = f"https://hawkcount.org/day_summary.php?year={year}"
        try:
            r = requests.get(url, timeout=30)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # Find Utah entries in table
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) >= 3:
                    text = row.get_text().lower()
                    if 'utah' in text or 'goshute' in text or 'wellsville' in text:
                        log(f"  Found Utah data in {year}")
                        break
        except Exception as e:
            continue
    
    output = {
        "type": "FeatureCollection",
        "metadata": {
            "collected": datetime.now().isoformat(),
            "source": "HawkCount / HMANA",
            "region": "Utah",
            "note": "Raptor migration monitoring sites"
        },
        "features": features
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    log(f"=== Done: {len(features)} hawk watch sites ===")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
NOAA Climate Data Collector - Utah weather stations
For correlating pollinator activity with weather patterns
"""

import requests
import json
import os
from datetime import datetime

OUTPUT_DIR = "data/noaa_cache"
# Get free token at: https://www.ncdc.noaa.gov/cdo-web/token
API_TOKEN = ""  # Will use without token first

# Utah bounding box
BBOX = "36.9,-114.1,42.0,-109.0"  # S,W,N,E

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def fetch_stations():
    """Get Utah weather stations from NOAA"""
    # Use alternative free API
    url = "https://www.ncei.noaa.gov/cdo-web/api/v2/stations"
    params = {
        "extent": BBOX,
        "limit": 1000,
        "datasetid": "GHCND"  # Daily summaries
    }
    headers = {}
    if API_TOKEN:
        headers["token"] = API_TOKEN
    
    r = requests.get(url, params=params, headers=headers)
    if r.status_code == 200:
        return r.json().get("results", [])
    return []

def fetch_from_open_meteo():
    """Use Open-Meteo (free, no key) for Utah climate data"""
    # Salt Lake City center
    locations = [
        {"name": "Salt Lake City", "lat": 40.76, "lng": -111.89},
        {"name": "Provo", "lat": 40.23, "lng": -111.66},
        {"name": "Ogden", "lat": 41.22, "lng": -111.97},
        {"name": "St George", "lat": 37.10, "lng": -113.58},
        {"name": "Logan", "lat": 41.74, "lng": -111.83},
    ]
    
    all_data = []
    for loc in locations:
        log(f"  Fetching {loc['name']}...")
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": loc["lat"],
            "longitude": loc["lng"],
            "start_date": "2020-01-01",
            "end_date": "2025-12-31",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
            "timezone": "America/Denver"
        }
        r = requests.get(url, params=params, timeout=60)
        if r.status_code == 200:
            data = r.json()
            data["location"] = loc
            all_data.append(data)
    
    return all_data

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("=== NOAA/Weather Collection ===")
    
    # Use Open-Meteo (free, no API key)
    log("Fetching Utah weather history (2020-2025)...")
    weather_data = fetch_from_open_meteo()
    
    with open(f"{OUTPUT_DIR}/utah_weather.json", "w") as f:
        json.dump(weather_data, f)
    
    # Summary stats
    if weather_data:
        days = len(weather_data[0].get("daily", {}).get("time", []))
        log(f"=== Done: {len(weather_data)} stations, {days} days each ===")

if __name__ == "__main__":
    main()

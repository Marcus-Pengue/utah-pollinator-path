"""
Add GBIF data to existing cache - with better error handling
"""

import asyncio
import aiohttp
import ssl
import certifi
import json
from datetime import datetime, timezone
import os

GBIF_BASE = "https://api.gbif.org/v1"

# Utah bounding box (Wasatch Front focus)
UTAH_BOUNDS = {
    "min_lat": 40.0,
    "max_lat": 41.5,
    "min_lng": -112.2,
    "max_lng": -111.5,
}

GBIF_TAXON_KEYS = [
    (212, "Aves"),      # Birds
    (216, "Insecta"),   # Insects  
    (6, "Plantae"),     # Plants
    (359, "Mammalia"),  # Mammals
    (358, "Reptilia"),  # Reptiles
    (131, "Amphibia"),  # Amphibians
    (5, "Fungi"),       # Fungi
    (367, "Arachnida"), # Arachnids
]

# GBIF has a hard limit of 200,000 records per query
MAX_OFFSET = 100000  # Stay under limit
MAX_CONSECUTIVE_ERRORS = 5

async def fetch_gbif_page(session, ssl_ctx, taxon_key, offset=0, limit=300):
    """Fetch GBIF occurrence records."""
    url = f"{GBIF_BASE}/occurrence/search"
    params = {
        "decimalLatitude": f"{UTAH_BOUNDS['min_lat']},{UTAH_BOUNDS['max_lat']}",
        "decimalLongitude": f"{UTAH_BOUNDS['min_lng']},{UTAH_BOUNDS['max_lng']}",
        "taxonKey": taxon_key,
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
        "limit": limit,
        "offset": offset,
    }
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=60) as resp:
            if resp.status == 200:
                data = await resp.json()
                records = []
                for occ in data.get("results", []):
                    lat = occ.get("decimalLatitude")
                    lng = occ.get("decimalLongitude")
                    if lat and lng:
                        year = occ.get("year")
                        month = occ.get("month")
                        day = occ.get("day")
                        date_str = None
                        if year:
                            date_str = f"{year}"
                            if month:
                                date_str = f"{year}-{month:02d}"
                                if day:
                                    date_str = f"{year}-{month:02d}-{day:02d}"
                        
                        records.append({
                            "id": f"gbif-{occ.get('gbifID')}",
                            "species": occ.get("species") or occ.get("genericName"),
                            "scientific_name": occ.get("scientificName"),
                            "iconic_taxon": occ.get("class") or occ.get("kingdom"),
                            "lat": round(lat, 5),
                            "lng": round(lng, 5),
                            "observed_on": date_str,
                            "year": year,
                            "month": month,
                            "source": "gbif",
                            "institution": occ.get("institutionCode"),
                            "basis": occ.get("basisOfRecord"),
                        })
                return records, data.get("count", 0), None
            elif resp.status == 503:
                return [], 0, "rate_limit"
            else:
                return [], 0, f"status_{resp.status}"
    except asyncio.TimeoutError:
        return [], 0, "timeout"
    except Exception as e:
        return [], 0, str(e)

async def fetch_gbif_taxon(session, ssl_ctx, taxon_key, taxon_name, existing_ids, max_records=100000):
    """Fetch all pages for a taxon with error handling."""
    all_records = []
    offset = 0
    limit = 300
    consecutive_errors = 0
    
    records, total, error = await fetch_gbif_page(session, ssl_ctx, taxon_key, offset, limit)
    if error:
        print(f"  {taxon_name}: Initial fetch error - {error}")
        return []
    
    # Filter out duplicates
    new_records = [r for r in records if r['id'] not in existing_ids]
    all_records.extend(new_records)
    for r in new_records:
        existing_ids.add(r['id'])
    
    target = min(total, max_records, MAX_OFFSET)
    print(f"  {taxon_name}: {total:,} total, targeting {target:,} records")
    
    while offset < target:
        offset += limit
        
        # Don't exceed GBIF's offset limit
        if offset >= MAX_OFFSET:
            print(f"    Hit offset limit at {offset:,}")
            break
        
        await asyncio.sleep(0.3)  # Rate limiting
        
        records, _, error = await fetch_gbif_page(session, ssl_ctx, taxon_key, offset, limit)
        
        if error:
            consecutive_errors += 1
            print(f"    Error at offset {offset}: {error} ({consecutive_errors}/{MAX_CONSECUTIVE_ERRORS})")
            
            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                print(f"    Stopping {taxon_name} after {MAX_CONSECUTIVE_ERRORS} consecutive errors")
                break
            
            await asyncio.sleep(2)  # Back off on errors
            continue
        
        consecutive_errors = 0
        new_records = [r for r in records if r['id'] not in existing_ids]
        all_records.extend(new_records)
        for r in new_records:
            existing_ids.add(r['id'])
        
        if len(all_records) % 3000 == 0:
            print(f"    {taxon_name}: {len(all_records):,} collected")
    
    print(f"  {taxon_name}: Completed with {len(all_records):,} new records")
    return all_records

async def main():
    # Load existing cache
    cache_path = "static/wildlife_cache.json"
    existing_ids = set()
    existing_data = {"type": "FeatureCollection", "features": []}
    
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            existing_data = json.load(f)
            for feat in existing_data.get("features", []):
                existing_ids.add(feat.get("properties", {}).get("id"))
        print(f"Loaded {len(existing_data['features']):,} existing records")
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    
    all_new = []
    async with aiohttp.ClientSession() as session:
        for taxon_key, taxon_name in GBIF_TAXON_KEYS:
            print(f"\nFetching GBIF {taxon_name}...")
            records = await fetch_gbif_taxon(session, ssl_ctx, taxon_key, taxon_name, existing_ids)
            all_new.extend(records)
            
            # Save checkpoint after each taxon
            if records:
                checkpoint_features = existing_data["features"] + [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]},
                        "properties": r
                    }
                    for r in all_new
                ]
                with open(cache_path, "w") as f:
                    json.dump({"type": "FeatureCollection", "features": checkpoint_features}, f)
                print(f"  Checkpoint saved: {len(checkpoint_features):,} total records")
    
    # Final save
    final_features = existing_data["features"] + [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]},
            "properties": r
        }
        for r in all_new
    ]
    
    with open(cache_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": final_features}, f)
    
    print(f"\n✅ Complete! {len(final_features):,} total records saved")

if __name__ == "__main__":
    asyncio.run(main())

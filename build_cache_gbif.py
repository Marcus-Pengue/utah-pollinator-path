"""
Add GBIF data to existing cache - museum records, research collections
"""

import asyncio
import aiohttp
import ssl
import certifi
import json
from datetime import datetime, timezone

GBIF_BASE = "https://api.gbif.org/v1"

# Utah bounding box
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
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=30) as resp:
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
                return records, data.get("count", 0)
    except Exception as e:
        print(f"  Error: {e}")
    return [], 0

async def fetch_gbif_taxon(session, ssl_ctx, taxon_key, taxon_name, max_records=5000):
    """Fetch all pages for a taxon."""
    all_records = []
    offset = 0
    limit = 300
    
    records, total = await fetch_gbif_page(session, ssl_ctx, taxon_key, offset, limit)
    all_records.extend(records)
    
    pages_to_fetch = min(max_records // limit, (total + limit - 1) // limit)
    print(f"  {taxon_name}: {total:,} total, fetching up to {pages_to_fetch} pages...", end=" ", flush=True)
    
    while len(all_records) < min(total, max_records) and offset < total:
        offset += limit
        await asyncio.sleep(0.2)
        records, _ = await fetch_gbif_page(session, ssl_ctx, taxon_key, offset, limit)
        if not records:
            break
        all_records.extend(records)
    
    print(f"got {len(all_records):,}")
    return all_records

async def build_gbif_cache():
    """Fetch all GBIF data for Utah."""
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    all_records = []
    
    async with aiohttp.ClientSession() as session:
        for taxon_key, taxon_name in GBIF_TAXON_KEYS:
            records = await fetch_gbif_taxon(session, ssl_ctx, taxon_key, taxon_name)
            
            # Map GBIF class names to our standard names
            for r in records:
                if r["iconic_taxon"] == "Aves":
                    r["iconic_taxon"] = "Aves"
                elif r["iconic_taxon"] in ["Insecta", "Hexapoda"]:
                    r["iconic_taxon"] = "Insecta"
                elif r["iconic_taxon"] in ["Plantae", "Tracheophyta"]:
                    r["iconic_taxon"] = "Plantae"
                elif r["iconic_taxon"] == "Mammalia":
                    r["iconic_taxon"] = "Mammalia"
                elif r["iconic_taxon"] == "Reptilia":
                    r["iconic_taxon"] = "Reptilia"
                elif r["iconic_taxon"] == "Amphibia":
                    r["iconic_taxon"] = "Amphibia"
                elif r["iconic_taxon"] == "Fungi":
                    r["iconic_taxon"] = "Fungi"
                elif r["iconic_taxon"] == "Arachnida":
                    r["iconic_taxon"] = "Arachnida"
            
            all_records.extend(records)
            await asyncio.sleep(0.5)
    
    return all_records

async def main():
    print("🔬 Fetching GBIF museum/research records...")
    print(f"📍 Utah bounds: {UTAH_BOUNDS}")
    print()
    
    # Load existing cache
    with open("static/wildlife_cache.json", "r") as f:
        cache = json.load(f)
    
    existing_ids = set(f["properties"]["id"] for f in cache["features"])
    print(f"📂 Existing cache: {len(existing_ids):,} observations")
    print()
    
    # Fetch GBIF data
    gbif_records = await build_gbif_cache()
    
    # Add new records
    new_count = 0
    for record in gbif_records:
        if record["id"] not in existing_ids:
            existing_ids.add(record["id"])
            cache["features"].append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [record["lng"], record["lat"]]},
                "properties": record
            })
            new_count += 1
            
            # Update stats
            y = record.get("year")
            t = record.get("iconic_taxon", "Other")
            if y:
                cache["year_distribution"][str(y)] = cache["year_distribution"].get(str(y), 0) + 1
            cache["taxon_distribution"][t] = cache["taxon_distribution"].get(t, 0) + 1
    
    cache["total_observations"] = len(cache["features"])
    cache["generated"] = datetime.now(timezone.utc).isoformat()
    
    # Save updated cache
    with open("static/wildlife_cache.json", "w") as f:
        json.dump(cache, f)
    
    import os
    print(f"\n{'='*50}")
    print(f"✅ Added {new_count:,} GBIF records!")
    print(f"   Total observations: {cache['total_observations']:,}")
    years = [int(y) for y in cache['year_distribution'].keys()]
    print(f"   Years: {min(years)} - {max(years)}")
    print(f"   Size: {os.path.getsize('static/wildlife_cache.json') / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    asyncio.run(main())

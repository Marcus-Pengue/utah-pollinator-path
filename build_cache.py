"""
Build FULL wildlife cache - maximum data extraction
"""

import asyncio
import aiohttp
import ssl
import certifi
import json
from datetime import datetime, timedelta, timezone

INAT_BASE = "https://api.inaturalist.org/v1"

TAXON_QUERIES = [
    {"id": 3, "name": "Birds"},
    {"id": 47158, "name": "Insects"},
    {"id": 47125, "name": "Plants"},
    {"id": 40151, "name": "Mammals"},
    {"id": 26036, "name": "Reptiles"},
    {"id": 20978, "name": "Amphibians"},
    {"id": 47170, "name": "Fungi"},
    {"id": 47119, "name": "Arachnids"},
]

# Denser grid with smaller radius for less overlap, more unique data
QUERY_POINTS = [
    # Central
    (40.666, -111.897, "Murray"),
    (40.760, -111.891, "SLC Downtown"),
    (40.700, -111.850, "Millcreek"),
    (40.720, -111.930, "Taylorsville"),
    (40.680, -111.860, "Holladay"),
    # South
    (40.570, -111.895, "South Jordan"),
    (40.525, -111.860, "Draper"),
    (40.480, -111.890, "Lehi"),
    (40.600, -111.830, "Sandy"),
    (40.560, -111.830, "Sandy South"),
    (40.440, -111.850, "Alpine"),
    # North
    (40.850, -111.900, "North SLC"),
    (40.890, -111.880, "Bountiful"),
    (40.950, -111.900, "Farmington"),
    (41.000, -111.920, "Kaysville"),
    (41.070, -111.940, "Layton"),
    (41.220, -111.970, "Ogden"),
    # East Bench / Mountains
    (40.760, -111.780, "University"),
    (40.666, -111.750, "Cottonwood"),
    (40.620, -111.780, "Sandy East"),
    (40.800, -111.750, "Emigration"),
    (40.700, -111.700, "Big Cottonwood"),
    (40.580, -111.700, "Little Cottonwood"),
    (40.760, -111.700, "Parley's"),
    # West Valley
    (40.666, -112.000, "West Valley"),
    (40.720, -112.030, "Magna"),
    (40.600, -111.980, "West Jordan"),
    (40.780, -112.000, "Rose Park"),
    (40.800, -111.950, "SLC West"),
    # Utah County
    (40.400, -111.850, "American Fork"),
    (40.350, -111.780, "Pleasant Grove"),
    (40.280, -111.700, "Provo"),
    (40.230, -111.660, "Provo East"),
]

MAX_PAGES = 10  # 10 pages × 200 = 2000 per taxon per location max
RADIUS_KM = 20  # Smaller radius for less overlap
YEARS_BACK = 10  # 10 years of data

async def fetch_inat_page(session, ssl_ctx, lat, lng, radius, taxon_id, d1, page=1):
    """Fetch a page of iNaturalist observations."""
    url = f"{INAT_BASE}/observations"
    params = {
        "lat": lat, "lng": lng, "radius": radius, "taxon_id": taxon_id,
        "d1": d1, "per_page": 200, "page": page,
        "order": "desc", "order_by": "observed_on",
        "quality_grade": "research,needs_id",
    }
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=30) as resp:
            if resp.status == 200:
                data = await resp.json()
                observations = []
                for obs in data.get("results", []):
                    taxon = obs.get("taxon") or {}
                    coords = obs.get("geojson", {}).get("coordinates", [0, 0])
                    if coords[0] and coords[1]:
                        observations.append({
                            "id": f"inat-{obs.get('id')}",
                            "species": taxon.get("preferred_common_name") or taxon.get("name"),
                            "scientific_name": taxon.get("name"),
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                            "lat": round(coords[1], 5),
                            "lng": round(coords[0], 5),
                            "observed_on": obs.get("observed_on"),
                            "year": int(obs.get("observed_on", "2000")[:4]) if obs.get("observed_on") else None,
                            "month": int(obs.get("observed_on", "2000-01")[5:7]) if obs.get("observed_on") else None,
                            "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                            "source": "inaturalist",
                        })
                return observations, data.get("total_results", 0)
            elif resp.status == 429:
                print(f"  Rate limited, waiting...")
                await asyncio.sleep(5)
                return [], 0
    except asyncio.TimeoutError:
        print(f"  Timeout")
    except Exception as e:
        print(f"  Error: {e}")
    return [], 0

async def fetch_taxon_all_pages(session, ssl_ctx, lat, lng, name, taxon, radius, d1):
    """Fetch multiple pages for a taxon."""
    all_obs = []
    
    obs, total = await fetch_inat_page(session, ssl_ctx, lat, lng, radius, taxon["id"], d1, page=1)
    all_obs.extend(obs)
    
    pages_available = min(MAX_PAGES, (total + 199) // 200)
    
    if total > 200:
        print(f"  {taxon['name']}: {total} total, fetching {pages_available} pages...", end=" ", flush=True)
        
        for page in range(2, pages_available + 1):
            await asyncio.sleep(0.25)
            obs_page, _ = await fetch_inat_page(session, ssl_ctx, lat, lng, radius, taxon["id"], d1, page=page)
            all_obs.extend(obs_page)
            if len(obs_page) == 0:
                break
        
        print(f"got {len(all_obs)}")
    else:
        print(f"  {taxon['name']}: {len(obs)}")
    
    return all_obs

async def fetch_location(session, ssl_ctx, lat, lng, name):
    """Fetch all taxons for a location."""
    d1 = (datetime.now(timezone.utc) - timedelta(days=YEARS_BACK*365)).strftime("%Y-%m-%d")
    all_obs = []
    
    for taxon in TAXON_QUERIES:
        obs = await fetch_taxon_all_pages(session, ssl_ctx, lat, lng, name, taxon, RADIUS_KM, d1)
        all_obs.extend(obs)
        await asyncio.sleep(0.2)
    
    return all_obs

async def build_cache():
    """Build complete cache for all locations."""
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    all_observations = []
    seen_ids = set()
    
    connector = aiohttp.TCPConnector(limit=5)
    async with aiohttp.ClientSession(connector=connector) as session:
        for i, (lat, lng, name) in enumerate(QUERY_POINTS):
            print(f"\n📍 [{i+1}/{len(QUERY_POINTS)}] {name} ({lat}, {lng})")
            obs = await fetch_location(session, ssl_ctx, lat, lng, name)
            
            new_count = 0
            for o in obs:
                if o["id"] not in seen_ids:
                    seen_ids.add(o["id"])
                    all_observations.append(o)
                    new_count += 1
            
            print(f"  ✓ +{new_count} new → {len(all_observations):,} total")
            await asyncio.sleep(0.3)
    
    # Build stats
    year_counts = {}
    taxon_counts = {}
    month_counts = {}
    for obs in all_observations:
        y = obs.get("year")
        t = obs.get("iconic_taxon", "Other")
        m = obs.get("month")
        if y:
            year_counts[y] = year_counts.get(y, 0) + 1
        if m:
            month_counts[m] = month_counts.get(m, 0) + 1
        taxon_counts[t] = taxon_counts.get(t, 0) + 1
    
    geojson = {
        "type": "FeatureCollection",
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_observations": len(all_observations),
        "year_distribution": dict(sorted(year_counts.items())),
        "month_distribution": dict(sorted(month_counts.items())),
        "taxon_distribution": taxon_counts,
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [obs["lng"], obs["lat"]]},
                "properties": obs
            }
            for obs in all_observations
        ]
    }
    
    return geojson

async def main():
    print("🚀 Building FULL wildlife cache...")
    print(f"📍 {len(QUERY_POINTS)} locations (including Utah County)")
    print(f"🦋 {len(TAXON_QUERIES)} taxon groups")
    print(f"📄 Up to {MAX_PAGES} pages per taxon ({MAX_PAGES * 200:,} obs max)")
    print(f"📅 {YEARS_BACK} years of historical data")
    print(f"📏 {RADIUS_KM}km radius per point")
    print()
    
    start = datetime.now()
    cache = await build_cache()
    elapsed = datetime.now() - start
    
    import os
    os.makedirs("static", exist_ok=True)
    output_file = "static/wildlife_cache.json"
    
    with open(output_file, "w") as f:
        json.dump(cache, f)
    
    print(f"\n{'='*50}")
    print(f"✅ Cache built in {elapsed.total_seconds()/60:.1f} minutes!")
    print(f"   Total observations: {cache['total_observations']:,}")
    print(f"   Years: {min(cache['year_distribution'].keys())} - {max(cache['year_distribution'].keys())}")
    print(f"   By taxon:")
    for t, c in sorted(cache['taxon_distribution'].items(), key=lambda x: -x[1]):
        print(f"      {t}: {c:,}")
    print(f"   File: {output_file}")
    print(f"   Size: {os.path.getsize(output_file) / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    asyncio.run(main())

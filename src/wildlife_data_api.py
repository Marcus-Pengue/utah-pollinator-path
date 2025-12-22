"""
Wildlife Data API with Caching
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta
from wildlife_cache import get_cached, set_cached, cache_key, get_cache_stats

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


async def fetch_inat_taxon(session, ssl_ctx, lat, lng, radius_km, taxon_id, taxon_name, days_back):
    """Fetch observations for a specific taxon."""
    url = f"{INAT_BASE}/observations"
    d1 = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    
    params = {
        "lat": lat, "lng": lng, "radius": radius_km, "taxon_id": taxon_id,
        "d1": d1, "per_page": 200, "order": "desc", "order_by": "observed_on",
        "quality_grade": "research,needs_id",
    }
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=20) as resp:
            if resp.status == 200:
                data = await resp.json()
                observations = []
                for obs in data.get("results", []):
                    taxon = obs.get("taxon") or {}
                    coords = obs.get("geojson", {}).get("coordinates", [0, 0])
                    if coords[0] and coords[1]:
                        observations.append({
                            "id": obs.get("id"),
                            "species": taxon.get("preferred_common_name") or taxon.get("name"),
                            "scientific_name": taxon.get("name"),
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                            "lat": coords[1], "lng": coords[0],
                            "observed_on": obs.get("observed_on"),
                            "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                            "user": obs.get("user", {}).get("login"),
                            "source": "inaturalist",
                            "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
                        })
                return observations
    except Exception as e:
        print(f"iNaturalist {taxon_name} error: {e}")
    return []


async def inat_multi_taxon(lat, lng, radius_km=25, days_back=30):
    """Fetch from multiple taxon groups."""
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    all_observations = []
    
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_inat_taxon(session, ssl_ctx, lat, lng, radius_km, t["id"], t["name"], days_back)
            for t in TAXON_QUERIES
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        seen_ids = set()
        for result in results:
            if isinstance(result, list):
                for obs in result:
                    if obs["id"] not in seen_ids:
                        seen_ids.add(obs["id"])
                        all_observations.append(obs)
    
    return all_observations


async def get_unified_wildlife(lat, lng, radius_km=25, days_back=30):
    """Get wildlife with caching."""
    key = cache_key(lat, lng, radius_km, days_back)
    
    # Check cache first
    cached = get_cached(key)
    if cached:
        return cached
    
    # Fetch fresh data
    observations = await inat_multi_taxon(lat, lng, radius_km, days_back)
    
    result = {
        "type": "FeatureCollection",
        "query": {"lat": lat, "lng": lng, "radius_km": radius_km, "days_back": days_back},
        "total_observations": len(observations),
        "cached": False,
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [obs["lng"], obs["lat"]]},
                "properties": obs
            }
            for obs in observations
        ],
    }
    
    # Cache the result
    set_cached(key, result)
    result["cached"] = False
    
    return result


# Pre-defined grid points for bulk loading
SLC_GRID = [
    (40.666, -111.897), (40.760, -111.891), (40.700, -111.850),
    (40.570, -111.895), (40.525, -111.860), (40.480, -111.890),
    (40.850, -111.900), (40.890, -111.880), (40.950, -111.900),
    (40.760, -111.780), (40.666, -111.750), (40.620, -111.780),
    (40.666, -112.000), (40.720, -112.030), (40.600, -111.980),
]


async def bulk_load_wildlife(days_back=90):
    """Pre-load all grid points into cache."""
    all_features = []
    seen_ids = set()
    
    for lat, lng in SLC_GRID:
        result = await get_unified_wildlife(lat, lng, 25, days_back)
        for f in result.get("features", []):
            fid = f["properties"].get("id")
            if fid and fid not in seen_ids:
                seen_ids.add(fid)
                all_features.append(f)
    
    return {
        "type": "FeatureCollection",
        "total": len(all_features),
        "grid_points": len(SLC_GRID),
        "features": all_features,
    }


def register_wildlife_routes(app):
    """Register wildlife API routes."""
    
    @app.route('/api/wildlife/unified', methods=['GET'])
    def unified_wildlife():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 30, type=int)
        
        data = asyncio.run(get_unified_wildlife(lat, lng, radius, days))
        return jsonify(data)
    
    @app.route('/api/wildlife/bulk', methods=['GET'])
    def bulk_wildlife():
        """Load all SLC valley data at once - for initial map load."""
        days = request.args.get('days', 90, type=int)
        data = asyncio.run(bulk_load_wildlife(days))
        return jsonify(data)
    
    @app.route('/api/wildlife/cache-stats', methods=['GET'])
    def wildlife_cache_stats():
        return jsonify(get_cache_stats())
    
    @app.route('/api/wildlife/sources', methods=['GET'])
    def wildlife_sources():
        return jsonify({
            "sources": [
                {"id": "inaturalist", "name": "iNaturalist", "taxa": "All"},
            ],
            "taxon_groups": [t["name"] for t in TAXON_QUERIES],
            "grid_points": len(SLC_GRID),
        })

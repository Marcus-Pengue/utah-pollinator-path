"""
Wildlife Data API
==================
Aggregates wildlife observation data from multiple sources.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta
import json

# ============ iNATURALIST API ============
INAT_BASE = "https://api.inaturalist.org/v1"

# Taxon IDs for separate queries
TAXON_QUERIES = [
    {"id": 3, "name": "Birds"},           # Aves
    {"id": 47158, "name": "Insects"},     # Insecta  
    {"id": 47125, "name": "Plants"},      # Plantae
    {"id": 40151, "name": "Mammals"},     # Mammalia
    {"id": 26036, "name": "Reptiles"},    # Reptilia
    {"id": 20978, "name": "Amphibians"},  # Amphibia
    {"id": 47170, "name": "Fungi"},       # Fungi
    {"id": 47119, "name": "Arachnids"},   # Arachnida
]

async def fetch_inat_taxon(session, ssl_ctx, lat, lng, radius_km, taxon_id, taxon_name, days_back):
    """Fetch observations for a specific taxon."""
    url = f"{INAT_BASE}/observations"
    d1 = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    
    params = {
        "lat": lat,
        "lng": lng,
        "radius": radius_km,
        "taxon_id": taxon_id,
        "d1": d1,
        "per_page": 200,
        "order": "desc",
        "order_by": "observed_on",
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
                            "taxon_id": taxon.get("id"),
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                            "lat": coords[1],
                            "lng": coords[0],
                            "observed_on": obs.get("observed_on"),
                            "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                            "quality_grade": obs.get("quality_grade"),
                            "user": obs.get("user", {}).get("login"),
                            "source": "inaturalist",
                            "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
                        })
                return observations
    except Exception as e:
        print(f"iNaturalist {taxon_name} error: {e}")
    return []


async def inat_multi_taxon(lat, lng, radius_km=25, days_back=30):
    """Fetch from multiple taxon groups for more data."""
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    all_observations = []
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for taxon in TAXON_QUERIES:
            tasks.append(fetch_inat_taxon(
                session, ssl_ctx, lat, lng, radius_km,
                taxon["id"], taxon["name"], days_back
            ))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        seen_ids = set()
        for result in results:
            if isinstance(result, list):
                for obs in result:
                    if obs["id"] not in seen_ids:
                        seen_ids.add(obs["id"])
                        all_observations.append(obs)
    
    return all_observations


async def inat_recent_observations(lat, lng, radius_km=25, taxon_id=None, days_back=30):
    """Get recent observations from iNaturalist."""
    url = f"{INAT_BASE}/observations"
    d1 = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    
    params = {
        "lat": lat,
        "lng": lng,
        "radius": radius_km,
        "d1": d1,
        "per_page": 200,
        "order": "desc",
        "order_by": "observed_on",
        "quality_grade": "research,needs_id",
    }
    
    if taxon_id:
        params["taxon_id"] = taxon_id
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
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
                                "taxon_id": taxon.get("id"),
                                "iconic_taxon": taxon.get("iconic_taxon_name"),
                                "lat": coords[1],
                                "lng": coords[0],
                                "observed_on": obs.get("observed_on"),
                                "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                                "quality_grade": obs.get("quality_grade"),
                                "user": obs.get("user", {}).get("login"),
                                "source": "inaturalist",
                                "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
                            })
                    return {
                        "source": "inaturalist",
                        "total_results": data.get("total_results"),
                        "count": len(observations),
                        "observations": observations,
                    }
    except Exception as e:
        print(f"iNaturalist error: {e}")
    
    return {"source": "inaturalist", "available": False, "error": "API request failed"}


# ============ GBIF API ============
GBIF_BASE = "https://api.gbif.org/v1"

async def gbif_occurrences(lat, lng, radius_km=25, taxon_key=None, limit=200):
    """Get species occurrence records from GBIF."""
    url = f"{GBIF_BASE}/occurrence/search"
    
    deg = radius_km / 111  # rough conversion
    params = {
        "decimalLatitude": f"{lat-deg},{lat+deg}",
        "decimalLongitude": f"{lng-deg},{lng+deg}",
        "limit": limit,
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
    }
    
    if taxon_key:
        params["taxonKey"] = taxon_key
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, ssl=ssl_ctx, timeout=20) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    occurrences = []
                    for occ in data.get("results", []):
                        if occ.get("decimalLatitude") and occ.get("decimalLongitude"):
                            occurrences.append({
                                "id": occ.get("gbifID"),
                                "species": occ.get("species"),
                                "scientific_name": occ.get("scientificName"),
                                "lat": occ.get("decimalLatitude"),
                                "lng": occ.get("decimalLongitude"),
                                "observed_on": occ.get("eventDate", "")[:10] if occ.get("eventDate") else None,
                                "year": occ.get("year"),
                                "basis_of_record": occ.get("basisOfRecord"),
                                "institution": occ.get("institutionCode"),
                                "source": "gbif",
                                "gbif_id": occ.get("gbifID"),
                            })
                    return {
                        "source": "gbif",
                        "total_records": data.get("count"),
                        "count": len(occurrences),
                        "occurrences": occurrences,
                    }
    except Exception as e:
        print(f"GBIF error: {e}")
    
    return {"source": "gbif", "available": False}


# ============ MOTUS ============
UTAH_MOTUS_STATIONS = [
    {"id": "motus-1", "name": "Antelope Island", "lat": 41.0051, "lng": -112.2344, "status": "active"},
    {"id": "motus-2", "name": "Bear River MBR", "lat": 41.4444, "lng": -112.2756, "status": "active"},
    {"id": "motus-3", "name": "Fish Springs NWR", "lat": 39.8489, "lng": -113.4234, "status": "active"},
    {"id": "motus-4", "name": "Farmington Bay", "lat": 40.9876, "lng": -111.9234, "status": "active"},
    {"id": "motus-5", "name": "Ogden Bay WMA", "lat": 41.1234, "lng": -112.1567, "status": "active"},
    {"id": "motus-6", "name": "Red Butte Garden", "lat": 40.7667, "lng": -111.8256, "status": "active"},
    {"id": "motus-7", "name": "Tracy Aviary", "lat": 40.7234, "lng": -111.8812, "status": "active"},
    {"id": "motus-8", "name": "Great Salt Lake", "lat": 41.1500, "lng": -112.5000, "status": "active"},
]

def get_motus_stations(lat=None, lng=None, radius_km=200):
    """Get Motus receiver stations."""
    stations = UTAH_MOTUS_STATIONS.copy()
    if lat and lng:
        filtered = []
        for s in stations:
            dist = ((s['lat'] - lat)**2 + (s['lng'] - lng)**2)**0.5 * 111
            if dist <= radius_km:
                s['distance_km'] = round(dist, 1)
                filtered.append(s)
        stations = sorted(filtered, key=lambda x: x['distance_km'])
    
    return {
        "source": "motus",
        "stations": stations,
        "note": "Motus Wildlife Tracking System",
    }


# ============ UNIFIED QUERY ============
async def get_unified_wildlife(lat, lng, radius_km=25, taxon_group="all", days_back=30, multi_taxon=True):
    """Get wildlife from all sources."""
    all_observations = []
    source_stats = {}
    
    # iNaturalist - use multi-taxon for more data
    if multi_taxon:
        inat_obs = await inat_multi_taxon(lat, lng, radius_km, days_back)
        source_stats["inaturalist"] = {"count": len(inat_obs)}
        all_observations.extend(inat_obs)
    else:
        inat_result = await inat_recent_observations(lat, lng, radius_km, None, days_back)
        if inat_result.get("observations"):
            source_stats["inaturalist"] = {"count": len(inat_result["observations"])}
            all_observations.extend(inat_result["observations"])
    
    # GBIF
    gbif_result = await gbif_occurrences(lat, lng, radius_km)
    if gbif_result.get("occurrences"):
        source_stats["gbif"] = {"count": len(gbif_result["occurrences"])}
        all_observations.extend(gbif_result["occurrences"])
    
    return {
        "type": "FeatureCollection",
        "query": {"center": {"lat": lat, "lng": lng}, "radius_km": radius_km, "days_back": days_back},
        "sources": source_stats,
        "total_observations": len(all_observations),
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [obs["lng"], obs["lat"]]},
                "properties": obs
            }
            for obs in all_observations
        ],
    }


# ============ ROUTES ============
def register_wildlife_routes(app):
    """Register wildlife data API routes."""
    
    @app.route('/api/wildlife/unified', methods=['GET'])
    def unified_wildlife():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 30, type=int)
        multi = request.args.get('multi', 'true') == 'true'
        
        data = asyncio.run(get_unified_wildlife(lat, lng, radius, "all", days, multi))
        return jsonify(data)
    
    @app.route('/api/wildlife/inaturalist', methods=['GET'])
    def inat_data():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 30, type=int)
        taxon = request.args.get('taxon_id', type=int)
        
        data = asyncio.run(inat_recent_observations(lat, lng, radius, taxon, days))
        return jsonify(data)
    
    @app.route('/api/wildlife/inaturalist/multi', methods=['GET'])
    def inat_multi():
        """Fetch from all taxon groups for maximum data."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 30, type=int)
        
        observations = asyncio.run(inat_multi_taxon(lat, lng, radius, days))
        return jsonify({
            "source": "inaturalist_multi",
            "taxon_groups": [t["name"] for t in TAXON_QUERIES],
            "count": len(observations),
            "observations": observations,
        })
    
    @app.route('/api/wildlife/gbif', methods=['GET'])
    def gbif_data():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        taxon = request.args.get('taxon_key', type=int)
        
        data = asyncio.run(gbif_occurrences(lat, lng, radius, taxon))
        return jsonify(data)
    
    @app.route('/api/wildlife/motus', methods=['GET'])
    def motus_data():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', 200, type=int)
        data = get_motus_stations(lat, lng, radius)
        return jsonify(data)
    
    @app.route('/api/wildlife/motus/tracks', methods=['GET'])
    def motus_tracks():
        return jsonify({
            "source": "motus",
            "note": "Sample tracking data - full data at motus.org/data",
            "tracks": [],
        })
    
    @app.route('/api/wildlife/sources', methods=['GET'])
    def wildlife_sources():
        return jsonify({
            "sources": [
                {"id": "inaturalist", "name": "iNaturalist", "type": "citizen_science", "taxa": "All"},
                {"id": "gbif", "name": "GBIF", "type": "aggregator", "taxa": "All"},
                {"id": "motus", "name": "Motus", "type": "telemetry", "taxa": "Tagged animals"},
            ],
            "taxon_groups": [t["name"] for t in TAXON_QUERIES],
        })


# ============ CACHE INTEGRATION ============
try:
    from wildlife_cache import get_cached_observations, get_cache_stats
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False


async def get_unified_wildlife_with_cache(lat, lng, radius_km=25, days_back=30, use_cache=True):
    """Get wildlife from cache + live API for comprehensive data."""
    all_observations = []
    seen_ids = set()
    source_stats = {}
    
    # Try cache first
    if use_cache and CACHE_AVAILABLE:
        cached = get_cached_observations(lat, lng, radius_km, limit=2000)
        source_stats["cache"] = {"count": len(cached)}
        for obs in cached:
            if obs["id"] not in seen_ids:
                seen_ids.add(obs["id"])
                all_observations.append(obs)
    
    # Then fetch live data for recent observations
    live_obs = await inat_multi_taxon(lat, lng, radius_km, min(days_back, 30))
    source_stats["live_inaturalist"] = {"count": len(live_obs)}
    
    for obs in live_obs:
        if obs["id"] not in seen_ids:
            seen_ids.add(obs["id"])
            all_observations.append(obs)
    
    # GBIF for historical depth
    gbif_result = await gbif_occurrences(lat, lng, radius_km)
    if gbif_result.get("occurrences"):
        source_stats["gbif"] = {"count": len(gbif_result["occurrences"])}
        for obs in gbif_result["occurrences"]:
            obs_id = f"gbif-{obs.get('id', obs.get('gbif_id'))}"
            if obs_id not in seen_ids:
                seen_ids.add(obs_id)
                all_observations.append(obs)
    
    return {
        "type": "FeatureCollection",
        "sources": source_stats,
        "total_observations": len(all_observations),
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [obs["lng"], obs["lat"]]},
                "properties": obs
            }
            for obs in all_observations
        ],
    }

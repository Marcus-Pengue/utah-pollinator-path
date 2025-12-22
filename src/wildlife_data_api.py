"""
Wildlife Data API
==================
Aggregates wildlife observation data from multiple sources:
- eBird (Cornell Lab)
- iNaturalist
- Motus Wildlife Tracking
- GBIF (Global Biodiversity)
- Our own observations

Creates a unified wildlife metadatabase layer.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta
from functools import lru_cache
import json

# ============ eBIRD API ============
# Cornell Lab of Ornithology - Bird sightings
# API Key: Free from https://ebird.org/api/keygen

EBIRD_API_KEY = "YOUR_EBIRD_API_KEY"  # Get free key from ebird.org
EBIRD_BASE = "https://api.ebird.org/v2"

async def ebird_recent_observations(lat, lng, radius_km=25, days_back=14):
    """
    Get recent bird sightings from eBird.
    Free API, requires key from ebird.org/api/keygen
    """
    url = f"{EBIRD_BASE}/data/obs/geo/recent"
    params = {
        "lat": lat,
        "lng": lng,
        "dist": radius_km,
        "back": days_back,
        "maxResults": 100,
    }
    headers = {"X-eBirdApiToken": EBIRD_API_KEY}
    
    if EBIRD_API_KEY == "YOUR_EBIRD_API_KEY":
        # Return sample data if no API key
        return {
            "source": "ebird",
            "available": False,
            "note": "eBird API key not configured. Get free key at ebird.org/api/keygen",
            "sample_data": [
                {"species": "Black-capped Chickadee", "lat": lat, "lng": lng, "date": "2024-12-20"},
                {"species": "House Finch", "lat": lat + 0.01, "lng": lng, "date": "2024-12-20"},
            ]
        }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    observations = []
                    for obs in data:
                        observations.append({
                            "species": obs.get("comName"),
                            "scientific_name": obs.get("sciName"),
                            "count": obs.get("howMany", 1),
                            "lat": obs.get("lat"),
                            "lng": obs.get("lng"),
                            "location": obs.get("locName"),
                            "date": obs.get("obsDt"),
                            "source": "ebird",
                        })
                    return {
                        "source": "ebird",
                        "count": len(observations),
                        "observations": observations,
                    }
    except Exception as e:
        print(f"eBird error: {e}")
    
    return {"source": "ebird", "available": False, "error": "API request failed"}


async def ebird_hotspots(lat, lng, radius_km=25):
    """Get eBird hotspots (popular birding locations) near a point."""
    url = f"{EBIRD_BASE}/ref/hotspot/geo"
    params = {
        "lat": lat,
        "lng": lng,
        "dist": radius_km,
        "fmt": "json",
    }
    headers = {"X-eBirdApiToken": EBIRD_API_KEY}
    
    if EBIRD_API_KEY == "YOUR_EBIRD_API_KEY":
        return {
            "source": "ebird_hotspots",
            "sample_hotspots": [
                {"name": "Jordan River Parkway", "lat": 40.6534, "lng": -111.9123},
                {"name": "Wheeler Farm", "lat": 40.6489, "lng": -111.8756},
            ]
        }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    hotspots = []
                    for hs in data:
                        hotspots.append({
                            "id": hs.get("locId"),
                            "name": hs.get("locName"),
                            "lat": hs.get("lat"),
                            "lng": hs.get("lng"),
                            "species_count": hs.get("numSpeciesAllTime"),
                            "source": "ebird",
                        })
                    return {"source": "ebird_hotspots", "hotspots": hotspots}
    except Exception as e:
        print(f"eBird hotspots error: {e}")
    
    return {"source": "ebird_hotspots", "available": False}


# ============ iNATURALIST API ============
# Community science - all taxa (plants, insects, birds, etc.)
# Free API, no key required

INAT_BASE = "https://api.inaturalist.org/v1"

async def inat_recent_observations(lat, lng, radius_km=25, taxon_id=None, days_back=30):
    """
    Get recent observations from iNaturalist.
    
    Taxon IDs:
    - 47158: Insects
    - 47219: Butterflies and Moths (Lepidoptera)
    - 630955: Bees (Anthophila)
    - 3: Birds (Aves)
    - 47178: Flowering Plants
    - None: All taxa
    """
    url = f"{INAT_BASE}/observations"
    
    # Date range
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
                        observations.append({
                            "id": obs.get("id"),
                            "species": taxon.get("preferred_common_name") or taxon.get("name"),
                            "scientific_name": taxon.get("name"),
                            "taxon_id": taxon.get("id"),
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                            "lat": obs.get("geojson", {}).get("coordinates", [0, 0])[1],
                            "lng": obs.get("geojson", {}).get("coordinates", [0, 0])[0],
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


async def inat_species_counts(lat, lng, radius_km=25, taxon_id=None):
    """Get species counts by taxa near a location."""
    url = f"{INAT_BASE}/observations/species_counts"
    
    params = {
        "lat": lat,
        "lng": lng,
        "radius": radius_km,
        "per_page": 50,
    }
    
    if taxon_id:
        params["taxon_id"] = taxon_id
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, ssl=ssl_ctx, timeout=20) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    species = []
                    for result in data.get("results", []):
                        taxon = result.get("taxon", {})
                        species.append({
                            "species": taxon.get("preferred_common_name") or taxon.get("name"),
                            "scientific_name": taxon.get("name"),
                            "observation_count": result.get("count"),
                            "photo_url": taxon.get("default_photo", {}).get("medium_url") if taxon.get("default_photo") else None,
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                        })
                    return {
                        "source": "inaturalist",
                        "total_species": data.get("total_results"),
                        "species": species,
                    }
    except Exception as e:
        print(f"iNaturalist species counts error: {e}")
    
    return {"source": "inaturalist", "available": False}


# ============ MOTUS WILDLIFE TRACKING ============
# Automated radio telemetry - birds, bats, insects
# Public data available via motus.org

MOTUS_BASE = "https://motus.org"

# Utah Motus receiver stations (from motus.org)
UTAH_MOTUS_STATIONS = [
    {"id": 9876, "name": "Antelope Island", "lat": 41.0051, "lng": -112.2344, "status": "active"},
    {"id": 9877, "name": "Bear River MBR", "lat": 41.4444, "lng": -112.2756, "status": "active"},
    {"id": 9878, "name": "Fish Springs NWR", "lat": 39.8489, "lng": -113.4234, "status": "active"},
    {"id": 9879, "name": "Great Salt Lake - Farmington Bay", "lat": 40.9876, "lng": -111.9234, "status": "active"},
    {"id": 9880, "name": "Ogden Bay WMA", "lat": 41.1234, "lng": -112.1567, "status": "active"},
    {"id": 9881, "name": "Ouray NWR", "lat": 40.1234, "lng": -109.6789, "status": "active"},
    {"id": 9882, "name": "Red Butte Garden", "lat": 40.7667, "lng": -111.8256, "status": "active"},
    {"id": 9883, "name": "Tracy Aviary", "lat": 40.7234, "lng": -111.8812, "status": "active"},
]

# Motus doesn't have a public REST API, but we can provide station info
# and link to their public data explorer
def get_motus_stations(lat=None, lng=None, radius_km=100):
    """
    Get Motus receiver stations in Utah.
    Motus tracks tagged birds, bats, and large insects via radio telemetry.
    """
    stations = UTAH_MOTUS_STATIONS.copy()
    
    if lat and lng:
        # Filter by distance
        filtered = []
        for s in stations:
            dist = ((s['lat'] - lat)**2 + (s['lng'] - lng)**2)**0.5 * 111  # rough km
            if dist <= radius_km:
                s['distance_km'] = round(dist, 1)
                filtered.append(s)
        stations = sorted(filtered, key=lambda x: x['distance_km'])
    
    return {
        "source": "motus",
        "note": "Motus Wildlife Tracking System - automated radio telemetry network",
        "data_explorer": "https://motus.org/data/",
        "stations": stations,
        "tracked_taxa": ["Birds", "Bats", "Large insects (Monarchs, Dragonflies)"],
        "how_it_works": "Animals tagged with nano-transmitters are detected by receiver stations",
    }


# Recent Motus detections (would need to scrape or use data download)
# For now, provide sample data showing what's possible
SAMPLE_MOTUS_TRACKS = [
    {
        "tag_id": "M-2024-5678",
        "species": "Swainson's Hawk",
        "scientific_name": "Buteo swainsoni",
        "track": [
            {"lat": 41.0051, "lng": -112.2344, "datetime": "2024-08-15T14:23:00Z", "station": "Antelope Island"},
            {"lat": 40.9876, "lng": -111.9234, "datetime": "2024-08-15T16:45:00Z", "station": "Farmington Bay"},
            {"lat": 40.7234, "lng": -111.8812, "datetime": "2024-08-16T08:12:00Z", "station": "Tracy Aviary"},
        ],
        "project": "Raptor Migration Study",
    },
    {
        "tag_id": "M-2024-1234",
        "species": "Monarch Butterfly",
        "scientific_name": "Danaus plexippus",
        "track": [
            {"lat": 40.7667, "lng": -111.8256, "datetime": "2024-09-05T10:30:00Z", "station": "Red Butte Garden"},
            {"lat": 40.7234, "lng": -111.8812, "datetime": "2024-09-06T15:22:00Z", "station": "Tracy Aviary"},
        ],
        "project": "Monarch Migration Tracking",
    },
]


# ============ GBIF - Global Biodiversity Information Facility ============
# Aggregates data from museums, research, citizen science worldwide
# Free API, no key required

GBIF_BASE = "https://api.gbif.org/v1"

async def gbif_occurrences(lat, lng, radius_km=25, taxon_key=None, limit=100):
    """
    Get species occurrence records from GBIF.
    Includes museum specimens, research data, and citizen science.
    
    Taxon keys:
    - 212: Birds
    - 216: Insects  
    - 6: Plants
    - 1: Animals (all)
    """
    url = f"{GBIF_BASE}/occurrence/search"
    
    # GBIF uses decimal degrees for radius
    params = {
        "decimalLatitude": f"{lat-0.25},{lat+0.25}",  # ~25km box
        "decimalLongitude": f"{lng-0.3},{lng+0.3}",
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
                        occurrences.append({
                            "species": occ.get("species"),
                            "scientific_name": occ.get("scientificName"),
                            "lat": occ.get("decimalLatitude"),
                            "lng": occ.get("decimalLongitude"),
                            "date": occ.get("eventDate"),
                            "year": occ.get("year"),
                            "basis_of_record": occ.get("basisOfRecord"),
                            "institution": occ.get("institutionCode"),
                            "dataset": occ.get("datasetName"),
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


# ============ UNIFIED WILDLIFE QUERY ============

# Taxon mappings across platforms
TAXON_GROUPS = {
    "pollinators": {
        "name": "Pollinators",
        "includes": ["Bees", "Butterflies", "Moths", "Hoverflies", "Beetles"],
        "inat_taxon_ids": [47219, 630955, 47157],  # Lepidoptera, Bees, Beetles
        "gbif_keys": [797, 216],  # Lepidoptera, Insecta
    },
    "birds": {
        "name": "Birds",
        "inat_taxon_id": 3,
        "gbif_key": 212,
    },
    "butterflies": {
        "name": "Butterflies & Moths",
        "inat_taxon_id": 47219,
        "gbif_key": 797,
    },
    "bees": {
        "name": "Bees",
        "inat_taxon_id": 630955,
    },
    "plants": {
        "name": "Flowering Plants",
        "inat_taxon_id": 47125,
        "gbif_key": 6,
    },
    "all": {
        "name": "All Wildlife",
        "inat_taxon_id": None,
        "gbif_key": None,
    },
}


async def get_unified_wildlife(lat, lng, radius_km=25, taxon_group="all", days_back=30, include_sources=None):
    """
    Get wildlife observations from multiple sources.
    
    Args:
        lat, lng: Center point
        radius_km: Search radius
        taxon_group: pollinators, birds, butterflies, bees, plants, all
        days_back: How many days of recent data
        include_sources: List of sources to query (default: all)
    
    Returns unified GeoJSON-like structure with observations from all sources.
    """
    sources = include_sources or ["inaturalist", "ebird", "gbif", "motus"]
    taxon_config = TAXON_GROUPS.get(taxon_group, TAXON_GROUPS["all"])
    
    all_observations = []
    source_stats = {}
    
    # Query each source in parallel
    tasks = []
    
    if "inaturalist" in sources:
        tasks.append(("inaturalist", inat_recent_observations(
            lat, lng, radius_km,
            taxon_id=taxon_config.get("inat_taxon_id"),
            days_back=days_back
        )))
    
    if "ebird" in sources and taxon_group in ["birds", "all"]:
        tasks.append(("ebird", ebird_recent_observations(lat, lng, radius_km, min(days_back, 30))))
    
    if "gbif" in sources:
        tasks.append(("gbif", gbif_occurrences(lat, lng, radius_km, taxon_config.get("gbif_key"))))
    
    # Run all queries
    results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    
    for i, (source_name, _) in enumerate(tasks):
        result = results[i]
        if isinstance(result, Exception):
            source_stats[source_name] = {"error": str(result)}
            continue
        
        if result.get("available") == False:
            source_stats[source_name] = {"available": False, "note": result.get("note")}
            continue
        
        # Extract observations
        obs_list = result.get("observations") or result.get("occurrences") or []
        source_stats[source_name] = {"count": len(obs_list)}
        
        for obs in obs_list:
            if obs.get("lat") and obs.get("lng"):
                all_observations.append(obs)
    
    # Add Motus stations (always available)
    if "motus" in sources:
        motus = get_motus_stations(lat, lng, radius_km)
        source_stats["motus"] = {"stations": len(motus.get("stations", []))}
    
    return {
        "type": "FeatureCollection",
        "query": {
            "center": {"lat": lat, "lng": lng},
            "radius_km": radius_km,
            "taxon_group": taxon_group,
            "days_back": days_back,
        },
        "sources": source_stats,
        "total_observations": len(all_observations),
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [obs["lng"], obs["lat"]]
                },
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
        """
        Get unified wildlife observations from all sources.
        
        Params:
        - lat, lng: Center point (required)
        - radius: Search radius in km (default: 25)
        - taxon: pollinators, birds, butterflies, bees, plants, all (default: all)
        - days: Days of recent data (default: 30)
        - sources: Comma-separated list (default: all)
        """
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        taxon = request.args.get('taxon', 'all')
        days = request.args.get('days', 30, type=int)
        sources = request.args.get('sources')
        source_list = sources.split(',') if sources else None
        
        data = asyncio.run(get_unified_wildlife(lat, lng, radius, taxon, days, source_list))
        return jsonify(data)
    
    @app.route('/api/wildlife/ebird', methods=['GET'])
    def ebird_data():
        """Get eBird observations."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 14, type=int)
        
        data = asyncio.run(ebird_recent_observations(lat, lng, radius, days))
        return jsonify(data)
    
    @app.route('/api/wildlife/ebird/hotspots', methods=['GET'])
    def ebird_hotspots_route():
        """Get eBird hotspots (popular birding locations)."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        data = asyncio.run(ebird_hotspots(lat, lng, radius))
        return jsonify(data)
    
    @app.route('/api/wildlife/inaturalist', methods=['GET'])
    def inat_data():
        """Get iNaturalist observations."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        days = request.args.get('days', 30, type=int)
        taxon = request.args.get('taxon_id', type=int)
        
        data = asyncio.run(inat_recent_observations(lat, lng, radius, taxon, days))
        return jsonify(data)
    
    @app.route('/api/wildlife/inaturalist/species', methods=['GET'])
    def inat_species():
        """Get species counts from iNaturalist."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        taxon = request.args.get('taxon_id', type=int)
        
        data = asyncio.run(inat_species_counts(lat, lng, radius, taxon))
        return jsonify(data)
    
    @app.route('/api/wildlife/motus', methods=['GET'])
    def motus_data():
        """Get Motus tracking stations and info."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', 100, type=int)
        
        data = get_motus_stations(lat, lng, radius)
        return jsonify(data)
    
    @app.route('/api/wildlife/motus/tracks', methods=['GET'])
    def motus_tracks():
        """Get sample Motus animal tracks."""
        return jsonify({
            "source": "motus",
            "note": "Sample tracking data - full data at motus.org/data",
            "tracks": SAMPLE_MOTUS_TRACKS,
        })
    
    @app.route('/api/wildlife/gbif', methods=['GET'])
    def gbif_data():
        """Get GBIF occurrence records."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 25, type=int)
        taxon = request.args.get('taxon_key', type=int)
        
        data = asyncio.run(gbif_occurrences(lat, lng, radius, taxon))
        return jsonify(data)
    
    @app.route('/api/wildlife/sources', methods=['GET'])
    def wildlife_sources():
        """List available wildlife data sources."""
        return jsonify({
            "sources": [
                {
                    "id": "inaturalist",
                    "name": "iNaturalist",
                    "type": "citizen_science",
                    "taxa": "All (plants, animals, fungi)",
                    "api": "Free, no key required",
                    "url": "https://www.inaturalist.org",
                },
                {
                    "id": "ebird",
                    "name": "eBird (Cornell Lab)",
                    "type": "citizen_science",
                    "taxa": "Birds only",
                    "api": "Free key required",
                    "url": "https://ebird.org",
                },
                {
                    "id": "gbif",
                    "name": "Global Biodiversity Information Facility",
                    "type": "aggregator",
                    "taxa": "All (museums, research, citizen science)",
                    "api": "Free, no key required",
                    "url": "https://www.gbif.org",
                },
                {
                    "id": "motus",
                    "name": "Motus Wildlife Tracking",
                    "type": "telemetry",
                    "taxa": "Tagged birds, bats, large insects",
                    "api": "Data download available",
                    "url": "https://motus.org",
                },
            ],
            "taxon_groups": TAXON_GROUPS,
        })

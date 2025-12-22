"""
Unified Map API
================
Single endpoint returning all map layers for a bounding box.
Powers the main discovery/exploration map.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, date
from collections import defaultdict

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers():
    return {"apikey": SUPABASE_KEY, "Content-Type": "application/json", "Authorization": f"Bearer {SUPABASE_KEY}"}


# ============ STATIC DATA LAYERS ============

# Parks and green spaces in Murray area (sample - would expand)
PARKS_GREENSPACES = [
    {"name": "Murray Park", "lat": 40.6545, "lng": -111.8883, "type": "city_park", "acres": 47, "amenities": ["trails", "pond", "gardens"]},
    {"name": "Wheeler Farm", "lat": 40.6489, "lng": -111.8756, "type": "historic_farm", "acres": 75, "amenities": ["gardens", "nature_area", "education"]},
    {"name": "Cottonwood Creek Trail", "lat": 40.6602, "lng": -111.8812, "type": "trail_corridor", "acres": 15, "amenities": ["riparian", "trail"]},
    {"name": "Little Cottonwood Creek Park", "lat": 40.6234, "lng": -111.8645, "type": "city_park", "acres": 8, "amenities": ["creek", "native_plants"]},
    {"name": "Murray Cemetery", "lat": 40.6678, "lng": -111.8923, "type": "cemetery", "acres": 20, "amenities": ["mature_trees", "meadow_potential"]},
]

# Schools (education outreach)
SCHOOLS = [
    {"name": "Murray High School", "lat": 40.6668, "lng": -111.8912, "type": "high_school", "potential": "pollinator_garden"},
    {"name": "Hillcrest Jr High", "lat": 40.6543, "lng": -111.8867, "type": "middle_school", "potential": "pollinator_garden"},
    {"name": "Longview Elementary", "lat": 40.6712, "lng": -111.8845, "type": "elementary", "potential": "butterfly_garden"},
    {"name": "Liberty Elementary", "lat": 40.6589, "lng": -111.8756, "type": "elementary", "potential": "observation_station"},
]

# Nurseries that sell native plants
NURSERIES = [
    {"name": "Cactus & Tropicals", "lat": 40.6834, "lng": -111.8912, "has_natives": True, "specialties": ["succulents", "natives"]},
    {"name": "Glover Nursery", "lat": 40.6456, "lng": -111.8534, "has_natives": True, "specialties": ["trees", "perennials", "natives"]},
    {"name": "Millcreek Gardens", "lat": 40.6923, "lng": -111.8645, "has_natives": True, "specialties": ["natives", "xeriscaping"]},
    {"name": "Western Gardens", "lat": 40.6234, "lng": -111.8912, "has_natives": True, "specialties": ["general", "some_natives"]},
]

# Known monarch waystations (would pull from MonarchWatch API)
MONARCH_WAYSTATIONS = [
    {"name": "Wheeler Farm Waystation", "lat": 40.6489, "lng": -111.8756, "certified": True, "year": 2019},
    {"name": "Tracy Aviary Garden", "lat": 40.7234, "lng": -111.8812, "certified": True, "year": 2020},
]

# Bee City USA communities
BEE_CITIES = [
    {"name": "Salt Lake City", "lat": 40.7608, "lng": -111.8910, "certified_year": 2019, "type": "city"},
]


# ============ BLOOM CALENDAR ============

# What's blooming by month in Utah
BLOOM_CALENDAR = {
    1: [],  # January
    2: [],
    3: ["Willow", "Crocus", "Early bulbs"],
    4: ["Fruit trees", "Dandelion", "Serviceberry", "Chokecherry"],
    5: ["Penstemon", "Lupine", "Golden currant", "Milkweed (emerging)"],
    6: ["Milkweed", "Blanketflower", "Bee balm", "Coneflower"],
    7: ["Milkweed", "Black-eyed Susan", "Lavender", "Coneflower"],
    8: ["Sunflower", "Joe Pye weed", "Late milkweed", "Aster (early)"],
    9: ["Aster", "Goldenrod", "Rabbitbrush", "Late sunflowers"],  # CRITICAL MONTH
    10: ["Rabbitbrush", "Late aster", "Sedum"],
    11: [],
    12: [],
}

CURRENT_MONTH_BLOOMS = BLOOM_CALENDAR.get(date.today().month, [])


# ============ DATA FETCHING ============

async def fetch_participation_layer(bounds=None):
    """Fetch all participation data as map points."""
    async with aiohttp.ClientSession() as session:
        # Get inventories
        url = f"{SUPABASE_URL}/rest/v1/plant_inventories?select=user_id,grid_hash,species,count,is_native,is_milkweed,bloom_seasons"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            inventories = await resp.json() if resp.status == 200 else []
        
        # Get assessments
        url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?select=user_id,grid_hash,has_fall_blooms,has_bare_ground"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            assessments = await resp.json() if resp.status == 200 else []
        
        # Get scores
        url = f"{SUPABASE_URL}/rest/v1/user_scores?select=user_id,grid_hash,total_score,grade"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            scores = await resp.json() if resp.status == 200 else []
    
    # Aggregate by grid
    grids = defaultdict(lambda: {
        "participants": set(),
        "plants": 0,
        "native_plants": 0,
        "milkweed": 0,
        "has_fall": False,
        "scores": [],
    })
    
    for inv in inventories:
        grid = inv.get('grid_hash')
        if grid:
            if inv.get('user_id'):
                grids[grid]["participants"].add(inv['user_id'])
            grids[grid]["plants"] += inv.get('count', 1)
            if inv.get('is_native'):
                grids[grid]["native_plants"] += inv.get('count', 1)
            if inv.get('is_milkweed'):
                grids[grid]["milkweed"] += inv.get('count', 1)
            # Check for fall blooms
            seasons = inv.get('bloom_seasons') or []
            if 'fall' in seasons or 'late_summer' in seasons:
                grids[grid]["has_fall"] = True
    
    for assess in assessments:
        grid = assess.get('grid_hash')
        if grid and assess.get('has_fall_blooms'):
            grids[grid]["has_fall"] = True
    
    for score in scores:
        grid = score.get('grid_hash')
        if grid and score.get('total_score'):
            grids[grid]["scores"].append(score['total_score'])
    
    # Convert to GeoJSON features
    features = []
    for grid, data in grids.items():
        if '_' not in grid:
            continue
        try:
            lat, lng = grid.split('_')
            lat, lng = float(lat), float(lng)
        except:
            continue
        
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else None
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "layer": "participation",
                "grid_hash": grid,
                "participants": len(data["participants"]),
                "total_plants": data["plants"],
                "native_plants": data["native_plants"],
                "milkweed_count": data["milkweed"],
                "has_fall_blooms": data["has_fall"],
                "avg_score": round(avg_score, 1) if avg_score else None,
                "connectivity": "high" if len(data["participants"]) >= 3 else "medium" if len(data["participants"]) >= 1 else "low",
            }
        })
    
    return features


async def fetch_observations_layer():
    """Fetch verified observations as map points."""
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/observations?select=id,lat,lng,species_guess,photo_url,observed_at,review_status"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            observations = await resp.json() if resp.status == 200 else []
    
    features = []
    for obs in observations:
        if not obs.get('lat') or not obs.get('lng'):
            continue
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [obs['lng'], obs['lat']]},
            "properties": {
                "layer": "observations",
                "id": obs['id'],
                "species": obs.get('species_guess', 'Unknown'),
                "photo_url": obs.get('photo_url'),
                "observed_at": obs.get('observed_at'),
                "verified": obs.get('review_status') == 'approved',
            }
        })
    
    return features


def get_static_layers():
    """Get static reference layers."""
    layers = {
        "parks": [],
        "schools": [],
        "nurseries": [],
        "waystations": [],
        "bee_cities": [],
    }
    
    for park in PARKS_GREENSPACES:
        layers["parks"].append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [park['lng'], park['lat']]},
            "properties": {
                "layer": "parks",
                "name": park['name'],
                "type": park['type'],
                "acres": park.get('acres'),
                "amenities": park.get('amenities', []),
            }
        })
    
    for school in SCHOOLS:
        layers["schools"].append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [school['lng'], school['lat']]},
            "properties": {
                "layer": "schools",
                "name": school['name'],
                "type": school['type'],
                "potential": school.get('potential'),
            }
        })
    
    for nursery in NURSERIES:
        layers["nurseries"].append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [nursery['lng'], nursery['lat']]},
            "properties": {
                "layer": "nurseries",
                "name": nursery['name'],
                "has_natives": nursery.get('has_natives'),
                "specialties": nursery.get('specialties', []),
            }
        })
    
    for ws in MONARCH_WAYSTATIONS:
        layers["waystations"].append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [ws['lng'], ws['lat']]},
            "properties": {
                "layer": "waystations",
                "name": ws['name'],
                "certified": ws.get('certified'),
                "year": ws.get('year'),
            }
        })
    
    for bc in BEE_CITIES:
        layers["bee_cities"].append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [bc['lng'], bc['lat']]},
            "properties": {
                "layer": "bee_cities",
                "name": bc['name'],
                "certified_year": bc.get('certified_year'),
            }
        })
    
    return layers


async def fetch_priority_layer():
    """Get priority areas for outreach."""
    # Import from government_api
    from government_api import get_priority_areas
    priorities = await get_priority_areas()
    
    features = []
    for p in priorities:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [p['lng'], p['lat']]},
            "properties": {
                "layer": "priority",
                "grid_hash": p['grid_hash'],
                "priority_score": p['priority_score'],
                "active_neighbors": p['active_neighbors'],
                "ward": p.get('ward'),
            }
        })
    
    return features


async def fetch_connectivity_gaps():
    """Get connectivity gap areas."""
    from government_api import get_connectivity_gaps
    gaps = await get_connectivity_gaps()
    
    features = []
    for iso in gaps.get('isolated_habitats', []):
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [iso['lng'], iso['lat']]},
            "properties": {
                "layer": "gaps",
                "gap_type": "isolated",
                "grid_hash": iso['grid_hash'],
                "recommendation": iso.get('recommendation'),
            }
        })
    
    for gap in gaps.get('fall_bloomer_gaps', []):
        if gap.get('lat') and gap.get('lng'):
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [gap['lng'], gap['lat']]},
                "properties": {
                    "layer": "gaps",
                    "gap_type": "fall_bloomer",
                    "grid_hash": gap['grid_hash'],
                    "recommendation": gap.get('recommendation'),
                }
            })
    
    return features


# ============ UNIFIED MAP ENDPOINT ============

async def get_unified_map_data(layers_requested=None):
    """
    Get all map layers in one response.
    
    Layers:
    - participation: User gardens/habitats
    - observations: Wildlife sightings
    - parks: Green spaces
    - schools: Education targets
    - nurseries: Where to buy plants
    - waystations: Monarch waystations
    - bee_cities: Bee City USA communities
    - priority: Outreach priority areas
    - gaps: Connectivity gaps
    """
    all_layers = [
        "participation", "observations", "parks", "schools",
        "nurseries", "waystations", "bee_cities", "priority", "gaps"
    ]
    
    if layers_requested:
        requested = [l.strip() for l in layers_requested.split(',')]
    else:
        requested = all_layers
    
    result = {
        "type": "FeatureCollection",
        "generated_at": datetime.utcnow().isoformat(),
        "layers_included": requested,
        "features": [],
        "metadata": {
            "blooming_now": CURRENT_MONTH_BLOOMS,
            "month": date.today().month,
            "season_note": _get_season_note(),
        }
    }
    
    # Fetch dynamic layers
    if "participation" in requested:
        features = await fetch_participation_layer()
        result["features"].extend(features)
    
    if "observations" in requested:
        features = await fetch_observations_layer()
        result["features"].extend(features)
    
    if "priority" in requested:
        features = await fetch_priority_layer()
        result["features"].extend(features)
    
    if "gaps" in requested:
        features = await fetch_connectivity_gaps()
        result["features"].extend(features)
    
    # Add static layers
    static = get_static_layers()
    
    if "parks" in requested:
        result["features"].extend(static["parks"])
    
    if "schools" in requested:
        result["features"].extend(static["schools"])
    
    if "nurseries" in requested:
        result["features"].extend(static["nurseries"])
    
    if "waystations" in requested:
        result["features"].extend(static["waystations"])
    
    if "bee_cities" in requested:
        result["features"].extend(static["bee_cities"])
    
    # Add summary stats
    result["summary"] = {
        "total_features": len(result["features"]),
        "by_layer": {}
    }
    for layer in requested:
        count = len([f for f in result["features"] if f["properties"].get("layer") == layer])
        result["summary"]["by_layer"][layer] = count
    
    return result


def _get_season_note():
    """Get seasonal guidance note."""
    month = date.today().month
    
    if month in [3, 4, 5]:
        return "🌱 Spring planting season! Add native perennials now."
    elif month in [6, 7]:
        return "☀️ Peak bloom season. Document pollinators you see!"
    elif month == 8:
        return "🦋 Prepare for monarch migration! Add fall bloomers NOW."
    elif month == 9:
        return "🍂 CRITICAL: Monarch migration underway. Fall nectar needed!"
    elif month in [10, 11]:
        return "🍁 Leave stems and leaves for overwintering bees."
    else:
        return "❄️ Plan your spring garden. Order native seeds!"


# ============ ROUTES ============

def register_unified_map_routes(app):
    """Register unified map API routes."""
    
    @app.route('/api/map/unified', methods=['GET'])
    def unified_map():
        """
        Get all map layers in one GeoJSON response.
        
        Query params:
        - layers: comma-separated list (default: all)
        - bounds: bbox as minLng,minLat,maxLng,maxLat (optional, for future filtering)
        """
        layers = request.args.get('layers')
        data = asyncio.run(get_unified_map_data(layers))
        return jsonify(data)
    
    @app.route('/api/map/layers', methods=['GET'])
    def list_map_layers():
        """List available map layers."""
        return jsonify({
            "layers": [
                {"id": "participation", "name": "Pollinator Gardens", "type": "dynamic", "icon": "🌻"},
                {"id": "observations", "name": "Wildlife Sightings", "type": "dynamic", "icon": "🦋"},
                {"id": "parks", "name": "Parks & Green Spaces", "type": "static", "icon": "🌳"},
                {"id": "schools", "name": "Schools", "type": "static", "icon": "🏫"},
                {"id": "nurseries", "name": "Native Plant Nurseries", "type": "static", "icon": "🪴"},
                {"id": "waystations", "name": "Monarch Waystations", "type": "static", "icon": "🦋"},
                {"id": "bee_cities", "name": "Bee City Communities", "type": "static", "icon": "🐝"},
                {"id": "priority", "name": "Priority Outreach Areas", "type": "dynamic", "icon": "📍"},
                {"id": "gaps", "name": "Connectivity Gaps", "type": "dynamic", "icon": "⚠️"},
            ],
            "seasonal": {
                "current_month": date.today().month,
                "blooming_now": CURRENT_MONTH_BLOOMS,
                "note": _get_season_note(),
            }
        })
    
    @app.route('/api/map/bloom-calendar', methods=['GET'])
    def bloom_calendar():
        """Get full bloom calendar."""
        return jsonify({
            "calendar": BLOOM_CALENDAR,
            "current_month": date.today().month,
            "blooming_now": CURRENT_MONTH_BLOOMS,
        })
    
    @app.route('/api/map/point/<grid_hash>', methods=['GET'])
    def get_point_detail(grid_hash):
        """Get detailed info for a specific grid point."""
        async def fetch_detail():
            async with aiohttp.ClientSession() as session:
                # Get all data for this grid
                inv_url = f"{SUPABASE_URL}/rest/v1/plant_inventories?grid_hash=eq.{grid_hash}"
                async with session.get(inv_url, headers=_headers(), ssl=_ssl_context()) as resp:
                    inventories = await resp.json() if resp.status == 200 else []
                
                assess_url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?grid_hash=eq.{grid_hash}"
                async with session.get(assess_url, headers=_headers(), ssl=_ssl_context()) as resp:
                    assessments = await resp.json() if resp.status == 200 else []
                
                obs_url = f"{SUPABASE_URL}/rest/v1/observations?grid_hash=eq.{grid_hash}"
                async with session.get(obs_url, headers=_headers(), ssl=_ssl_context()) as resp:
                    observations = await resp.json() if resp.status == 200 else []
                
                score_url = f"{SUPABASE_URL}/rest/v1/user_scores?grid_hash=eq.{grid_hash}"
                async with session.get(score_url, headers=_headers(), ssl=_ssl_context()) as resp:
                    scores = await resp.json() if resp.status == 200 else []
            
            return {
                "grid_hash": grid_hash,
                "participants": len(set(i.get('user_id') for i in inventories if i.get('user_id'))),
                "plants": {
                    "total": sum(i.get('count', 1) for i in inventories),
                    "species": list(set(i.get('species') for i in inventories if i.get('species'))),
                    "native_count": sum(i.get('count', 1) for i in inventories if i.get('is_native')),
                    "milkweed_count": sum(i.get('count', 1) for i in inventories if i.get('is_milkweed')),
                },
                "assessments": len(assessments),
                "observations": [
                    {"species": o.get('species_guess'), "photo_url": o.get('photo_url'), "date": o.get('observed_at')}
                    for o in observations[:5]
                ],
                "scores": scores,
            }
        
        detail = asyncio.run(fetch_detail())
        return jsonify(detail)

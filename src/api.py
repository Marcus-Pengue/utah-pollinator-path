"""
Utah Pollinator Path - REST API Server
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import asyncio
import json
import time
import os
from datetime import datetime
from typing import Dict, Any
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.engine import PollinatorEngine, Location
from sources.sources import create_all_sources
from algorithms.homeowner import create_homeowner_algorithm
from algorithms.municipal import create_municipal_algorithm

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = PollinatorEngine(cache_ttl_hours=24)
        for name, source in create_all_sources().items():
            _engine.register_source(source)
        _engine.register_algorithm(create_homeowner_algorithm())
        _engine.register_algorithm(create_municipal_algorithm())
        print(f"Engine initialized: {_engine.list_sources()}, {_engine.list_algorithms()}")
    return _engine

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@app.route('/health', methods=['GET'])
def health():
    engine = get_engine()
    return jsonify({"status": "healthy", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat(),
                   "sources": engine.list_sources(), "algorithms": engine.list_algorithms()})

@app.route('/api/info', methods=['GET'])
def api_info():
    return jsonify({"name": "Utah Pollinator Path API", "version": "1.0.0",
                   "endpoints": ["GET /health", "POST /api/score/homeowner", "POST /api/score/municipal",
                                "POST /api/score/batch", "POST /api/recommendations"]})

@app.route('/api/score/homeowner', methods=['POST'])
def score_homeowner():
    return _score_location("homeowner_v1")

@app.route('/api/score/municipal', methods=['POST'])
def score_municipal():
    return _score_location("municipal_v1")

def _score_location(algorithm: str):
    data = request.json
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    try:
        location = Location(lat=float(data['lat']), lng=float(data['lng']), name=data.get('name', ''))
        engine = get_engine()
        result = run_async(engine.score(location, algorithm=algorithm))
        return jsonify(result.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/score/batch', methods=['POST'])
def score_batch():
    data = request.json
    if not data or 'locations' not in data:
        return jsonify({"error": "locations array required"}), 400
    try:
        locations = [Location(lat=loc['lat'], lng=loc['lng'], name=loc.get('name', '')) for loc in data['locations']]
        algorithm = data.get('algorithm', 'homeowner_v1')
        engine = get_engine()
        results = run_async(engine.batch_score(locations, algorithm=algorithm))
        scores = [r.percentage for r in results]
        return jsonify({"results": [r.to_dict() for r in results],
                       "summary": {"count": len(results), "avg_score": round(sum(scores)/len(scores), 2) if scores else 0}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    data = request.json
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    try:
        location = Location(lat=float(data['lat']), lng=float(data['lng']))
        engine = get_engine()
        result = run_async(engine.score(location, algorithm=data.get('algorithm', 'homeowner_v1')))
        return jsonify({"current_score": result.percentage, "grade": result.grade.letter,
                       "recommendations": [r.to_dict() for r in result.recommendations]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<dataset>', methods=['GET'])
def get_dataset(dataset: str):
    valid = {"priority200": "PRIORITY200.json", "connect200": "CONNECT200.json", "public200": "PUBLIC200.json"}
    if dataset not in valid:
        return jsonify({"error": f"Unknown dataset", "available": list(valid.keys())}), 404
    try:
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', valid[dataset])
        if os.path.exists(data_path):
            with open(data_path, 'r') as f:
                return Response(f.read(), mimetype='application/json')
        return jsonify({"error": "Data file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# =============================================================================

# =============================================================================
# LEADERBOARD ENDPOINTS (Supabase-backed)
# =============================================================================

from leaderboard_db import register_leaderboard_routes
register_leaderboard_routes(app)

from observations_api import register_observation_routes
register_observation_routes(app)

from auth_api import register_auth_routes
from admin_api import register_admin_routes
from species_api import register_species_routes
from advisor_api import register_advisor_routes
from scoring_v2_api import register_scoring_v2_routes
from inventory_api import register_inventory_routes
from challenges_api import register_challenges_routes
from badges_api import register_badges_routes
from assessments_api import register_assessments_routes
from referrals_api import register_referrals_routes
from connectivity_engine import register_connectivity_routes
from score_engine import register_score_routes
from scoring_config import register_config_routes
from stats_api import register_stats_routes
from jobs_engine import register_jobs_routes
from event_logger import register_events_routes
from admin_auth import register_admin_routes as register_admin_auth_routes
from government_api import register_government_routes
from external_data_api import register_external_data_routes
from unified_map_api import register_unified_map_routes
from enhanced_map_data import register_enhanced_map_routes
from wildlife_data_api import register_wildlife_routes
from climate_data_api import register_climate_routes
register_admin_routes(app)
register_species_routes(app)
register_advisor_routes(app)
register_scoring_v2_routes(app)
register_inventory_routes(app)
register_challenges_routes(app)
register_badges_routes(app)
register_assessments_routes(app)
register_referrals_routes(app)
register_connectivity_routes(app)
register_score_routes(app)
register_config_routes(app)
register_stats_routes(app)
register_jobs_routes(app)
register_events_routes(app)
register_admin_auth_routes(app)
register_government_routes(app)
register_external_data_routes(app)
register_unified_map_routes(app)
register_enhanced_map_routes(app)
register_wildlife_routes(app)
register_climate_routes(app)


# =============================================================================
# RUN SERVER
# =============================================================================
# INTERNAL OBSERVATIONS SCORING
# =============================================================================

from algorithms.internal_scoring import score_internal_observations, get_property_observation_summary

@app.route('/api/score/property', methods=['POST'])
def score_property():
    """
    Score a property based on YOUR observations (not public iNaturalist).
    
    POST /api/score/property
    {"lat": 40.6655, "lng": -111.8965}
    """
    data = request.get_json()
    
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    
    lat, lng = data['lat'], data['lng']
    grid_hash = f"{round(lat, 3)}_{round(lng, 3)}"
    
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(score_internal_observations(
            lat=lat,
            lng=lng,
            grid_hash=grid_hash,
        ))
        return jsonify({
            "grid_hash": grid_hash,
            "scores": result,
        })
    finally:
        loop.close()


@app.route('/api/property/<grid_hash>/summary', methods=['GET'])
def property_summary(grid_hash):
    """
    Get detailed observation summary for a property.
    
    GET /api/property/40.666_-111.897/summary
    """
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(get_property_observation_summary(grid_hash))
        return jsonify(result)
    finally:
        loop.close()


# =============================================================================
# RUN SERVER
# =============================================================================
# =============================================================================
# MAP / GEOJSON ENDPOINTS
# =============================================================================

@app.route('/api/map/observations', methods=['GET'])
def map_observations():
    """
    Get all observations as GeoJSON for map display.
    
    GET /api/map/observations
    GET /api/map/observations?status=confirmed
    GET /api/map/observations?city=Murray
    """
    import asyncio
    from observations import get_observations
    
    status = request.args.get('status')
    city = request.args.get('city')
    limit = request.args.get('limit', 500, type=int)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(get_observations(status=status, limit=limit))
    finally:
        loop.close()
    
    observations = result.get('observations', [])
    
    # Filter by city if specified
    if city:
        observations = [o for o in observations if o.get('city') == city]
    
    # Convert to GeoJSON
    features = []
    for obs in observations:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [obs.get('lng'), obs.get('lat')]
            },
            "properties": {
                "id": obs.get('id'),
                "grid_hash": obs.get('grid_hash'),
                "species_guess": obs.get('species_guess'),
                "confirmed_species": obs.get('inat_confirmed_taxon'),
                "observer_name": obs.get('observer_name'),
                "observed_at": obs.get('observed_at'),
                "photo_url": obs.get('photo_url'),
                "status": obs.get('status'),
                "city": obs.get('city'),
            }
        })
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total": len(features),
            "generated_at": datetime.now().isoformat(),
        }
    })


@app.route('/api/map/leaderboard', methods=['GET'])
def map_leaderboard():
    """
    Get leaderboard entries as GeoJSON for map display.
    
    GET /api/map/leaderboard
    GET /api/map/leaderboard?city=Murray
    """
    import asyncio
    from database import get_leaderboard
    
    city = request.args.get('city')
    level = 'city' if city else 'state'
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(get_leaderboard(level=level, filter_value=city, limit=100))
    finally:
        loop.close()
    
    entries = result.get('entries', [])
    
    features = []
    for entry in entries:
        # Skip if no coordinates
        if not entry.get('lat') or not entry.get('lng'):
            continue
            
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [entry.get('lng'), entry.get('lat')]
            },
            "properties": {
                "grid_hash": entry.get('grid_hash'),
                "display_name": entry.get('display_name'),
                "score": entry.get('score'),
                "grade": entry.get('grade'),
                "identity_level": entry.get('identity_level'),
                "city": entry.get('city'),
                "ward": entry.get('ward'),
                "rank": entry.get('rank'),
            }
        })
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total": len(features),
            "level": level,
            "filter": city,
        }
    })


@app.route('/api/map/properties', methods=['GET'])
def map_properties():
    """
    Get unique properties (grid hashes) with aggregated data.
    Combines leaderboard scores + observation counts.
    
    GET /api/map/properties
    """
    import asyncio
    from database import get_leaderboard
    from observations import get_observations
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Get all leaderboard entries
        lb_result = loop.run_until_complete(get_leaderboard(level='state', limit=500))
        lb_entries = {e.get('grid_hash'): e for e in lb_result.get('entries', [])}
        
        # Get all observations and count by grid_hash
        obs_result = loop.run_until_complete(get_observations(limit=1000))
        obs_by_grid = {}
        for obs in obs_result.get('observations', []):
            gh = obs.get('grid_hash')
            if gh not in obs_by_grid:
                obs_by_grid[gh] = {'count': 0, 'species': set(), 'september': 0}
            obs_by_grid[gh]['count'] += 1
            if obs.get('species_guess'):
                obs_by_grid[gh]['species'].add(obs['species_guess'])
            # Check if September observation
            observed_at = obs.get('observed_at', '')
            if observed_at and '-09-' in observed_at:
                obs_by_grid[gh]['september'] += 1
    finally:
        loop.close()
    
    # Merge data
    all_grids = set(lb_entries.keys()) | set(obs_by_grid.keys())
    
    features = []
    for grid_hash in all_grids:
        lb = lb_entries.get(grid_hash, {})
        obs = obs_by_grid.get(grid_hash, {'count': 0, 'species': set(), 'september': 0})
        
        # Get coordinates from either source
        lat = lb.get('lat')
        lng = lb.get('lng')
        
        if not lat or not lng:
            # Parse from grid_hash: "40.666_-111.897"
            try:
                parts = grid_hash.split('_')
                lat = float(parts[0])
                lng = float(parts[1])
            except:
                continue
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": {
                "grid_hash": grid_hash,
                "display_name": lb.get('display_name', 'Unknown'),
                "score": lb.get('score', 0),
                "grade": lb.get('grade', 'N/A'),
                "identity_level": lb.get('identity_level', 'seedling'),
                "city": lb.get('city'),
                "ward": lb.get('ward'),
                "observation_count": obs['count'],
                "species_count": len(obs['species']),
                "september_count": obs['september'],
                "has_score": bool(lb),
                "has_observations": obs['count'] > 0,
            }
        })
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_properties": len(features),
            "with_scores": sum(1 for f in features if f['properties']['has_score']),
            "with_observations": sum(1 for f in features if f['properties']['has_observations']),
        }
    })


# =============================================================================
# RUN SERVER
# =============================================================================
# =============================================================================
# UNIFIED USER DASHBOARD
# =============================================================================

@app.route('/api/dashboard', methods=['GET'])
def user_dashboard():
    """
    Get complete user dashboard - one call, all data.
    
    GET /api/dashboard
    Header: Authorization: Bearer <token>
    
    Returns:
    - Profile info
    - Property score
    - Observations
    - Rankings
    - Recommendations
    """
    import asyncio
    from auth import get_user, get_profile
    from database import get_user_rankings
    from algorithms.internal_scoring import score_internal_observations, get_property_observation_summary
    
    # Require auth
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Authentication required"}), 401
    
    token = auth_header.split(' ')[1]
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Get user
        user = loop.run_until_complete(get_user(token))
        if not user.get('success'):
            return jsonify({"error": "Invalid token"}), 401
        
        user_id = user['user_id']
        email = user['email']
        
        # Get profile
        profile_result = loop.run_until_complete(get_profile(user_id))
        profile = profile_result.get('profile', {})
        
        # Get user's observations
        from observations_api import get_observations_by_user
        obs_result = loop.run_until_complete(get_observations_by_user(user_id))
        
        # Get property from most recent observation or profile
        grid_hash = None
        lat, lng = None, None
        
        if obs_result.get('observations'):
            latest = obs_result['observations'][0]
            grid_hash = latest.get('grid_hash')
            lat = latest.get('lat')
            lng = latest.get('lng')
        
        # Get property score if we have location
        property_score = None
        property_summary = None
        if grid_hash and lat and lng:
            property_score = loop.run_until_complete(
                score_internal_observations(lat=lat, lng=lng, grid_hash=grid_hash)
            )
            property_summary = loop.run_until_complete(
                get_property_observation_summary(grid_hash)
            )
        
        # Get rankings if user is on leaderboard
        rankings = None
        if grid_hash:
            rankings_result = loop.run_until_complete(get_user_rankings(grid_hash))
            if not rankings_result.get('error'):
                rankings = rankings_result.get('rankings')
        
        # Build recommendations
        recommendations = _build_recommendations(
            profile=profile,
            property_score=property_score,
            property_summary=property_summary,
            obs_result=obs_result,
        )
        
        return jsonify({
            "user": {
                "id": user_id,
                "email": email,
                "display_name": profile.get('display_name'),
                "identity_level": profile.get('identity_level', 'seedling'),
                "city": profile.get('city'),
                "ward": profile.get('ward'),
            },
            "property": {
                "grid_hash": grid_hash,
                "lat": lat,
                "lng": lng,
                "score": property_score,
                "summary": property_summary,
            },
            "observations": {
                "total": obs_result.get('total', 0),
                "september_count": obs_result.get('september_count', 0),
                "species_count": obs_result.get('species_count', 0),
                "recent": obs_result.get('observations', [])[:5],
            },
            "rankings": rankings,
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat(),
        })
    
    finally:
        loop.close()


def _build_recommendations(profile, property_score, property_summary, obs_result):
    """Generate personalized recommendations based on user data."""
    
    recs = []
    
    # No observations yet
    if obs_result.get('total', 0) == 0:
        recs.append({
            "priority": "high",
            "type": "action",
            "title": "Document your first pollinator!",
            "message": "Upload a photo of any pollinator you see in your yard. This starts tracking your habitat.",
            "action": "Upload Photo",
        })
        return recs
    
    # No September observations
    if property_summary and property_summary.get('september_count', 0) == 0:
        recs.append({
            "priority": "high",
            "type": "planting",
            "title": "September Gap Detected",
            "message": "Plant late-season bloomers like rabbitbrush, asters, or goldenrod to support monarch migration.",
            "plants": ["Rabbitbrush", "Asters", "Goldenrod"],
        })
    
    # Low activity score
    if property_score and property_score.get('activity_score', 0) < 0.5:
        recs.append({
            "priority": "medium",
            "type": "action",
            "title": "Keep documenting!",
            "message": f"You have {obs_result.get('total', 0)} observations. More photos = higher score.",
            "target": "10 observations",
        })
    
    # Low diversity
    if property_score and property_score.get('diversity_score', 0) < 0.5:
        recs.append({
            "priority": "medium",
            "type": "planting",
            "title": "Increase plant diversity",
            "message": "More plant variety attracts more pollinator species. Try adding milkweed for monarchs.",
            "plants": ["Narrowleaf Milkweed", "Showy Milkweed"],
        })
    
    # Not on leaderboard
    if not profile.get('total_score'):
        recs.append({
            "priority": "low",
            "type": "social",
            "title": "Join the leaderboard!",
            "message": "Score your property to see how you rank against neighbors.",
            "action": "Score Property",
        })
    
    # Has observations, doing well
    if obs_result.get('total', 0) >= 5 and property_score and property_score.get('activity_score', 0) >= 0.75:
        recs.append({
            "priority": "low",
            "type": "social",
            "title": "You're doing great!",
            "message": "Consider inviting a neighbor to join. Every yard helps connect the corridor.",
            "action": "Share",
        })
    
    return recs


# =============================================================================
# RUN SERVER
# =============================================================================
# =============================================================================

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)



# Download endpoints for full datasets

# ============================================
# GARDEN REGISTRATION SYSTEM
# ============================================
import csv
from io import StringIO

GARDENS_FILE = 'src/static/gardens.json'
GARDENS_CSV_FILE = 'src/static/gardens_export.csv'

def load_gardens():
    """Load gardens from JSON file."""
    if os.path.exists(GARDENS_FILE):
        with open(GARDENS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_gardens(gardens):
    """Save gardens to JSON file."""
    os.makedirs(os.path.dirname(GARDENS_FILE), exist_ok=True)
    with open(GARDENS_FILE, 'w') as f:
        json.dump(gardens, f, indent=2)

def export_gardens_csv():
    """Export gardens to CSV format for Xerces submission."""
    gardens = load_gardens()
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header row matching Xerces-style format
    writer.writerow([
        'Garden Name', 'Latitude', 'Longitude', 'Size', 
        'Habitat Score', 'Certification Tier',
        'Plants', 'Native Plant Count', 'Fall Bloomer Count',
        'Features', 'Pesticide Free', 'Water Source',
        'Description', 'Email', 'Registration Date'
    ])
    
    for g in gardens:
        props = g.get('properties', {})
        plants = props.get('plants', [])
        features = props.get('features', [])
        
        # Count natives and fall bloomers
        native_plants = ['milkweed', 'goldenrod', 'aster', 'rabbitbrush', 'agastache', 'penstemon', 'coneflower']
        fall_plants = ['goldenrod', 'aster', 'rabbitbrush', 'agastache']
        native_count = len([p for p in plants if p in native_plants])
        fall_count = len([p for p in plants if p in fall_plants])
        
        writer.writerow([
            props.get('name', 'Unnamed Garden'),
            g.get('geometry', {}).get('coordinates', [0, 0])[1],  # lat
            g.get('geometry', {}).get('coordinates', [0, 0])[0],  # lng
            props.get('size', 'unknown'),
            props.get('score', 0),
            props.get('tier', 'Seedling'),
            '; '.join(plants),
            native_count,
            fall_count,
            '; '.join(features),
            'Yes' if 'no_pesticides' in features else 'No',
            'Yes' if 'water' in features else 'No',
            props.get('description', ''),
            props.get('email', ''),
            props.get('registered_at', '')
        ])
    
    return output.getvalue()


import hashlib
import random

def anonymize_garden_for_public(garden):
    """Anonymize garden data for public display."""
    props = garden.get('properties', {})
    coords = garden.get('geometry', {}).get('coordinates', [0, 0])
    
    # Generate anonymous ID
    garden_id = props.get('id', str(random.random()))
    hash_obj = hashlib.md5(garden_id.encode())
    anon_id = f"UPP-{hash_obj.hexdigest()[:6].upper()}"
    
    # Offset location slightly (~50m) for privacy
    lat_offset = (random.random() - 0.5) * 0.0009
    lng_offset = (random.random() - 0.5) * 0.0009
    
    plants = props.get('plants', [])
    features = props.get('features', [])
    fall_bloomers = ['goldenrod', 'aster', 'rabbitbrush', 'agastache']
    
    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [coords[0] + lng_offset, coords[1] + lat_offset]
        },
        'properties': {
            'anonymous_id': anon_id,
            'display_name': f"Pollinator Habitat {anon_id}",
            'tier': props.get('tier', 'Seedling'),
            'score': props.get('score', 0),
            'size': props.get('size', 'medium'),
            'plant_count': len(plants),
            'feature_count': len(features),
            'has_water': 'water' in features,
            'is_pesticide_free': 'no_pesticides' in features,
            'has_fall_bloomers': any(p in fall_bloomers for p in plants),
            'observation_count': props.get('synced_obs_count', 0),
            'registered_month': props.get('registered_at', '')[:7] if props.get('registered_at') else '',
            # DO NOT include: name, email, exact location, inat_username, specific plants
        }
    }


@app.route('/api/gardens', methods=['GET'])
def get_gardens():
    """Get all registered gardens as GeoJSON (anonymized for public)."""
    gardens = load_gardens()
    # Return anonymized version for public display
    anonymized = [anonymize_garden_for_public(g) for g in gardens]
    return jsonify({
        'type': 'FeatureCollection',
        'features': anonymized,
        'privacy_note': 'Locations offset ~50m for privacy. Names anonymized.'
    })

@app.route('/api/gardens/private/<garden_id>', methods=['GET'])
def get_garden_private(garden_id):
    """Get full garden details (for owner only - would need auth)."""
    gardens = load_gardens()
    for g in gardens:
        if g.get('properties', {}).get('id') == garden_id:
            return jsonify(g)
    return jsonify({'error': 'Garden not found'}), 404

@app.route('/api/gardens', methods=['POST'])
def register_garden():
    """Register a new pollinator garden."""
    data = request.json
    
    # Check for referral code
    referred_by = None
    ref_code = data.get('referral_code', '')
    if ref_code:
        gardens = load_gardens()
        for g in gardens:
            g_id = g.get('properties', {}).get('id', '')
            if generate_referral_code(g_id) == ref_code.upper():
                referred_by = g_id
                break

    garden = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [data.get('lng'), data.get('lat')]
        },
        'properties': {
            'id': f"garden_{int(time.time())}_{len(load_gardens())}",
            'referred_by': referred_by,
            'name': data.get('name', 'Unnamed Garden'),
            'size': data.get('size', 'medium'),
            'plants': data.get('plants', []),
            'features': data.get('features', []),
            'description': data.get('description', ''),
            'email': data.get('email', ''),
            'score': data.get('score', 0),
            'tier': data.get('tier', 'Seedling'),
            'registered_at': datetime.now().isoformat(),
        }
    }
    
    gardens = load_gardens()
    gardens.append(garden)
    save_gardens(gardens)
    
    return jsonify({
        'success': True,
        'garden': garden,
        'total_gardens': len(gardens)
    })

@app.route('/api/gardens/export/csv')
def export_gardens_csv_endpoint():
    """Export all gardens as CSV for Xerces submission."""
    csv_data = export_gardens_csv()
    
    response = app.response_class(
        response=csv_data,
        status=200,
        mimetype='text/csv'
    )
    response.headers['Content-Disposition'] = f'attachment; filename=utah-pollinator-gardens-{datetime.now().strftime("%Y%m%d")}.csv'
    return response

@app.route('/api/gardens/export/xerces')
def export_xerces_report():
    """Export gardens in Xerces-compatible format with summary stats."""
    gardens = load_gardens()
    
    # Calculate summary stats
    total_score = sum(g.get('properties', {}).get('score', 0) for g in gardens)
    total_area = sum({
        'small': 50, 'medium': 250, 'large': 750
    }.get(g.get('properties', {}).get('size', 'medium'), 250) for g in gardens)
    
    all_plants = []
    all_features = []
    for g in gardens:
        all_plants.extend(g.get('properties', {}).get('plants', []))
        all_features.extend(g.get('properties', {}).get('features', []))
    
    plant_counts = {}
    for p in all_plants:
        plant_counts[p] = plant_counts.get(p, 0) + 1
    
    feature_counts = {}
    for f in all_features:
        feature_counts[f] = feature_counts.get(f, 0) + 1
    
    # Tier distribution
    tiers = {}
    for g in gardens:
        tier = g.get('properties', {}).get('tier', 'Seedling')
        tiers[tier] = tiers.get(tier, 0) + 1
    
    return jsonify({
        'report_date': datetime.now().isoformat(),
        'region': 'Wasatch Front, Utah',
        'summary': {
            'total_gardens': len(gardens),
            'total_habitat_score': total_score,
            'estimated_area_sqft': total_area,
            'average_score': round(total_score / len(gardens), 1) if gardens else 0,
        },
        'tier_distribution': tiers,
        'top_plants': dict(sorted(plant_counts.items(), key=lambda x: -x[1])[:10]),
        'feature_adoption': feature_counts,
        'pesticide_free_count': feature_counts.get('no_pesticides', 0),
        'fall_bloomer_gardens': len([g for g in gardens if any(p in ['goldenrod', 'aster', 'rabbitbrush'] for p in g.get('properties', {}).get('plants', []))]),
        'gardens': gardens
    })

@app.route('/api/gardens/stats')
def garden_stats():
    """Get summary statistics for gardens."""
    gardens = load_gardens()
    
    if not gardens:
        return jsonify({
            'total': 0,
            'average_score': 0,
            'tiers': {},
            'top_plants': []
        })
    
    total_score = sum(g.get('properties', {}).get('score', 0) for g in gardens)
    
    tiers = {}
    all_plants = []
    for g in gardens:
        tier = g.get('properties', {}).get('tier', 'Seedling')
        tiers[tier] = tiers.get(tier, 0) + 1
        all_plants.extend(g.get('properties', {}).get('plants', []))
    
    plant_counts = {}
    for p in all_plants:
        plant_counts[p] = plant_counts.get(p, 0) + 1
    
    return jsonify({
        'total': len(gardens),
        'average_score': round(total_score / len(gardens), 1),
        'tiers': tiers,
        'top_plants': sorted(plant_counts.items(), key=lambda x: -x[1])[:5]
    })




# ============================================
# VERIFICATION SYSTEM
# ============================================

@app.route('/api/verification/schedule', methods=['POST'])
def schedule_verification():
    """Schedule a professional verification appointment."""
    data = request.get_json()
    garden_id = data.get('garden_id')
    date = data.get('date')
    time = data.get('time')
    
    # In production, this would:
    # 1. Create a calendar event
    # 2. Send confirmation email
    # 3. Process payment
    
    # For now, save to a simple file
    appointments_file = os.path.join(STATIC_DIR, 'appointments.json')
    try:
        with open(appointments_file, 'r') as f:
            appointments = json.load(f)
    except:
        appointments = []
    
    appointment = {
        'id': f"apt_{int(time.time())}",
        'garden_id': garden_id,
        'date': date,
        'time': time,
        'status': 'pending',
        'created_at': datetime.now().isoformat(),
        'price': 15.00
    }
    appointments.append(appointment)
    
    with open(appointments_file, 'w') as f:
        json.dump(appointments, f, indent=2)
    
    return jsonify({
        'success': True,
        'appointment': appointment,
        'message': f'Verification scheduled for {date} at {time}'
    })

@app.route('/api/verification/community/request', methods=['POST'])
def request_community_verification():
    """Request community verification from nearby gardeners."""
    data = request.get_json()
    garden_id = data.get('garden_id')
    
    gardens = load_gardens()
    garden = next((g for g in gardens if g.get('properties', {}).get('id') == garden_id), None)
    if not garden:
        return jsonify({'error': 'Garden not found'}), 404
    
    coords = garden.get('geometry', {}).get('coordinates', [0, 0])
    
    # Find nearby gardens that could verify (within 8km / 5 miles)
    nearby_verifiers = []
    for g in gardens:
        if g.get('properties', {}).get('id') == garden_id:
            continue
        g_coords = g.get('geometry', {}).get('coordinates', [0, 0])
        lat_diff = (coords[1] - g_coords[1]) * 111000
        lng_diff = (coords[0] - g_coords[0]) * 85000
        distance = (lat_diff**2 + lng_diff**2) ** 0.5
        
        if distance <= 8000:  # 8km
            nearby_verifiers.append({
                'anonymous_id': generate_referral_code(g.get('properties', {}).get('id', '')),
                'distance_km': round(distance / 1000, 1),
                'tier': g.get('properties', {}).get('tier', 'Seedling')
            })
    
    return jsonify({
        'success': True,
        'nearby_verifiers': len(nearby_verifiers),
        'message': f'Verification request sent to {len(nearby_verifiers)} nearby gardeners'
    })

@app.route('/api/verification/submit', methods=['POST'])
def submit_verification():
    """Submit verification photos and confirm a garden."""
    data = request.get_json()
    garden_id = data.get('garden_id')
    verifier_id = data.get('verifier_id')
    verification_type = data.get('type', 'community')  # 'community' or 'professional'
    photos = data.get('photos', [])
    
    gardens = load_gardens()
    for g in gardens:
        if g.get('properties', {}).get('id') == garden_id:
            g['properties']['verification'] = {
                'level': verification_type,
                'verified_at': datetime.now().isoformat(),
                'verified_by': verifier_id,
                'photos': photos
            }
            # Apply score multiplier
            current_score = g['properties'].get('score', 0)
            multiplier = 1.5 if verification_type == 'professional' else 1.25
            g['properties']['verified_score'] = int(current_score * multiplier)
            break
    
    save_gardens(gardens)
    
    return jsonify({
        'success': True,
        'message': f'Garden verified as {verification_type}',
        'multiplier': 1.5 if verification_type == 'professional' else 1.25
    })

@app.route('/api/gardens/<garden_id>/plants', methods=['POST'])
def add_plant(garden_id):
    """Add a new plant to a garden."""
    data = request.get_json()
    
    gardens = load_gardens()
    for g in gardens:
        if g.get('properties', {}).get('id') == garden_id:
            if 'plant_log' not in g['properties']:
                g['properties']['plant_log'] = []
            
            plant_entry = {
                'id': f"plant_{int(time.time())}_{len(g['properties']['plant_log'])}",
                'species': data.get('species'),
                'quantity': data.get('quantity', 1),
                'planted_date': data.get('planted_date'),
                'is_new_planting': True,
                'verified': False,
                'created_at': datetime.now().isoformat()
            }
            g['properties']['plant_log'].append(plant_entry)
            
            # Also add to plants list if not already there
            if data.get('species') not in g['properties'].get('plants', []):
                if 'plants' not in g['properties']:
                    g['properties']['plants'] = []
                g['properties']['plants'].append(data.get('species'))
            
            save_gardens(gardens)
            return jsonify({'success': True, 'plant': plant_entry})
    
    return jsonify({'error': 'Garden not found'}), 404

@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    """Get all scheduled verification appointments (admin only)."""
    appointments_file = os.path.join(STATIC_DIR, 'appointments.json')
    try:
        with open(appointments_file, 'r') as f:
            appointments = json.load(f)
    except:
        appointments = []
    return jsonify(appointments)


# ============================================
# REFERRAL SYSTEM
# ============================================
import string

def generate_referral_code(garden_id):
    """Generate a unique referral code for a garden."""
    hash_obj = hashlib.md5(garden_id.encode())
    return hash_obj.hexdigest()[:8].upper()

def get_referral_stats(garden_id):
    """Get referral statistics for a garden."""
    gardens = load_gardens()
    
    # Find gardens referred by this one
    referred = [g for g in gardens 
                if g.get('properties', {}).get('referred_by') == garden_id]
    
    # Find the garden's location
    garden = next((g for g in gardens if g.get('properties', {}).get('id') == garden_id), None)
    if not garden:
        return {'error': 'Garden not found'}
    
    coords = garden.get('geometry', {}).get('coordinates', [0, 0])
    
    # Find nearby gardens
    nearby = []
    for g in gardens:
        g_coords = g.get('geometry', {}).get('coordinates', [0, 0])
        # Simple distance calc (approximate)
        lat_diff = (coords[1] - g_coords[1]) * 111000  # meters
        lng_diff = (coords[0] - g_coords[0]) * 85000   # meters at ~40 lat
        distance = (lat_diff**2 + lng_diff**2) ** 0.5
        
        if distance <= 1000 and g.get('properties', {}).get('id') != garden_id:
            nearby.append({
                'anonymous_id': generate_referral_code(g.get('properties', {}).get('id', '')),
                'distance': round(distance),
                'tier': g.get('properties', {}).get('tier', 'Seedling'),
                'score': g.get('properties', {}).get('score', 0),
                'is_referral': g.get('properties', {}).get('referred_by') == garden_id
            })
    
    return {
        'referral_code': generate_referral_code(garden_id),
        'referred_count': len(referred),
        'nearby_gardens': sorted(nearby, key=lambda x: x['distance'])
    }

@app.route('/api/referral/<garden_id>')
def get_referral_info(garden_id):
    """Get referral info for a garden."""
    stats = get_referral_stats(garden_id)
    return jsonify(stats)

@app.route('/api/referral/validate/<code>')
def validate_referral_code(code):
    """Validate a referral code and return referrer info."""
    gardens = load_gardens()
    
    for g in gardens:
        g_id = g.get('properties', {}).get('id', '')
        if generate_referral_code(g_id) == code.upper():
            return jsonify({
                'valid': True,
                'referrer_tier': g.get('properties', {}).get('tier', 'Seedling'),
                'referrer_anonymous_id': f"UPP-{code.upper()[:6]}"
            })
    
    return jsonify({'valid': False})

@app.route('/api/gardens/nearby')
def get_nearby_gardens():
    """Get gardens near a location."""
    lat = float(request.args.get('lat', 0))
    lng = float(request.args.get('lng', 0))
    radius = float(request.args.get('radius', 1000))  # meters
    
    gardens = load_gardens()
    nearby = []
    
    for g in gardens:
        coords = g.get('geometry', {}).get('coordinates', [0, 0])
        lat_diff = (lat - coords[1]) * 111000
        lng_diff = (lng - coords[0]) * 85000
        distance = (lat_diff**2 + lng_diff**2) ** 0.5
        
        if distance <= radius:
            anon = anonymize_garden_for_public(g)
            anon['properties']['distance'] = round(distance)
            nearby.append(anon)
    
    return jsonify({
        'type': 'FeatureCollection',
        'features': sorted(nearby, key=lambda x: x['properties']['distance'])
    })


@app.route('/api/downloads/full-json')
def download_full_json():
    """Download full Utah dataset as gzipped JSON"""
    return send_from_directory(
        'static/downloads', 
        'utah_full_cache.json.gz',
        mimetype='application/gzip',
        as_attachment=True,
        download_name='utah-pollinator-311k-observations.json.gz'
    )

@app.route('/api/downloads/full-csv')
def download_full_csv():
    """Download full Utah dataset as gzipped CSV"""
    return send_from_directory(
        'static/downloads', 
        'utah_full_cache.csv.gz',
        mimetype='application/gzip',
        as_attachment=True,
        download_name='utah-pollinator-311k-observations.csv.gz'
    )

@app.route('/api/downloads/info')
def download_info():
    """Get info about available downloads - reads from metadata.json"""
    import os
    meta_path = 'src/static/downloads/metadata.json'
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            meta = json.load(f)
        return jsonify({
            'observations': meta.get('observations', 0),
            'generated': meta.get('generated', ''),
            'date_range': meta.get('date_range', ''),
            'sources': meta.get('sources', []),
            'files': {
                'json_gz': {
                    'size_mb': meta['files']['json_gz']['size_mb'],
                    'url': '/api/downloads/full-json'
                },
                'csv_gz': {
                    'size_mb': meta['files']['csv_gz']['size_mb'],
                    'url': '/api/downloads/full-csv'
                }
            }
        })
    else:
        return jsonify({'error': 'Metadata not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    get_engine()
    print(f"\n  Utah Pollinator Path API running on http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)

# =============================================================================
# CACHED WILDLIFE DATA (105k+ observations)
# =============================================================================

CACHE_FILE = os.path.join(os.path.dirname(__file__), 'static', 'wildlife_cache.json')
_wildlife_cache = None

def load_wildlife_cache():
    global _wildlife_cache
    if _wildlife_cache is None and os.path.exists(CACHE_FILE):
        print(f"Loading wildlife cache from {CACHE_FILE}...")
        with open(CACHE_FILE, 'r') as f:
            _wildlife_cache = json.load(f)
        print(f"Loaded {_wildlife_cache.get('total_observations', 0):,} observations")
    return _wildlife_cache

@app.route('/api/wildlife/cached', methods=['GET'])
def get_cached_wildlife():
    """Return cached wildlife observations."""
    cache = load_wildlife_cache()
    if not cache:
        return jsonify({"error": "Cache not found", "path": CACHE_FILE}), 404
    
    min_year = request.args.get('min_year', type=int)
    max_year = request.args.get('max_year', type=int)
    taxon = request.args.get('taxon')
    
    features = cache.get("features", [])
    
    if min_year or max_year or taxon:
        filtered = []
        for f in features:
            props = f.get("properties", {})
            y = props.get("year")
            t = props.get("iconic_taxon")
            
            if min_year and (not y or y < min_year):
                continue
            if max_year and (not y or y > max_year):
                continue
            if taxon and t != taxon:
                continue
            filtered.append(f)
        features = filtered
    
    return jsonify({
        "type": "FeatureCollection",
        "total": len(features),
        "year_distribution": cache.get("year_distribution", {}),
        "taxon_distribution": cache.get("taxon_distribution", {}),
        "features": features
    })

@app.route('/api/wildlife/cached/stats', methods=['GET'])
def get_wildlife_cache_stats():
    """Return cache statistics without full data."""
    cache = load_wildlife_cache()
    if not cache:
        return jsonify({"error": "Cache not found"}), 404
    
    return jsonify({
        "total_observations": cache.get("total_observations"),
        "generated": cache.get("generated"),
        "year_distribution": cache.get("year_distribution", {}),
        "taxon_distribution": cache.get("taxon_distribution", {}),
    })

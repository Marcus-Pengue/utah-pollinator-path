"""
Utah Pollinator Path - REST API Server
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import asyncio
import json
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
from admin_auth import register_admin_routes
register_auth_routes(app)
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
register_admin_routes(app)


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


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    get_engine()
    print(f"\n  Utah Pollinator Path API running on http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)

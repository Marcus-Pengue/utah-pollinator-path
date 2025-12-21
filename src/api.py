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

app = Flask(__name__)
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
# LEADERBOARD ENDPOINTS
# =============================================================================

from leaderboard import LeaderboardManager, GeocodingService, get_wards_for_area

# Initialize leaderboard (in production, this connects to Supabase)
leaderboard_manager = LeaderboardManager()


@app.route('/api/leaderboard/join', methods=['POST'])
def join_leaderboard():
    """
    Join the leaderboard with your score.
    
    POST /api/leaderboard/join
    {
        "lat": 40.6655,
        "lng": -111.8965,
        "score": 80.0,
        "grade": "A",
        "display_name": "Garden Guru",    // optional
        "ward": "Murray 4th Ward"          // optional, self-reported
    }
    
    Returns: Your entry + all your rankings
    """
    data = request.get_json()
    
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    
    if 'score' not in data or 'grade' not in data:
        return jsonify({"error": "score and grade required"}), 400
    
    # Run async function in sync context
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        entry = loop.run_until_complete(
            leaderboard_manager.add_entry(
                lat=data['lat'],
                lng=data['lng'],
                score=data['score'],
                grade=data['grade'],
                display_name=data.get('display_name', 'Anonymous Gardener'),
                ward=data.get('ward'),
            )
        )
        
        # Get their rankings
        rankings = leaderboard_manager.get_user_rankings(entry.location_info.grid_hash)
        
        return jsonify({
            "success": True,
            "entry": entry.to_dict(),
            "rankings": rankings.get("rankings", {}),
            "message": f"Welcome to the leaderboard, {entry.display_name}!"
        })
    finally:
        loop.close()


@app.route('/api/leaderboard/<level>', methods=['GET'])
def get_leaderboard(level):
    """
    Get leaderboard for a specific level.
    
    GET /api/leaderboard/state
    GET /api/leaderboard/city?filter=Murray
    GET /api/leaderboard/zip?filter=84107
    GET /api/leaderboard/ward?filter=Murray%204th%20Ward
    
    Query params:
        filter: Value to filter by (required for city/zip/ward)
        limit: Max entries (default 20)
    """
    valid_levels = ['state', 'county', 'city', 'zip', 'ward']
    
    if level not in valid_levels:
        return jsonify({
            "error": f"Invalid level. Must be one of: {valid_levels}"
        }), 400
    
    filter_value = request.args.get('filter')
    limit = request.args.get('limit', 20, type=int)
    
    # Non-state levels require a filter
    if level != 'state' and not filter_value:
        return jsonify({
            "error": f"filter parameter required for {level} level",
            "example": f"/api/leaderboard/{level}?filter=VALUE"
        }), 400
    
    result = leaderboard_manager.get_leaderboard(
        level=level,
        filter_value=filter_value,
        limit=limit
    )
    
    return jsonify(result)


@app.route('/api/leaderboard/me/<grid_hash>', methods=['GET'])
def get_my_rankings(grid_hash):
    """
    Get all rankings for a specific user.
    
    GET /api/leaderboard/me/40.666_-111.897
    
    Returns: User's rank at every level (state, city, zip, ward)
    """
    rankings = leaderboard_manager.get_user_rankings(grid_hash)
    
    if "error" in rankings:
        return jsonify(rankings), 404
    
    return jsonify(rankings)


@app.route('/api/wards/<county>', methods=['GET'])
def get_wards(county):
    """
    Get known wards for a county (for dropdown population).
    
    GET /api/wards/Salt%20Lake%20County
    
    Returns: List of known ward names
    """
    wards = get_wards_for_area(county)
    
    return jsonify({
        "county": county,
        "wards": wards,
        "note": "Users can also enter custom ward names"
    })


@app.route('/api/geocode', methods=['POST'])
def geocode_location():
    """
    Get location info from coordinates.
    
    POST /api/geocode
    {"lat": 40.6655, "lng": -111.8965}
    
    Returns: city, county, state, zip (auto-detected)
    """
    data = request.get_json()
    
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        geocoder = GeocodingService()
        location = loop.run_until_complete(
            geocoder.reverse_geocode(data['lat'], data['lng'])
        )
        
        return jsonify({
            "location": location.to_dict(),
            "available_wards": get_wards_for_area(location.county or "")
        })
    finally:
        loop.close()


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    get_engine()
    print(f"\n  Utah Pollinator Path API running on http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)

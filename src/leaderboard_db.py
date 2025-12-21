"""
Leaderboard endpoints using Supabase persistence.
"""

from flask import request, jsonify
import asyncio
from database import add_entry, get_leaderboard, get_user_rankings
from leaderboard import GeocodingService, get_wards_for_area


def _get_identity_level(score: float) -> str:
    if score >= 90:
        return "pioneer"
    elif score >= 80:
        return "migration_champion"
    elif score >= 60:
        return "habitat_guardian"
    elif score >= 40:
        return "pollinator_friend"
    return "seedling"


def _run_async(coro):
    """Run async function in sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def register_leaderboard_routes(app):
    """Register all leaderboard routes on the Flask app."""
    
    geocoder = GeocodingService()
    
    @app.route('/api/leaderboard/join', methods=['POST'])
    def join_leaderboard():
        data = request.get_json()
        
        if not data or 'lat' not in data or 'lng' not in data:
            return jsonify({"error": "lat and lng required"}), 400
        
        if 'score' not in data or 'grade' not in data:
            return jsonify({"error": "score and grade required"}), 400
        
        lat, lng = data['lat'], data['lng']
        
        # Geocode location
        location = _run_async(geocoder.reverse_geocode(lat, lng))
        
        # Calculate identity level
        identity = _get_identity_level(data['score'])
        
        # Add to database
        entry = _run_async(add_entry(
            lat=lat,
            lng=lng,
            grid_hash=location.grid_hash,
            score=data['score'],
            grade=data['grade'],
            display_name=data.get('display_name', 'Anonymous Gardener'),
            city=location.city,
            county=location.county,
            state=location.state or "Utah",
            zip_code=location.zip_code,
            ward=data.get('ward'),
            identity_level=identity,
        ))
        
        if "error" in entry:
            return jsonify(entry), 500
        
        # Get rankings
        rankings = _run_async(get_user_rankings(location.grid_hash))
        
        return jsonify({
            "success": True,
            "entry": entry,
            "rankings": rankings.get("rankings", {}),
            "message": f"Welcome to the leaderboard, {entry.get('display_name', 'Anonymous')}!"
        })
    
    @app.route('/api/leaderboard/<level>', methods=['GET'])
    def get_leaderboard_route(level):
        valid_levels = ['state', 'county', 'city', 'zip', 'ward']
        
        if level not in valid_levels:
            return jsonify({"error": f"Invalid level. Must be one of: {valid_levels}"}), 400
        
        filter_value = request.args.get('filter')
        limit = request.args.get('limit', 20, type=int)
        
        if level != 'state' and not filter_value:
            return jsonify({"error": f"filter required for {level}"}), 400
        
        result = _run_async(get_leaderboard(level, filter_value, limit))
        return jsonify(result)
    
    @app.route('/api/leaderboard/me/<grid_hash>', methods=['GET'])
    def get_my_rankings(grid_hash):
        rankings = _run_async(get_user_rankings(grid_hash))
        if "error" in rankings:
            return jsonify(rankings), 404
        return jsonify(rankings)
    
    @app.route('/api/wards/<county>', methods=['GET'])
    def get_wards(county):
        wards = get_wards_for_area(county)
        return jsonify({"county": county, "wards": wards})
    
    @app.route('/api/geocode', methods=['POST'])
    def geocode_location():
        data = request.get_json()
        if not data or 'lat' not in data or 'lng' not in data:
            return jsonify({"error": "lat and lng required"}), 400
        
        location = _run_async(geocoder.reverse_geocode(data['lat'], data['lng']))
        return jsonify({
            "location": location.to_dict(),
            "available_wards": get_wards_for_area(location.county or "")
        })

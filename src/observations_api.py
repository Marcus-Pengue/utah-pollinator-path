"""
Observations API endpoints for Flask.
"""

from flask import request, jsonify
import asyncio
from observations import submit_observation, get_observations, get_my_observations


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def register_observation_routes(app):
    """Register observation routes on Flask app."""
    
    @app.route('/api/observations/upload', methods=['POST'])
    def upload_observation():
        """
        Upload a pollinator observation.
        
        POST /api/observations/upload
        {
            "photo": "<base64 encoded image>",
            "lat": 40.6655,
            "lng": -111.8965,
            "observed_at": "2025-09-15T14:30:00Z",  // optional
            "observer_name": "John",                 // optional
            "observer_email": "john@example.com",    // optional
            "species_guess": "Monarch butterfly"     // optional
        }
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if 'photo' not in data:
            return jsonify({"error": "photo (base64) required"}), 400
        
        if 'lat' not in data or 'lng' not in data:
            return jsonify({"error": "lat and lng required"}), 400
        
        result = _run_async(submit_observation(
            photo_base64=data['photo'],
            lat=data['lat'],
            lng=data['lng'],
            observed_at=data.get('observed_at'),
            observer_name=data.get('observer_name', 'Anonymous'),
            observer_email=data.get('observer_email'),
            species_guess=data.get('species_guess'),
        ))
        
        if result.get('success'):
            return jsonify(result), 201
        else:
            return jsonify(result), 500
    
    @app.route('/api/observations', methods=['GET'])
    def list_observations():
        """
        List observations with optional filters.
        
        GET /api/observations
        GET /api/observations?status=pending
        GET /api/observations?limit=10
        """
        status = request.args.get('status')
        grid_hash = request.args.get('grid_hash')
        limit = request.args.get('limit', 50, type=int)
        
        result = _run_async(get_observations(
            status=status,
            grid_hash=grid_hash,
            limit=limit,
        ))
        
        return jsonify(result)
    
    @app.route('/api/observations/mine', methods=['GET'])
    def my_observations():
        """
        Get observations by email.
        
        GET /api/observations/mine?email=john@example.com
        """
        email = request.args.get('email')
        
        if not email:
            return jsonify({"error": "email parameter required"}), 400
        
        result = _run_async(get_my_observations(email))
        return jsonify(result)
    
    @app.route('/api/observations/stats', methods=['GET'])
    def observation_stats():
        """Get observation statistics."""
        
        all_obs = _run_async(get_observations(limit=1000))
        observations = all_obs.get('observations', [])
        
        # Count by status
        statuses = [o.get('status') for o in observations]
        
        # Count by city
        cities = {}
        for o in observations:
            city = o.get('city', 'Unknown')
            cities[city] = cities.get(city, 0) + 1
        
        return jsonify({
            "total": len(observations),
            "by_status": {
                "pending": statuses.count("pending"),
                "uploaded": statuses.count("uploaded"),
                "confirmed": statuses.count("confirmed"),
            },
            "by_city": cities,
        })

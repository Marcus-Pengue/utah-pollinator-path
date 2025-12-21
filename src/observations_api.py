"""
Observations API endpoints for Flask.
"""

from flask import request, jsonify
import asyncio
from observations import submit_observation, get_observations, get_my_observations
from auth import get_user
from challenge_hooks import on_observation_added_sync
from badge_engine import on_observation_added_check_badges


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _get_user_from_request():
    """Extract user from Authorization header if present."""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    user = _run_async(get_user(token))
    
    if user.get('success'):
        return {
            'user_id': user['user_id'],
            'email': user['email'],
        }
    return None


def register_observation_routes(app):
    """Register observation routes on Flask app."""
    
    @app.route('/api/observations/upload', methods=['POST'])
    def upload_observation():
        """
        Upload a pollinator observation.
        
        POST /api/observations/upload
        Header (optional): Authorization: Bearer <token>
        
        {
            "photo": "<base64 encoded image>",
            "lat": 40.6655,
            "lng": -111.8965,
            "observed_at": "2025-09-15T14:30:00Z",  // optional
            "observer_name": "John",                 // optional if authenticated
            "species_guess": "Monarch butterfly"     // optional
        }
        
        If authenticated, user_id is automatically attached.
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if 'photo' not in data:
            return jsonify({"error": "photo (base64) required"}), 400
        
        if 'lat' not in data or 'lng' not in data:
            return jsonify({"error": "lat and lng required"}), 400
        
        # Check for authenticated user
        user = _get_user_from_request()
        
        # Use authenticated user info if available
        if user:
            observer_name = data.get('observer_name') or user['email'].split('@')[0]
            observer_email = user['email']
            user_id = user['user_id']
        else:
            observer_name = data.get('observer_name', 'Anonymous')
            observer_email = data.get('observer_email')
            user_id = None
        
        result = _run_async(submit_observation(
            photo_base64=data['photo'],
            lat=data['lat'],
            lng=data['lng'],
            observed_at=data.get('observed_at'),
            observer_name=observer_name,
            observer_email=observer_email,
            species_guess=data.get('species_guess'),
            user_id=user_id,
        ))
        
        if result.get('success'):
            # Auto-contribute to challenges & check badges
            challenge_contributions = []
            new_badges = []
            
            if user_id:
                try:
                    challenge_contributions = on_observation_added_sync(user_id, {}, token=request.headers.get('Authorization', '').replace('Bearer ', ''))
                except Exception as e:
                    print(f"Challenge hook error: {e}")
                
                try:
                    new_badges = on_observation_added_check_badges(user_id, request.headers.get('Authorization', '').replace('Bearer ', ''))
                except Exception as e:
                    print(f"Badge hook error: {e}")
            
            result['challenge_contributions'] = challenge_contributions
            result['new_badges'] = new_badges
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
        Get current user's observations.
        
        GET /api/observations/mine
        Header: Authorization: Bearer <token>
        """
        user = _get_user_from_request()
        
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        
        result = _run_async(get_observations_by_user(user['user_id']))
        return jsonify(result)


async def get_observations_by_user(user_id: str):
    """Get all observations for a specific user."""
    import aiohttp
    import ssl
    import certifi
    
    SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"
    
    url = f"{SUPABASE_URL}/rest/v1/observations?user_id=eq.{user_id}&order=created_at.desc"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    connector = aiohttp.TCPConnector(ssl=ssl_ctx)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=headers) as resp:
            observations = await resp.json() if resp.status == 200 else []
    
    # Stats
    sept_count = sum(1 for o in observations if o.get('observed_at', '').find('-09-') != -1)
    species = set(o.get('species_guess') for o in observations if o.get('species_guess'))
    
    return {
        "total": len(observations),
        "september_count": sept_count,
        "species_count": len(species),
        "observations": observations,
    }

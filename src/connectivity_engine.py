"""
Connectivity Engine
====================
Automatically tracks and updates neighbor connections.
Updates connectivity scores when neighbors join.
"""

import aiohttp
import asyncio
import ssl
import certifi
from datetime import datetime

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h


def grid_neighbors(grid_hash):
    """
    Get neighboring grid cells for a given hash.
    Grid hash format: "40.666_-111.897" (lat_lng with 3 decimals = ~100m precision)
    Returns list of adjacent grid hashes.
    """
    if not grid_hash or '_' not in grid_hash:
        return [grid_hash] if grid_hash else []
    
    try:
        lat, lng = grid_hash.split('_')
        lat = float(lat)
        lng = float(lng)
    except:
        return [grid_hash]
    
    # ~100m grid cells, get 3x3 area (~300m radius)
    neighbors = []
    for dlat in [-0.001, 0, 0.001]:
        for dlng in [-0.001, 0, 0.001]:
            new_lat = round(lat + dlat, 3)
            new_lng = round(lng + dlng, 3)
            neighbors.append(f"{new_lat}_{new_lng}")
    
    return neighbors


async def count_neighbors_in_program(user_id, grid_hash, token):
    """
    Count actual program participants near a given grid location.
    Looks at users with plant inventories or assessments in nearby grids.
    """
    if not grid_hash:
        return 0
    
    nearby_grids = grid_neighbors(grid_hash)
    
    async with aiohttp.ClientSession() as session:
        # Count unique users with inventories in nearby grids
        neighbor_users = set()
        
        for grid in nearby_grids:
            # Check plant inventories
            url = f"{SUPABASE_URL}/rest/v1/plant_inventories?grid_hash=eq.{grid}&select=user_id"
            async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for row in data:
                        if row.get('user_id') != user_id:
                            neighbor_users.add(row['user_id'])
            
            # Check assessments
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?grid_hash=eq.{grid}&select=user_id"
            async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for row in data:
                        if row.get('user_id') != user_id:
                            neighbor_users.add(row['user_id'])
        
        return len(neighbor_users)


async def count_referral_connections(user_id, token):
    """
    Count neighbors connected through referrals.
    - People I referred who joined
    - Person who referred me
    """
    count = 0
    
    async with aiohttp.ClientSession() as session:
        # People I referred who joined
        url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&status=eq.joined"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                data = await resp.json()
                count += len(data)
        
        # Person who referred me
        url = f"{SUPABASE_URL}/rest/v1/referrals?referred_user_id=eq.{user_id}&status=eq.joined"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                data = await resp.json()
                count += len(data)
    
    return count


async def get_total_connectivity(user_id, grid_hash, token):
    """
    Get total connectivity score inputs for a user.
    Combines:
    - Actual neighbors in program (nearby grids)
    - Referral connections
    """
    grid_neighbors_count = await count_neighbors_in_program(user_id, grid_hash, token)
    referral_count = await count_referral_connections(user_id, token)
    
    # Total unique neighbors (referrals are guaranteed unique, grid might overlap)
    # For simplicity, sum them but cap reasonably
    total = grid_neighbors_count + referral_count
    
    return {
        "grid_neighbors": grid_neighbors_count,
        "referral_connections": referral_count,
        "total_neighbors": total,
    }


async def on_referral_joined(referrer_id, referred_user_id, token):
    """
    Hook called when a referral is claimed.
    Updates connectivity for both users.
    """
    results = {
        "referrer_updated": False,
        "referred_updated": False,
    }
    
    async with aiohttp.ClientSession() as session:
        # Get referrer's latest assessment to update
        url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?user_id=eq.{referrer_id}&order=assessment_date.desc&limit=1"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                assessments = await resp.json()
                if assessments:
                    assessment = assessments[0]
                    grid_hash = assessment.get('grid_hash')
                    
                    # Recalculate neighbors
                    connectivity = await get_total_connectivity(referrer_id, grid_hash, token)
                    
                    # Update assessment
                    update_url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?id=eq.{assessment['id']}"
                    headers = _headers(token)
                    headers["Prefer"] = "return=representation"
                    
                    async with session.patch(
                        update_url,
                        headers=headers,
                        ssl=_ssl_context(),
                        json={"neighbors_in_program": connectivity['total_neighbors']}
                    ) as resp:
                        if resp.status == 200:
                            results["referrer_updated"] = True
                            results["referrer_neighbors"] = connectivity['total_neighbors']
    
    return results


# Sync wrappers
def count_neighbors_sync(user_id, grid_hash, token):
    return asyncio.run(count_neighbors_in_program(user_id, grid_hash, token))

def get_connectivity_sync(user_id, grid_hash, token):
    return asyncio.run(get_total_connectivity(user_id, grid_hash, token))

def on_referral_joined_sync(referrer_id, referred_user_id, token):
    return asyncio.run(on_referral_joined(referrer_id, referred_user_id, token))


def register_connectivity_routes(app):
    """Register connectivity API routes."""
    from flask import request, jsonify
    
    @app.route('/api/connectivity', methods=['GET'])
    def get_connectivity():
        """
        Get connectivity data for current user.
        
        GET /api/connectivity?grid_hash=40.666_-111.897
        """
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        grid_hash = request.args.get('grid_hash')
        
        async def fetch():
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers=_headers(token),
                    ssl=_ssl_context()
                ) as resp:
                    if resp.status != 200:
                        return None, "Invalid token"
                    user_data = await resp.json()
                    user_id = user_data.get('id')
            
            connectivity = await get_total_connectivity(user_id, grid_hash, token)
            
            # Calculate score contribution
            neighbors = connectivity['total_neighbors']
            
            if neighbors == 0:
                pioneer_bonus = 8
                neighbor_score = 0
            elif neighbors <= 2:
                pioneer_bonus = 4
                neighbor_score = neighbors * 2
            else:
                pioneer_bonus = 0
                neighbor_score = min(10, 5 + neighbors)
            
            connectivity['pioneer_bonus'] = pioneer_bonus
            connectivity['neighbor_score'] = neighbor_score
            connectivity['total_score'] = min(20, pioneer_bonus + neighbor_score + 2)  # +2 baseline
            
            return connectivity, None
        
        result, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify(result)
    
    @app.route('/api/connectivity/nearby', methods=['GET'])
    def get_nearby_participants():
        """
        Get count of nearby participants.
        
        GET /api/connectivity/nearby?grid_hash=40.666_-111.897
        """
        grid_hash = request.args.get('grid_hash')
        if not grid_hash:
            return jsonify({"error": "grid_hash required"}), 400
        
        nearby = grid_neighbors(grid_hash)
        
        async def count():
            total = 0
            async with aiohttp.ClientSession() as session:
                for grid in nearby:
                    url = f"{SUPABASE_URL}/rest/v1/plant_inventories?grid_hash=eq.{grid}&select=user_id"
                    async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            total += len(set(r['user_id'] for r in data))
            return total
        
        participant_count = asyncio.run(count())
        
        return jsonify({
            "grid_hash": grid_hash,
            "nearby_grids": nearby,
            "participant_count": participant_count
        })

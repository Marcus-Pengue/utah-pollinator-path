"""
Achievement Badges API
======================
Gamification badges for user milestones.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h

# Badge definitions
BADGES = {
    # Getting started
    "first_plant": {
        "name": "First Seed",
        "description": "Added your first plant to the garden",
        "icon": "🌱",
        "category": "getting_started",
        "points": 10,
    },
    "first_observation": {
        "name": "Eagle Eye",
        "description": "Logged your first pollinator observation",
        "icon": "👁️",
        "category": "getting_started",
        "points": 10,
    },
    
    # Milkweed hero
    "first_milkweed": {
        "name": "Monarch Friend",
        "description": "Planted your first milkweed",
        "icon": "🦋",
        "category": "milkweed",
        "points": 25,
    },
    "milkweed_5": {
        "name": "Milkweed Champion",
        "description": "Planted 5+ milkweed plants",
        "icon": "🏆",
        "category": "milkweed",
        "points": 50,
    },
    "milkweed_10": {
        "name": "Monarch Sanctuary",
        "description": "Planted 10+ milkweed plants",
        "icon": "👑",
        "category": "milkweed",
        "points": 100,
    },
    
    # September critical
    "september_ready": {
        "name": "September Ready",
        "description": "Have fall-blooming plants for monarch migration",
        "icon": "🍂",
        "category": "seasonal",
        "points": 50,
    },
    "fall_trio": {
        "name": "Fall Trio",
        "description": "Planted 3+ different fall-blooming species",
        "icon": "🎃",
        "category": "seasonal",
        "points": 75,
    },
    
    # Diversity
    "diversity_5": {
        "name": "Variety Pack",
        "description": "5 different native species in your garden",
        "icon": "🌈",
        "category": "diversity",
        "points": 30,
    },
    "diversity_10": {
        "name": "Biodiversity Hero",
        "description": "10 different native species in your garden",
        "icon": "🌺",
        "category": "diversity",
        "points": 75,
    },
    
    # Community
    "pioneer": {
        "name": "Trailblazer",
        "description": "First participant in your neighborhood",
        "icon": "🚀",
        "category": "community",
        "points": 50,
    },
    "recruiter": {
        "name": "Pollinator Ambassador",
        "description": "Invited a neighbor who joined",
        "icon": "🤝",
        "category": "community",
        "points": 40,
    },
    "challenge_complete": {
        "name": "Challenge Champion",
        "description": "Completed a ward challenge",
        "icon": "⚔️",
        "category": "community",
        "points": 100,
    },
    
    # Observations
    "observations_10": {
        "name": "Citizen Scientist",
        "description": "Logged 10 pollinator observations",
        "icon": "🔬",
        "category": "observations",
        "points": 50,
    },
    "observations_50": {
        "name": "Field Researcher",
        "description": "Logged 50 pollinator observations",
        "icon": "📊",
        "category": "observations",
        "points": 150,
    },
}


async def get_user_id(token):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=_headers(token),
            ssl=_ssl_context()
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('id')
    return None


async def get_user_badges(user_id, token):
    """Get badges user has earned."""
    url = f"{SUPABASE_URL}/rest/v1/user_badges?user_id=eq.{user_id}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                return await resp.json()
    return []


async def award_badge(user_id, badge_key, token):
    """Award a badge to user if not already earned."""
    # Check if already has badge
    existing = await get_user_badges(user_id, token)
    if any(b['badge_key'] == badge_key for b in existing):
        return None  # Already has it
    
    # Award badge
    url = f"{SUPABASE_URL}/rest/v1/user_badges"
    headers = _headers(token)
    headers["Prefer"] = "return=representation"
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, ssl=_ssl_context(), json={
            "user_id": user_id,
            "badge_key": badge_key,
            "earned_at": datetime.utcnow().isoformat()
        }) as resp:
            if resp.status == 201:
                data = await resp.json()
                badge_info = BADGES.get(badge_key, {})
                return {
                    "badge_key": badge_key,
                    **badge_info,
                    "new": True
                }
    return None


async def check_and_award_badges(user_id, token):
    """Check user's progress and award any earned badges."""
    newly_awarded = []
    
    async with aiohttp.ClientSession() as session:
        # Get user's plant inventory
        inv_url = f"{SUPABASE_URL}/rest/v1/plant_inventories?user_id=eq.{user_id}"
        async with session.get(inv_url, headers=_headers(token), ssl=_ssl_context()) as resp:
            plants = await resp.json() if resp.status == 200 else []
        
        # Get user's observations
        obs_url = f"{SUPABASE_URL}/rest/v1/observations?user_id=eq.{user_id}"
        async with session.get(obs_url, headers=_headers(token), ssl=_ssl_context()) as resp:
            observations = await resp.json() if resp.status == 200 else []
    
    total_plants = sum(p.get('count', 1) for p in plants)
    total_milkweed = sum(p.get('count', 1) for p in plants if p.get('is_milkweed'))
    unique_species = len(set(p.get('species', '') for p in plants))
    has_fall = any('fall' in str(p.get('bloom_seasons', [])) for p in plants)
    fall_species = len([p for p in plants if 'fall' in str(p.get('bloom_seasons', []))])
    total_observations = len(observations)
    
    # Check each badge
    checks = [
        ("first_plant", total_plants >= 1),
        ("first_observation", total_observations >= 1),
        ("first_milkweed", total_milkweed >= 1),
        ("milkweed_5", total_milkweed >= 5),
        ("milkweed_10", total_milkweed >= 10),
        ("september_ready", has_fall),
        ("fall_trio", fall_species >= 3),
        ("diversity_5", unique_species >= 5),
        ("diversity_10", unique_species >= 10),
        ("observations_10", total_observations >= 10),
        ("observations_50", total_observations >= 50),
    ]
    
    for badge_key, condition in checks:
        if condition:
            result = await award_badge(user_id, badge_key, token)
            if result:
                newly_awarded.append(result)
    
    return newly_awarded


def register_badges_routes(app):
    """Register badge routes."""
    
    @app.route('/api/badges', methods=['GET'])
    def list_all_badges():
        """Get all available badges."""
        badges_list = []
        for key, badge in BADGES.items():
            badges_list.append({"key": key, **badge})
        
        # Group by category
        categories = {}
        for b in badges_list:
            cat = b.get('category', 'other')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(b)
        
        return jsonify({"badges": badges_list, "by_category": categories})
    
    @app.route('/api/badges/my', methods=['GET'])
    def my_badges():
        """Get current user's earned badges."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            earned = await get_user_badges(user_id, token)
            
            # Enrich with badge info
            badges = []
            for e in earned:
                badge_info = BADGES.get(e['badge_key'], {})
                badges.append({
                    **e,
                    **badge_info
                })
            
            total_points = sum(b.get('points', 0) for b in badges)
            
            return {
                "earned": badges,
                "count": len(badges),
                "total_points": total_points,
                "available": len(BADGES),
            }, None
        
        result, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify(result)
    
    @app.route('/api/badges/check', methods=['POST'])
    def check_badges():
        """Check and award any new badges for current user."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def check():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            newly_awarded = await check_and_award_badges(user_id, token)
            return newly_awarded, None
        
        result, error = asyncio.run(check())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({
            "new_badges": result,
            "count": len(result),
            "message": f"🎉 Earned {len(result)} new badge(s)!" if result else "No new badges yet"
        })

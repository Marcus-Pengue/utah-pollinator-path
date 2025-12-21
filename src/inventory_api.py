"""
Plant Inventory API
====================
CRUD operations for user plant inventories.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from species_db import PLANTS
from challenge_hooks import on_plant_added_sync
from badge_engine import on_plant_added_check_badges

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(access_token=None):
    h = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        h["Authorization"] = f"Bearer {access_token}"
    else:
        h["Authorization"] = f"Bearer {SUPABASE_KEY}"
    return h

def get_plant(species_key):
    """Get plant from database by key or name."""
    if species_key in PLANTS:
        return PLANTS[species_key]
    species_lower = species_key.lower().replace('_', ' ')
    for key, plant in PLANTS.items():
        if plant.common_name.lower() == species_lower:
            return plant
    return None

async def get_user_id(token):
    """Get user ID from token."""
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

async def db_query(method, table, token, params=None, data=None, filters=None):
    """Execute database query."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    if filters:
        query_parts = []
        for k, v in filters.items():
            query_parts.append(f"{k}=eq.{v}")
        if query_parts:
            url += "?" + "&".join(query_parts)
    
    if params:
        sep = "?" if "?" not in url else "&"
        url += sep + "&".join(f"{k}={v}" for k, v in params.items())
    
    headers = _headers(token)
    if method in ['POST', 'PATCH']:
        headers["Prefer"] = "return=representation"
    
    async with aiohttp.ClientSession() as session:
        kwargs = {"headers": headers, "ssl": _ssl_context()}
        if data:
            kwargs["json"] = data
        
        async with session.request(method, url, **kwargs) as resp:
            if resp.status in [200, 201]:
                return await resp.json()
            elif resp.status == 204:
                return []
            else:
                text = await resp.text()
                return {"error": text, "status": resp.status}


def register_inventory_routes(app):
    """Register plant inventory routes."""
    
    @app.route('/api/inventory', methods=['GET'])
    def get_inventory():
        """Get current user's plant inventory."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            filters = {"user_id": user_id}
            grid_hash = request.args.get('grid_hash')
            if grid_hash:
                filters["grid_hash"] = grid_hash
            
            result = await db_query('GET', 'plant_inventories', token, 
                params={"order": "created_at.desc"}, filters=filters)
            return result, None
        
        result, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        if isinstance(result, dict) and 'error' in result:
            return jsonify(result), result.get('status', 500)
        
        plants = []
        for p in result:
            plant_info = get_plant(p.get('species', ''))
            plants.append({
                **p,
                "monarch_value": getattr(plant_info, 'monarch_value', None) if plant_info else None,
            })
        
        return jsonify({
            "plants": plants,
            "count": len(plants),
            "has_fall_blooms": any('fall' in (p.get('bloom_seasons') or []) for p in plants),
            "has_milkweed": any(p.get('is_milkweed') for p in plants),
        })
    
    @app.route('/api/inventory', methods=['POST'])
    def add_plant():
        """Add a plant to inventory."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        if not data.get('species'):
            return jsonify({"error": "species required"}), 400
        if not data.get('grid_hash'):
            return jsonify({"error": "grid_hash required"}), 400
        
        async def insert():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            known_plant = get_plant(data['species'].lower().replace(' ', '_'))
            
            record = {
                "user_id": user_id,
                "grid_hash": data['grid_hash'],
                "species": data['species'],
                "common_name": data.get('common_name') or (known_plant.common_name if known_plant else None),
                "count": data.get('count', 1),
                "bloom_seasons": data.get('bloom_seasons', []),
                "is_native": data.get('is_native', True),
                "is_milkweed": data.get('is_milkweed', False),
                "notes": data.get('notes'),
            }
            
            if known_plant:
                if not record['bloom_seasons']:
                    record['bloom_seasons'] = [s.value for s in known_plant.bloom_seasons]
                record['is_native'] = known_plant.native_to_utah
                record['is_milkweed'] = 'milkweed' in known_plant.common_name.lower()
            
            result = await db_query('POST', 'plant_inventories', token, data=record)
            return result, None
        
        result, error = asyncio.run(insert())
        if error:
            return jsonify({"error": error}), 401
        
        if isinstance(result, dict) and 'error' in result:
            return jsonify(result), result.get('status', 500)
        
        # Auto-contribute to challenges
        challenge_contributions = []
        try:
            plant_info = {
                "count": record.get('count', 1),
                "is_milkweed": record.get('is_milkweed', False),
                "bloom_seasons": record.get('bloom_seasons', []),
            }
            challenge_contributions = on_plant_added_sync(user_id, plant_info, token)
        except Exception as e:
            print(f"Challenge hook error: {e}")
        
        return jsonify({
            "success": True,
            "plant": result[0] if result else None,
            "message": f"Added {data['species']} to your garden",
            "challenge_contributions": challenge_contributions,
            "new_badges": new_badges
        }), 201
    
    @app.route('/api/inventory/<plant_id>', methods=['DELETE'])
    def delete_plant(plant_id):
        """Remove a plant from inventory."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def delete():
            user_id = await get_user_id(token)
            if not user_id:
                return "Invalid token"
            
            await db_query('DELETE', 'plant_inventories', token, 
                filters={"id": plant_id, "user_id": user_id})
            return None
        
        error = asyncio.run(delete())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({"success": True, "message": "Plant removed"})
    
    @app.route('/api/inventory/suggestions', methods=['GET'])
    def get_suggestions():
        """Get plant suggestions based on what user is missing."""
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ')[1] if auth_header.startswith('Bearer ') else None
        
        suggestions = {"critical": [], "recommended": []}
        user_plants = []
        has_fall = False
        has_milkweed = False
        
        if token:
            async def fetch():
                user_id = await get_user_id(token)
                if not user_id:
                    return []
                filters = {"user_id": user_id}
                grid_hash = request.args.get('grid_hash')
                if grid_hash:
                    filters["grid_hash"] = grid_hash
                return await db_query('GET', 'plant_inventories', token, filters=filters)
            
            result = asyncio.run(fetch())
            if isinstance(result, list):
                user_plants = [p.get('species', '').lower() for p in result]
                has_fall = any('fall' in (p.get('bloom_seasons') or []) for p in result)
                has_milkweed = any(p.get('is_milkweed') for p in result)
        
        if not has_fall:
            for key in ['rubber_rabbitbrush', 'showy_goldenrod', 'new_england_aster']:
                plant = PLANTS.get(key)
                if plant and plant.common_name.lower() not in user_plants:
                    suggestions['critical'].append({
                        "species": key,
                        "common_name": plant.common_name,
                        "reason": "September nectar gap - critical for monarch migration",
                        "monarch_value": plant.monarch_value,
                    })
        
        if not has_milkweed:
            for key in ['showy_milkweed', 'narrowleaf_milkweed']:
                plant = PLANTS.get(key)
                if plant and plant.common_name.lower() not in user_plants:
                    suggestions['critical'].append({
                        "species": key,
                        "common_name": plant.common_name,
                        "reason": "Monarch host plant - caterpillars only eat milkweed",
                        "monarch_value": plant.monarch_value,
                    })
        
        for key, plant in PLANTS.items():
            if plant.common_name.lower() not in user_plants:
                if key not in [s['species'] for s in suggestions['critical']]:
                    if plant.monarch_value >= 7:
                        suggestions['recommended'].append({
                            "species": key,
                            "common_name": plant.common_name,
                            "monarch_value": plant.monarch_value,
                            "bloom_seasons": [s.value for s in plant.bloom_seasons],
                        })
        
        suggestions['recommended'] = sorted(
            suggestions['recommended'], 
            key=lambda x: x['monarch_value'], 
            reverse=True
        )[:5]
        
        return jsonify(suggestions)

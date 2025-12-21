"""
Ward Challenges API
====================
Group competitions and collective goals.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(access_token=None):
    h = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }
    h["Authorization"] = f"Bearer {access_token}" if access_token else f"Bearer {SUPABASE_KEY}"
    return h

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

async def db_query(method, table, token=None, params=None, data=None, filters=None):
    """Execute database query."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    if filters:
        query_parts = [f"{k}=eq.{v}" for k, v in filters.items()]
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


# Pre-defined challenge templates
CHALLENGE_TEMPLATES = {
    "september_ready": {
        "name": "September Ready",
        "description": "Get 10 households to plant fall-blooming natives before monarch migration",
        "goal_type": "fall_bloomers",
        "goal_target": 10,
        "duration_days": 30,
    },
    "milkweed_mission": {
        "name": "Milkweed Mission",
        "description": "Plant 50 milkweed across the ward for monarch caterpillars",
        "goal_type": "milkweed",
        "goal_target": 50,
        "duration_days": 60,
    },
    "pollinator_block": {
        "name": "Pollinator Block Party",
        "description": "Get 20 neighbors participating in the program",
        "goal_type": "participants",
        "goal_target": 20,
        "duration_days": 90,
    },
    "diversity_drive": {
        "name": "Diversity Drive",
        "description": "Collectively plant 25 different native species",
        "goal_type": "species_count",
        "goal_target": 25,
        "duration_days": 60,
    },
    "observation_blitz": {
        "name": "Observation Blitz",
        "description": "Log 100 pollinator observations this month",
        "goal_type": "observations",
        "goal_target": 100,
        "duration_days": 30,
    },
}


def register_challenges_routes(app):
    """Register challenge routes."""
    
    @app.route('/api/challenges', methods=['GET'])
    def list_challenges():
        """
        List challenges.
        
        GET /api/challenges?ward=Murray%205th&status=active
        """
        async def fetch():
            params = {"order": "created_at.desc"}
            url = f"{SUPABASE_URL}/rest/v1/challenges?select=*,challenge_participants(count)"
            
            ward = request.args.get('ward')
            city = request.args.get('city')
            status = request.args.get('status', 'active')
            
            filters = []
            if ward:
                filters.append(f"ward=eq.{ward}")
            if city:
                filters.append(f"city=eq.{city}")
            if status:
                filters.append(f"status=eq.{status}")
            
            if filters:
                url += "&" + "&".join(filters)
            
            url += "&order=created_at.desc"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return []
        
        challenges = asyncio.run(fetch())
        
        # Calculate progress percentage
        for c in challenges:
            c['progress_pct'] = min(100, int((c.get('current_progress', 0) / max(c.get('goal_target', 1), 1)) * 100))
            c['participant_count'] = c.get('challenge_participants', [{}])[0].get('count', 0) if c.get('challenge_participants') else 0
        
        return jsonify({"challenges": challenges, "count": len(challenges)})
    
    @app.route('/api/challenges/templates', methods=['GET'])
    def get_templates():
        """Get pre-defined challenge templates."""
        return jsonify({"templates": CHALLENGE_TEMPLATES})
    
    @app.route('/api/challenges', methods=['POST'])
    def create_challenge():
        """
        Create a new challenge.
        
        POST /api/challenges
        {
            "template": "september_ready",  // OR provide custom fields
            "ward": "Murray 5th",
            "city": "Murray"
        }
        
        OR custom:
        {
            "name": "Custom Challenge",
            "description": "...",
            "goal_type": "plants_added",
            "goal_target": 100,
            "ward": "Murray 5th"
        }
        """
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        async def create():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            # Use template or custom
            if data.get('template') and data['template'] in CHALLENGE_TEMPLATES:
                template = CHALLENGE_TEMPLATES[data['template']]
                record = {
                    "name": template['name'],
                    "description": template['description'],
                    "goal_type": template['goal_type'],
                    "goal_target": template['goal_target'],
                    "challenge_type": "collective",
                    "ward": data.get('ward'),
                    "city": data.get('city'),
                    "created_by": user_id,
                    "status": "active",
                    "ends_at": (datetime.utcnow() + timedelta(days=template['duration_days'])).isoformat(),
                }
            else:
                # Custom challenge
                if not data.get('name') or not data.get('goal_type') or not data.get('goal_target'):
                    return None, "name, goal_type, and goal_target required"
                
                record = {
                    "name": data['name'],
                    "description": data.get('description', ''),
                    "goal_type": data['goal_type'],
                    "goal_target": data['goal_target'],
                    "challenge_type": data.get('challenge_type', 'collective'),
                    "ward": data.get('ward'),
                    "city": data.get('city'),
                    "created_by": user_id,
                    "status": "active",
                }
                if data.get('duration_days'):
                    record["ends_at"] = (datetime.utcnow() + timedelta(days=data['duration_days'])).isoformat()
            
            result = await db_query('POST', 'challenges', token, data=record)
            
            if isinstance(result, list) and result:
                # Auto-join creator
                await db_query('POST', 'challenge_participants', token, data={
                    "challenge_id": result[0]['id'],
                    "user_id": user_id,
                    "contribution": 0
                })
            
            return result, None
        
        result, error = asyncio.run(create())
        if error:
            return jsonify({"error": error}), 400
        
        if isinstance(result, dict) and 'error' in result:
            return jsonify(result), result.get('status', 500)
        
        return jsonify({
            "success": True,
            "challenge": result[0] if result else None,
            "message": "Challenge created! Share with your ward."
        }), 201
    
    @app.route('/api/challenges/<challenge_id>', methods=['GET'])
    def get_challenge(challenge_id):
        """Get challenge details with participants."""
        async def fetch():
            # Get challenge
            challenge = await db_query('GET', 'challenges', filters={"id": challenge_id})
            if not challenge or isinstance(challenge, dict):
                return None, None
            
            # Get participants
            participants = await db_query('GET', 'challenge_participants', 
                filters={"challenge_id": challenge_id},
                params={"order": "contribution.desc"})
            
            return challenge[0] if challenge else None, participants if isinstance(participants, list) else []
        
        challenge, participants = asyncio.run(fetch())
        
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        challenge['participants'] = participants
        challenge['participant_count'] = len(participants)
        challenge['progress_pct'] = min(100, int((challenge.get('current_progress', 0) / max(challenge.get('goal_target', 1), 1)) * 100))
        
        return jsonify(challenge)
    
    @app.route('/api/challenges/<challenge_id>/join', methods=['POST'])
    def join_challenge(challenge_id):
        """Join a challenge."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def join():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            result = await db_query('POST', 'challenge_participants', token, data={
                "challenge_id": challenge_id,
                "user_id": user_id,
                "contribution": 0
            })
            return result, None
        
        result, error = asyncio.run(join())
        if error:
            return jsonify({"error": error}), 401
        
        if isinstance(result, dict) and 'error' in result:
            # Probably already joined (unique constraint)
            return jsonify({"success": True, "message": "Already participating"})
        
        return jsonify({"success": True, "message": "Joined challenge!"})
    
    @app.route('/api/challenges/<challenge_id>/contribute', methods=['POST'])
    def contribute_to_challenge(challenge_id):
        """
        Record a contribution to a challenge.
        
        POST /api/challenges/<id>/contribute
        {"amount": 1, "type": "fall_bloomers"}
        """
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json() or {}
        amount = data.get('amount', 1)
        
        async def contribute():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            # Get current participation
            participant = await db_query('GET', 'challenge_participants', 
                filters={"challenge_id": challenge_id, "user_id": user_id})
            
            if not participant or not isinstance(participant, list) or len(participant) == 0:
                # Auto-join
                await db_query('POST', 'challenge_participants', token, data={
                    "challenge_id": challenge_id,
                    "user_id": user_id,
                    "contribution": amount
                })
                current_contribution = amount
            else:
                # Update contribution
                current_contribution = participant[0].get('contribution', 0) + amount
                await db_query('PATCH', 'challenge_participants', token,
                    data={"contribution": current_contribution},
                    filters={"challenge_id": challenge_id, "user_id": user_id})
            
            # Update challenge progress
            challenge = await db_query('GET', 'challenges', filters={"id": challenge_id})
            if challenge and isinstance(challenge, list) and len(challenge) > 0:
                new_progress = challenge[0].get('current_progress', 0) + amount
                await db_query('PATCH', 'challenges', token,
                    data={"current_progress": new_progress},
                    filters={"id": challenge_id})
                
                # Check if completed
                if new_progress >= challenge[0].get('goal_target', 0):
                    await db_query('PATCH', 'challenges', token,
                        data={"status": "completed"},
                        filters={"id": challenge_id})
                    return {"completed": True, "progress": new_progress}, None
                
                return {"completed": False, "progress": new_progress}, None
            
            return {"completed": False}, None
        
        result, error = asyncio.run(contribute())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({
            "success": True,
            "progress": result.get('progress'),
            "completed": result.get('completed'),
            "message": "🎉 Challenge completed!" if result.get('completed') else "Contribution recorded!"
        })
    
    @app.route('/api/challenges/my', methods=['GET'])
    def my_challenges():
        """Get challenges user is participating in."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            user_id = await get_user_id(token)
            if not user_id:
                return [], "Invalid token"
            
            # Get participations
            participations = await db_query('GET', 'challenge_participants',
                filters={"user_id": user_id})
            
            if not participations or not isinstance(participations, list):
                return [], None
            
            # Get challenge details for each
            challenges = []
            for p in participations:
                challenge = await db_query('GET', 'challenges', 
                    filters={"id": p['challenge_id']})
                if challenge and isinstance(challenge, list) and len(challenge) > 0:
                    c = challenge[0]
                    c['my_contribution'] = p.get('contribution', 0)
                    c['progress_pct'] = min(100, int((c.get('current_progress', 0) / max(c.get('goal_target', 1), 1)) * 100))
                    challenges.append(c)
            
            return challenges, None
        
        challenges, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({"challenges": challenges, "count": len(challenges)})

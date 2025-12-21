"""
Challenge Hooks
===============
Auto-contribute to challenges when users take actions.
"""

import aiohttp
import asyncio
import ssl
import certifi

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h


async def get_user_challenges(user_id, token):
    """Get challenges user is participating in."""
    url = f"{SUPABASE_URL}/rest/v1/challenge_participants?user_id=eq.{user_id}&select=challenge_id,contribution"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                participations = await resp.json()
                
                # Get challenge details
                challenges = []
                for p in participations:
                    chal_url = f"{SUPABASE_URL}/rest/v1/challenges?id=eq.{p['challenge_id']}&status=eq.active"
                    async with session.get(chal_url, headers=_headers(token), ssl=_ssl_context()) as cresp:
                        if cresp.status == 200:
                            chal_data = await cresp.json()
                            if chal_data:
                                challenges.append({
                                    **chal_data[0],
                                    "my_contribution": p['contribution']
                                })
                return challenges
    return []


async def contribute_to_challenge(challenge_id, user_id, amount, token):
    """Add contribution to a challenge."""
    async with aiohttp.ClientSession() as session:
        # Update participant contribution
        url = f"{SUPABASE_URL}/rest/v1/challenge_participants?challenge_id=eq.{challenge_id}&user_id=eq.{user_id}"
        
        # Get current
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data:
                    new_contrib = data[0].get('contribution', 0) + amount
                    headers = _headers(token)
                    headers["Prefer"] = "return=representation"
                    async with session.patch(url, headers=headers, ssl=_ssl_context(),
                        json={"contribution": new_contrib}) as presp:
                        pass
        
        # Update challenge progress
        chal_url = f"{SUPABASE_URL}/rest/v1/challenges?id=eq.{challenge_id}"
        async with session.get(chal_url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                chal_data = await resp.json()
                if chal_data:
                    new_progress = chal_data[0].get('current_progress', 0) + amount
                    goal = chal_data[0].get('goal_target', 0)
                    
                    update_data = {"current_progress": new_progress}
                    if new_progress >= goal:
                        update_data["status"] = "completed"
                    
                    headers = _headers(token)
                    headers["Prefer"] = "return=representation"
                    async with session.patch(chal_url, headers=headers, ssl=_ssl_context(),
                        json=update_data) as presp:
                        if new_progress >= goal:
                            return {"completed": True, "challenge_name": chal_data[0].get('name')}
    
    return {"completed": False}


async def on_plant_added(user_id, plant_data, token):
    """
    Hook called when a plant is added to inventory.
    Auto-contributes to relevant challenges.
    
    Returns list of challenges contributed to.
    """
    contributions = []
    
    # Get user's active challenges
    challenges = await get_user_challenges(user_id, token)
    
    if not challenges:
        return contributions
    
    count = plant_data.get('count', 1)
    is_milkweed = plant_data.get('is_milkweed', False)
    bloom_seasons = plant_data.get('bloom_seasons', [])
    is_fall_bloomer = any(s in ['fall', 'early_fall', 'late_fall'] for s in bloom_seasons)
    
    for challenge in challenges:
        goal_type = challenge.get('goal_type')
        contributed = False
        
        # Milkweed challenge
        if goal_type == 'milkweed' and is_milkweed:
            result = await contribute_to_challenge(challenge['id'], user_id, count, token)
            contributed = True
            contributions.append({
                "challenge": challenge['name'],
                "amount": count,
                "type": "milkweed",
                "completed": result.get('completed', False)
            })
        
        # Fall bloomers challenge
        elif goal_type == 'fall_bloomers' and is_fall_bloomer:
            result = await contribute_to_challenge(challenge['id'], user_id, count, token)
            contributed = True
            contributions.append({
                "challenge": challenge['name'],
                "amount": count,
                "type": "fall_bloomer",
                "completed": result.get('completed', False)
            })
        
        # Plants added (any plant)
        elif goal_type == 'plants_added':
            result = await contribute_to_challenge(challenge['id'], user_id, count, token)
            contributed = True
            contributions.append({
                "challenge": challenge['name'],
                "amount": count,
                "type": "plant",
                "completed": result.get('completed', False)
            })
        
        # Species count (count as 1 regardless of plant count)
        elif goal_type == 'species_count':
            result = await contribute_to_challenge(challenge['id'], user_id, 1, token)
            contributed = True
            contributions.append({
                "challenge": challenge['name'],
                "amount": 1,
                "type": "species",
                "completed": result.get('completed', False)
            })
    
    return contributions


async def on_observation_added(user_id, observation_data, token):
    """
    Hook called when an observation is added.
    Auto-contributes to observation challenges.
    """
    contributions = []
    
    challenges = await get_user_challenges(user_id, token)
    
    for challenge in challenges:
        if challenge.get('goal_type') == 'observations':
            result = await contribute_to_challenge(challenge['id'], user_id, 1, token)
            contributions.append({
                "challenge": challenge['name'],
                "amount": 1,
                "type": "observation",
                "completed": result.get('completed', False)
            })
    
    return contributions


# Sync wrappers for Flask
def on_plant_added_sync(user_id, plant_data, token):
    return asyncio.run(on_plant_added(user_id, plant_data, token))

def on_observation_added_sync(user_id, observation_data, token):
    return asyncio.run(on_observation_added(user_id, observation_data, token))

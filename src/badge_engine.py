"""
Badge Engine
=============
Automatically awards badges based on user actions.
Called from various hooks when actions occur.
"""

import aiohttp
import asyncio
import ssl
import certifi
from datetime import datetime
from event_logger import log_badge_earned

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h

# Badge definitions with trigger conditions
BADGE_TRIGGERS = {
    # Plant-based badges
    "first_plant": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('total_plants', 0) >= 1,
    },
    "first_milkweed": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('total_milkweed', 0) >= 1,
    },
    "milkweed_5": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('total_milkweed', 0) >= 5,
    },
    "milkweed_10": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('total_milkweed', 0) >= 10,
    },
    "september_ready": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('has_fall_blooms', False),
    },
    "fall_trio": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('fall_species_count', 0) >= 3,
    },
    "diversity_5": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('unique_species', 0) >= 5,
    },
    "diversity_10": {
        "trigger": "plant_added",
        "condition": lambda stats: stats.get('unique_species', 0) >= 10,
    },
    
    # Observation-based badges
    "first_observation": {
        "trigger": "observation_added",
        "condition": lambda stats: stats.get('total_observations', 0) >= 1,
    },
    "observations_10": {
        "trigger": "observation_added",
        "condition": lambda stats: stats.get('total_observations', 0) >= 10,
    },
    "observations_50": {
        "trigger": "observation_added",
        "condition": lambda stats: stats.get('total_observations', 0) >= 50,
    },
    
    # Referral badges (handled in referrals_api already, but included for completeness)
    "recruiter": {
        "trigger": "referral_joined",
        "condition": lambda stats: stats.get('referrals_joined', 0) >= 1,
    },
    
    # Assessment badges
    "first_assessment": {
        "trigger": "assessment_completed",
        "condition": lambda stats: stats.get('total_assessments', 0) >= 1,
    },
    
    # Challenge badges
    "challenge_complete": {
        "trigger": "challenge_completed",
        "condition": lambda stats: stats.get('challenges_completed', 0) >= 1,
    },
    
    # Pioneer badge (first in grid)
    "pioneer": {
        "trigger": "any",
        "condition": lambda stats: stats.get('is_pioneer', False),
    },
}


async def get_user_badges(user_id, token):
    """Get badges user already has."""
    url = f"{SUPABASE_URL}/rest/v1/user_badges?user_id=eq.{user_id}&select=badge_key"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                data = await resp.json()
                return set(b['badge_key'] for b in data)
    return set()


async def award_badge(user_id, badge_key, token):
    """Award a badge to user."""
    url = f"{SUPABASE_URL}/rest/v1/user_badges"
    headers = _headers(token)
    headers["Prefer"] = "return=representation"
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, ssl=_ssl_context(), json={
            "user_id": user_id,
            "badge_key": badge_key,
            "earned_at": datetime.utcnow().isoformat()
        }) as resp:
            return resp.status == 201


async def get_user_stats(user_id, token):
    """Gather all stats needed for badge checks."""
    stats = {
        "total_plants": 0,
        "total_milkweed": 0,
        "has_fall_blooms": False,
        "fall_species_count": 0,
        "unique_species": 0,
        "total_observations": 0,
        "total_assessments": 0,
        "referrals_joined": 0,
        "challenges_completed": 0,
        "is_pioneer": False,
    }
    
    async with aiohttp.ClientSession() as session:
        # Plant inventory stats
        url = f"{SUPABASE_URL}/rest/v1/plant_inventories?user_id=eq.{user_id}"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                plants = await resp.json()
                stats['total_plants'] = sum(p.get('count', 1) for p in plants)
                stats['total_milkweed'] = sum(p.get('count', 1) for p in plants if p.get('is_milkweed'))
                stats['unique_species'] = len(set(p.get('species', '') for p in plants))
                
                fall_species = set()
                for p in plants:
                    seasons = p.get('bloom_seasons', []) or []
                    if any('fall' in str(s).lower() for s in seasons):
                        stats['has_fall_blooms'] = True
                        fall_species.add(p.get('species'))
                stats['fall_species_count'] = len(fall_species)
        
        # Observation stats
        url = f"{SUPABASE_URL}/rest/v1/observations?user_id=eq.{user_id}"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                observations = await resp.json()
                stats['total_observations'] = len(observations)
        
        # Assessment stats
        url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?user_id=eq.{user_id}"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                assessments = await resp.json()
                stats['total_assessments'] = len(assessments)
        
        # Referral stats
        url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&status=eq.joined"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                referrals = await resp.json()
                stats['referrals_joined'] = len(referrals)
        
        # Challenge completion stats
        url = f"{SUPABASE_URL}/rest/v1/challenge_participants?user_id=eq.{user_id}"
        async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                participations = await resp.json()
                # Check if any challenges they're in are completed
                for p in participations:
                    chal_url = f"{SUPABASE_URL}/rest/v1/challenges?id=eq.{p['challenge_id']}&status=eq.completed"
                    async with session.get(chal_url, headers=_headers(token), ssl=_ssl_context()) as cresp:
                        if cresp.status == 200:
                            completed = await cresp.json()
                            if completed:
                                stats['challenges_completed'] += 1
    
    return stats


async def check_and_award_badges(user_id, trigger, token):
    """
    Check all badges for a trigger event and award any earned.
    
    Args:
        user_id: User to check
        trigger: Event type (plant_added, observation_added, etc.)
        token: Auth token
    
    Returns:
        List of newly awarded badge keys
    """
    # Get current badges
    existing = await get_user_badges(user_id, token)
    
    # Get user stats
    stats = await get_user_stats(user_id, token)
    
    # Check each badge
    newly_awarded = []
    
    for badge_key, badge_info in BADGE_TRIGGERS.items():
        # Skip if already has badge
        if badge_key in existing:
            continue
        
        # Skip if trigger doesn't match (unless it's "any")
        if badge_info['trigger'] != trigger and badge_info['trigger'] != 'any':
            continue
        
        # Check condition
        try:
            if badge_info['condition'](stats):
                if await award_badge(user_id, badge_key, token):
                    newly_awarded.append(badge_key)
                    try:
                        log_badge_earned(user_id, badge_key, badge_key)
                    except:
                        pass
        except Exception as e:
            print(f"Badge check error for {badge_key}: {e}")
    
    return newly_awarded


# Sync wrappers for Flask routes
def check_badges_sync(user_id, trigger, token):
    """Sync wrapper for checking badges."""
    return asyncio.run(check_and_award_badges(user_id, trigger, token))


# Convenience functions for specific triggers
def on_plant_added_check_badges(user_id, token):
    return check_badges_sync(user_id, "plant_added", token)

def on_observation_added_check_badges(user_id, token):
    return check_badges_sync(user_id, "observation_added", token)

def on_assessment_completed_check_badges(user_id, token):
    return check_badges_sync(user_id, "assessment_completed", token)

def on_challenge_completed_check_badges(user_id, token):
    return check_badges_sync(user_id, "challenge_completed", token)

"""
Event Logger
=============
Tracks all user actions for analytics and debugging.
Non-blocking async logging.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from admin_auth import require_admin
from datetime import datetime, timedelta
from functools import wraps

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers():
    return {"apikey": SUPABASE_KEY, "Content-Type": "application/json", "Authorization": f"Bearer {SUPABASE_KEY}"}


# Event types
EVENT_TYPES = {
    # User actions
    "user.signup": "User signed up",
    "user.login": "User logged in",
    
    # Inventory
    "inventory.plant_added": "Plant added to inventory",
    "inventory.plant_removed": "Plant removed from inventory",
    "inventory.plant_updated": "Plant updated",
    
    # Observations
    "observation.created": "Observation submitted",
    "observation.verified": "Observation verified",
    "observation.rejected": "Observation rejected",
    
    # Assessments
    "assessment.created": "Habitat assessment completed",
    "assessment.updated": "Assessment updated",
    
    # Challenges
    "challenge.created": "Challenge created",
    "challenge.joined": "User joined challenge",
    "challenge.contributed": "Contribution to challenge",
    "challenge.completed": "Challenge completed",
    
    # Referrals
    "referral.created": "Referral link created",
    "referral.claimed": "Referral claimed",
    
    # Badges
    "badge.earned": "Badge earned",
    
    # Scores
    "score.calculated": "Score calculated",
    "score.improved": "Score improved",
    
    # Alerts
    "alert.sent": "Alert sent to user",
    "alert.read": "Alert read",
    
    # System
    "job.started": "Scheduled job started",
    "job.completed": "Scheduled job completed",
    "api.error": "API error occurred",
}


async def log_event(
    event_type: str,
    event_action: str,
    user_id: str = None,
    grid_hash: str = None,
    entity_type: str = None,
    entity_id: str = None,
    metadata: dict = None,
    ip_address: str = None,
    user_agent: str = None,
):
    """
    Log an event asynchronously.
    Non-blocking - failures are silently ignored.
    """
    record = {
        "event_type": event_type,
        "event_action": event_action,
        "user_id": user_id,
        "grid_hash": grid_hash,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata,
        "ip_address": ip_address,
        "user_agent": user_agent,
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{SUPABASE_URL}/rest/v1/event_log",
                headers=_headers(),
                ssl=_ssl_context(),
                json=record
            )
    except Exception as e:
        print(f"Event log error: {e}")


def log_event_sync(event_type, event_action, **kwargs):
    """Sync wrapper for logging events."""
    try:
        asyncio.run(log_event(event_type, event_action, **kwargs))
    except:
        pass  # Never block on logging failures


def log_from_request(event_type, event_action, user_id=None, **kwargs):
    """Log event with request context."""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    ua = request.headers.get('User-Agent', '')[:200]
    
    log_event_sync(
        event_type=event_type,
        event_action=event_action,
        user_id=user_id,
        ip_address=ip,
        user_agent=ua,
        **kwargs
    )


# Convenience functions
def log_plant_added(user_id, species, count, grid_hash=None):
    log_event_sync(
        "inventory.plant_added",
        f"Added {count}x {species}",
        user_id=user_id,
        grid_hash=grid_hash,
        entity_type="plant",
        metadata={"species": species, "count": count}
    )

def log_observation_created(user_id, observation_id, species_guess=None):
    log_event_sync(
        "observation.created",
        f"Observation: {species_guess or 'Unknown'}",
        user_id=user_id,
        entity_type="observation",
        entity_id=observation_id,
        metadata={"species_guess": species_guess}
    )

def log_assessment_created(user_id, assessment_id, score, grade):
    log_event_sync(
        "assessment.created",
        f"Assessment: {grade} ({score})",
        user_id=user_id,
        entity_type="assessment",
        entity_id=assessment_id,
        metadata={"score": score, "grade": grade}
    )

def log_challenge_joined(user_id, challenge_id, challenge_name):
    log_event_sync(
        "challenge.joined",
        f"Joined: {challenge_name}",
        user_id=user_id,
        entity_type="challenge",
        entity_id=challenge_id,
    )

def log_badge_earned(user_id, badge_key, badge_name):
    log_event_sync(
        "badge.earned",
        f"Earned: {badge_name}",
        user_id=user_id,
        entity_type="badge",
        entity_id=badge_key,
    )

def log_referral_claimed(referrer_id, referred_id, code):
    log_event_sync(
        "referral.claimed",
        f"Referral {code} claimed",
        user_id=referred_id,
        entity_type="referral",
        entity_id=code,
        metadata={"referrer_id": referrer_id}
    )

def log_score_calculated(user_id, score, grade, source):
    log_event_sync(
        "score.calculated",
        f"Score: {grade} ({score})",
        user_id=user_id,
        entity_type="score",
        metadata={"score": score, "grade": grade, "source": source}
    )

def log_api_error(endpoint, error, user_id=None):
    log_event_sync(
        "api.error",
        f"Error: {endpoint}",
        user_id=user_id,
        metadata={"endpoint": endpoint, "error": str(error)[:500]}
    )


# Analytics queries
async def get_event_counts(days=7):
    """Get event counts by type for last N days."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/event_log?created_at=gte.{cutoff}&select=event_type"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                events = await resp.json()
                counts = {}
                for e in events:
                    t = e.get('event_type', 'unknown')
                    counts[t] = counts.get(t, 0) + 1
                return counts
    return {}


async def get_user_activity(user_id, limit=50):
    """Get recent activity for a user."""
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/event_log?user_id=eq.{user_id}&order=created_at.desc&limit={limit}"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                return await resp.json()
    return []


async def get_recent_events(limit=100, event_type=None):
    """Get recent events, optionally filtered by type."""
    url = f"{SUPABASE_URL}/rest/v1/event_log?order=created_at.desc&limit={limit}"
    if event_type:
        url += f"&event_type=eq.{event_type}"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                return await resp.json()
    return []


async def get_daily_stats(days=30):
    """Get daily event counts."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/event_log?created_at=gte.{cutoff}&select=event_type,created_at"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                events = await resp.json()
                
                # Group by date
                daily = {}
                for e in events:
                    date = e.get('created_at', '')[:10]
                    if date not in daily:
                        daily[date] = {"date": date, "total": 0, "types": {}}
                    daily[date]["total"] += 1
                    t = e.get('event_type', 'unknown')
                    daily[date]["types"][t] = daily[date]["types"].get(t, 0) + 1
                
                return sorted(daily.values(), key=lambda x: x['date'], reverse=True)
    return []


def register_events_routes(app):
    """Register event logging API routes."""
    
    @app.route('/api/events/recent', methods=['GET'])
    @require_admin
    def recent_events():
        """Get recent events. TODO: Add admin auth."""
        limit = request.args.get('limit', 100, type=int)
        event_type = request.args.get('type')
        
        events = asyncio.run(get_recent_events(limit, event_type))
        return jsonify({"events": events, "count": len(events)})
    
    @app.route('/api/events/counts', methods=['GET'])
    def event_counts():
        """Get event counts by type."""
        days = request.args.get('days', 7, type=int)
        counts = asyncio.run(get_event_counts(days))
        return jsonify({"period_days": days, "counts": counts})
    
    @app.route('/api/events/daily', methods=['GET'])
    def daily_stats():
        """Get daily event breakdown."""
        days = request.args.get('days', 30, type=int)
        stats = asyncio.run(get_daily_stats(days))
        return jsonify({"period_days": days, "daily": stats})
    
    @app.route('/api/events/user/<user_id>', methods=['GET'])
    @require_admin
    def user_activity(user_id):
        """Get activity for a specific user. TODO: Add auth."""
        limit = request.args.get('limit', 50, type=int)
        activity = asyncio.run(get_user_activity(user_id, limit))
        return jsonify({"user_id": user_id, "activity": activity})
    
    @app.route('/api/events/types', methods=['GET'])
    def event_types():
        """List all event types."""
        return jsonify({"event_types": EVENT_TYPES})

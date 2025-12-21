"""
Stats & Admin API
==================
System-wide statistics, bulk exports, admin tools.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from admin_auth import require_admin
from datetime import datetime, timedelta

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "count=exact"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h


async def get_table_count(table, filters=None):
    """Get count from a table with optional filters."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id"
    if filters:
        url += f"&{filters}"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            # Count is in content-range header
            range_header = resp.headers.get('content-range', '*/0')
            try:
                count = int(range_header.split('/')[-1])
                return count
            except:
                data = await resp.json()
                return len(data) if resp.status == 200 else 0


async def get_system_stats():
    """Get comprehensive system statistics."""
    stats = {}
    
    # User counts
    stats['total_users'] = await get_table_count('plant_inventories', 'select=user_id')
    
    # Plant data
    stats['total_plants'] = await get_table_count('plant_inventories')
    stats['total_species'] = await get_table_count('species')
    
    # Assessments
    stats['total_assessments'] = await get_table_count('habitat_assessments')
    
    # Observations
    stats['total_observations'] = await get_table_count('observations')
    stats['pending_observations'] = await get_table_count('observations', 'status=eq.pending')
    stats['verified_observations'] = await get_table_count('observations', 'status=eq.verified')
    
    # Challenges
    stats['total_challenges'] = await get_table_count('challenges')
    stats['active_challenges'] = await get_table_count('challenges', 'status=eq.active')
    stats['completed_challenges'] = await get_table_count('challenges', 'status=eq.completed')
    
    # Referrals
    stats['total_referrals'] = await get_table_count('referrals')
    stats['successful_referrals'] = await get_table_count('referrals', 'status=eq.joined')
    
    # Badges
    stats['badges_awarded'] = await get_table_count('user_badges')
    
    # Scores
    stats['users_with_scores'] = await get_table_count('user_scores')
    
    return stats


async def get_growth_stats(days=30):
    """Get growth metrics over time period."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    stats = {
        "period_days": days,
        "cutoff_date": cutoff,
    }
    
    # New assessments
    stats['new_assessments'] = await get_table_count(
        'habitat_assessments', 
        f'submitted_at=gte.{cutoff}'
    )
    
    # New observations
    stats['new_observations'] = await get_table_count(
        'observations',
        f'created_at=gte.{cutoff}'
    )
    
    # New referrals joined
    stats['new_referrals_joined'] = await get_table_count(
        'referrals',
        f'joined_at=gte.{cutoff}&status=eq.joined'
    )
    
    # New badges
    stats['new_badges'] = await get_table_count(
        'user_badges',
        f'earned_at=gte.{cutoff}'
    )
    
    return stats


async def get_geographic_stats():
    """Get stats by geographic area."""
    async with aiohttp.ClientSession() as session:
        # Get unique grid hashes with counts
        url = f"{SUPABASE_URL}/rest/v1/plant_inventories?select=grid_hash"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                data = await resp.json()
                grids = {}
                for row in data:
                    gh = row.get('grid_hash', 'unknown')
                    grids[gh] = grids.get(gh, 0) + 1
                
                return {
                    "unique_grids": len(grids),
                    "top_grids": sorted(grids.items(), key=lambda x: x[1], reverse=True)[:10],
                }
    return {}


async def get_score_distribution():
    """Get distribution of scores."""
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/user_scores?select=total_score,grade"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                scores = await resp.json()
                
                if not scores:
                    return {"count": 0}
                
                score_values = [s['total_score'] for s in scores if s.get('total_score')]
                
                # Grade distribution
                grades = {}
                for s in scores:
                    g = s.get('grade', 'Unknown')
                    grades[g] = grades.get(g, 0) + 1
                
                return {
                    "count": len(scores),
                    "average": sum(score_values) / len(score_values) if score_values else 0,
                    "min": min(score_values) if score_values else 0,
                    "max": max(score_values) if score_values else 0,
                    "grade_distribution": grades,
                }
    return {}


async def get_challenge_stats():
    """Get challenge participation stats."""
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/challenges?select=id,name,goal_type,goal_target,current_progress,status"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                challenges = await resp.json()
                
                # Completion rates
                completed = [c for c in challenges if c.get('status') == 'completed']
                active = [c for c in challenges if c.get('status') == 'active']
                
                # Progress on active
                active_progress = []
                for c in active:
                    target = c.get('goal_target', 1)
                    progress = c.get('current_progress', 0)
                    pct = (progress / target * 100) if target > 0 else 0
                    active_progress.append({
                        "name": c.get('name'),
                        "progress_pct": round(pct, 1),
                        "goal_type": c.get('goal_type'),
                    })
                
                return {
                    "total": len(challenges),
                    "completed": len(completed),
                    "active": len(active),
                    "completion_rate": (len(completed) / len(challenges) * 100) if challenges else 0,
                    "active_challenges": sorted(active_progress, key=lambda x: x['progress_pct'], reverse=True),
                }
    return {}


async def export_all_data():
    """Export all data for backup/analysis."""
    data = {}
    tables = [
        'plant_inventories', 'species', 'habitat_assessments',
        'observations', 'challenges', 'challenge_participants',
        'referrals', 'user_badges', 'user_scores', 'score_history'
    ]
    
    async with aiohttp.ClientSession() as session:
        for table in tables:
            url = f"{SUPABASE_URL}/rest/v1/{table}?limit=10000"
            async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                if resp.status == 200:
                    data[table] = await resp.json()
                else:
                    data[table] = []
    
    return data


def register_stats_routes(app):
    """Register stats API routes."""
    
    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        """Get system-wide statistics."""
        stats = asyncio.run(get_system_stats())
        return jsonify({
            "generated_at": datetime.utcnow().isoformat(),
            "stats": stats
        })
    
    @app.route('/api/stats/growth', methods=['GET'])
    def get_growth():
        """Get growth metrics."""
        days = request.args.get('days', 30, type=int)
        stats = asyncio.run(get_growth_stats(days))
        return jsonify(stats)
    
    @app.route('/api/stats/geographic', methods=['GET'])
    def get_geo_stats():
        """Get geographic distribution."""
        stats = asyncio.run(get_geographic_stats())
        return jsonify(stats)
    
    @app.route('/api/stats/scores', methods=['GET'])
    def get_score_stats():
        """Get score distribution."""
        stats = asyncio.run(get_score_distribution())
        return jsonify(stats)
    
    @app.route('/api/stats/challenges', methods=['GET'])
    def get_chal_stats():
        """Get challenge statistics."""
        stats = asyncio.run(get_challenge_stats())
        return jsonify(stats)
    
    @app.route('/api/admin/export', methods=['GET'])
    @require_admin
    def admin_export():
        """
        Export all system data.
        TODO: Add admin auth check.
        """
        data = asyncio.run(export_all_data())
        return jsonify({
            "exported_at": datetime.utcnow().isoformat(),
            "tables": list(data.keys()),
            "data": data
        })
    
    @app.route('/api/stats/dashboard', methods=['GET'])
    def dashboard_stats():
        """Combined stats for admin dashboard."""
        async def gather_all():
            system = await get_system_stats()
            growth = await get_growth_stats(30)
            scores = await get_score_distribution()
            challenges = await get_challenge_stats()
            geo = await get_geographic_stats()
            
            return {
                "system": system,
                "growth_30d": growth,
                "scores": scores,
                "challenges": challenges,
                "geographic": geo,
            }
        
        stats = asyncio.run(gather_all())
        return jsonify({
            "generated_at": datetime.utcnow().isoformat(),
            **stats
        })

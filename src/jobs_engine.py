"""
Scheduled Jobs Engine
======================
Handles recurring tasks: expire challenges, send alerts, cleanup.
Can be triggered via API or external cron (Render cron, GitHub Actions, etc.)
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
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h


async def log_job(job_name, status, result=None, error=None):
    """Log job execution to history."""
    record = {
        "job_name": job_name,
        "status": status,
        "result": result,
        "error": error,
    }
    if status in ['completed', 'failed']:
        record["completed_at"] = datetime.utcnow().isoformat()
    
    async with aiohttp.ClientSession() as session:
        await session.post(
            f"{SUPABASE_URL}/rest/v1/job_history",
            headers=_headers(),
            ssl=_ssl_context(),
            json=record
        )


async def create_alert(user_id, alert_type, title, message, priority='normal', expires_days=7):
    """Create an alert for a user."""
    record = {
        "user_id": user_id,
        "alert_type": alert_type,
        "title": title,
        "message": message,
        "priority": priority,
        "expires_at": (datetime.utcnow() + timedelta(days=expires_days)).isoformat(),
    }
    
    async with aiohttp.ClientSession() as session:
        await session.post(
            f"{SUPABASE_URL}/rest/v1/user_alerts",
            headers=_headers(),
            ssl=_ssl_context(),
            json=record
        )


# ============ JOB: Expire Challenges ============

async def job_expire_challenges():
    """Mark challenges past end_date as expired."""
    now = datetime.utcnow().isoformat()
    
    async with aiohttp.ClientSession() as session:
        # Find active challenges past end date
        url = f"{SUPABASE_URL}/rest/v1/challenges?status=eq.active&ends_at=lt.{now}"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status != 200:
                return {"expired": 0, "error": "Failed to fetch"}
            challenges = await resp.json()
        
        expired_count = 0
        for c in challenges:
            # Check if goal was met
            progress = c.get('current_progress', 0)
            target = c.get('goal_target', 1)
            
            new_status = 'completed' if progress >= target else 'expired'
            
            # Update status
            update_url = f"{SUPABASE_URL}/rest/v1/challenges?id=eq.{c['id']}"
            headers = _headers()
            headers["Prefer"] = "return=representation"
            
            async with session.patch(
                update_url,
                headers=headers,
                ssl=_ssl_context(),
                json={"status": new_status}
            ) as resp:
                if resp.status == 200:
                    expired_count += 1
                    
                    # Notify participants if completed
                    if new_status == 'completed':
                        await notify_challenge_complete(c['id'], c.get('name', 'Challenge'))
    
    return {"expired": expired_count, "checked": len(challenges)}


async def notify_challenge_complete(challenge_id, challenge_name):
    """Notify all participants that challenge completed."""
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/challenge_participants?challenge_id=eq.{challenge_id}"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status == 200:
                participants = await resp.json()
                for p in participants:
                    await create_alert(
                        user_id=p['user_id'],
                        alert_type='challenge_complete',
                        title=f"🎉 {challenge_name} Complete!",
                        message="Your neighborhood achieved the goal! Check your badges.",
                        priority='high',
                    )


# ============ JOB: Seasonal Alerts ============

SEASONAL_ALERTS = {
    "august_fall_prep": {
        "months": [8],
        "days": [1, 15],
        "title": "🍂 September is Coming!",
        "message": "84.5% nectar deficit during monarch migration. Add fall bloomers now: asters, goldenrod, or late sunflowers.",
        "priority": "high",
        "check_condition": lambda user_data: not user_data.get('has_fall_blooms'),
    },
    "spring_planting": {
        "months": [3, 4],
        "days": [1],
        "title": "🌱 Spring Planting Season",
        "message": "Perfect time to add native plants! Early bloomers help emerging pollinators.",
        "priority": "normal",
    },
    "milkweed_reminder": {
        "months": [5],
        "days": [1],
        "title": "🦋 Monarch Season Approaching",
        "message": "Monarchs need milkweed! Add some now for summer egg-laying.",
        "check_condition": lambda user_data: not user_data.get('has_milkweed'),
    },
    "winter_prep": {
        "months": [10],
        "days": [15],
        "title": "❄️ Overwintering Reminder",
        "message": "Leave stems and leaves until spring! 70% of bees overwinter in the ground.",
        "priority": "normal",
    },
}


async def job_seasonal_alerts():
    """Send seasonal alerts to users who need them."""
    now = datetime.utcnow()
    current_month = now.month
    current_day = now.day
    
    alerts_sent = 0
    
    for alert_key, alert_config in SEASONAL_ALERTS.items():
        # Check if this alert should run today
        if current_month not in alert_config.get('months', []):
            continue
        if current_day not in alert_config.get('days', [1]):
            continue
        
        # Get users to alert
        async with aiohttp.ClientSession() as session:
            # Get users with assessments
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?select=user_id,has_fall_blooms,milkweed_present"
            async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                if resp.status != 200:
                    continue
                assessments = await resp.json()
            
            # Dedupe users
            users_seen = set()
            for a in assessments:
                user_id = a.get('user_id')
                if user_id in users_seen:
                    continue
                users_seen.add(user_id)
                
                # Check condition if exists
                check = alert_config.get('check_condition')
                if check:
                    user_data = {
                        'has_fall_blooms': a.get('has_fall_blooms', False),
                        'has_milkweed': a.get('milkweed_present') not in [None, 'none'],
                    }
                    if not check(user_data):
                        continue
                
                # Check if already sent this alert recently
                check_url = f"{SUPABASE_URL}/rest/v1/user_alerts?user_id=eq.{user_id}&alert_type=eq.{alert_key}&created_at=gte.{(now - timedelta(days=30)).isoformat()}"
                async with session.get(check_url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        existing = await resp.json()
                        if existing:
                            continue
                
                # Send alert
                await create_alert(
                    user_id=user_id,
                    alert_type=alert_key,
                    title=alert_config['title'],
                    message=alert_config.get('message', ''),
                    priority=alert_config.get('priority', 'normal'),
                )
                alerts_sent += 1
    
    return {"alerts_sent": alerts_sent}


# ============ JOB: Cleanup Expired Alerts ============

async def job_cleanup_alerts():
    """Delete expired and old read alerts."""
    now = datetime.utcnow().isoformat()
    old_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    async with aiohttp.ClientSession() as session:
        # Delete expired
        url = f"{SUPABASE_URL}/rest/v1/user_alerts?expires_at=lt.{now}"
        async with session.delete(url, headers=_headers(), ssl=_ssl_context()) as resp:
            expired_deleted = 0  # Can't easily get count
        
        # Delete old read alerts
        url = f"{SUPABASE_URL}/rest/v1/user_alerts?read_at=lt.{old_date}"
        async with session.delete(url, headers=_headers(), ssl=_ssl_context()) as resp:
            pass
    
    return {"cleaned": True}


# ============ JOB: Recalculate Stale Scores ============

async def job_recalc_stale_scores():
    """Recalculate scores not updated in 7+ days."""
    from score_engine import recalculate_and_store_score
    
    stale_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
    
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/user_scores?calculated_at=lt.{stale_date}&limit=50"
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            if resp.status != 200:
                return {"recalculated": 0}
            stale = await resp.json()
        
        recalc_count = 0
        for s in stale:
            try:
                await recalculate_and_store_score(
                    s['user_id'],
                    s.get('grid_hash'),
                    SUPABASE_KEY,
                    source='scheduled'
                )
                recalc_count += 1
            except Exception as e:
                print(f"Recalc error: {e}")
    
    return {"recalculated": recalc_count, "checked": len(stale)}


# ============ Job Runner ============

JOBS = {
    "expire_challenges": job_expire_challenges,
    "seasonal_alerts": job_seasonal_alerts,
    "cleanup_alerts": job_cleanup_alerts,
    "recalc_stale_scores": job_recalc_stale_scores,
}


async def run_job(job_name):
    """Run a specific job and log results."""
    if job_name not in JOBS:
        return {"error": f"Unknown job: {job_name}"}
    
    await log_job(job_name, "running")
    
    try:
        result = await JOBS[job_name]()
        await log_job(job_name, "completed", result=result)
        return {"job": job_name, "status": "completed", "result": result}
    except Exception as e:
        await log_job(job_name, "failed", error=str(e))
        return {"job": job_name, "status": "failed", "error": str(e)}


async def run_all_jobs():
    """Run all scheduled jobs."""
    results = {}
    for job_name in JOBS:
        results[job_name] = await run_job(job_name)
    return results


def register_jobs_routes(app):
    """Register jobs API routes."""
    
    @app.route('/api/jobs/run/<job_name>', methods=['POST'])
    @require_admin
    def run_single_job(job_name):
        """Run a specific job. TODO: Add admin auth."""
        result = asyncio.run(run_job(job_name))
        return jsonify(result)
    
    @app.route('/api/jobs/run-all', methods=['POST'])
    @require_admin
    def run_all():
        """Run all scheduled jobs. TODO: Add admin auth."""
        results = asyncio.run(run_all_jobs())
        return jsonify({
            "ran_at": datetime.utcnow().isoformat(),
            "results": results
        })
    
    @app.route('/api/jobs/list', methods=['GET'])
    def list_jobs():
        """List available jobs."""
        return jsonify({
            "jobs": list(JOBS.keys()),
            "seasonal_alerts": list(SEASONAL_ALERTS.keys()),
        })
    
    @app.route('/api/jobs/history', methods=['GET'])
    def job_history():
        """Get recent job history."""
        async def fetch():
            url = f"{SUPABASE_URL}/rest/v1/job_history?order=started_at.desc&limit=50"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json()
            return []
        
        history = asyncio.run(fetch())
        return jsonify({"history": history})
    
    @app.route('/api/alerts/my', methods=['GET'])
    def my_alerts():
        """Get current user's alerts."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers=_headers(token),
                    ssl=_ssl_context()
                ) as resp:
                    if resp.status != 200:
                        return None, "Invalid token"
                    user = await resp.json()
                    user_id = user.get('id')
                
                url = f"{SUPABASE_URL}/rest/v1/user_alerts?user_id=eq.{user_id}&read_at=is.null&order=created_at.desc"
                async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json(), None
            return [], None
        
        alerts, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({"alerts": alerts, "count": len(alerts)})
    
    @app.route('/api/alerts/<alert_id>/read', methods=['POST'])
    def mark_alert_read(alert_id):
        """Mark an alert as read."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def mark():
            url = f"{SUPABASE_URL}/rest/v1/user_alerts?id=eq.{alert_id}"
            headers = _headers(token)
            headers["Prefer"] = "return=representation"
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    url,
                    headers=headers,
                    ssl=_ssl_context(),
                    json={"read_at": datetime.utcnow().isoformat()}
                ) as resp:
                    return resp.status == 200
        
        success = asyncio.run(mark())
        return jsonify({"success": success})

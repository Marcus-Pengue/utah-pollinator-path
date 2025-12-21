"""
Referral System API
====================
Invite neighbors, track joins, earn connectivity points.
"""

import aiohttp
import asyncio
import ssl
import certifi
import hashlib
import secrets
from flask import request, jsonify
from datetime import datetime

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"
BASE_URL = "https://utah-pollinator-path.onrender.com"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h

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

def generate_referral_code():
    """Generate unique 8-char referral code."""
    return secrets.token_urlsafe(6)[:8].upper()


def register_referrals_routes(app):
    """Register referral routes."""
    
    @app.route('/api/referrals/code', methods=['GET'])
    def get_my_referral_code():
        """Get or create user's referral code."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def get_or_create():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            # Check for existing unused code
            url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&status=eq.pending&referred_user_id=is.null&limit=1"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        existing = await resp.json()
                        if existing:
                            return existing[0], None
                
                # Create new code
                code = generate_referral_code()
                record = {
                    "referrer_id": user_id,
                    "referral_code": code,
                    "status": "pending"
                }
                
                headers = _headers(token)
                headers["Prefer"] = "return=representation"
                
                async with session.post(
                    f"{SUPABASE_URL}/rest/v1/referrals",
                    headers=headers,
                    ssl=_ssl_context(),
                    json=record
                ) as resp:
                    if resp.status == 201:
                        data = await resp.json()
                        return data[0], None
                    else:
                        text = await resp.text()
                        return None, text
        
        result, error = asyncio.run(get_or_create())
        if error:
            return jsonify({"error": error}), 400
        
        code = result.get('referral_code')
        return jsonify({
            "code": code,
            "link": f"{BASE_URL}/static/index.html?ref={code}",
            "share_text": f"Join me in creating pollinator habitat! 🦋🌻 Sign up here: {BASE_URL}/static/index.html?ref={code}"
        })
    
    @app.route('/api/referrals/create', methods=['POST'])
    def create_invite():
        """Create a new invite (optionally for specific email)."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json() or {}
        
        async def create():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            code = generate_referral_code()
            record = {
                "referrer_id": user_id,
                "referral_code": code,
                "referred_email": data.get('email'),
                "grid_hash": data.get('grid_hash'),
                "status": "pending"
            }
            
            headers = _headers(token)
            headers["Prefer"] = "return=representation"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{SUPABASE_URL}/rest/v1/referrals",
                    headers=headers,
                    ssl=_ssl_context(),
                    json=record
                ) as resp:
                    if resp.status == 201:
                        data = await resp.json()
                        return data[0], None
                    else:
                        text = await resp.text()
                        return None, text
        
        result, error = asyncio.run(create())
        if error:
            return jsonify({"error": error}), 400
        
        code = result.get('referral_code')
        return jsonify({
            "success": True,
            "code": code,
            "link": f"{BASE_URL}/static/index.html?ref={code}",
        }), 201
    
    @app.route('/api/referrals/claim', methods=['POST'])
    def claim_referral():
        """Claim a referral code when signing up."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json()
        
        if not data or not data.get('code'):
            return jsonify({"error": "code required"}), 400
        
        code = data['code'].upper().strip()
        
        async def claim():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            async with aiohttp.ClientSession() as session:
                # Find the referral
                url = f"{SUPABASE_URL}/rest/v1/referrals?referral_code=eq.{code}&status=eq.pending"
                async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    if resp.status != 200:
                        return None, "Code not found"
                    referrals = await resp.json()
                    if not referrals:
                        return None, "Invalid or expired code"
                    
                    referral = referrals[0]
                    
                    # Can't refer yourself
                    if referral['referrer_id'] == user_id:
                        return None, "Cannot use your own referral code"
                
                # Update referral
                update_url = f"{SUPABASE_URL}/rest/v1/referrals?id=eq.{referral['id']}"
                headers = _headers(token)
                headers["Prefer"] = "return=representation"
                
                async with session.patch(
                    update_url,
                    headers=headers,
                    ssl=_ssl_context(),
                    json={
                        "referred_user_id": user_id,
                        "status": "joined",
                        "joined_at": datetime.utcnow().isoformat()
                    }
                ) as resp:
                    if resp.status == 200:
                        # Award badge to referrer
                        badge_url = f"{SUPABASE_URL}/rest/v1/user_badges"
                        await session.post(
                            badge_url,
                            headers=headers,
                            ssl=_ssl_context(),
                            json={
                                "user_id": referral['referrer_id'],
                                "badge_key": "recruiter",
                                "earned_at": datetime.utcnow().isoformat()
                            }
                        )
                        return {"referrer_id": referral['referrer_id']}, None
                
                return None, "Failed to claim"
        
        result, error = asyncio.run(claim())
        if error:
            return jsonify({"error": error}), 400
        
        return jsonify({
            "success": True,
            "message": "Welcome! Your neighbor will earn connectivity points.",
        })
    
    @app.route('/api/referrals/my', methods=['GET'])
    def my_referrals():
        """Get user's referral stats."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            # Get referrals I sent
            sent_url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&order=created_at.desc"
            
            # Get referral I used (who invited me)
            received_url = f"{SUPABASE_URL}/rest/v1/referrals?referred_user_id=eq.{user_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(sent_url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    sent = await resp.json() if resp.status == 200 else []
                
                async with session.get(received_url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    received = await resp.json() if resp.status == 200 else []
            
            return {
                "sent": sent,
                "sent_count": len(sent),
                "joined_count": len([r for r in sent if r.get('status') == 'joined']),
                "pending_count": len([r for r in sent if r.get('status') == 'pending']),
                "invited_by": received[0] if received else None,
            }, None
        
        result, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify(result)
    
    @app.route('/api/referrals/leaderboard', methods=['GET'])
    def referral_leaderboard():
        """Top referrers."""
        async def fetch():
            url = f"{SUPABASE_URL}/rest/v1/referrals?status=eq.joined&select=referrer_id"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        referrals = await resp.json()
                        
                        # Count by referrer
                        counts = {}
                        for r in referrals:
                            rid = r.get('referrer_id')
                            counts[rid] = counts.get(rid, 0) + 1
                        
                        # Sort
                        sorted_refs = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
                        
                        return [{"referrer_id": r[0], "count": r[1], "rank": i+1} for i, r in enumerate(sorted_refs)]
            return []
        
        leaders = asyncio.run(fetch())
        return jsonify({"leaderboard": leaders})

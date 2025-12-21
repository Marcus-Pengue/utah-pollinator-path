"""
Admin Authentication
=====================
Secures admin endpoints with API key authentication.
Set ADMIN_API_KEY environment variable on Render.
"""

import os
import functools
from flask import request, jsonify

# Admin API key from environment
ADMIN_API_KEY = os.environ.get('ADMIN_API_KEY', 'dev-admin-key-change-me')

# List of admin user IDs (can also be managed in database)
ADMIN_USER_IDS = set(os.environ.get('ADMIN_USER_IDS', '').split(',')) - {''}


def require_admin_key(f):
    """
    Decorator: Require valid admin API key in header.
    
    Usage:
        @require_admin_key
        def admin_endpoint():
            ...
    
    Header: X-Admin-Key: <your-admin-key>
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        admin_key = request.headers.get('X-Admin-Key', '')
        
        if not admin_key:
            return jsonify({"error": "Admin key required", "header": "X-Admin-Key"}), 401
        
        if admin_key != ADMIN_API_KEY:
            return jsonify({"error": "Invalid admin key"}), 403
        
        return f(*args, **kwargs)
    
    return decorated


def require_admin_user(f):
    """
    Decorator: Require authenticated user to be in admin list.
    
    Usage:
        @require_admin_user
        def admin_endpoint():
            ...
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Get user ID from token
        import asyncio
        import aiohttp
        import ssl
        import certifi
        
        SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
        SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"
        
        async def get_user_id():
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers=headers,
                    ssl=ssl_ctx
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get('id')
            return None
        
        user_id = asyncio.run(get_user_id())
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        if user_id not in ADMIN_USER_IDS:
            return jsonify({"error": "Admin access required"}), 403
        
        # Add user_id to request context
        request.admin_user_id = user_id
        return f(*args, **kwargs)
    
    return decorated


def require_admin(f):
    """
    Decorator: Accept either admin key OR admin user.
    Most flexible option for admin endpoints.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        # Check admin key first
        admin_key = request.headers.get('X-Admin-Key', '')
        if admin_key == ADMIN_API_KEY:
            return f(*args, **kwargs)
        
        # Fall back to user auth
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            import asyncio
            import aiohttp
            import ssl
            import certifi
            
            SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
            SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"
            
            async def get_user_id():
                ssl_ctx = ssl.create_default_context(cafile=certifi.where())
                headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{SUPABASE_URL}/auth/v1/user",
                        headers=headers,
                        ssl=ssl_ctx
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            return data.get('id')
                return None
            
            user_id = asyncio.run(get_user_id())
            
            if user_id and user_id in ADMIN_USER_IDS:
                request.admin_user_id = user_id
                return f(*args, **kwargs)
        
        return jsonify({"error": "Admin access required"}), 403
    
    return decorated


def register_admin_routes(app):
    """Register admin management routes."""
    
    @app.route('/api/admin/verify', methods=['GET'])
    @require_admin_key
    def verify_admin():
        """Verify admin key is valid."""
        return jsonify({"valid": True, "message": "Admin access verified"})
    
    @app.route('/api/admin/config', methods=['GET'])
    @require_admin_key
    def get_admin_config():
        """Get current admin configuration."""
        return jsonify({
            "admin_user_count": len(ADMIN_USER_IDS),
            "admin_users_configured": len(ADMIN_USER_IDS) > 0,
            "key_configured": ADMIN_API_KEY != 'dev-admin-key-change-me',
        })

"""
Auth API endpoints for Flask.
"""

from flask import request, jsonify
import asyncio
from auth import sign_up, sign_in, sign_out, get_user, get_profile, update_profile


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def register_auth_routes(app):
    """Register auth routes on Flask app."""
    
    @app.route('/api/auth/signup', methods=['POST'])
    def api_signup():
        """
        Register new user.
        
        POST /api/auth/signup
        {"email": "user@example.com", "password": "securepass123"}
        """
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "email and password required"}), 400
        
        if len(data['password']) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        result = _run_async(sign_up(data['email'], data['password']))
        
        if result.get('success'):
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    
    @app.route('/api/auth/signin', methods=['POST'])
    def api_signin():
        """
        Sign in user.
        
        POST /api/auth/signin
        {"email": "user@example.com", "password": "securepass123"}
        
        Returns access_token for authenticated requests.
        """
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "email and password required"}), 400
        
        result = _run_async(sign_in(data['email'], data['password']))
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 401
    
    @app.route('/api/auth/signout', methods=['POST'])
    def api_signout():
        """
        Sign out user.
        
        POST /api/auth/signout
        Header: Authorization: Bearer <access_token>
        """
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header required"}), 401
        
        token = auth_header.split(' ')[1]
        result = _run_async(sign_out(token))
        
        return jsonify(result), 200 if result.get('success') else 400
    
    @app.route('/api/auth/me', methods=['GET'])
    def api_me():
        """
        Get current user info.
        
        GET /api/auth/me
        Header: Authorization: Bearer <access_token>
        """
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header required"}), 401
        
        token = auth_header.split(' ')[1]
        user = _run_async(get_user(token))
        
        if not user.get('success'):
            return jsonify(user), 401
        
        # Also get profile
        profile = _run_async(get_profile(user['user_id']))
        
        return jsonify({
            "user_id": user['user_id'],
            "email": user['email'],
            "profile": profile.get('profile', {}),
        })
    
    @app.route('/api/auth/profile', methods=['PATCH'])
    def api_update_profile():
        """
        Update user profile.
        
        PATCH /api/auth/profile
        Header: Authorization: Bearer <access_token>
        {"display_name": "Garden Guru", "city": "Murray", "ward": "Murray 4th Ward"}
        """
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header required"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify user
        user = _run_async(get_user(token))
        if not user.get('success'):
            return jsonify(user), 401
        
        data = request.get_json() or {}
        
        result = _run_async(update_profile(
            access_token=token,
            user_id=user['user_id'],
            display_name=data.get('display_name'),
            city=data.get('city'),
            ward=data.get('ward'),
        ))
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400

"""
Utah Pollinator Path - User Authentication
==========================================
Supabase Auth integration for user accounts.
"""

import aiohttp
import ssl
import certifi
from typing import Dict, Optional

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"


def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())


def _headers(access_token: Optional[str] = None):
    h = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        h["Authorization"] = f"Bearer {access_token}"
    else:
        h["Authorization"] = f"Bearer {SUPABASE_KEY}"
    return h


async def sign_up(email: str, password: str) -> Dict:
    """Register a new user."""
    
    url = f"{SUPABASE_URL}/auth/v1/signup"
    data = {"email": email, "password": password}
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.post(url, json=data, headers=_headers()) as resp:
            result = await resp.json()
            
            if resp.status in (200, 201):
                return {
                    "success": True,
                    "user_id": result.get("user", {}).get("id"),
                    "email": result.get("user", {}).get("email"),
                    "message": "Check your email to confirm your account!",
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error_description") or result.get("msg") or str(result),
                }


async def sign_in(email: str, password: str) -> Dict:
    """Sign in existing user."""
    
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    data = {"email": email, "password": password}
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.post(url, json=data, headers=_headers()) as resp:
            result = await resp.json()
            
            if resp.status == 200:
                return {
                    "success": True,
                    "user_id": result.get("user", {}).get("id"),
                    "email": result.get("user", {}).get("email"),
                    "access_token": result.get("access_token"),
                    "refresh_token": result.get("refresh_token"),
                    "expires_in": result.get("expires_in"),
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error_description") or result.get("msg") or "Invalid credentials",
                }


async def get_user(access_token: str) -> Dict:
    """Get current user from access token."""
    
    url = f"{SUPABASE_URL}/auth/v1/user"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers(access_token)) as resp:
            if resp.status == 200:
                user = await resp.json()
                return {
                    "success": True,
                    "user_id": user.get("id"),
                    "email": user.get("email"),
                }
            else:
                return {"success": False, "error": "Invalid or expired token"}


async def get_profile(user_id: str) -> Dict:
    """Get user profile."""
    
    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=*"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers()) as resp:
            if resp.status == 200:
                profiles = await resp.json()
                if profiles:
                    return {"success": True, "profile": profiles[0]}
            return {"success": False, "error": "Profile not found"}


async def update_profile(
    access_token: str,
    user_id: str,
    display_name: Optional[str] = None,
    city: Optional[str] = None,
    ward: Optional[str] = None,
) -> Dict:
    """Update user profile."""
    
    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"
    
    data = {}
    if display_name:
        data["display_name"] = display_name
    if city:
        data["city"] = city
    if ward:
        data["ward"] = ward
    
    if not data:
        return {"success": False, "error": "No fields to update"}
    
    headers = _headers(access_token)
    headers["Prefer"] = "return=representation"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.patch(url, json=data, headers=headers) as resp:
            if resp.status == 200:
                profiles = await resp.json()
                return {"success": True, "profile": profiles[0] if profiles else {}}
            else:
                error = await resp.text()
                return {"success": False, "error": error}


async def sign_out(access_token: str) -> Dict:
    """Sign out user (invalidate token)."""
    
    url = f"{SUPABASE_URL}/auth/v1/logout"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.post(url, headers=_headers(access_token)) as resp:
            if resp.status in (200, 204):
                return {"success": True, "message": "Signed out"}
            else:
                return {"success": False, "error": "Sign out failed"}


# Test
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("Testing auth...")
        
        # Test signup (will fail if user exists, that's ok)
        result = await sign_up("test@example.com", "testpassword123")
        print(f"Signup: {result}")
        
        # Test signin
        result = await sign_in("test@example.com", "testpassword123")
        print(f"Signin: {result}")
        
        if result.get("success"):
            token = result["access_token"]
            user_id = result["user_id"]
            
            # Get user
            user = await get_user(token)
            print(f"User: {user}")
            
            # Get profile
            profile = await get_profile(user_id)
            print(f"Profile: {profile}")
    
    asyncio.run(test())

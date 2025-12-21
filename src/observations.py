"""
Utah Pollinator Path - Photo Observations API
==============================================
Zero-friction photo uploads for pollinator sightings.
"""

import aiohttp
import ssl
import certifi
import base64
import uuid
from datetime import datetime
from typing import Dict, Optional

# Supabase credentials
SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

STORAGE_BUCKET = "observations"
TABLE = "observations"


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())


async def upload_photo(photo_base64: str, filename: str) -> Dict:
    """Upload photo to Supabase Storage."""
    
    # Decode base64 to bytes
    # Handle data URL format: "data:image/jpeg;base64,/9j/4AAQ..."
    if "base64," in photo_base64:
        photo_base64 = photo_base64.split("base64,")[1]
    
    photo_bytes = base64.b64decode(photo_base64)
    
    # Upload to Supabase Storage
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{filename}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/jpeg",
    }
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.post(url, data=photo_bytes, headers=headers) as resp:
            if resp.status in (200, 201):
                # Return public URL
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
                return {"success": True, "url": public_url, "path": filename}
            else:
                error = await resp.text()
                return {"success": False, "error": error, "status": resp.status}


async def save_observation(
    photo_url: str,
    photo_path: str,
    lat: float,
    lng: float,
    observed_at: str,
    observer_name: str = "Anonymous",
    observer_email: Optional[str] = None,
    species_guess: Optional[str] = None,
    user_id: Optional[str] = None,
    observation_type: str = "wildlife",
    city: Optional[str] = None,
    state: str = "Utah",
) -> Dict:
    """Save observation metadata to database."""
    
    grid_hash = f"{round(lat, 3)}_{round(lng, 3)}"
    
    data = {
        "photo_url": photo_url,
        "photo_path": photo_path,
        "lat": lat,
        "lng": lng,
        "grid_hash": grid_hash,
        "observed_at": observed_at,
        "observer_name": observer_name,
        "observer_email": observer_email,
        "species_guess": species_guess,
        "city": city,
        "state": state,
        "status": "pending",
        "user_id": user_id,
        "observation_type": observation_type,
        "review_status": "pending_review",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.post(url, json=data, headers=_headers()) as resp:
            if resp.status in (200, 201):
                result = await resp.json()
                return result[0] if result else {}
            else:
                error = await resp.text()
                return {"error": error, "status": resp.status}


async def submit_observation(
    photo_base64: str,
    lat: float,
    lng: float,
    observed_at: Optional[str] = None,
    observer_name: str = "Anonymous",
    observer_email: Optional[str] = None,
    species_guess: Optional[str] = None,
    user_id: Optional[str] = None,
    observation_type: str = "wildlife",
) -> Dict:
    """
    Complete observation submission flow.
    
    1. Upload photo to storage
    2. Geocode location (get city)
    3. Save to database
    4. Return confirmation
    """
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    grid_hash = f"{round(lat, 3)}_{round(lng, 3)}"
    filename = f"{timestamp}_{grid_hash}_{unique_id}.jpg"
    
    # 1. Upload photo
    upload_result = await upload_photo(photo_base64, filename)
    if not upload_result.get("success"):
        return {"error": f"Photo upload failed: {upload_result.get('error')}"}
    
    # 2. Get city from coordinates (simple reverse geocode)
    city = await _get_city(lat, lng)
    
    # 3. Save observation
    if not observed_at:
        observed_at = datetime.utcnow().isoformat()
    
    observation = await save_observation(
        photo_url=upload_result["url"],
        photo_path=upload_result["path"],
        lat=lat,
        lng=lng,
        observed_at=observed_at,
        observer_name=observer_name,
        observer_email=observer_email,
        species_guess=species_guess,
        user_id=user_id,
        city=city,
    )
    
    if "error" in observation:
        return observation
    
    return {
        "success": True,
        "observation_id": observation.get("id"),
        "photo_url": upload_result["url"],
        "status": "pending",
        "user_id": user_id,
        "observation_type": observation_type,
        "review_status": "pending_review",
        "message": "Photo received! We'll notify you when it's identified.",
        "observation": observation,
    }


async def get_observations(
    status: Optional[str] = None,
    grid_hash: Optional[str] = None,
    limit: int = 50,
) -> Dict:
    """Get observations with optional filters."""
    
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}?select=*&order=created_at.desc&limit={limit}"
    
    if status:
        url += f"&status=eq.{status}"
    if grid_hash:
        url += f"&grid_hash=eq.{grid_hash}"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers()) as resp:
            observations = await resp.json() if resp.status == 200 else []
    
    return {
        "total": len(observations),
        "observations": observations,
    }


async def get_my_observations(observer_email: str) -> Dict:
    """Get all observations by email."""
    
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}?observer_email=eq.{observer_email}&order=created_at.desc"
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers()) as resp:
            observations = await resp.json() if resp.status == 200 else []
    
    # Stats
    statuses = [o.get("status") for o in observations]
    
    return {
        "total": len(observations),
        "pending": statuses.count("pending"),
        "uploaded": statuses.count("uploaded"),
        "confirmed": statuses.count("confirmed"),
        "observations": observations,
    }


async def _get_city(lat: float, lng: float) -> Optional[str]:
    """Simple reverse geocoding for city name."""
    
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "json"}
    headers = {"User-Agent": "UtahPollinatorPath/1.0"}
    
    try:
        connector = aiohttp.TCPConnector(ssl=_ssl_context())
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url, params=params, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    address = data.get("address", {})
                    return address.get("city") or address.get("town") or address.get("village")
    except:
        pass
    return None


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("Testing observations API...")
        
        # Create a tiny test image (1x1 red pixel JPEG)
        # This is a valid minimal JPEG
        test_image_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEPwC/AB//2Q=="
        
        # Test submission
        result = await submit_observation(
            photo_base64=test_image_b64,
            lat=40.6655,
            lng=-111.8965,
            observer_name="Test Observer",
            species_guess="Monarch butterfly",
        )
        
        print(f"Result: {result}")
        
        if result.get("success"):
            print(f"✅ Photo URL: {result.get('photo_url')}")
            print(f"✅ Observation ID: {result.get('observation_id')}")
        else:
            print(f"❌ Error: {result.get('error')}")
        
        # Get observations
        obs = await get_observations(limit=5)
        print(f"\nTotal observations: {obs['total']}")
        
    asyncio.run(test())

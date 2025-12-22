"""
Wildlife Data Cache - In-memory caching for faster responses
"""

import time
from datetime import datetime, timedelta

# Simple in-memory cache
_cache = {}
_cache_ttl = 3600  # 1 hour

def get_cached(key):
    """Get value from cache if not expired."""
    if key in _cache:
        value, timestamp = _cache[key]
        if time.time() - timestamp < _cache_ttl:
            return value
        del _cache[key]
    return None

def set_cached(key, value):
    """Store value in cache."""
    _cache[key] = (value, time.time())

def cache_key(lat, lng, radius, days):
    """Generate cache key from params."""
    return f"{lat:.2f},{lng:.2f},{radius},{days}"

def get_cache_stats():
    """Return cache statistics."""
    return {
        "entries": len(_cache),
        "keys": list(_cache.keys())[:20],
    }

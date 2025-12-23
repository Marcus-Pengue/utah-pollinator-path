
# Cached wildlife routes
from wildlife_cache_api import register_cache_routes
register_cache_routes(app)

# Cached wildlife data routes
try:
    from wildlife_cache_api import register_cache_routes
    register_cache_routes(app)
    print("✓ Wildlife cache routes registered")
except Exception as e:
    print(f"Warning: Could not load cache routes: {e}")

"""
Utah Pollinator Path - Main Flask Application
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import json

app = Flask(__name__, static_folder='../static')
CORS(app)

# Import and register route modules
from map_api import register_map_routes
from wildlife_data_api import register_wildlife_routes
from climate_data_api import register_climate_routes

register_map_routes(app)
register_wildlife_routes(app)
register_climate_routes(app)

# Health check
@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "utah-pollinator-path"})

@app.route('/')
def home():
    return jsonify({
        "name": "Utah Pollinator Path API",
        "version": "1.0",
        "endpoints": [
            "/api/map/unified",
            "/api/map/monarch-status",
            "/api/wildlife/unified",
            "/api/wildlife/cached",
            "/api/climate/current",
            "/api/climate/trends",
            "/health"
        ]
    })

# Cached wildlife data routes
CACHE_FILE = os.path.join(app.static_folder, "wildlife_cache.json")
_cache = None

def load_cache():
    global _cache
    if _cache is None and os.path.exists(CACHE_FILE):
        print(f"Loading cache from {CACHE_FILE}...")
        with open(CACHE_FILE, 'r') as f:
            _cache = json.load(f)
        print(f"Loaded {_cache.get('total_observations', 0)} observations")
    return _cache

@app.route('/api/wildlife/cached', methods=['GET'])
def get_cached_wildlife():
    """Return full cached dataset with optional filters."""
    cache = load_cache()
    if not cache:
        return jsonify({"error": "Cache not found", "path": CACHE_FILE}), 404
    
    min_year = request.args.get('min_year', type=int)
    max_year = request.args.get('max_year', type=int)
    taxon = request.args.get('taxon')
    
    features = cache.get("features", [])
    
    if min_year or max_year or taxon:
        filtered = []
        for f in features:
            y = f["properties"].get("year")
            t = f["properties"].get("iconic_taxon")
            
            if min_year and (not y or y < min_year):
                continue
            if max_year and (not y or y > max_year):
                continue
            if taxon and t != taxon:
                continue
                
            filtered.append(f)
        features = filtered
    
    return jsonify({
        "type": "FeatureCollection",
        "total": len(features),
        "year_distribution": cache.get("year_distribution", {}),
        "taxon_distribution": cache.get("taxon_distribution", {}),
        "features": features
    })

@app.route('/api/wildlife/cached/stats', methods=['GET'])
def get_cache_stats():
    """Return cache statistics."""
    cache = load_cache()
    if not cache:
        return jsonify({"error": "Cache not found"}), 404
    
    return jsonify({
        "total_observations": cache.get("total_observations"),
        "generated": cache.get("generated"),
        "year_distribution": cache.get("year_distribution", {}),
        "taxon_distribution": cache.get("taxon_distribution", {}),
    })

if __name__ == '__main__':
    # Pre-load cache on startup
    load_cache()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

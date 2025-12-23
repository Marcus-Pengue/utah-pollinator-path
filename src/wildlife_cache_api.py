"""
Serve cached wildlife data
"""

from flask import jsonify, send_file, request
import json
import os

CACHE_FILE = "static/wildlife_cache.json"
_cache = None

def load_cache():
    global _cache
    if _cache is None and os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r') as f:
            _cache = json.load(f)
    return _cache

def register_cache_routes(app):
    
    @app.route('/api/wildlife/cached', methods=['GET'])
    def get_cached_wildlife():
        """Return full cached dataset with optional filters."""
        cache = load_cache()
        if not cache:
            return jsonify({"error": "Cache not found"}), 404
        
        # Optional year filter
        min_year = request.args.get('min_year', type=int)
        max_year = request.args.get('max_year', type=int)
        taxon = request.args.get('taxon')
        
        features = cache["features"]
        
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
        """Return cache statistics without full data."""
        cache = load_cache()
        if not cache:
            return jsonify({"error": "Cache not found"}), 404
        
        return jsonify({
            "total_observations": cache.get("total_observations"),
            "generated": cache.get("generated"),
            "year_distribution": cache.get("year_distribution", {}),
            "month_distribution": cache.get("month_distribution", {}),
            "taxon_distribution": cache.get("taxon_distribution", {}),
        })
    
    @app.route('/api/wildlife/cached/file', methods=['GET'])
    def get_cache_file():
        """Return raw cache file for client-side loading."""
        if os.path.exists(CACHE_FILE):
            return send_file(CACHE_FILE, mimetype='application/json')
        return jsonify({"error": "Cache not found"}), 404

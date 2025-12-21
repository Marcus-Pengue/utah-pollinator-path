"""
Utah Pollinator Path - REST API Server
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.engine import PollinatorEngine, Location
from sources.sources import create_all_sources
from algorithms.homeowner import create_homeowner_algorithm
from algorithms.municipal import create_municipal_algorithm

app = Flask(__name__)
CORS(app)

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = PollinatorEngine(cache_ttl_hours=24)
        for name, source in create_all_sources().items():
            _engine.register_source(source)
        _engine.register_algorithm(create_homeowner_algorithm())
        _engine.register_algorithm(create_municipal_algorithm())
        print(f"Engine initialized: {_engine.list_sources()}, {_engine.list_algorithms()}")
    return _engine

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@app.route('/health', methods=['GET'])
def health():
    engine = get_engine()
    return jsonify({"status": "healthy", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat(),
                   "sources": engine.list_sources(), "algorithms": engine.list_algorithms()})

@app.route('/api/info', methods=['GET'])
def api_info():
    return jsonify({"name": "Utah Pollinator Path API", "version": "1.0.0",
                   "endpoints": ["GET /health", "POST /api/score/homeowner", "POST /api/score/municipal",
                                "POST /api/score/batch", "POST /api/recommendations"]})

@app.route('/api/score/homeowner', methods=['POST'])
def score_homeowner():
    return _score_location("homeowner_v1")

@app.route('/api/score/municipal', methods=['POST'])
def score_municipal():
    return _score_location("municipal_v1")

def _score_location(algorithm: str):
    data = request.json
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    try:
        location = Location(lat=float(data['lat']), lng=float(data['lng']), name=data.get('name', ''))
        engine = get_engine()
        result = run_async(engine.score(location, algorithm=algorithm))
        return jsonify(result.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/score/batch', methods=['POST'])
def score_batch():
    data = request.json
    if not data or 'locations' not in data:
        return jsonify({"error": "locations array required"}), 400
    try:
        locations = [Location(lat=loc['lat'], lng=loc['lng'], name=loc.get('name', '')) for loc in data['locations']]
        algorithm = data.get('algorithm', 'homeowner_v1')
        engine = get_engine()
        results = run_async(engine.batch_score(locations, algorithm=algorithm))
        scores = [r.percentage for r in results]
        return jsonify({"results": [r.to_dict() for r in results],
                       "summary": {"count": len(results), "avg_score": round(sum(scores)/len(scores), 2) if scores else 0}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    data = request.json
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "lat and lng required"}), 400
    try:
        location = Location(lat=float(data['lat']), lng=float(data['lng']))
        engine = get_engine()
        result = run_async(engine.score(location, algorithm=data.get('algorithm', 'homeowner_v1')))
        return jsonify({"current_score": result.percentage, "grade": result.grade.letter,
                       "recommendations": [r.to_dict() for r in result.recommendations]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<dataset>', methods=['GET'])
def get_dataset(dataset: str):
    valid = {"priority200": "PRIORITY200.json", "connect200": "CONNECT200.json", "public200": "PUBLIC200.json"}
    if dataset not in valid:
        return jsonify({"error": f"Unknown dataset", "available": list(valid.keys())}), 404
    try:
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', valid[dataset])
        if os.path.exists(data_path):
            with open(data_path, 'r') as f:
                return Response(f.read(), mimetype='application/json')
        return jsonify({"error": "Data file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# =============================================================================

# =============================================================================
# LEADERBOARD ENDPOINTS (Supabase-backed)
# =============================================================================

from leaderboard_db import register_leaderboard_routes
register_leaderboard_routes(app)


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    get_engine()
    print(f"\n  Utah Pollinator Path API running on http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)

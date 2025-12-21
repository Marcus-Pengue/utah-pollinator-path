"""
API endpoints for evidence-based scoring v2.
"""

from flask import request, jsonify
from scoring_v2 import (
    PropertyData, PlantInventory, Season,
    score_property, ScoreBreakdown
)


def register_scoring_v2_routes(app):
    """Register v2 scoring routes."""
    
    @app.route('/api/v2/score', methods=['POST'])
    def score_property_v2():
        """
        Evidence-based property scoring.
        
        POST /api/v2/score
        {
            "lat": 40.666,
            "lng": -111.897,
            "plants": [
                {"species": "Showy Milkweed", "count": 3, "bloom_seasons": ["summer"], "is_native": true, "is_milkweed": true},
                {"species": "Rabbitbrush", "count": 2, "bloom_seasons": ["fall"], "is_native": true}
            ],
            "flower_coverage_pct": 25,
            "has_bare_ground": true,
            "bare_ground_sqft": 20,
            "has_dead_wood": true,
            "has_bee_hotel": false,
            "has_brush_pile": false,
            "leaves_stems_over_winter": true,
            "uses_pesticides": false,
            "pesticide_frequency": "never",
            "mowing_frequency": "monthly",
            "lot_size_sqft": 5000,
            "impervious_surface_pct": 25,
            "neighbors_in_program": 2
        }
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        if 'lat' not in data or 'lng' not in data:
            return jsonify({"error": "lat and lng required"}), 400
        
        # Parse plants
        plants = []
        for p in data.get('plants', []):
            seasons = []
            for s in p.get('bloom_seasons', []):
                if s.lower() == 'spring':
                    seasons.append(Season.SPRING)
                elif s.lower() == 'summer':
                    seasons.append(Season.SUMMER)
                elif s.lower() == 'fall':
                    seasons.append(Season.FALL)
            
            plants.append(PlantInventory(
                species=p.get('species', 'Unknown'),
                count=p.get('count', 1),
                bloom_seasons=seasons,
                is_native=p.get('is_native', True),
                is_milkweed=p.get('is_milkweed', False),
            ))
        
        # Build PropertyData
        prop = PropertyData(
            lat=data['lat'],
            lng=data['lng'],
            grid_hash=f"{round(data['lat'], 3)}_{round(data['lng'], 3)}",
            plants=plants,
            estimated_flower_coverage_pct=data.get('flower_coverage_pct', 0),
            has_bare_ground=data.get('has_bare_ground', False),
            bare_ground_sqft=data.get('bare_ground_sqft', 0),
            has_dead_wood=data.get('has_dead_wood', False),
            has_brush_pile=data.get('has_brush_pile', False),
            has_bee_hotel=data.get('has_bee_hotel', False),
            leaves_stems_over_winter=data.get('leaves_stems_over_winter', False),
            neighbors_in_program=data.get('neighbors_in_program', 0),
            green_space_within_500m=data.get('green_space_within_500m', 0),
            uses_pesticides=data.get('uses_pesticides', False),
            pesticide_frequency=data.get('pesticide_frequency', 'never'),
            mowing_frequency=data.get('mowing_frequency', 'weekly'),
            lot_size_sqft=data.get('lot_size_sqft', 5000),
            impervious_surface_pct=data.get('impervious_surface_pct', 30),
        )
        
        # Score it
        result = score_property(prop)
        
        # Format response
        return jsonify({
            "score": round(result.final_score, 1),
            "grade": result.grade,
            "confidence": result.confidence,
            "data_completeness": round(result.data_completeness, 1),
            "breakdown": {
                "floral": {
                    "total": result.floral_score,
                    "max": 35,
                    "diversity": result.floral_diversity,
                    "coverage": result.floral_coverage,
                    "spring": result.floral_spring,
                    "summer": result.floral_summer,
                    "fall": result.floral_fall,
                    "milkweed_bonus": result.floral_milkweed_bonus,
                },
                "nesting": {
                    "total": result.nesting_score,
                    "max": 30,
                    "ground": result.nesting_ground,
                    "cavity": result.nesting_cavity,
                    "undisturbed": result.nesting_undisturbed,
                },
                "connectivity": {
                    "total": result.connectivity_score,
                    "max": 20,
                },
                "management": {
                    "total": result.management_score,
                    "max": 15,
                },
                "impervious_penalty": result.impervious_penalty,
            },
            "recommendations": result.recommendations,
            "methodology": {
                "version": "2.0",
                "basis": "Research-validated weights (ESTIMAP R²=0.80, InVEST R²=0.65-0.80)",
                "september_weight": "1.5-2x (84.5% nectar deficit finding)",
                "impervious_threshold": "22% (Berlin study R²=0.84)",
            }
        })
    
    @app.route('/api/v2/score/quick', methods=['GET'])
    def quick_score_v2():
        """
        Quick score with minimal data (for initial engagement).
        
        GET /api/v2/score/quick?lat=40.666&lng=-111.897&has_fall_blooms=true&has_milkweed=false
        """
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        has_fall = request.args.get('has_fall_blooms', 'false').lower() == 'true'
        has_milkweed = request.args.get('has_milkweed', 'false').lower() == 'true'
        has_natives = request.args.get('has_natives', 'false').lower() == 'true'
        pesticide_free = request.args.get('pesticide_free', 'true').lower() == 'true'
        
        # Build minimal plant list
        plants = []
        if has_fall:
            plants.append(PlantInventory("Fall bloomer", 1, [Season.FALL], is_native=True))
        if has_milkweed:
            plants.append(PlantInventory("Milkweed", 1, [Season.SUMMER], is_native=True, is_milkweed=True))
        if has_natives:
            plants.append(PlantInventory("Native plant", 2, [Season.SPRING, Season.SUMMER], is_native=True))
        
        prop = PropertyData(
            lat=lat,
            lng=lng,
            plants=plants,
            uses_pesticides=not pesticide_free,
        )
        
        result = score_property(prop)
        
        return jsonify({
            "score": round(result.final_score, 1),
            "grade": result.grade,
            "confidence": "low",
            "message": "Complete your plant inventory for a more accurate score",
            "quick_wins": [
                r for r in result.recommendations 
                if r.get('priority') in ['critical', 'high']
            ][:3],
        })

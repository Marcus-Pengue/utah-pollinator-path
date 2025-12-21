"""
Species Database API endpoints.
"""

from flask import request, jsonify
from species_db import (
    PLANTS, POLLINATORS,
    search_plants, search_pollinators,
    get_september_critical_plants, get_milkweeds,
    validate_species, get_planting_recommendations,
    BloomSeason, SunRequirement, WaterNeed
)


def register_species_routes(app):
    """Register species routes on Flask app."""
    
    @app.route('/api/species/plants', methods=['GET'])
    def list_plants():
        """
        Search plants.
        
        GET /api/species/plants
        GET /api/species/plants?query=milkweed
        GET /api/species/plants?bloom=early_fall
        GET /api/species/plants?native=true
        GET /api/species/plants?tag=september_critical
        """
        query = request.args.get('query')
        bloom = request.args.get('bloom')
        native = request.args.get('native', '').lower() == 'true'
        tag = request.args.get('tag')
        min_monarch = request.args.get('min_monarch', type=int)
        
        bloom_season = None
        if bloom:
            try:
                bloom_season = BloomSeason(bloom)
            except ValueError:
                pass
        
        tags = [tag] if tag else None
        
        results = search_plants(
            query=query,
            bloom_season=bloom_season,
            min_monarch_value=min_monarch,
            native_only=native,
            tags=tags,
        )
        
        return jsonify({
            "count": len(results),
            "plants": [
                {
                    "common_name": p.common_name,
                    "scientific_name": p.scientific_name,
                    "bloom_seasons": [s.value for s in p.bloom_seasons],
                    "monarch_value": p.monarch_value,
                    "pollinator_value": p.pollinator_value,
                    "native_to_utah": p.native_to_utah,
                    "sun": p.sun.value,
                    "water": p.water.value,
                    "description": p.description,
                    "planting_tips": p.planting_tips,
                    "tags": p.tags,
                }
                for p in results
            ]
        })
    
    @app.route('/api/species/plants/september', methods=['GET'])
    def september_plants():
        """Get plants critical for September monarch migration."""
        results = get_september_critical_plants()
        return jsonify({
            "message": "Plants critical for September monarch migration",
            "count": len(results),
            "plants": [
                {
                    "common_name": p.common_name,
                    "scientific_name": p.scientific_name,
                    "monarch_value": p.monarch_value,
                    "description": p.description,
                    "planting_tips": p.planting_tips,
                }
                for p in results
            ]
        })
    
    @app.route('/api/species/plants/milkweeds', methods=['GET'])
    def milkweed_plants():
        """Get all milkweed varieties."""
        results = get_milkweeds()
        return jsonify({
            "message": "Milkweeds - host plants for monarch caterpillars",
            "count": len(results),
            "plants": [
                {
                    "common_name": p.common_name,
                    "scientific_name": p.scientific_name,
                    "monarch_value": p.monarch_value,
                    "water": p.water.value,
                    "description": p.description,
                    "planting_tips": p.planting_tips,
                }
                for p in results
            ]
        })
    
    @app.route('/api/species/pollinators', methods=['GET'])
    def list_pollinators():
        """
        Search pollinators.
        
        GET /api/species/pollinators
        GET /api/species/pollinators?query=butterfly
        GET /api/species/pollinators?category=butterfly
        GET /api/species/pollinators?month=9
        """
        query = request.args.get('query')
        category = request.args.get('category')
        month = request.args.get('month', type=int)
        
        results = search_pollinators(query=query, category=category, month=month)
        
        return jsonify({
            "count": len(results),
            "pollinators": [
                {
                    "common_name": p.common_name,
                    "scientific_name": p.scientific_name,
                    "category": p.category,
                    "active_months": p.active_months,
                    "host_plants": p.host_plants,
                    "nectar_plants": p.nectar_plants,
                    "description": p.description,
                    "identification_tips": p.identification_tips,
                    "conservation_status": p.conservation_status,
                }
                for p in results
            ]
        })
    
    @app.route('/api/species/validate', methods=['GET'])
    def validate_name():
        """
        Validate a species name.
        
        GET /api/species/validate?name=monarch
        """
        name = request.args.get('name', '')
        if not name:
            return jsonify({"error": "name parameter required"}), 400
        
        result = validate_species(name)
        
        if result:
            return jsonify({"valid": True, "match": result})
        else:
            return jsonify({"valid": False, "match": None})
    
    @app.route('/api/species/autocomplete', methods=['GET'])
    def autocomplete():
        """
        Autocomplete species names.
        
        GET /api/species/autocomplete?q=mon
        GET /api/species/autocomplete?q=milk&type=plant
        """
        q = request.args.get('q', '').lower()
        species_type = request.args.get('type')  # plant, pollinator, or None for both
        
        if len(q) < 2:
            return jsonify({"suggestions": []})
        
        suggestions = []
        
        if species_type in [None, 'plant']:
            for plant in PLANTS.values():
                if q in plant.common_name.lower() or q in plant.scientific_name.lower():
                    suggestions.append({
                        "type": "plant",
                        "name": plant.common_name,
                        "scientific": plant.scientific_name,
                        "monarch_value": plant.monarch_value,
                    })
        
        if species_type in [None, 'pollinator']:
            for poll in POLLINATORS.values():
                if q in poll.common_name.lower() or q in poll.scientific_name.lower():
                    suggestions.append({
                        "type": "pollinator",
                        "name": poll.common_name,
                        "scientific": poll.scientific_name,
                    })
        
        return jsonify({"suggestions": suggestions[:10]})
    
    @app.route('/api/species/recommend', methods=['POST'])
    def recommend_plants():
        """
        Get personalized planting recommendations.
        
        POST /api/species/recommend
        {
            "sun": "full_sun",
            "water": "low",
            "has_september_gap": true
        }
        """
        data = request.get_json() or {}
        
        sun_str = data.get('sun', 'full_sun')
        water_str = data.get('water', 'low')
        has_gap = data.get('has_september_gap', True)
        
        try:
            sun = SunRequirement(sun_str)
        except ValueError:
            sun = SunRequirement.FULL_SUN
        
        try:
            water = WaterNeed(water_str)
        except ValueError:
            water = WaterNeed.LOW
        
        recs = get_planting_recommendations(
            sun=sun,
            water=water,
            has_september_gap=has_gap,
        )
        
        return jsonify(recs)

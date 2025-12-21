"""
Habitat Assessments API
========================
Xerces-compatible habitat assessment system.
Supports model validation through structured data export.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers(token=None):
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    h["Authorization"] = f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}"
    return h

async def get_user_id(token):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=_headers(token),
            ssl=_ssl_context()
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('id')
    return None


def calculate_score_from_assessment(data):
    """
    Calculate evidence-based score from assessment data.
    Maps questionnaire responses to scoring_v2 inputs.
    """
    score = 0
    breakdown = {
        "floral": {"total": 0, "max": 35},
        "nesting": {"total": 0, "max": 30},
        "connectivity": {"total": 0, "max": 20},
        "management": {"total": 0, "max": 15},
        "impervious_penalty": 0
    }
    
    # === FLORAL RESOURCES (35 pts) ===
    
    # Diversity (0-12 pts)
    native_count = data.get('native_species_count', 0)
    if native_count >= 10:
        breakdown["floral"]["diversity"] = 12
    elif native_count >= 7:
        breakdown["floral"]["diversity"] = 10
    elif native_count >= 5:
        breakdown["floral"]["diversity"] = 8
    elif native_count >= 3:
        breakdown["floral"]["diversity"] = 5
    elif native_count >= 1:
        breakdown["floral"]["diversity"] = 2
    else:
        breakdown["floral"]["diversity"] = 0
    
    # Coverage (0-8 pts)
    coverage = data.get('flower_coverage_pct', 0)
    if coverage >= 30:
        breakdown["floral"]["coverage"] = 8
    elif coverage >= 20:
        breakdown["floral"]["coverage"] = 6
    elif coverage >= 10:
        breakdown["floral"]["coverage"] = 4
    elif coverage >= 5:
        breakdown["floral"]["coverage"] = 2
    else:
        breakdown["floral"]["coverage"] = 0
    
    # Seasonal continuity (0-10 pts) - FALL WEIGHTED
    breakdown["floral"]["spring"] = 2 if data.get('has_spring_blooms') else 0
    breakdown["floral"]["summer"] = 2 if data.get('has_summer_blooms') else 0
    breakdown["floral"]["fall"] = 6 if data.get('has_fall_blooms') else 0  # 1.5-2x weight
    
    # Milkweed bonus (0-5 pts)
    milkweed = data.get('milkweed_present', 'none')
    if milkweed == 'many':
        breakdown["floral"]["milkweed"] = 5
    elif milkweed == 'some':
        breakdown["floral"]["milkweed"] = 4
    elif milkweed == 'few':
        breakdown["floral"]["milkweed"] = 3
    else:
        breakdown["floral"]["milkweed"] = 0
    
    breakdown["floral"]["total"] = min(35,
        breakdown["floral"].get("diversity", 0) +
        breakdown["floral"].get("coverage", 0) +
        breakdown["floral"].get("spring", 0) +
        breakdown["floral"].get("summer", 0) +
        breakdown["floral"].get("fall", 0) +
        breakdown["floral"].get("milkweed", 0)
    )
    
    # === NESTING HABITAT (30 pts) ===
    
    # Ground nesting (0-10 pts)
    ground_score = 0
    if data.get('has_bare_ground'):
        sqft = data.get('bare_ground_sqft', 0)
        if sqft >= 50:
            ground_score = 10
        elif sqft >= 25:
            ground_score = 7
        elif sqft >= 10:
            ground_score = 5
        else:
            ground_score = 3
    if data.get('has_sandy_areas'):
        ground_score = min(10, ground_score + 2)
    if data.get('has_sunny_ground'):
        ground_score = min(10, ground_score + 1)
    breakdown["nesting"]["ground"] = ground_score
    
    # Cavity nesting (0-10 pts)
    cavity_score = 0
    if data.get('has_dead_wood'):
        cavity_score += 4
    if data.get('has_bee_hotel'):
        cavity_score += 3
    if data.get('has_brush_pile'):
        cavity_score += 3
    if data.get('has_hollow_stems'):
        cavity_score += 2
    breakdown["nesting"]["cavity"] = min(10, cavity_score)
    
    # Undisturbed areas (0-10 pts)
    undisturbed = 0
    if data.get('leaves_stems_over_winter'):
        undisturbed += 5
    if data.get('has_leaf_litter'):
        undisturbed += 2
    mowing = data.get('mowing_frequency', 'weekly')
    if mowing == 'never':
        undisturbed += 3
    elif mowing == 'monthly':
        undisturbed += 2
    elif mowing == 'biweekly':
        undisturbed += 1
    breakdown["nesting"]["undisturbed"] = min(10, undisturbed)
    
    breakdown["nesting"]["total"] = (
        breakdown["nesting"]["ground"] +
        breakdown["nesting"]["cavity"] +
        breakdown["nesting"]["undisturbed"]
    )
    
    # === CONNECTIVITY (20 pts) ===
    
    neighbors = data.get('neighbors_in_program', 0)
    
    # Pioneer bonus
    if neighbors == 0:
        breakdown["connectivity"]["pioneer"] = 8
        breakdown["connectivity"]["neighbors"] = 0
    elif neighbors <= 2:
        breakdown["connectivity"]["pioneer"] = 4
        breakdown["connectivity"]["neighbors"] = neighbors * 2
    else:
        breakdown["connectivity"]["pioneer"] = 0
        if neighbors >= 5:
            breakdown["connectivity"]["neighbors"] = 10
        else:
            breakdown["connectivity"]["neighbors"] = 5 + neighbors
    
    # Green space
    green = data.get('green_space_nearby', 'none')
    if green == 'large':
        breakdown["connectivity"]["green_space"] = 10
    elif green == 'medium':
        breakdown["connectivity"]["green_space"] = 7
    elif green == 'small':
        breakdown["connectivity"]["green_space"] = 4
    else:
        breakdown["connectivity"]["green_space"] = 2
    
    breakdown["connectivity"]["total"] = min(20,
        breakdown["connectivity"].get("pioneer", 0) +
        breakdown["connectivity"].get("neighbors", 0) +
        breakdown["connectivity"].get("green_space", 0)
    )
    
    # === MANAGEMENT (15 pts) ===
    
    # Pesticide-free (0-8 pts)
    pesticide = data.get('pesticide_frequency', 'sometimes')
    if pesticide == 'never':
        breakdown["management"]["pesticide_free"] = 8
    elif pesticide == 'rarely':
        breakdown["management"]["pesticide_free"] = 5
    elif pesticide == 'sometimes':
        breakdown["management"]["pesticide_free"] = 2
    else:
        breakdown["management"]["pesticide_free"] = 0
    
    # Native proportion (0-7 pts)
    native_pct = data.get('native_plant_pct', 0)
    if native_pct >= 80:
        breakdown["management"]["native_pct"] = 7
    elif native_pct >= 60:
        breakdown["management"]["native_pct"] = 5
    elif native_pct >= 40:
        breakdown["management"]["native_pct"] = 3
    elif native_pct >= 20:
        breakdown["management"]["native_pct"] = 1
    else:
        breakdown["management"]["native_pct"] = 0
    
    breakdown["management"]["total"] = (
        breakdown["management"].get("pesticide_free", 0) +
        breakdown["management"].get("native_pct", 0)
    )
    
    # === IMPERVIOUS PENALTY ===
    impervious = data.get('impervious_surface_pct', 0)
    if impervious > 22:
        breakdown["impervious_penalty"] = -min((impervious - 22) * 0.35, 10)
    
    # === TOTAL ===
    raw_score = (
        breakdown["floral"]["total"] +
        breakdown["nesting"]["total"] +
        breakdown["connectivity"]["total"] +
        breakdown["management"]["total"] +
        breakdown["impervious_penalty"]
    )
    
    final_score = max(0, min(100, raw_score))
    
    # Grade
    if final_score >= 90:
        grade = "A+"
    elif final_score >= 85:
        grade = "A"
    elif final_score >= 80:
        grade = "A-"
    elif final_score >= 75:
        grade = "B+"
    elif final_score >= 70:
        grade = "B"
    elif final_score >= 65:
        grade = "B-"
    elif final_score >= 60:
        grade = "C+"
    elif final_score >= 55:
        grade = "C"
    elif final_score >= 50:
        grade = "C-"
    elif final_score >= 40:
        grade = "D"
    else:
        grade = "F"
    
    return {
        "score": round(final_score, 1),
        "grade": grade,
        "breakdown": breakdown
    }


def register_assessments_routes(app):
    """Register assessment routes."""
    
    @app.route('/api/assessments', methods=['POST'])
    def create_assessment():
        """Save a habitat assessment."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        # Calculate score
        score_result = calculate_score_from_assessment(data)
        
        async def save():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            record = {
                "user_id": user_id,
                "assessment_id": data.get('assessment_id'),
                "assessment_date": data.get('assessment_date'),
                "assessment_version": data.get('assessment_version', '1.0'),
                "grid_hash": data.get('grid_hash'),
                
                # Site
                "lot_size_sqft": data.get('lot_size_sqft'),
                "impervious_surface_pct": data.get('impervious_surface_pct'),
                
                # Floral
                "flower_coverage_pct": data.get('flower_coverage_pct'),
                "has_spring_blooms": data.get('has_spring_blooms', False),
                "has_summer_blooms": data.get('has_summer_blooms', False),
                "has_fall_blooms": data.get('has_fall_blooms', False),
                "native_species_count": data.get('native_species_count'),
                "milkweed_present": data.get('milkweed_present'),
                
                # Nesting
                "has_bare_ground": data.get('has_bare_ground', False),
                "has_sandy_areas": data.get('has_sandy_areas', False),
                "has_sunny_ground": data.get('has_sunny_ground', False),
                "bare_ground_sqft": data.get('bare_ground_sqft'),
                "has_dead_wood": data.get('has_dead_wood', False),
                "has_bee_hotel": data.get('has_bee_hotel', False),
                "has_brush_pile": data.get('has_brush_pile', False),
                "has_hollow_stems": data.get('has_hollow_stems', False),
                
                # Management
                "pesticide_frequency": data.get('pesticide_frequency'),
                "leaves_stems_over_winter": data.get('leaves_stems_over_winter', False),
                "has_leaf_litter": data.get('has_leaf_litter', False),
                "mowing_frequency": data.get('mowing_frequency'),
                "native_plant_pct": data.get('native_plant_pct'),
                
                # Connectivity
                "neighbors_in_program": data.get('neighbors_in_program', 0),
                "green_space_nearby": data.get('green_space_nearby'),
                "has_water_source": data.get('has_water_source', False),
                "has_mud_source": data.get('has_mud_source', False),
                
                # Calculated
                "calculated_score": score_result["score"],
                "calculated_grade": score_result["grade"],
                "notes": data.get('notes'),
            }
            
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments"
            headers = _headers(token)
            headers["Prefer"] = "return=representation"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, ssl=_ssl_context(), json=record) as resp:
                    if resp.status == 201:
                        return await resp.json(), None
                    else:
                        text = await resp.text()
                        return None, text
        
        result, error = asyncio.run(save())
        if error:
            return jsonify({"error": error}), 400
        
        return jsonify({
            "success": True,
            "assessment": result[0] if result else None,
            "score": score_result["score"],
            "grade": score_result["grade"],
            "breakdown": score_result["breakdown"]
        }), 201
    
    @app.route('/api/assessments', methods=['GET'])
    def get_assessments():
        """Get user's assessments."""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        
        async def fetch():
            user_id = await get_user_id(token)
            if not user_id:
                return None, "Invalid token"
            
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?user_id=eq.{user_id}&order=assessment_date.desc"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(token), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json(), None
                    return [], None
        
        result, error = asyncio.run(fetch())
        if error:
            return jsonify({"error": error}), 401
        
        return jsonify({"assessments": result, "count": len(result)})
    
    @app.route('/api/assessments/export/xerces', methods=['GET'])
    def export_xerces():
        """
        Export all assessments in Xerces-compatible format.
        Admin endpoint for batch upload to Xerces Society.
        """
        # For now, no auth required - just export format
        # In production, add admin auth
        
        async def fetch_all():
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?order=assessment_date.desc&limit=1000"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json()
            return []
        
        assessments = asyncio.run(fetch_all())
        
        # Convert to Xerces format
        xerces_records = []
        for a in assessments:
            xerces_records.append({
                "site_id": a.get('assessment_id'),
                "assessment_date": a.get('assessment_date'),
                "location": a.get('grid_hash'),
                
                # Xerces Category: FOOD
                "food_bloom_spring": a.get('has_spring_blooms', False),
                "food_bloom_summer": a.get('has_summer_blooms', False),
                "food_bloom_fall": a.get('has_fall_blooms', False),
                "food_native_species_count": a.get('native_species_count', 0),
                "food_flowering_area_pct": a.get('flower_coverage_pct', 0),
                "food_milkweed_present": a.get('milkweed_present') != 'none',
                
                # Xerces Category: NESTING
                "nest_bare_ground": a.get('has_bare_ground', False),
                "nest_bare_ground_sqft": a.get('bare_ground_sqft', 0),
                "nest_dead_wood": a.get('has_dead_wood', False),
                "nest_bee_boxes": a.get('has_bee_hotel', False),
                "nest_brush_piles": a.get('has_brush_pile', False),
                "nest_pithy_stems": a.get('has_hollow_stems', False),
                
                # Xerces Category: PROTECTION
                "protect_pesticide_free": a.get('pesticide_frequency') == 'never',
                "protect_pesticide_frequency": a.get('pesticide_frequency'),
                "protect_overwinter_habitat": a.get('leaves_stems_over_winter', False),
                
                # Xerces Category: WATER
                "water_source_present": a.get('has_water_source', False),
                "water_mud_puddle": a.get('has_mud_source', False),
                
                # Validation metadata
                "_calculated_score": a.get('calculated_score'),
                "_calculated_grade": a.get('calculated_grade'),
                "_source": "Utah Pollinator Path",
                "_version": a.get('assessment_version'),
            })
        
        return jsonify({
            "format": "xerces_v1",
            "export_date": datetime.utcnow().isoformat(),
            "record_count": len(xerces_records),
            "records": xerces_records
        })
    
    @app.route('/api/assessments/export/validation', methods=['GET'])
    def export_validation():
        """
        Export assessments with full data for model validation.
        Includes all input variables and calculated scores.
        """
        async def fetch_all():
            url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?order=assessment_date.desc&limit=1000"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
                    if resp.status == 200:
                        return await resp.json()
            return []
        
        assessments = asyncio.run(fetch_all())
        
        # Include all fields for validation
        validation_records = []
        for a in assessments:
            # Recalculate score to include breakdown
            score_result = calculate_score_from_assessment(a)
            
            validation_records.append({
                # IDs
                "assessment_id": a.get('assessment_id'),
                "grid_hash": a.get('grid_hash'),
                "assessment_date": a.get('assessment_date'),
                
                # All input variables (for model training)
                "inputs": {
                    "lot_size_sqft": a.get('lot_size_sqft'),
                    "impervious_surface_pct": a.get('impervious_surface_pct'),
                    "flower_coverage_pct": a.get('flower_coverage_pct'),
                    "has_spring_blooms": a.get('has_spring_blooms'),
                    "has_summer_blooms": a.get('has_summer_blooms'),
                    "has_fall_blooms": a.get('has_fall_blooms'),
                    "native_species_count": a.get('native_species_count'),
                    "milkweed_present": a.get('milkweed_present'),
                    "has_bare_ground": a.get('has_bare_ground'),
                    "bare_ground_sqft": a.get('bare_ground_sqft'),
                    "has_dead_wood": a.get('has_dead_wood'),
                    "has_bee_hotel": a.get('has_bee_hotel'),
                    "has_brush_pile": a.get('has_brush_pile'),
                    "has_hollow_stems": a.get('has_hollow_stems'),
                    "pesticide_frequency": a.get('pesticide_frequency'),
                    "leaves_stems_over_winter": a.get('leaves_stems_over_winter'),
                    "mowing_frequency": a.get('mowing_frequency'),
                    "native_plant_pct": a.get('native_plant_pct'),
                    "neighbors_in_program": a.get('neighbors_in_program'),
                    "green_space_nearby": a.get('green_space_nearby'),
                },
                
                # Calculated outputs
                "outputs": {
                    "score": score_result["score"],
                    "grade": score_result["grade"],
                    "breakdown": score_result["breakdown"],
                },
                
                # For future: actual pollinator observations
                "observations": None,  # To be linked later
            })
        
        return jsonify({
            "format": "validation_v1",
            "export_date": datetime.utcnow().isoformat(),
            "record_count": len(validation_records),
            "schema_version": "1.0",
            "scoring_weights": {
                "floral": 35,
                "nesting": 30,
                "connectivity": 20,
                "management": 15,
                "impervious_threshold": 22,
            },
            "records": validation_records
        })

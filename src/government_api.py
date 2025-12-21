"""
Government API
===============
Analytics, priority areas, reporting for municipal partners.
Powers government dashboard and decision-making.
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta
from collections import defaultdict
from admin_auth import require_admin

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())

def _headers():
    return {"apikey": SUPABASE_KEY, "Content-Type": "application/json", "Authorization": f"Bearer {SUPABASE_KEY}"}


# ============ DATA FETCHING ============

async def fetch_all_assessments():
    """Fetch all habitat assessments."""
    url = f"{SUPABASE_URL}/rest/v1/habitat_assessments?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []

async def fetch_all_inventories():
    """Fetch all plant inventories."""
    url = f"{SUPABASE_URL}/rest/v1/plant_inventories?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []

async def fetch_all_scores():
    """Fetch all user scores."""
    url = f"{SUPABASE_URL}/rest/v1/user_scores?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []

async def fetch_all_challenges():
    """Fetch all challenges."""
    url = f"{SUPABASE_URL}/rest/v1/challenges?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []

async def fetch_challenge_participants():
    """Fetch all challenge participants."""
    url = f"{SUPABASE_URL}/rest/v1/challenge_participants?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []

async def fetch_all_observations():
    """Fetch all observations."""
    url = f"{SUPABASE_URL}/rest/v1/observations?select=*"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), ssl=_ssl_context()) as resp:
            return await resp.json() if resp.status == 200 else []


# ============ GRID ANALYSIS ============

def grid_to_coords(grid_hash):
    """Convert grid hash to lat/lng."""
    if not grid_hash or '_' not in grid_hash:
        return None, None
    try:
        lat, lng = grid_hash.split('_')
        return float(lat), float(lng)
    except:
        return None, None

def coords_to_ward(lat, lng):
    """
    Map coordinates to ward/area.
    TODO: Replace with actual ward boundary lookup.
    """
    # Simplified Murray ward mapping based on lat ranges
    if lat is None:
        return "Unknown"
    
    if lat >= 40.68:
        return "Murray North"
    elif lat >= 40.66:
        return "Murray Central"
    elif lat >= 40.64:
        return "Murray South"
    else:
        return "South Valley"

def coords_to_city(lat, lng):
    """Map coordinates to city."""
    # Simplified - Murray boundaries roughly
    if lat is None:
        return "Unknown"
    if 40.62 <= lat <= 40.70 and -111.92 <= lng <= -111.85:
        return "Murray"
    return "Salt Lake County"


# ============ AGGREGATION ============

async def get_program_overview():
    """Get high-level program metrics."""
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    scores = await fetch_all_scores()
    challenges = await fetch_all_challenges()
    observations = await fetch_all_observations()
    
    # Unique participants
    participants = set()
    for a in assessments:
        if a.get('user_id'):
            participants.add(a['user_id'])
    for i in inventories:
        if i.get('user_id'):
            participants.add(i['user_id'])
    
    # Plant counts
    total_plants = sum(i.get('count', 1) for i in inventories)
    native_plants = sum(i.get('count', 1) for i in inventories if i.get('is_native'))
    milkweed_plants = sum(i.get('count', 1) for i in inventories if i.get('is_milkweed'))
    
    # Fall bloomer coverage
    fall_households = len(set(
        a['user_id'] for a in assessments 
        if a.get('has_fall_blooms') and a.get('user_id')
    ))
    
    # Unique species
    species = set(i.get('species') for i in inventories if i.get('species'))
    
    # Average score
    score_values = [s.get('total_score', 0) for s in scores if s.get('total_score')]
    avg_score = sum(score_values) / len(score_values) if score_values else 0
    
    # Active challenges
    active_challenges = len([c for c in challenges if c.get('status') == 'active'])
    completed_challenges = len([c for c in challenges if c.get('status') == 'completed'])
    
    # Grid coverage
    grids = set()
    for a in assessments:
        if a.get('grid_hash'):
            grids.add(a['grid_hash'])
    for i in inventories:
        if i.get('grid_hash'):
            grids.add(i['grid_hash'])
    
    return {
        "participants": len(participants),
        "unique_grids": len(grids),
        "total_plants": total_plants,
        "native_plants": native_plants,
        "milkweed_plants": milkweed_plants,
        "unique_species": len(species),
        "fall_bloomer_households": fall_households,
        "average_score": round(avg_score, 1),
        "active_challenges": active_challenges,
        "completed_challenges": completed_challenges,
        "total_observations": len(observations),
        "verified_observations": len([o for o in observations if o.get('review_status') == 'approved']),
    }


async def get_ward_breakdown():
    """Get metrics broken down by ward/area."""
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    scores = await fetch_all_scores()
    
    wards = defaultdict(lambda: {
        "participants": set(),
        "grids": set(),
        "total_plants": 0,
        "native_plants": 0,
        "milkweed_plants": 0,
        "fall_bloomers": 0,
        "scores": [],
    })
    
    # Process assessments
    for a in assessments:
        lat, lng = grid_to_coords(a.get('grid_hash'))
        ward = coords_to_ward(lat, lng)
        
        if a.get('user_id'):
            wards[ward]["participants"].add(a['user_id'])
        if a.get('grid_hash'):
            wards[ward]["grids"].add(a['grid_hash'])
        if a.get('has_fall_blooms'):
            wards[ward]["fall_bloomers"] += 1
    
    # Process inventories
    for i in inventories:
        lat, lng = grid_to_coords(i.get('grid_hash'))
        ward = coords_to_ward(lat, lng)
        
        count = i.get('count', 1)
        wards[ward]["total_plants"] += count
        if i.get('is_native'):
            wards[ward]["native_plants"] += count
        if i.get('is_milkweed'):
            wards[ward]["milkweed_plants"] += count
    
    # Process scores
    for s in scores:
        lat, lng = grid_to_coords(s.get('grid_hash'))
        ward = coords_to_ward(lat, lng)
        if s.get('total_score'):
            wards[ward]["scores"].append(s['total_score'])
    
    # Format output
    result = []
    for ward_name, data in wards.items():
        scores = data["scores"]
        result.append({
            "ward": ward_name,
            "participants": len(data["participants"]),
            "grids_covered": len(data["grids"]),
            "total_plants": data["total_plants"],
            "native_plants": data["native_plants"],
            "milkweed_plants": data["milkweed_plants"],
            "fall_bloomer_count": data["fall_bloomers"],
            "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "max_score": max(scores) if scores else 0,
        })
    
    return sorted(result, key=lambda x: x['participants'], reverse=True)


async def get_priority_areas():
    """
    Identify priority areas for outreach.
    Priority = low adoption + high potential (near existing participants)
    """
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    
    # Get all active grids
    active_grids = set()
    for a in assessments:
        if a.get('grid_hash'):
            active_grids.add(a['grid_hash'])
    for i in inventories:
        if i.get('grid_hash'):
            active_grids.add(i['grid_hash'])
    
    # Find grids adjacent to active ones but not yet active
    # These are high-potential for connectivity
    priority_grids = []
    
    for grid in active_grids:
        lat, lng = grid_to_coords(grid)
        if lat is None:
            continue
        
        # Check 8 adjacent grids
        for dlat in [-0.001, 0, 0.001]:
            for dlng in [-0.001, 0, 0.001]:
                if dlat == 0 and dlng == 0:
                    continue
                
                adj_lat = round(lat + dlat, 3)
                adj_lng = round(lng + dlng, 3)
                adj_grid = f"{adj_lat}_{adj_lng}"
                
                if adj_grid not in active_grids:
                    # Count how many active neighbors
                    neighbor_count = 0
                    for g in active_grids:
                        g_lat, g_lng = grid_to_coords(g)
                        if g_lat and abs(g_lat - adj_lat) <= 0.002 and abs(g_lng - adj_lng) <= 0.002:
                            neighbor_count += 1
                    
                    priority_grids.append({
                        "grid_hash": adj_grid,
                        "lat": adj_lat,
                        "lng": adj_lng,
                        "ward": coords_to_ward(adj_lat, adj_lng),
                        "city": coords_to_city(adj_lat, adj_lng),
                        "active_neighbors": neighbor_count,
                        "priority_score": neighbor_count * 10,  # More neighbors = higher priority
                    })
    
    # Dedupe and sort by priority
    seen = set()
    unique_priority = []
    for p in sorted(priority_grids, key=lambda x: x['priority_score'], reverse=True):
        if p['grid_hash'] not in seen:
            seen.add(p['grid_hash'])
            unique_priority.append(p)
    
    return unique_priority[:50]  # Top 50 priority areas


async def get_connectivity_gaps():
    """Identify gaps in the habitat network."""
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    
    # Active grids with data
    grid_data = defaultdict(lambda: {
        "participants": 0,
        "plants": 0,
        "has_fall": False,
        "has_milkweed": False,
    })
    
    for a in assessments:
        grid = a.get('grid_hash')
        if grid:
            grid_data[grid]["participants"] += 1
            if a.get('has_fall_blooms'):
                grid_data[grid]["has_fall"] = True
    
    for i in inventories:
        grid = i.get('grid_hash')
        if grid:
            grid_data[grid]["plants"] += i.get('count', 1)
            if i.get('is_milkweed'):
                grid_data[grid]["has_milkweed"] = True
    
    # Find isolated grids (no neighbors)
    isolated = []
    for grid, data in grid_data.items():
        lat, lng = grid_to_coords(grid)
        if lat is None:
            continue
        
        neighbor_count = 0
        for other_grid in grid_data.keys():
            if other_grid == grid:
                continue
            o_lat, o_lng = grid_to_coords(other_grid)
            if o_lat and abs(o_lat - lat) <= 0.002 and abs(o_lng - lng) <= 0.002:
                neighbor_count += 1
        
        if neighbor_count == 0:
            isolated.append({
                "grid_hash": grid,
                "lat": lat,
                "lng": lng,
                "ward": coords_to_ward(lat, lng),
                "participants": data["participants"],
                "plants": data["plants"],
                "issue": "isolated",
                "recommendation": "Target adjacent properties for outreach",
            })
    
    # Find grids missing fall bloomers
    fall_gaps = []
    for grid, data in grid_data.items():
        if not data["has_fall"]:
            lat, lng = grid_to_coords(grid)
            fall_gaps.append({
                "grid_hash": grid,
                "lat": lat,
                "lng": lng,
                "ward": coords_to_ward(lat, lng) if lat else "Unknown",
                "participants": data["participants"],
                "issue": "no_fall_bloomers",
                "recommendation": "September Ready challenge or fall plant distribution",
            })
    
    return {
        "isolated_habitats": isolated,
        "fall_bloomer_gaps": fall_gaps[:20],
        "summary": {
            "total_grids": len(grid_data),
            "isolated_count": len(isolated),
            "missing_fall_count": len(fall_gaps),
        }
    }


async def get_temporal_trends(days=90):
    """Get adoption trends over time."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    
    # Group by week
    weeks = defaultdict(lambda: {
        "new_assessments": 0,
        "new_plants": 0,
        "new_participants": set(),
    })
    
    for a in assessments:
        created = a.get('submitted_at', '')[:10]
        if created >= cutoff[:10]:
            week = created[:7]  # YYYY-MM format
            weeks[week]["new_assessments"] += 1
            if a.get('user_id'):
                weeks[week]["new_participants"].add(a['user_id'])
    
    for i in inventories:
        created = i.get('created_at', '')[:10]
        if created >= cutoff[:10]:
            week = created[:7]
            weeks[week]["new_plants"] += i.get('count', 1)
    
    # Format output
    trends = []
    for period, data in sorted(weeks.items()):
        trends.append({
            "period": period,
            "new_assessments": data["new_assessments"],
            "new_plants": data["new_plants"],
            "new_participants": len(data["new_participants"]),
        })
    
    return trends


async def get_challenge_effectiveness():
    """Analyze challenge engagement and outcomes."""
    challenges = await fetch_all_challenges()
    participants = await fetch_challenge_participants()
    
    # Map participants to challenges
    challenge_participants = defaultdict(list)
    for p in participants:
        challenge_participants[p.get('challenge_id')].append(p)
    
    results = []
    for c in challenges:
        cid = c.get('id')
        c_participants = challenge_participants.get(cid, [])
        
        target = c.get('goal_target', 1)
        progress = c.get('current_progress', 0)
        completion_pct = (progress / target * 100) if target > 0 else 0
        
        total_contribution = sum(p.get('contribution', 0) for p in c_participants)
        
        results.append({
            "challenge_id": cid,
            "name": c.get('name'),
            "goal_type": c.get('goal_type'),
            "ward": c.get('ward'),
            "city": c.get('city'),
            "status": c.get('status'),
            "participant_count": len(c_participants),
            "goal_target": target,
            "current_progress": progress,
            "completion_pct": round(completion_pct, 1),
            "total_contributions": total_contribution,
            "avg_contribution": round(total_contribution / len(c_participants), 1) if c_participants else 0,
        })
    
    return sorted(results, key=lambda x: x['participant_count'], reverse=True)


# ============ GEOJSON EXPORTS ============

async def get_participation_geojson():
    """Export participation data as GeoJSON for mapping."""
    assessments = await fetch_all_assessments()
    inventories = await fetch_all_inventories()
    scores = await fetch_all_scores()
    
    # Aggregate by grid
    grid_data = defaultdict(lambda: {
        "participants": 0,
        "plants": 0,
        "has_fall": False,
        "has_milkweed": False,
        "score": None,
    })
    
    for a in assessments:
        grid = a.get('grid_hash')
        if grid:
            grid_data[grid]["participants"] += 1
            if a.get('has_fall_blooms'):
                grid_data[grid]["has_fall"] = True
    
    for i in inventories:
        grid = i.get('grid_hash')
        if grid:
            grid_data[grid]["plants"] += i.get('count', 1)
            if i.get('is_milkweed'):
                grid_data[grid]["has_milkweed"] = True
    
    for s in scores:
        grid = s.get('grid_hash')
        if grid and s.get('total_score'):
            grid_data[grid]["score"] = s['total_score']
    
    # Build GeoJSON
    features = []
    for grid, data in grid_data.items():
        lat, lng = grid_to_coords(grid)
        if lat is None:
            continue
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": {
                "grid_hash": grid,
                "participants": data["participants"],
                "plants": data["plants"],
                "has_fall_blooms": data["has_fall"],
                "has_milkweed": data["has_milkweed"],
                "score": data["score"],
                "ward": coords_to_ward(lat, lng),
            }
        })
    
    return {
        "type": "FeatureCollection",
        "generated_at": datetime.utcnow().isoformat(),
        "features": features,
    }


async def get_priority_geojson():
    """Export priority areas as GeoJSON."""
    priorities = await get_priority_areas()
    
    features = []
    for p in priorities:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [p["lng"], p["lat"]]
            },
            "properties": {
                "grid_hash": p["grid_hash"],
                "ward": p["ward"],
                "city": p["city"],
                "active_neighbors": p["active_neighbors"],
                "priority_score": p["priority_score"],
            }
        })
    
    return {
        "type": "FeatureCollection",
        "generated_at": datetime.utcnow().isoformat(),
        "features": features,
    }


# ============ REPORTING ============

async def generate_council_report():
    """Generate summary report for city council."""
    overview = await get_program_overview()
    wards = await get_ward_breakdown()
    trends = await get_temporal_trends(90)
    gaps = await get_connectivity_gaps()
    challenges = await get_challenge_effectiveness()
    
    # Calculate impact estimates
    # Rough estimate: each 10 plants = 1 sq meter habitat
    est_habitat_sqm = overview["total_plants"] / 10
    est_habitat_sqft = est_habitat_sqm * 10.764
    
    return {
        "report_date": datetime.utcnow().isoformat(),
        "report_type": "council_summary",
        
        "executive_summary": {
            "total_participants": overview["participants"],
            "total_plants_logged": overview["total_plants"],
            "native_plant_percentage": round(overview["native_plants"] / max(overview["total_plants"], 1) * 100, 1),
            "estimated_habitat_sqft": round(est_habitat_sqft),
            "average_property_score": overview["average_score"],
            "fall_bloomer_coverage": f"{overview['fall_bloomer_households']} households",
        },
        
        "program_health": {
            "active_challenges": overview["active_challenges"],
            "completed_challenges": overview["completed_challenges"],
            "verified_observations": overview["verified_observations"],
            "unique_species_recorded": overview["unique_species"],
        },
        
        "geographic_coverage": {
            "grids_with_participation": overview["unique_grids"],
            "wards_breakdown": wards,
        },
        
        "connectivity_status": {
            "isolated_habitats": gaps["summary"]["isolated_count"],
            "fall_bloomer_gaps": gaps["summary"]["missing_fall_count"],
            "recommendation": "Focus outreach on priority grids to build connectivity",
        },
        
        "trends": {
            "period": "Last 90 days",
            "data": trends,
        },
        
        "top_challenges": challenges[:5],
        
        "recommendations": [
            f"Target {len(gaps['isolated_habitats'])} isolated properties for neighbor outreach",
            f"Launch September Ready campaigns in {gaps['summary']['missing_fall_count']} areas missing fall bloomers",
            "Consider milkweed distribution program for monarch corridor",
            "Expand challenge participation through ward-based competitions",
        ],
    }


# ============ ROUTES ============

def register_government_routes(app):
    """Register government API routes."""
    
    @app.route('/api/gov/overview', methods=['GET'])
    def gov_overview():
        """Get program overview metrics."""
        data = asyncio.run(get_program_overview())
        return jsonify(data)
    
    @app.route('/api/gov/wards', methods=['GET'])
    def gov_wards():
        """Get breakdown by ward/area."""
        data = asyncio.run(get_ward_breakdown())
        return jsonify({"wards": data})
    
    @app.route('/api/gov/priority-areas', methods=['GET'])
    def gov_priority():
        """Get priority areas for outreach."""
        data = asyncio.run(get_priority_areas())
        return jsonify({"priority_areas": data, "count": len(data)})
    
    @app.route('/api/gov/connectivity-gaps', methods=['GET'])
    def gov_gaps():
        """Get connectivity gap analysis."""
        data = asyncio.run(get_connectivity_gaps())
        return jsonify(data)
    
    @app.route('/api/gov/trends', methods=['GET'])
    def gov_trends():
        """Get temporal adoption trends."""
        days = request.args.get('days', 90, type=int)
        data = asyncio.run(get_temporal_trends(days))
        return jsonify({"period_days": days, "trends": data})
    
    @app.route('/api/gov/challenges', methods=['GET'])
    def gov_challenges():
        """Get challenge effectiveness analysis."""
        data = asyncio.run(get_challenge_effectiveness())
        return jsonify({"challenges": data})
    
    @app.route('/api/gov/geojson/participation', methods=['GET'])
    def gov_geojson_participation():
        """Export participation as GeoJSON."""
        data = asyncio.run(get_participation_geojson())
        return jsonify(data)
    
    @app.route('/api/gov/geojson/priority', methods=['GET'])
    def gov_geojson_priority():
        """Export priority areas as GeoJSON."""
        data = asyncio.run(get_priority_geojson())
        return jsonify(data)
    
    @app.route('/api/gov/report/council', methods=['GET'])
    @require_admin
    def gov_council_report():
        """Generate council summary report."""
        data = asyncio.run(generate_council_report())
        return jsonify(data)
    
    @app.route('/api/gov/report/ward/<ward_name>', methods=['GET'])
    def gov_ward_report(ward_name):
        """Get detailed report for specific ward."""
        async def ward_detail():
            wards = await get_ward_breakdown()
            for w in wards:
                if w['ward'].lower() == ward_name.lower():
                    return w
            return None
        
        data = asyncio.run(ward_detail())
        if data:
            return jsonify(data)
        return jsonify({"error": "Ward not found"}), 404

"""
Wasatch Pollinator Corridor Gap Analysis
=========================================
Identifies gaps in the pollinator corridor and prioritizes interventions.
"""

import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CorridorCell:
    """A single cell in the corridor analysis grid."""
    grid_hash: str
    lat: float
    lng: float
    city: str
    
    # Connectivity metrics
    connectivity_index: float      # 0-1, how connected to green corridors
    dist_to_green_m: float         # Distance to nearest green space
    green_count_250m: int          # Green spaces within 250m
    green_count_500m: int          # Green spaces within 500m
    
    # Development pressure
    built_count_250m: int          # Built structures within 250m
    built_count_500m: int          # Built structures within 500m
    
    # Priority scores
    need_proxy: float              # 0-1, how much area needs habitat
    intervention_priority: float   # 0-1, overall priority for intervention
    
    # Calculated
    gap_severity: str = "unknown"  # critical, high, moderate, low, connected


# Load data from project files (would be from DB in production)
def _load_priority_data() -> List[Dict]:
    """Load priority intervention data."""
    data_str = '''{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[-112.00412549399489,40.65182757903545]},"properties":{"grid_hash":"40.652_-112.004","nearest_location":"West Valley City","distance_km":"4.427493614368638","dist_to_green_m":"49.2","green_count_250m":"1","green_count_500m":"17","built_count_250m":"8","built_count_500m":"12","connectivity_index":"0.951","microclimate_proxy":"-0.8","need_proxy":0.8,"intervention_priority":0.891}}]}'''
    # In production, load from file or database
    return []


# Hardcoded sample data for demo (would load from DB)
PRIORITY_CELLS = [
    CorridorCell(
        grid_hash="40.652_-112.004", lat=40.652, lng=-112.004, city="West Valley City",
        connectivity_index=0.951, dist_to_green_m=49.2, green_count_250m=1, green_count_500m=17,
        built_count_250m=8, built_count_500m=12, need_proxy=0.8, intervention_priority=0.891,
        gap_severity="critical"
    ),
    CorridorCell(
        grid_hash="40.519_-111.949", lat=40.519, lng=-111.949, city="Draper",
        connectivity_index=0.915, dist_to_green_m=85.4, green_count_250m=1, green_count_500m=11,
        built_count_250m=28, built_count_500m=48, need_proxy=0.8, intervention_priority=0.869,
        gap_severity="critical"
    ),
    CorridorCell(
        grid_hash="40.613_-111.914", lat=40.613, lng=-111.914, city="West Jordan",
        connectivity_index=0.902, dist_to_green_m=98.3, green_count_250m=1, green_count_500m=60,
        built_count_250m=31, built_count_500m=219, need_proxy=0.8, intervention_priority=0.861,
        gap_severity="critical"
    ),
    CorridorCell(
        grid_hash="40.677_-111.928", lat=40.677, lng=-111.928, city="Taylorsville",
        connectivity_index=0.747, dist_to_green_m=253.2, green_count_250m=0, green_count_500m=16,
        built_count_250m=11, built_count_500m=20, need_proxy=1.0, intervention_priority=0.848,
        gap_severity="high"
    ),
    CorridorCell(
        grid_hash="40.739_-111.898", lat=40.739, lng=-111.898, city="Downtown SLC",
        connectivity_index=0.749, dist_to_green_m=250.8, green_count_250m=0, green_count_500m=10,
        built_count_250m=11, built_count_500m=28, need_proxy=1.0, intervention_priority=0.849,
        gap_severity="high"
    ),
    CorridorCell(
        grid_hash="40.624_-111.827", lat=40.624, lng=-111.827, city="Cottonwood Heights",
        connectivity_index=0.749, dist_to_green_m=251.2, green_count_250m=0, green_count_500m=13,
        built_count_250m=10, built_count_500m=18, need_proxy=1.0, intervention_priority=0.849,
        gap_severity="high"
    ),
]


# =============================================================================
# CORRIDOR GAP ANALYSIS
# =============================================================================

def classify_gap_severity(cell: Dict) -> str:
    """Classify the severity of a corridor gap."""
    connectivity = float(cell.get('connectivity_index', 0))
    priority = float(cell.get('intervention_priority', 0))
    green_nearby = int(cell.get('green_count_250m', 0))
    
    if priority >= 0.85 and green_nearby == 0:
        return "critical"
    elif priority >= 0.80 or (connectivity < 0.75 and green_nearby == 0):
        return "high"
    elif priority >= 0.70 or green_nearby <= 1:
        return "moderate"
    elif priority >= 0.60:
        return "low"
    else:
        return "connected"


def get_gap_stats_by_city(cells: List[Dict]) -> Dict:
    """Get gap statistics grouped by city."""
    city_stats = {}
    
    for cell in cells:
        city = cell.get('nearest_location', 'Unknown')
        severity = classify_gap_severity(cell)
        
        if city not in city_stats:
            city_stats[city] = {
                "total_cells": 0,
                "critical": 0,
                "high": 0,
                "moderate": 0,
                "low": 0,
                "connected": 0,
                "avg_priority": 0,
                "total_priority": 0,
            }
        
        city_stats[city]["total_cells"] += 1
        city_stats[city][severity] += 1
        city_stats[city]["total_priority"] += float(cell.get('intervention_priority', 0))
    
    # Calculate averages
    for city, stats in city_stats.items():
        if stats["total_cells"] > 0:
            stats["avg_priority"] = round(stats["total_priority"] / stats["total_cells"], 3)
        del stats["total_priority"]
    
    return city_stats


def find_critical_gaps(cells: List[Dict], limit: int = 20) -> List[Dict]:
    """Find the most critical gaps in the corridor."""
    # Sort by intervention priority
    sorted_cells = sorted(
        cells,
        key=lambda x: float(x.get('intervention_priority', 0)),
        reverse=True
    )
    
    critical = []
    for cell in sorted_cells[:limit]:
        critical.append({
            "grid_hash": cell.get('grid_hash'),
            "city": cell.get('nearest_location'),
            "lat": cell.get('geometry', {}).get('coordinates', [0, 0])[1] if 'geometry' in cell else cell.get('lat'),
            "lng": cell.get('geometry', {}).get('coordinates', [0, 0])[0] if 'geometry' in cell else cell.get('lng'),
            "intervention_priority": float(cell.get('intervention_priority', 0)),
            "connectivity_index": float(cell.get('connectivity_index', 0)),
            "dist_to_green_m": float(cell.get('dist_to_green_m', 0)),
            "green_count_500m": int(cell.get('green_count_500m', 0)),
            "severity": classify_gap_severity(cell),
            "impact_if_filled": _estimate_impact(cell),
        })
    
    return critical


def _estimate_impact(cell: Dict) -> Dict:
    """Estimate the impact of filling a gap."""
    priority = float(cell.get('intervention_priority', 0))
    connectivity = float(cell.get('connectivity_index', 0))
    built_nearby = int(cell.get('built_count_500m', 0))
    
    # Impact scales with priority and number of nearby homes
    homes_potentially_reached = min(built_nearby * 3, 150)  # Rough estimate
    
    # Connectivity boost estimate
    connectivity_boost = round((1 - connectivity) * 0.3, 2)  # Max 30% boost
    
    # Monarch impact (very rough)
    if priority > 0.85:
        monarch_impact = "high"
        estimated_monarchs = "20-50 additional monarchs could be supported"
    elif priority > 0.75:
        monarch_impact = "moderate"
        estimated_monarchs = "10-20 additional monarchs could be supported"
    else:
        monarch_impact = "low"
        estimated_monarchs = "5-10 additional monarchs could be supported"
    
    return {
        "homes_reached": homes_potentially_reached,
        "connectivity_boost": connectivity_boost,
        "monarch_impact": monarch_impact,
        "estimated_monarchs": estimated_monarchs,
    }


def find_corridor_breaks(cells: List[Dict]) -> List[Dict]:
    """
    Find where the corridor is "broken" - large gaps between connected areas.
    These are the most important to fix for migration.
    """
    # Sort cells by latitude (north-south migration route)
    sorted_cells = sorted(
        cells,
        key=lambda x: x.get('geometry', {}).get('coordinates', [0, 0])[1] if 'geometry' in x else x.get('lat', 0),
        reverse=True  # North to south
    )
    
    breaks = []
    
    # Find gaps > 2km between cells with decent connectivity
    prev_cell = None
    for cell in sorted_cells:
        if prev_cell is None:
            prev_cell = cell
            continue
        
        # Calculate distance
        prev_lat = prev_cell.get('geometry', {}).get('coordinates', [0, 0])[1] if 'geometry' in prev_cell else prev_cell.get('lat', 0)
        curr_lat = cell.get('geometry', {}).get('coordinates', [0, 0])[1] if 'geometry' in cell else cell.get('lat', 0)
        
        lat_diff = abs(prev_lat - curr_lat)
        dist_km = lat_diff * 111  # Rough km per degree
        
        # If gap > 1km, it's a potential break
        if dist_km > 1.0:
            prev_conn = float(prev_cell.get('connectivity_index', 0))
            curr_conn = float(cell.get('connectivity_index', 0))
            
            # Both sides well connected but gap between
            if prev_conn > 0.9 and curr_conn > 0.9:
                breaks.append({
                    "north_cell": prev_cell.get('grid_hash'),
                    "south_cell": cell.get('grid_hash'),
                    "gap_km": round(dist_km, 2),
                    "north_city": prev_cell.get('nearest_location'),
                    "south_city": cell.get('nearest_location'),
                    "severity": "critical" if dist_km > 2 else "moderate",
                })
        
        prev_cell = cell
    
    return breaks


def get_corridor_summary() -> Dict:
    """Get high-level corridor health summary."""
    
    # In production, load from database
    # For demo, use sample data
    
    return {
        "corridor_name": "Wasatch Front Pollinator Corridor",
        "extent": {
            "north": "Salt Lake City (40.78°N)",
            "south": "Draper (40.52°N)",
            "length_km": 29,
        },
        "health_score": 67,  # 0-100
        "status": "moderate_gaps",
        "critical_gaps": 12,
        "high_priority_gaps": 28,
        "total_cells_analyzed": 200,
        "cities_covered": [
            "Salt Lake City", "South Salt Lake", "Murray", "Taylorsville",
            "West Valley City", "West Jordan", "Sandy", "Draper", "Cottonwood Heights"
        ],
        "key_findings": [
            "Major gap in Taylorsville (40.677°N) - 250m to nearest green",
            "West Valley City has highest concentration of critical gaps",
            "Jordan River corridor well connected, needs branch extensions",
            "September nectar desert in southern Sandy/Draper corridor",
        ],
        "top_priorities": [
            {
                "city": "West Valley City",
                "action": "Focus on residential yards near 4400 S & 4800 W",
                "impact": "Could connect isolated patches to Jordan River corridor",
            },
            {
                "city": "Taylorsville",
                "action": "Target neighborhoods between 4700 S and 5400 S",
                "impact": "Bridges critical gap in mid-valley corridor",
            },
            {
                "city": "Murray",
                "action": "Expand from existing Murray Park habitat",
                "impact": "Strengthens already-connected area",
            },
        ],
    }


def calculate_user_corridor_impact(lat: float, lng: float, grid_hash: str = None) -> Dict:
    """
    Calculate how a single property contributes to the corridor.
    
    Args:
        lat, lng: Property coordinates
        grid_hash: Optional pre-computed grid hash
    
    Returns:
        Impact analysis for this location
    """
    
    if not grid_hash:
        grid_hash = f"{round(lat, 3)}_{round(lng, 3)}"
    
    # In production, look up from database
    # For demo, estimate based on location
    
    # Rough corridor centerline (Jordan River)
    corridor_lng = -111.92
    dist_from_corridor = abs(lng - corridor_lng) * 85  # km at this latitude
    
    if dist_from_corridor < 1:
        position = "core_corridor"
        connectivity_contribution = "high"
        description = "Your property is in the core corridor along the Jordan River"
    elif dist_from_corridor < 3:
        position = "corridor_buffer"
        connectivity_contribution = "moderate"
        description = "Your property helps extend the corridor into residential areas"
    else:
        position = "corridor_extension"
        connectivity_contribution = "pioneer"
        description = "Your property could help establish a new branch of the corridor"
    
    # Check if in known gap area
    known_gap_cities = ["West Valley City", "Taylorsville"]  # From analysis
    
    return {
        "grid_hash": grid_hash,
        "lat": lat,
        "lng": lng,
        "distance_from_corridor_km": round(dist_from_corridor, 2),
        "position_type": position,
        "connectivity_contribution": connectivity_contribution,
        "description": description,
        "neighbors_needed": 3 if position == "corridor_extension" else 1,
        "message": f"Your habitat could help {5 if position == 'core_corridor' else 10} monarchs during migration",
    }


# =============================================================================
# API-READY FUNCTIONS
# =============================================================================

def get_gaps_geojson(severity_filter: str = None, city_filter: str = None, limit: int = 100) -> Dict:
    """
    Get corridor gaps as GeoJSON for map display.
    """
    # In production, query from database
    # For demo, return sample
    
    features = []
    
    for cell in PRIORITY_CELLS[:limit]:
        if severity_filter and cell.gap_severity != severity_filter:
            continue
        if city_filter and cell.city != city_filter:
            continue
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [cell.lng, cell.lat]
            },
            "properties": {
                "grid_hash": cell.grid_hash,
                "city": cell.city,
                "severity": cell.gap_severity,
                "intervention_priority": cell.intervention_priority,
                "connectivity_index": cell.connectivity_index,
                "dist_to_green_m": cell.dist_to_green_m,
                "green_count_500m": cell.green_count_500m,
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total": len(features),
            "severity_filter": severity_filter,
            "city_filter": city_filter,
        }
    }


# Test
if __name__ == "__main__":
    print("=" * 60)
    print("WASATCH POLLINATOR CORRIDOR GAP ANALYSIS")
    print("=" * 60)
    
    summary = get_corridor_summary()
    
    print(f"\n📍 {summary['corridor_name']}")
    print(f"   {summary['extent']['north']} → {summary['extent']['south']}")
    print(f"   Length: {summary['extent']['length_km']} km")
    print(f"\n🏥 Health Score: {summary['health_score']}/100 ({summary['status']})")
    print(f"   Critical gaps: {summary['critical_gaps']}")
    print(f"   High priority: {summary['high_priority_gaps']}")
    
    print("\n🔴 KEY FINDINGS:")
    for finding in summary['key_findings']:
        print(f"   • {finding}")
    
    print("\n🎯 TOP PRIORITIES:")
    for p in summary['top_priorities']:
        print(f"   {p['city']}: {p['action']}")
        print(f"      Impact: {p['impact']}")
    
    print("\n📍 Sample Impact Calculation (Murray):")
    impact = calculate_user_corridor_impact(40.666, -111.897)
    print(f"   Position: {impact['position_type']}")
    print(f"   Contribution: {impact['connectivity_contribution']}")
    print(f"   {impact['message']}")

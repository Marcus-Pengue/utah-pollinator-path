"""
Internal Observation Scoring
============================
Scores based on YOUR observations table, not public iNaturalist.
This ties pollinator activity to specific properties.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Dict, Any
from sources.internal_observations import InternalObservationsSource


async def score_internal_observations(
    lat: float,
    lng: float,
    grid_hash: str = None,
    radius_degrees: float = 0.001,  # ~100m default
) -> Dict[str, Any]:
    """
    Score a location based on internal observations.
    
    Args:
        lat, lng: Location coordinates
        grid_hash: Optional exact grid hash to match
        radius_degrees: Search radius (0.001 ≈ 100m, 0.003 ≈ 300m)
    
    Returns:
        Scores and metadata
    """
    
    source = InternalObservationsSource()
    
    # If grid_hash provided, use exact match first
    if grid_hash:
        exact_data = await source.fetch_by_grid_hash(grid_hash)
    else:
        exact_data = {"total_observations": 0}
    
    # Also do proximity query for nearby observations
    from core.engine import Location
    loc = Location(lat=lat, lng=lng)
    proximity_data = await source.fetch(loc, radius_degrees=radius_degrees)
    
    # Combine: prefer exact grid, fall back to proximity
    total_obs = exact_data.get("total_observations", 0) or proximity_data.get("total_observations", 0)
    sept_obs = exact_data.get("september_observations", 0) or proximity_data.get("september_observations", 0)
    species_count = exact_data.get("species_count", 0) or proximity_data.get("species_count", 0)
    
    # Calculate scores
    
    # Activity Score: Based on total observations at this location
    # 0 obs = 0%, 1-2 = 25%, 3-5 = 50%, 6-10 = 75%, 10+ = 100%
    if total_obs == 0:
        activity_score = 0.0
    elif total_obs <= 2:
        activity_score = 0.25
    elif total_obs <= 5:
        activity_score = 0.50
    elif total_obs <= 10:
        activity_score = 0.75
    else:
        activity_score = 1.0
    
    # September Score: Critical for monarch migration
    # 0 = 0%, 1-2 = 33%, 3-5 = 66%, 5+ = 100%
    if sept_obs == 0:
        september_score = 0.0
    elif sept_obs <= 2:
        september_score = 0.33
    elif sept_obs <= 5:
        september_score = 0.66
    else:
        september_score = 1.0
    
    # Diversity Score: Based on species variety
    # 0 = 0%, 1-2 = 33%, 3-5 = 66%, 5+ = 100%
    if species_count == 0:
        diversity_score = 0.0
    elif species_count <= 2:
        diversity_score = 0.33
    elif species_count <= 5:
        diversity_score = 0.66
    else:
        diversity_score = 1.0
    
    return {
        # Raw data
        "total_observations": total_obs,
        "september_observations": sept_obs,
        "species_count": species_count,
        "exact_match_count": exact_data.get("total_observations", 0),
        "proximity_count": proximity_data.get("total_observations", 0),
        
        # Normalized scores (0-1)
        "activity_score": activity_score,
        "september_score": september_score,
        "diversity_score": diversity_score,
        
        # Metadata
        "radius_meters": round(radius_degrees * 111000),
        "species_list": proximity_data.get("species_list", []),
        "monthly_distribution": proximity_data.get("monthly_distribution", {}),
        
        # Source indicator
        "source": "internal_observations",
    }


async def get_property_observation_summary(grid_hash: str) -> Dict[str, Any]:
    """
    Get detailed observation summary for a specific property.
    Used for property detail pages / dashboards.
    """
    
    source = InternalObservationsSource()
    data = await source.fetch_by_grid_hash(grid_hash)
    
    if data.get("total_observations", 0) == 0:
        return {
            "status": "no_observations",
            "message": "No observations recorded at this property yet.",
            "tip": "Start documenting pollinators you see! Each photo improves your score.",
            "total": 0,
        }
    
    monthly = data.get("monthly_distribution", {})
    peak_month = max(monthly, key=monthly.get) if any(monthly.values()) else None
    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December"
    }
    
    # Check September gap
    sept_count = monthly.get(9, 0)
    total_count = data.get("total_observations", 0)
    sept_ratio = sept_count / total_count if total_count > 0 else 0
    
    if sept_ratio < 0.1 and total_count > 3:
        sept_status = "gap"
        sept_message = "September gap detected! Focus on late-season bloomers."
    elif sept_count > 0:
        sept_status = "good"
        sept_message = f"{sept_count} September observations - great for monarch migration!"
    else:
        sept_status = "none"
        sept_message = "No September observations yet. Plant rabbitbrush & asters!"
    
    return {
        "status": "has_observations",
        "total": total_count,
        "september_count": sept_count,
        "september_status": sept_status,
        "september_message": sept_message,
        "species_count": data.get("species_count", 0),
        "species_list": data.get("species_list", []),
        "peak_month": month_names.get(peak_month, "Unknown") if peak_month else None,
        "monthly_distribution": monthly,
        "recent_observations": data.get("observations", [])[:5],
    }


# Test
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("Testing internal scoring...")
        
        # Score Murray location
        result = await score_internal_observations(
            lat=40.6655,
            lng=-111.8965,
            grid_hash="40.666_-111.897",
        )
        
        print(f"\nLocation: Murray")
        print(f"Total observations: {result['total_observations']}")
        print(f"September observations: {result['september_observations']}")
        print(f"Species count: {result['species_count']}")
        print(f"\nScores:")
        print(f"  Activity: {result['activity_score']*100:.0f}%")
        print(f"  September: {result['september_score']*100:.0f}%")
        print(f"  Diversity: {result['diversity_score']*100:.0f}%")
        
        print("\n" + "="*50)
        print("Property Summary:")
        summary = await get_property_observation_summary("40.666_-111.897")
        print(f"  Status: {summary['status']}")
        print(f"  Total: {summary['total']}")
        print(f"  September: {summary['september_message']}")
        
    asyncio.run(test())

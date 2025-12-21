"""
Utah Pollinator Path - Leaderboard System
==========================================
Multi-level rankings: State → County → City → ZIP → Ward (self-reported)
"""

import aiohttp
import ssl
import certifi
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class LocationInfo:
    """Geocoded location details for leaderboard assignment."""
    lat: float
    lng: float
    city: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    ward: Optional[str] = None  # Self-reported
    grid_hash: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "lat": self.lat,
            "lng": self.lng,
            "city": self.city,
            "county": self.county,
            "state": self.state,
            "zip_code": self.zip_code,
            "ward": self.ward,
            "grid_hash": self.grid_hash,
        }


@dataclass 
class LeaderboardEntry:
    """Single entry on a leaderboard."""
    rank: int
    display_name: str  # Anonymous or chosen name
    score: float
    grade: str
    location_info: LocationInfo
    certified_date: Optional[datetime] = None
    identity_level: str = "seedling"
    
    def to_dict(self) -> Dict:
        return {
            "rank": self.rank,
            "display_name": self.display_name,
            "score": self.score,
            "grade": self.grade,
            "city": self.location_info.city,
            "zip_code": self.location_info.zip_code,
            "identity_level": self.identity_level,
        }


class GeocodingService:
    """Reverse geocoding via OpenStreetMap Nominatim."""
    
    URL = "https://nominatim.openstreetmap.org/reverse"
    
    async def reverse_geocode(self, lat: float, lng: float) -> LocationInfo:
        """Get city, county, ZIP from coordinates."""
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            params = {
                "lat": lat,
                "lon": lng,
                "format": "json",
                "addressdetails": 1,
            }
            headers = {"User-Agent": "UtahPollinatorPath/1.0"}
            
            async with session.get(self.URL, params=params, headers=headers) as response:
                if response.status != 200:
                    return LocationInfo(lat=lat, lng=lng)
                
                data = await response.json()
                address = data.get("address", {})
                
                # Extract city (could be city, town, village, etc.)
                city = (
                    address.get("city") or 
                    address.get("town") or 
                    address.get("village") or
                    address.get("municipality")
                )
                
                return LocationInfo(
                    lat=lat,
                    lng=lng,
                    city=city,
                    county=address.get("county", "").replace(" County", ""),
                    state=address.get("state"),
                    zip_code=address.get("postcode"),
                    grid_hash=f"{round(lat, 3)}_{round(lng, 3)}",
                )


class LeaderboardManager:
    """
    Manages multi-level leaderboards.
    
    Levels:
    - state: All Utah participants
    - county: Salt Lake County, Utah County, etc.
    - city: Murray, Sandy, Provo, etc.
    - zip: 84107, 84101, etc.
    - ward: Self-reported (Murray 4th Ward, etc.)
    """
    
    def __init__(self):
        self.geocoder = GeocodingService()
        # In production, this would be Supabase
        self._entries: List[LeaderboardEntry] = []
    
    async def add_entry(
        self,
        lat: float,
        lng: float,
        score: float,
        grade: str,
        display_name: str = "Anonymous Gardener",
        ward: Optional[str] = None,
    ) -> LeaderboardEntry:
        """Add or update a leaderboard entry."""
        
        # Get location info from coordinates
        location = await self.geocoder.reverse_geocode(lat, lng)
        location.ward = ward  # Self-reported
        
        # Determine identity level
        identity = self._get_identity_level(score)
        
        entry = LeaderboardEntry(
            rank=0,  # Calculated later
            display_name=display_name,
            score=score,
            grade=grade,
            location_info=location,
            certified_date=datetime.utcnow(),
            identity_level=identity,
        )
        
        self._entries.append(entry)
        self._recalculate_ranks()
        
        return entry
    
    def _get_identity_level(self, score: float) -> str:
        """Get identity level from score percentage."""
        if score >= 90:
            return "pioneer"
        elif score >= 80:
            return "migration_champion"
        elif score >= 60:
            return "habitat_guardian"
        elif score >= 40:
            return "pollinator_friend"
        return "seedling"
    
    def _recalculate_ranks(self):
        """Recalculate ranks for all entries."""
        sorted_entries = sorted(self._entries, key=lambda e: e.score, reverse=True)
        for i, entry in enumerate(sorted_entries):
            entry.rank = i + 1
    
    def get_leaderboard(
        self,
        level: str = "state",
        filter_value: Optional[str] = None,
        limit: int = 20,
    ) -> Dict:
        """
        Get leaderboard for a specific level.
        
        Args:
            level: "state", "county", "city", "zip", or "ward"
            filter_value: Value to filter by (e.g., "Murray" for city level)
            limit: Max entries to return
        
        Returns:
            Leaderboard with entries and stats
        """
        
        # Filter entries by level
        if level == "state":
            filtered = [e for e in self._entries if e.location_info.state == "Utah"]
        elif level == "county":
            filtered = [e for e in self._entries if e.location_info.county == filter_value]
        elif level == "city":
            filtered = [e for e in self._entries if e.location_info.city == filter_value]
        elif level == "zip":
            filtered = [e for e in self._entries if e.location_info.zip_code == filter_value]
        elif level == "ward":
            filtered = [e for e in self._entries if e.location_info.ward == filter_value]
        else:
            filtered = self._entries
        
        # Sort by score
        sorted_entries = sorted(filtered, key=lambda e: e.score, reverse=True)
        
        # Calculate stats
        scores = [e.score for e in sorted_entries]
        
        return {
            "level": level,
            "filter": filter_value,
            "total_participants": len(sorted_entries),
            "entries": [e.to_dict() for e in sorted_entries[:limit]],
            "stats": {
                "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "top_score": max(scores) if scores else 0,
                "pioneers": len([e for e in sorted_entries if e.identity_level == "pioneer"]),
                "champions": len([e for e in sorted_entries if e.identity_level == "migration_champion"]),
            },
        }
    
    def get_user_rankings(self, grid_hash: str) -> Dict:
        """Get all leaderboard positions for a specific user."""
        
        entry = next((e for e in self._entries if e.location_info.grid_hash == grid_hash), None)
        if not entry:
            return {"error": "User not found"}
        
        rankings = {}
        
        # State ranking
        state_entries = sorted(
            [e for e in self._entries if e.location_info.state == "Utah"],
            key=lambda e: e.score, reverse=True
        )
        rankings["state"] = {
            "rank": next((i+1 for i, e in enumerate(state_entries) if e.location_info.grid_hash == grid_hash), None),
            "total": len(state_entries),
            "label": "Utah",
        }
        
        # City ranking
        if entry.location_info.city:
            city_entries = sorted(
                [e for e in self._entries if e.location_info.city == entry.location_info.city],
                key=lambda e: e.score, reverse=True
            )
            rankings["city"] = {
                "rank": next((i+1 for i, e in enumerate(city_entries) if e.location_info.grid_hash == grid_hash), None),
                "total": len(city_entries),
                "label": entry.location_info.city,
            }
        
        # ZIP ranking
        if entry.location_info.zip_code:
            zip_entries = sorted(
                [e for e in self._entries if e.location_info.zip_code == entry.location_info.zip_code],
                key=lambda e: e.score, reverse=True
            )
            rankings["zip"] = {
                "rank": next((i+1 for i, e in enumerate(zip_entries) if e.location_info.grid_hash == grid_hash), None),
                "total": len(zip_entries),
                "label": entry.location_info.zip_code,
            }
        
        # Ward ranking (if self-reported)
        if entry.location_info.ward:
            ward_entries = sorted(
                [e for e in self._entries if e.location_info.ward == entry.location_info.ward],
                key=lambda e: e.score, reverse=True
            )
            rankings["ward"] = {
                "rank": next((i+1 for i, e in enumerate(ward_entries) if e.location_info.grid_hash == grid_hash), None),
                "total": len(ward_entries),
                "label": entry.location_info.ward,
            }
        
        return {
            "user": entry.to_dict(),
            "rankings": rankings,
        }


# =============================================================================
# WARD REGISTRY (Self-Reported)
# =============================================================================

# Common wards in the Wasatch Front (users can add more)
KNOWN_WARDS = {
    "salt_lake_county": [
        "Murray 1st Ward", "Murray 2nd Ward", "Murray 3rd Ward", "Murray 4th Ward",
        "Murray 5th Ward", "Murray 6th Ward", "Murray 7th Ward", "Murray 8th Ward",
        "Sandy 1st Ward", "Sandy 2nd Ward", "Sandy 3rd Ward",
        "Draper 1st Ward", "Draper 2nd Ward",
        "Holladay 1st Ward", "Holladay 2nd Ward",
        "Cottonwood Heights 1st Ward", "Cottonwood Heights 2nd Ward",
        "Millcreek 1st Ward", "Millcreek 2nd Ward",
        "Taylorsville 1st Ward", "Taylorsville 2nd Ward",
        "West Jordan 1st Ward", "West Jordan 2nd Ward",
        "South Jordan 1st Ward", "South Jordan 2nd Ward",
    ],
    "utah_county": [
        "Provo 1st Ward", "Provo 2nd Ward",
        "Orem 1st Ward", "Orem 2nd Ward",
        "Lehi 1st Ward", "Lehi 2nd Ward",
        "American Fork 1st Ward", "American Fork 2nd Ward",
    ],
    "davis_county": [
        "Bountiful 1st Ward", "Bountiful 2nd Ward",
        "Farmington 1st Ward", "Farmington 2nd Ward",
        "Layton 1st Ward", "Layton 2nd Ward",
    ],
}


def get_wards_for_area(county: str) -> List[str]:
    """Get known wards for a county."""
    key = county.lower().replace(" ", "_")
    return KNOWN_WARDS.get(key, [])


# =============================================================================
# TEST
# =============================================================================

async def test_leaderboard():
    """Test the leaderboard system."""
    import asyncio
    
    manager = LeaderboardManager()
    
    # Add some test entries
    await manager.add_entry(40.6655, -111.8965, 80.0, "A", "Garden Guru", "Murray 4th Ward")
    await manager.add_entry(40.6700, -111.8900, 72.5, "B", "Butterfly Bob", "Murray 4th Ward")
    await manager.add_entry(40.5800, -111.8500, 91.0, "A+", "Pioneer Pat", "Sandy 1st Ward")
    await manager.add_entry(40.6600, -111.8800, 65.0, "B", "Anonymous Gardener")
    
    # Get Murray leaderboard
    print("\n🏆 MURRAY LEADERBOARD:")
    murray = manager.get_leaderboard(level="city", filter_value="Murray")
    for entry in murray["entries"]:
        print(f"   #{entry['rank']} {entry['display_name']}: {entry['score']}% ({entry['grade']})")
    
    # Get ward leaderboard
    print("\n⛪ MURRAY 4TH WARD LEADERBOARD:")
    ward = manager.get_leaderboard(level="ward", filter_value="Murray 4th Ward")
    for entry in ward["entries"]:
        print(f"   #{entry['rank']} {entry['display_name']}: {entry['score']}%")
    
    # Get user rankings
    print("\n📊 YOUR RANKINGS:")
    rankings = manager.get_user_rankings("40.666_-111.897")
    for level, data in rankings.get("rankings", {}).items():
        print(f"   {level.upper()}: #{data['rank']} of {data['total']} in {data['label']}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_leaderboard())

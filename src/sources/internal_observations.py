"""
Internal Observations Source
============================
Queries OUR observations table instead of public iNaturalist.
Ties observations to specific properties via grid_hash.
"""

import aiohttp
import ssl
import certifi
from typing import Dict, Any, List
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.engine import DataSource, Location

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())


class InternalObservationsSource(DataSource):
    """
    Query observations from our Supabase table.
    
    Matches observations by grid_hash for ~100m precision,
    or by proximity query for flexible radius.
    """
    
    @property
    def name(self) -> str:
        return "internal_observations"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        """
        Fetch observations near this location.
        
        Args:
            location: Location to query
            radius_degrees: Search radius in degrees (0.001 ≈ 100m)
            
        Returns:
            Observation counts and details
        """
        radius_deg = kwargs.get('radius_degrees', 0.003)  # ~300m default
        
        # Calculate bounding box
        min_lat = location.lat - radius_deg
        max_lat = location.lat + radius_deg
        min_lng = location.lng - radius_deg
        max_lng = location.lng + radius_deg
        
        # Query observations within bounding box
        url = (
            f"{SUPABASE_URL}/rest/v1/observations"
            f"?select=*"
            f"&lat=gte.{min_lat}&lat=lte.{max_lat}"
            f"&lng=gte.{min_lng}&lng=lte.{max_lng}"
            f"&order=observed_at.desc"
        )
        
        try:
            connector = aiohttp.TCPConnector(ssl=_ssl_context())
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(url, headers=_headers()) as resp:
                    if resp.status != 200:
                        error = await resp.text()
                        return {"error": error, "total_observations": 0}
                    
                    observations = await resp.json()
        except Exception as e:
            return {"error": str(e), "total_observations": 0}
        
        # Process observations
        total = len(observations)
        
        # Count by month
        monthly_counts = {i: 0 for i in range(1, 13)}
        species_guesses = set()
        confirmed_species = set()
        observers = set()
        
        for obs in observations:
            # Parse month from observed_at
            observed_at = obs.get("observed_at", "")
            if observed_at:
                try:
                    month = int(observed_at.split("-")[1])
                    monthly_counts[month] += 1
                except:
                    pass
            
            # Track species
            if obs.get("species_guess"):
                species_guesses.add(obs["species_guess"])
            if obs.get("inat_confirmed_taxon"):
                confirmed_species.add(obs["inat_confirmed_taxon"])
            
            # Track observers
            if obs.get("observer_name"):
                observers.add(obs["observer_name"])
        
        # September activity (key metric)
        september_count = monthly_counts.get(9, 0)
        august_count = monthly_counts.get(8, 0)
        
        return {
            "total_observations": total,
            "september_observations": september_count,
            "august_observations": august_count,
            "monthly_distribution": monthly_counts,
            "species_guesses": list(species_guesses),
            "confirmed_species": list(confirmed_species),
            "species_count": len(species_guesses | confirmed_species),
            "observer_count": len(observers),
            "observers": list(observers),
            "observations": observations[:10],  # Return first 10 for display
            "radius_degrees": radius_deg,
            "radius_meters_approx": round(radius_deg * 111000),  # Rough conversion
        }
    
    async def fetch_by_grid_hash(self, grid_hash: str) -> Dict[str, Any]:
        """
        Fetch observations for exact grid hash (most precise).
        """
        url = (
            f"{SUPABASE_URL}/rest/v1/observations"
            f"?grid_hash=eq.{grid_hash}"
            f"&order=observed_at.desc"
        )
        
        try:
            connector = aiohttp.TCPConnector(ssl=_ssl_context())
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(url, headers=_headers()) as resp:
                    if resp.status == 200:
                        observations = await resp.json()
                        return self._process_observations(observations, "exact_grid")
                    else:
                        return {"error": await resp.text(), "total_observations": 0}
        except Exception as e:
            return {"error": str(e), "total_observations": 0}
    
    async def fetch_by_user(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch all observations by a specific user.
        """
        url = (
            f"{SUPABASE_URL}/rest/v1/observations"
            f"?user_id=eq.{user_id}"
            f"&order=observed_at.desc"
        )
        
        try:
            connector = aiohttp.TCPConnector(ssl=_ssl_context())
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(url, headers=_headers()) as resp:
                    if resp.status == 200:
                        observations = await resp.json()
                        return self._process_observations(observations, "user")
                    else:
                        return {"error": await resp.text(), "total_observations": 0}
        except Exception as e:
            return {"error": str(e), "total_observations": 0}
    
    def _process_observations(self, observations: List, query_type: str) -> Dict:
        """Process observation list into summary stats."""
        total = len(observations)
        
        monthly_counts = {i: 0 for i in range(1, 13)}
        species = set()
        
        for obs in observations:
            observed_at = obs.get("observed_at", "")
            if observed_at:
                try:
                    month = int(observed_at.split("-")[1])
                    monthly_counts[month] += 1
                except:
                    pass
            
            if obs.get("species_guess"):
                species.add(obs["species_guess"])
            if obs.get("inat_confirmed_taxon"):
                species.add(obs["inat_confirmed_taxon"])
        
        return {
            "total_observations": total,
            "september_observations": monthly_counts.get(9, 0),
            "august_observations": monthly_counts.get(8, 0),
            "monthly_distribution": monthly_counts,
            "species_count": len(species),
            "species_list": list(species),
            "query_type": query_type,
            "observations": observations[:10],
        }


# Test
if __name__ == "__main__":
    import asyncio
    
    async def test():
        source = InternalObservationsSource()
        
        # Test location query
        from core.engine import Location
        loc = Location(lat=40.6655, lng=-111.8965)
        
        print("Testing proximity query...")
        result = await source.fetch(loc, radius_degrees=0.01)  # ~1km
        print(f"Found {result['total_observations']} observations")
        print(f"September: {result['september_observations']}")
        print(f"Species: {result['species_count']}")
        
        print("\nTesting grid hash query...")
        result = await source.fetch_by_grid_hash("40.666_-111.897")
        print(f"Found {result['total_observations']} at exact grid")
        
    asyncio.run(test())

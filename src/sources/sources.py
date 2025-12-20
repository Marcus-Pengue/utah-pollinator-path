"""
Utah Pollinator Path - Data Sources (with SSL fix for macOS)
"""

import aiohttp
import asyncio
import ssl
import certifi
import math
from typing import Dict, Any, List, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.engine import DataSource, Location


class HTTPSource(DataSource):
    """Base class for HTTP-based data sources with SSL fix"""
    
    def __init__(self, timeout: int = 30, rate_limit_ms: int = 100):
        self.timeout = timeout
        self.rate_limit_ms = rate_limit_ms
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            connector = aiohttp.TCPConnector(ssl=ssl_ctx)
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout),
                connector=connector
            )
        return self._session
    
    async def _get(self, url: str, params: Dict = None) -> Dict:
        await asyncio.sleep(self.rate_limit_ms / 1000)
        session = await self._get_session()
        async with session.get(url, params=params) as response:
            response.raise_for_status()
            return await response.json()
    
    async def _post(self, url: str, data: str) -> Dict:
        await asyncio.sleep(self.rate_limit_ms / 1000)
        session = await self._get_session()
        async with session.post(url, data=data) as response:
            response.raise_for_status()
            return await response.json()
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()


class ElevationSource(HTTPSource):
    URL = "https://epqs.nationalmap.gov/v1/json"
    
    @property
    def name(self) -> str:
        return "elevation"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        params = {"x": location.lng, "y": location.lat, "units": "Feet", "output": "json"}
        try:
            data = await self._get(self.URL, params)
            elevation_ft = data.get("value")
            if elevation_ft is not None:
                elevation_ft = float(elevation_ft)
                return {
                    "elevation_ft": round(elevation_ft),
                    "elevation_m": round(elevation_ft * 0.3048),
                    "bloom_zone": self._get_bloom_zone(elevation_ft),
                    "in_september_zone": 5000 <= elevation_ft <= 7000,
                    "zone_description": "Optimal September bloom zone" if 5000 <= elevation_ft <= 7000 else "Outside optimal zone"
                }
        except Exception as e:
            return {"error": str(e), "elevation_ft": None}
        return {"elevation_ft": None}
    
    def _get_bloom_zone(self, elevation_ft: float) -> str:
        if elevation_ft < 4500: return "low_valley"
        elif elevation_ft < 5000: return "valley"
        elif elevation_ft < 5500: return "bench_low"
        elif elevation_ft < 6500: return "bench_optimal"
        elif elevation_ft < 7000: return "bench_high"
        elif elevation_ft < 8000: return "foothill"
        return "mountain"


class WaterSource(HTTPSource):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    
    def __init__(self, default_radius_m: int = 1000, **kwargs):
        super().__init__(**kwargs)
        self.default_radius_m = default_radius_m
    
    @property
    def name(self) -> str:
        return "water"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        radius = kwargs.get('radius_m', self.default_radius_m)
        query = f"""[out:json][timeout:25];(way["natural"="water"](around:{radius},{location.lat},{location.lng});way["waterway"](around:{radius},{location.lat},{location.lng});node["natural"="spring"](around:{radius},{location.lat},{location.lng});node["amenity"="fountain"](around:{radius},{location.lat},{location.lng}););out body;"""
        try:
            data = await self._post(self.OVERPASS_URL, f"data={query}")
            elements = data.get("elements", [])
            water_types = {}
            for el in elements:
                tags = el.get("tags", {})
                wtype = tags.get("natural") or tags.get("waterway") or tags.get("amenity") or "unknown"
                water_types[wtype] = water_types.get(wtype, 0) + 1
            return {"water_count": len(elements), "water_types": water_types, "has_water": len(elements) > 0, "radius_m": radius}
        except Exception as e:
            return {"error": str(e), "water_count": 0, "has_water": False}


class INaturalistSource(HTTPSource):
    BASE_URL = "https://api.inaturalist.org/v1"
    POLLINATOR_TAXA = {"bees": 47201, "butterflies": 47224, "monarch": 48662, "hoverflies": 52775}
    MILKWEED_TAXON = 47605
    
    def __init__(self, default_radius_km: float = 2.0, **kwargs):
        super().__init__(**kwargs)
        self.default_radius_km = default_radius_km
    
    @property
    def name(self) -> str:
        return "inaturalist"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        radius = kwargs.get('radius_km', self.default_radius_km)
        pollinator_data = await self._fetch_pollinators(location, radius)
        milkweed_data = await self._fetch_milkweed(location, radius)
        return {**pollinator_data, **milkweed_data}
    
    async def _fetch_pollinators(self, location: Location, radius_km: float) -> Dict:
        taxa_ids = ",".join(str(t) for t in self.POLLINATOR_TAXA.values())
        params = {"lat": location.lat, "lng": location.lng, "radius": radius_km, 
                  "taxon_id": taxa_ids, "per_page": 200, "quality_grade": "research,needs_id"}
        try:
            data = await self._get(f"{self.BASE_URL}/observations", params)
            results = data.get("results", [])
            monthly_counts = {i: 0 for i in range(1, 13)}
            species = set()
            bee_count = butterfly_count = monarch_count = 0
            for obs in results:
                obs_date = obs.get("observed_on")
                if obs_date:
                    try:
                        month = int(obs_date.split("-")[1])
                        monthly_counts[month] += 1
                    except:
                        pass
                taxon = obs.get("taxon", {})
                if taxon.get("name"):
                    species.add(taxon["name"])
                ancestor_ids = taxon.get("ancestor_ids", [])
                if self.POLLINATOR_TAXA["bees"] in ancestor_ids:
                    bee_count += 1
                if self.POLLINATOR_TAXA["butterflies"] in ancestor_ids:
                    butterfly_count += 1
                if taxon.get("id") == self.POLLINATOR_TAXA["monarch"]:
                    monarch_count += 1
            return {
                "total_observations": len(results), "september_observations": monthly_counts.get(9, 0),
                "august_observations": monthly_counts.get(8, 0), "species_count": len(species),
                "species_list": list(species)[:15], "monthly_distribution": monthly_counts,
                "bee_count": bee_count, "butterfly_count": butterfly_count, "monarch_count": monarch_count,
                "peak_month": max(monthly_counts, key=monthly_counts.get) if any(monthly_counts.values()) else None
            }
        except Exception as e:
            return {"error": str(e), "total_observations": 0}
    
    async def _fetch_milkweed(self, location: Location, radius_km: float) -> Dict:
        params = {"lat": location.lat, "lng": location.lng, "radius": radius_km,
                  "taxon_id": self.MILKWEED_TAXON, "per_page": 100, "quality_grade": "research"}
        try:
            data = await self._get(f"{self.BASE_URL}/observations", params)
            results = data.get("results", [])
            milkweed_species = set()
            for obs in results:
                if obs.get("taxon", {}).get("name"):
                    milkweed_species.add(obs["taxon"]["name"])
            return {"milkweed_observations": len(results), "milkweed_species": list(milkweed_species), "has_milkweed": len(results) > 0}
        except Exception as e:
            return {"milkweed_observations": 0, "has_milkweed": False}


class GreenSpaceSource(HTTPSource):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    
    def __init__(self, default_radius_m: int = 500, **kwargs):
        super().__init__(**kwargs)
        self.default_radius_m = default_radius_m
    
    @property
    def name(self) -> str:
        return "greenspace"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        radius = kwargs.get('radius_m', self.default_radius_m)
        query = f"""[out:json][timeout:25];(way["leisure"="park"](around:{radius},{location.lat},{location.lng});way["leisure"="garden"](around:{radius},{location.lat},{location.lng});way["landuse"="grass"](around:{radius},{location.lat},{location.lng});way["natural"="grassland"](around:{radius},{location.lat},{location.lng});way["landuse"="meadow"](around:{radius},{location.lat},{location.lng});way["natural"="wood"](around:{radius},{location.lat},{location.lng}););out body;"""
        try:
            data = await self._post(self.OVERPASS_URL, f"data={query}")
            elements = data.get("elements", [])
            green_types = {}
            for el in elements:
                tags = el.get("tags", {})
                gtype = tags.get("leisure") or tags.get("landuse") or tags.get("natural") or "unknown"
                green_types[gtype] = green_types.get(gtype, 0) + 1
            query_250 = query.replace(f"around:{radius}", "around:250")
            data_250 = await self._post(self.OVERPASS_URL, f"data={query_250}")
            count_250 = len(data_250.get("elements", []))
            return {
                "green_count": len(elements), "green_count_250m": count_250,
                "green_count_500m": len(elements) if radius == 500 else None,
                "green_types": green_types, "has_park": "park" in green_types,
                "has_garden": "garden" in green_types, "radius_m": radius
            }
        except Exception as e:
            return {"error": str(e), "green_count": 0}


class BuiltEnvironmentSource(HTTPSource):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    
    @property
    def name(self) -> str:
        return "built"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        query = f"""[out:json][timeout:25];(way["landuse"~"^(industrial|commercial|retail)$"](around:500,{location.lat},{location.lng});way["amenity"="parking"](around:500,{location.lat},{location.lng});way["aeroway"](around:500,{location.lat},{location.lng}););out body;"""
        try:
            data = await self._post(self.OVERPASS_URL, f"data={query}")
            elements = data.get("elements", [])
            query_250 = query.replace("around:500", "around:250")
            data_250 = await self._post(self.OVERPASS_URL, f"data={query_250}")
            count_250 = len(data_250.get("elements", []))
            built_types = {}
            for el in elements:
                tags = el.get("tags", {})
                btype = tags.get("landuse") or tags.get("amenity") or tags.get("aeroway") or "unknown"
                built_types[btype] = built_types.get(btype, 0) + 1
            return {
                "built_count": len(elements), "built_count_250m": count_250,
                "built_count_500m": len(elements), "built_types": built_types,
                "is_urban_heat_island": count_250 > 3
            }
        except Exception as e:
            return {"error": str(e), "built_count": 0}


class RightsOfWaySource(HTTPSource):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    
    @property
    def name(self) -> str:
        return "row"
    
    async def fetch(self, location: Location, **kwargs) -> Dict[str, Any]:
        radius = kwargs.get('radius_m', 500)
        query = f"""[out:json][timeout:25];(way["power"="line"](around:{radius},{location.lat},{location.lng});way["power"="minor_line"](around:{radius},{location.lat},{location.lng});way["railway"](around:{radius},{location.lat},{location.lng});way["highway"~"motorway|trunk|primary|secondary"](around:{radius},{location.lat},{location.lng});way["man_made"="pipeline"](around:{radius},{location.lat},{location.lng});way["waterway"](around:{radius},{location.lat},{location.lng}););out body;"""
        try:
            data = await self._post(self.OVERPASS_URL, f"data={query}")
            elements = data.get("elements", [])
            row_types = {"power_lines": 0, "railways": 0, "highways": 0, "pipelines": 0, "waterways": 0}
            for el in elements:
                if el.get("type") != "way":
                    continue
                tags = el.get("tags", {})
                if "power" in tags:
                    row_types["power_lines"] += 1
                elif "railway" in tags:
                    row_types["railways"] += 1
                elif "highway" in tags:
                    row_types["highways"] += 1
                elif tags.get("man_made") == "pipeline":
                    row_types["pipelines"] += 1
                elif "waterway" in tags:
                    row_types["waterways"] += 1
            total_row = sum(row_types.values())
            return {
                "row_count": total_row, "row_types": row_types, "has_row": total_row > 0,
                "row_type_list": [k for k, v in row_types.items() if v > 0], "radius_m": radius
            }
        except Exception as e:
            return {"error": str(e), "row_count": 0, "has_row": False}


def create_all_sources() -> Dict[str, DataSource]:
    return {
        "elevation": ElevationSource(),
        "water": WaterSource(),
        "inaturalist": INaturalistSource(),
        "greenspace": GreenSpaceSource(),
        "built": BuiltEnvironmentSource(),
        "row": RightsOfWaySource()
    }

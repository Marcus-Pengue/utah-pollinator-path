"""
External Data Integrations
===========================
Pulls from government/scientific sources to enrich maps.
- UGRC: Utah parcel data, boundaries
- NLCD: Land cover, impervious surface
- EPA EnviroAtlas: Pollinator habitat potential
- USGS GAP: Species range maps
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta
from functools import lru_cache
import json

# ============ UGRC - Utah Geographic Reference Center ============
# https://gis.utah.gov/

UGRC_BASE = "https://api.mapserv.utah.gov/api/v1"
UGRC_API_KEY = None  # Free key from https://developer.mapserv.utah.gov/

async def ugrc_geocode(address, city="Murray", state="UT"):
    """Geocode Utah address via UGRC."""
    if not UGRC_API_KEY:
        return None
    
    url = f"{UGRC_BASE}/geocode/{address}/{city}"
    params = {"apiKey": UGRC_API_KEY}
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, ssl=ssl_ctx) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("status") == 200:
                    return data.get("result", {})
    return None


async def ugrc_get_parcel(lat, lng):
    """Get parcel info for a point from UGRC."""
    if not UGRC_API_KEY:
        return {"source": "ugrc", "available": False, "reason": "API key not configured"}
    
    url = f"{UGRC_BASE}/search/parcels_slco/parcel_id,parcel_add,acres"
    params = {
        "apiKey": UGRC_API_KEY,
        "geometry": f"point:[{lng},{lat}]",
        "spatialReference": 4326,
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, ssl=ssl_ctx) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("result"):
                    parcel = data["result"][0]["attributes"]
                    return {
                        "source": "ugrc",
                        "parcel_id": parcel.get("parcel_id"),
                        "address": parcel.get("parcel_add"),
                        "acres": parcel.get("acres"),
                        "sqft": round(parcel.get("acres", 0) * 43560, 0),
                    }
    return {"source": "ugrc", "available": False}


# ============ NLCD - National Land Cover Database ============
# https://www.mrlc.gov/

NLCD_WMS = "https://www.mrlc.gov/geoserver/mrlc_display/wms"

# Land cover class descriptions
NLCD_CLASSES = {
    11: {"name": "Open Water", "habitat_potential": 0},
    21: {"name": "Developed, Open Space", "habitat_potential": 40},
    22: {"name": "Developed, Low Intensity", "habitat_potential": 25},
    23: {"name": "Developed, Medium Intensity", "habitat_potential": 10},
    24: {"name": "Developed, High Intensity", "habitat_potential": 5},
    31: {"name": "Barren Land", "habitat_potential": 15},
    41: {"name": "Deciduous Forest", "habitat_potential": 60},
    42: {"name": "Evergreen Forest", "habitat_potential": 50},
    43: {"name": "Mixed Forest", "habitat_potential": 55},
    52: {"name": "Shrub/Scrub", "habitat_potential": 70},
    71: {"name": "Grassland/Herbaceous", "habitat_potential": 75},
    81: {"name": "Pasture/Hay", "habitat_potential": 45},
    82: {"name": "Cultivated Crops", "habitat_potential": 20},
    90: {"name": "Woody Wetlands", "habitat_potential": 65},
    95: {"name": "Emergent Herbaceous Wetlands", "habitat_potential": 80},
}

# Impervious surface estimates by development class
IMPERVIOUS_BY_CLASS = {
    21: 15,   # Open space - parks, lawns
    22: 35,   # Low intensity - single family
    23: 65,   # Medium intensity - apartments
    24: 90,   # High intensity - commercial/industrial
}

async def nlcd_get_land_cover(lat, lng):
    """
    Get NLCD land cover class for a point.
    Uses MRLC WMS GetFeatureInfo with text/plain response.
    """
    buffer = 0.001
    bbox = f"{lng-buffer},{lat-buffer},{lng+buffer},{lat+buffer}"
    
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": "NLCD_2021_Land_Cover_L48",
        "QUERY_LAYERS": "NLCD_2021_Land_Cover_L48",
        "INFO_FORMAT": "text/plain",
        "SRS": "EPSG:4326",
        "BBOX": bbox,
        "WIDTH": "256",
        "HEIGHT": "256",
        "X": "128",
        "Y": "128",
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(NLCD_WMS, params=params, ssl=ssl_ctx, timeout=10) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    # Parse "PALETTE_INDEX = 24.0" from response
                    for line in text.split("\n"):
                        if "PALETTE_INDEX" in line:
                            try:
                                value = int(float(line.split("=")[1].strip()))
                                land_class = NLCD_CLASSES.get(value, {"name": "Unknown", "habitat_potential": 30})
                                return {
                                    "source": "nlcd_2021",
                                    "class_code": value,
                                    "class_name": land_class["name"],
                                    "habitat_potential": land_class["habitat_potential"],
                                    "estimated_impervious_pct": IMPERVIOUS_BY_CLASS.get(value, 30),
                                }
                            except:
                                pass
    except Exception as e:
        print(f"NLCD error: {e}")
    
    return {"source": "nlcd_2021", "available": False}


async def nlcd_get_impervious(lat, lng):
    """Get NLCD impervious surface percentage for a point."""
    buffer = 0.001
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": "NLCD_2021_Impervious_L48",
        "QUERY_LAYERS": "NLCD_2021_Impervious_L48",
        "INFO_FORMAT": "text/plain",
        "SRS": "EPSG:4326",
        "BBOX": f"{lng-buffer},{lat-buffer},{lng+buffer},{lat+buffer}",
        "WIDTH": "256",
        "HEIGHT": "256",
        "X": "128",
        "Y": "128",
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(NLCD_WMS, params=params, ssl=ssl_ctx, timeout=10) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    for line in text.split("\n"):
                        if "PALETTE_INDEX" in line or "GRAY_INDEX" in line:
                            try:
                                value = int(float(line.split("=")[1].strip()))
                                return {
                                    "source": "nlcd_2021_impervious",
                                    "impervious_pct": value,
                                }
                            except:
                                pass
    except Exception as e:
        print(f"NLCD impervious error: {e}")
    
    return {"source": "nlcd_2021_impervious", "available": False}


# ============ EPA EnviroAtlas - Pollinator Habitat ============
# https://www.epa.gov/enviroatlas

EPA_ENVIROATLAS_WMS = "https://enviroatlas.epa.gov/arcgis/rest/services"

# EnviroAtlas pollinator layers
EPA_LAYERS = {
    "pollinator_habitat": "Supplemental/PollinatorHabitatPotential/MapServer",
    "green_space": "Supplemental/PctGreenSpace/MapServer", 
    "tree_cover": "Supplemental/PctTreeCover/MapServer",
}

async def epa_get_pollinator_potential(lat, lng):
    """
    Estimate pollinator habitat potential based on NLCD land cover.
    EPA EnviroAtlas pollinator layer not publicly accessible.
    """
    # Get land cover and derive potential from that
    land_cover = await nlcd_get_land_cover(lat, lng)
    
    if land_cover.get("habitat_potential"):
        score = land_cover["habitat_potential"]
        return {
            "source": "derived_from_nlcd",
            "layer": "estimated_pollinator_potential",
            "score": score,
            "interpretation": _interpret_epa_score(score),
            "based_on": land_cover.get("class_name"),
        }
    
    return {"source": "epa_enviroatlas", "available": False, "note": "Using NLCD-derived estimate"}


def _interpret_epa_score(score):
    """Interpret EPA pollinator potential score."""
    if score is None:
        return "Unknown"
    score = float(score)
    if score >= 80:
        return "Excellent - High native habitat potential"
    elif score >= 60:
        return "Good - Moderate habitat with enhancement opportunity"
    elif score >= 40:
        return "Fair - Limited natural habitat, restoration recommended"
    elif score >= 20:
        return "Poor - Heavily developed, container gardens recommended"
    else:
        return "Very Poor - Intensive greening needed"


async def epa_get_green_space(lat, lng):
    """
    Estimate green space based on NLCD land cover.
    EPA percent green space layer not publicly accessible.
    """
    land_cover = await nlcd_get_land_cover(lat, lng)
    impervious = await nlcd_get_impervious(lat, lng)
    
    # Estimate green space from impervious
    imp_pct = impervious.get("impervious_pct", 30)
    green_pct = max(0, 100 - imp_pct)
    
    return {
        "source": "derived_from_nlcd",
        "layer": "estimated_green_space",
        "green_space_pct": green_pct,
        "impervious_pct": imp_pct,
        "land_cover": land_cover.get("class_name"),
    }


# ============ USGS GAP - Species Range Maps ============
# https://www.usgs.gov/programs/gap-analysis-project

USGS_GAP_BASE = "https://gis1.usgs.gov/arcgis/rest/services/GAP/GAP_Species_Ranges"

# Key pollinator species and their GAP layer IDs
POLLINATOR_SPECIES = {
    "monarch": {
        "scientific": "Danaus plexippus",
        "common": "Monarch Butterfly",
        "gap_layer": None,  # Invertebrates not in GAP - use range polygon
        "range_note": "Summer breeding range includes Utah",
    },
    "western_bumble": {
        "scientific": "Bombus occidentalis",
        "common": "Western Bumble Bee",
        "gap_layer": None,
        "range_note": "Native to Utah, candidate for ESA listing",
    },
    "hunt_bumble": {
        "scientific": "Bombus huntii", 
        "common": "Hunt's Bumble Bee",
        "gap_layer": None,
        "range_note": "Common in Utah gardens",
    },
    "rufous_hummingbird": {
        "scientific": "Selasphorus rufus",
        "common": "Rufous Hummingbird",
        "gap_layer": "bRUHUx",  # Bird species in GAP
        "range_note": "Migration corridor through Utah Jul-Sep",
    },
    "black_chinned_hummingbird": {
        "scientific": "Archilochus alexandri",
        "common": "Black-chinned Hummingbird",
        "gap_layer": "bBCHUx",
        "range_note": "Breeding resident May-Sep",
    },
}

# Utah-specific pollinator data (compiled from research)
UTAH_POLLINATORS = {
    "bees": {
        "native_species_count": 900,  # Utah has ~900 native bee species
        "key_genera": ["Bombus", "Osmia", "Megachile", "Agapostemon", "Halictus"],
        "conservation_concern": ["Bombus occidentalis", "Bombus suckleyi"],
    },
    "butterflies": {
        "total_species": 165,
        "key_species": ["Monarch", "Painted Lady", "Western Tiger Swallowtail", "Two-tailed Swallowtail"],
        "migration_species": ["Monarch", "Painted Lady"],
    },
    "hummingbirds": {
        "breeding": ["Black-chinned", "Broad-tailed", "Calliope"],
        "migrant": ["Rufous", "Costa's"],
    },
}


def get_utah_pollinator_context(lat, lng):
    """
    Get pollinator context for a Utah location.
    Returns expected species and conservation priorities.
    """
    # Determine ecoregion (simplified)
    # Murray area is in Wasatch Front urban zone
    if 40.5 <= lat <= 41.0 and -112.0 <= lng <= -111.7:
        ecoregion = "wasatch_front"
        context = {
            "ecoregion": "Wasatch Front Urban Corridor",
            "expected_bee_genera": ["Bombus", "Osmia", "Megachile", "Agapostemon", "Halictus", "Lasioglossum"],
            "expected_butterflies": ["Western Tiger Swallowtail", "Painted Lady", "Cabbage White", "Monarch (migrant)"],
            "expected_hummingbirds": ["Black-chinned", "Broad-tailed"],
            "migration_window": {
                "monarch": "August-September",
                "rufous_hummingbird": "July-September",
            },
            "conservation_priorities": [
                "Fall nectar sources (September deficit)",
                "Native milkweed for monarchs",
                "Ground nesting habitat for 70% of native bees",
                "Pesticide-free zones",
            ],
            "habitat_recommendations": [
                "Plant fall-blooming natives: aster, goldenrod, rabbitbrush",
                "Include early spring bloomers: willow, fruit trees",
                "Maintain bare ground patches for ground-nesting bees",
                "Leave hollow stems over winter for cavity nesters",
            ],
        }
    else:
        context = {
            "ecoregion": "Utah General",
            "note": "Location outside detailed mapping area",
        }
    
    return {
        "source": "usgs_gap_utah_research",
        "location": {"lat": lat, "lng": lng},
        "utah_context": UTAH_POLLINATORS,
        "local_context": context,
    }


async def usgs_check_species_range(lat, lng, species_key):
    """Check if location is within species range."""
    species = POLLINATOR_SPECIES.get(species_key)
    if not species:
        return {"error": f"Unknown species: {species_key}"}
    
    if not species.get("gap_layer"):
        # No GAP data - return general range info
        return {
            "source": "usgs_gap",
            "species": species["common"],
            "scientific_name": species["scientific"],
            "in_range": True,  # Assume Utah is in range for our key species
            "range_note": species["range_note"],
            "gap_data_available": False,
        }
    
    # Query GAP species range service
    url = f"{USGS_GAP_BASE}/{species['gap_layer']}/MapServer/identify"
    
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "sr": 4326,
        "layers": "all",
        "tolerance": 5,
        "mapExtent": f"{lng-0.1},{lat-0.1},{lng+0.1},{lat+0.1}",
        "imageDisplay": "100,100,96",
        "returnGeometry": "false",
        "f": "json",
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    in_range = len(data.get("results", [])) > 0
                    return {
                        "source": "usgs_gap",
                        "species": species["common"],
                        "scientific_name": species["scientific"],
                        "in_range": in_range,
                        "range_note": species["range_note"],
                        "gap_data_available": True,
                    }
    except Exception as e:
        print(f"USGS GAP error: {e}")
    
    return {"source": "usgs_gap", "available": False}


# ============ COMBINED LOCATION ENRICHMENT ============

async def enrich_location(lat, lng):
    """
    Get all external data for a location.
    Combines NLCD, EPA, and species data.
    """
    # Run queries in parallel
    results = await asyncio.gather(
        nlcd_get_land_cover(lat, lng),
        nlcd_get_impervious(lat, lng),
        epa_get_pollinator_potential(lat, lng),
        epa_get_green_space(lat, lng),
        return_exceptions=True
    )
    
    land_cover = results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])}
    impervious = results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])}
    epa_pollinator = results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])}
    epa_green = results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])}
    
    # Get species context (not async)
    species_context = get_utah_pollinator_context(lat, lng)
    
    # Calculate combined habitat score
    scores = []
    if land_cover.get("habitat_potential"):
        scores.append(land_cover["habitat_potential"])
    if epa_pollinator.get("score"):
        scores.append(float(epa_pollinator["score"]))
    
    combined_potential = sum(scores) / len(scores) if scores else None
    
    return {
        "location": {"lat": lat, "lng": lng},
        "queried_at": datetime.utcnow().isoformat(),
        "nlcd": {
            "land_cover": land_cover,
            "impervious": impervious,
        },
        "epa_enviroatlas": {
            "pollinator_potential": epa_pollinator,
            "green_space": epa_green,
        },
        "species": species_context,
        "combined_habitat_potential": combined_potential,
        "data_sources": [
            "NLCD 2021 Land Cover (MRLC)",
            "EPA EnviroAtlas",
            "USGS GAP Analysis",
            "Utah Pollinator Research",
        ],
    }


# ============ ROUTES ============

def register_external_data_routes(app):
    """Register external data API routes."""
    
    @app.route('/api/external/enrich', methods=['GET'])
    def enrich_point():
        """Get all external data for a lat/lng."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(enrich_location(lat, lng))
        return jsonify(data)
    
    @app.route('/api/external/nlcd', methods=['GET'])
    def get_nlcd():
        """Get NLCD land cover for a point."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        async def fetch():
            land = await nlcd_get_land_cover(lat, lng)
            imp = await nlcd_get_impervious(lat, lng)
            return {"land_cover": land, "impervious": imp}
        
        data = asyncio.run(fetch())
        return jsonify(data)
    
    @app.route('/api/external/epa', methods=['GET'])
    def get_epa():
        """Get EPA EnviroAtlas data for a point."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        async def fetch():
            poll = await epa_get_pollinator_potential(lat, lng)
            green = await epa_get_green_space(lat, lng)
            return {"pollinator_potential": poll, "green_space": green}
        
        data = asyncio.run(fetch())
        return jsonify(data)
    
    @app.route('/api/external/species', methods=['GET'])
    def get_species():
        """Get expected pollinator species for a location."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = get_utah_pollinator_context(lat, lng)
        return jsonify(data)
    
    @app.route('/api/external/species/list', methods=['GET'])
    def list_species():
        """List tracked pollinator species."""
        return jsonify({
            "tracked_species": POLLINATOR_SPECIES,
            "utah_summary": UTAH_POLLINATORS,
        })
    
    @app.route('/api/external/species/check/<species_key>', methods=['GET'])
    def check_species_range(species_key):
        """Check if location is in species range."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(usgs_check_species_range(lat, lng, species_key))
        return jsonify(data)
    
    @app.route('/api/external/sources', methods=['GET'])
    def list_sources():
        """List all external data sources."""
        return jsonify({
            "sources": [
                {
                    "name": "NLCD 2021",
                    "provider": "USGS/MRLC",
                    "description": "National Land Cover Database - land use classification and impervious surface",
                    "url": "https://www.mrlc.gov/",
                    "endpoints": ["/api/external/nlcd"],
                },
                {
                    "name": "EPA EnviroAtlas",
                    "provider": "US Environmental Protection Agency",
                    "description": "Pollinator habitat potential and green space metrics",
                    "url": "https://www.epa.gov/enviroatlas",
                    "endpoints": ["/api/external/epa"],
                },
                {
                    "name": "USGS GAP Analysis",
                    "provider": "US Geological Survey",
                    "description": "Species range maps for wildlife",
                    "url": "https://www.usgs.gov/programs/gap-analysis-project",
                    "endpoints": ["/api/external/species"],
                },
                {
                    "name": "UGRC",
                    "provider": "Utah Geospatial Resource Center",
                    "description": "Utah parcel data and boundaries",
                    "url": "https://gis.utah.gov/",
                    "endpoints": ["Coming soon"],
                },
            ],
        })

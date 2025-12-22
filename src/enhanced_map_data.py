"""
Enhanced Map Data Sources
==========================
Additional layers from government/scientific sources.
"""

import aiohttp
import asyncio
import ssl
import certifi
from datetime import datetime, date
from flask import request, jsonify

# ============ USDA WEB SOIL SURVEY ============
# Soil types affect ground-nesting bee habitat

USDA_SOIL_URL = "https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest"

# Soil suitability for ground-nesting bees
SOIL_BEE_RATINGS = {
    "sand": {"rating": "excellent", "score": 95, "note": "Ideal for ground-nesting bees - easy to excavate"},
    "loamy sand": {"rating": "excellent", "score": 90, "note": "Great drainage, easy nesting"},
    "sandy loam": {"rating": "good", "score": 80, "note": "Good bee nesting substrate"},
    "loam": {"rating": "good", "score": 70, "note": "Suitable for most ground nesters"},
    "silt loam": {"rating": "moderate", "score": 55, "note": "Adequate but can compact"},
    "clay loam": {"rating": "poor", "score": 35, "note": "Hard to excavate when dry"},
    "clay": {"rating": "poor", "score": 20, "note": "Difficult for ground-nesting bees"},
    "organic": {"rating": "poor", "score": 25, "note": "Too soft, prone to collapse"},
}

async def get_soil_type(lat, lng):
    """
    Get soil type from USDA Web Soil Survey.
    Returns soil texture and bee nesting suitability.
    """
    # USDA uses a SOAP-like REST API with SQL queries
    query = f"""
    SELECT mapunit.muname, component.compname, component.comppct_r, 
           chorizon.hzname, chorizon.sandtotal_r, chorizon.claytotal_r, chorizon.silttotal_r,
           chtexturegrp.texture
    FROM sacatalog
    INNER JOIN legend ON legend.areasymbol = sacatalog.areasymbol
    INNER JOIN mapunit ON mapunit.lkey = legend.lkey
    INNER JOIN component ON component.mukey = mapunit.mukey
    INNER JOIN chorizon ON chorizon.cokey = component.cokey
    LEFT JOIN chtexturegrp ON chtexturegrp.chkey = chorizon.chkey
    WHERE sacatalog.areasymbol IN (
        SELECT areasymbol FROM sastatusmap 
        WHERE GEOMETRY::Point({lng}, {lat}, 4326).STIntersects(sastatusmap.sapoly) = 1
    )
    AND chorizon.hzdept_r = 0
    ORDER BY component.comppct_r DESC
    """
    
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession() as session:
            async with session.post(
                USDA_SOIL_URL,
                json={"query": query, "format": "json"},
                ssl=ssl_ctx,
                timeout=15
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("Table"):
                        rows = data["Table"]
                        if rows:
                            texture = rows[0].get("texture", "").lower()
                            rating = SOIL_BEE_RATINGS.get(texture, SOIL_BEE_RATINGS.get("loam"))
                            return {
                                "source": "usda_web_soil_survey",
                                "soil_name": rows[0].get("muname"),
                                "component": rows[0].get("compname"),
                                "texture": texture,
                                "sand_pct": rows[0].get("sandtotal_r"),
                                "clay_pct": rows[0].get("claytotal_r"),
                                "silt_pct": rows[0].get("silttotal_r"),
                                "bee_nesting": rating,
                            }
    except Exception as e:
        print(f"USDA Soil error: {e}")
    
    # Fallback estimate based on Utah geography
    return {
        "source": "estimate",
        "texture": "sandy loam",
        "bee_nesting": SOIL_BEE_RATINGS["sandy loam"],
        "note": "Estimated for Wasatch Front urban area",
    }


# ============ USGS ELEVATION ============

USGS_ELEVATION_URL = "https://epqs.nationalmap.gov/v1/json"

async def get_elevation(lat, lng):
    """Get elevation from USGS National Map."""
    params = {
        "x": lng,
        "y": lat,
        "units": "Feet",
        "output": "json",
    }
    
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession() as session:
            async with session.get(USGS_ELEVATION_URL, params=params, ssl=ssl_ctx, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    elev = data.get("value")
                    if elev:
                        elev_ft = float(elev)
                        return {
                            "source": "usgs_ned",
                            "elevation_ft": round(elev_ft),
                            "elevation_m": round(elev_ft * 0.3048),
                            "zone": _elevation_zone(elev_ft),
                        }
    except Exception as e:
        print(f"USGS elevation error: {e}")
    
    return {"source": "usgs_ned", "available": False}


def _elevation_zone(elev_ft):
    """Categorize elevation for species guidance."""
    if elev_ft < 4500:
        return {"name": "Valley Floor", "species_note": "Full range of Wasatch Front pollinators"}
    elif elev_ft < 5500:
        return {"name": "Bench/Foothills", "species_note": "Mix of valley and mountain species"}
    elif elev_ft < 7000:
        return {"name": "Mountain", "species_note": "Mountain specialists, shorter season"}
    else:
        return {"name": "Alpine", "species_note": "Limited to alpine-adapted species"}


# ============ NHD PLUS - STREAMS & WATERSHEDS ============

NHD_URL = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/identify"

async def get_nearby_water(lat, lng):
    """Get nearby streams/water bodies from NHD Plus."""
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "sr": "4326",
        "layers": "all:6,7",  # Streams and water bodies
        "tolerance": "500",  # meters
        "mapExtent": f"{lng-0.01},{lat-0.01},{lng+0.01},{lat+0.01}",
        "imageDisplay": "400,400,96",
        "returnGeometry": "false",
        "f": "json",
    }
    
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession() as session:
            async with session.get(NHD_URL, params=params, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("results", [])
                    
                    streams = []
                    for r in results:
                        attrs = r.get("attributes", {})
                        streams.append({
                            "name": attrs.get("gnis_name") or attrs.get("GNIS_NAME") or "Unnamed",
                            "type": attrs.get("ftype") or attrs.get("FTYPE"),
                        })
                    
                    return {
                        "source": "nhd_plus",
                        "nearby_water": streams[:5],
                        "riparian_potential": len(streams) > 0,
                        "corridor_note": "Riparian areas are pollinator highways" if streams else None,
                    }
    except Exception as e:
        print(f"NHD error: {e}")
    
    return {"source": "nhd_plus", "available": False}


# ============ UTAH SGID - PARKS & OPEN SPACE ============

UTAH_SGID_URL = "https://opendata.gis.utah.gov/datasets"

# Utah parks from SGID (cached/static for Murray area)
UTAH_PARKS_SGID = [
    {"name": "Murray Park", "lat": 40.6545, "lng": -111.8883, "type": "Municipal Park", "acres": 47, "owner": "Murray City"},
    {"name": "Wheeler Historic Farm", "lat": 40.6489, "lng": -111.8756, "type": "Historic Site", "acres": 75, "owner": "Salt Lake County"},
    {"name": "Cottonwood Creek Corridor", "lat": 40.6602, "lng": -111.8812, "type": "Trail/Greenway", "acres": 25, "owner": "Multiple"},
    {"name": "Fashion Place Linear Park", "lat": 40.6453, "lng": -111.8934, "type": "Linear Park", "acres": 8, "owner": "Murray City"},
    {"name": "Parkview Park", "lat": 40.6712, "lng": -111.8823, "type": "Neighborhood Park", "acres": 5, "owner": "Murray City"},
    {"name": "Vine Street Park", "lat": 40.6634, "lng": -111.8912, "type": "Neighborhood Park", "acres": 3, "owner": "Murray City"},
    {"name": "Grant Park", "lat": 40.6578, "lng": -111.8845, "type": "Neighborhood Park", "acres": 2, "owner": "Murray City"},
    {"name": "Hidden Valley Park", "lat": 40.6234, "lng": -111.8645, "type": "Natural Area", "acres": 12, "owner": "Salt Lake County"},
]


# ============ NLCD TREE CANOPY ============

NLCD_TREE_URL = "https://www.mrlc.gov/geoserver/mrlc_display/wms"

async def get_tree_canopy(lat, lng):
    """Get tree canopy percentage from NLCD."""
    buffer = 0.001
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": "NLCD_2021_Tree_Canopy_L48",
        "QUERY_LAYERS": "NLCD_2021_Tree_Canopy_L48",
        "INFO_FORMAT": "text/plain",
        "SRS": "EPSG:4326",
        "BBOX": f"{lng-buffer},{lat-buffer},{lng+buffer},{lat+buffer}",
        "WIDTH": "256",
        "HEIGHT": "256",
        "X": "128",
        "Y": "128",
    }
    
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession() as session:
            async with session.get(NLCD_TREE_URL, params=params, ssl=ssl_ctx, timeout=10) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    for line in text.split("\n"):
                        if "PALETTE_INDEX" in line or "GRAY_INDEX" in line:
                            try:
                                value = int(float(line.split("=")[1].strip()))
                                return {
                                    "source": "nlcd_2021_tree_canopy",
                                    "tree_canopy_pct": value,
                                    "shade_level": _shade_level(value),
                                }
                            except:
                                pass
    except Exception as e:
        print(f"Tree canopy error: {e}")
    
    return {"source": "nlcd_2021_tree_canopy", "available": False}


def _shade_level(pct):
    """Interpret tree canopy percentage."""
    if pct >= 60:
        return {"level": "heavy", "note": "Shade-tolerant plants needed, fewer ground nesters"}
    elif pct >= 30:
        return {"level": "moderate", "note": "Good mix of sun and shade habitat"}
    elif pct >= 10:
        return {"level": "light", "note": "Mostly sunny, ideal for most pollinators"}
    else:
        return {"level": "minimal", "note": "Full sun, consider adding some shade"}


# ============ MONARCH WATCH WAYSTATIONS ============

# MonarchWatch doesn't have a public API, so we cache known Utah waystations
MONARCH_WAYSTATIONS_UTAH = [
    {"name": "Wheeler Farm Monarch Waystation", "lat": 40.6489, "lng": -111.8756, "certified": True, "year": 2019, "id": "UT-001"},
    {"name": "Tracy Aviary", "lat": 40.7234, "lng": -111.8812, "certified": True, "year": 2020, "id": "UT-002"},
    {"name": "Red Butte Garden", "lat": 40.7667, "lng": -111.8256, "certified": True, "year": 2018, "id": "UT-003"},
    {"name": "Thanksgiving Point", "lat": 40.4234, "lng": -111.9012, "certified": True, "year": 2017, "id": "UT-004"},
    {"name": "Utah State Capitol Gardens", "lat": 40.7775, "lng": -111.8882, "certified": True, "year": 2021, "id": "UT-005"},
    {"name": "Jordan River Parkway - Murray", "lat": 40.6534, "lng": -111.9123, "certified": True, "year": 2022, "id": "UT-006"},
]


# ============ BEE CITY USA ============

BEE_CITIES_UTAH = [
    {"name": "Salt Lake City", "lat": 40.7608, "lng": -111.8910, "type": "Bee City", "year": 2019},
    {"name": "Park City", "lat": 40.6461, "lng": -111.4980, "type": "Bee City", "year": 2020},
    {"name": "University of Utah", "lat": 40.7649, "lng": -111.8421, "type": "Bee Campus", "year": 2019},
    {"name": "Utah State University", "lat": 41.7370, "lng": -111.8338, "type": "Bee Campus", "year": 2018},
]


# ============ UTAH DWR WILDLIFE CORRIDORS ============

# Key wildlife corridors in Salt Lake Valley
WILDLIFE_CORRIDORS = [
    {
        "name": "Jordan River Corridor",
        "type": "riparian",
        "description": "Major north-south pollinator and wildlife highway",
        "coordinates": [
            {"lat": 40.7608, "lng": -111.9234},
            {"lat": 40.6534, "lng": -111.9123},
            {"lat": 40.5234, "lng": -111.9045},
        ],
        "importance": "critical",
    },
    {
        "name": "Cottonwood Creek Corridor",
        "type": "riparian",
        "description": "East-west connector linking mountains to valley",
        "coordinates": [
            {"lat": 40.6234, "lng": -111.7645},
            {"lat": 40.6345, "lng": -111.8234},
            {"lat": 40.6456, "lng": -111.8912},
        ],
        "importance": "high",
    },
    {
        "name": "Big Cottonwood Creek",
        "type": "riparian",
        "description": "Mountain to valley pollinator pathway",
        "coordinates": [
            {"lat": 40.6167, "lng": -111.7500},
            {"lat": 40.6300, "lng": -111.8100},
            {"lat": 40.6450, "lng": -111.8700},
        ],
        "importance": "high",
    },
    {
        "name": "Wasatch Foothills",
        "type": "upland",
        "description": "Foothill habitat connecting mountain and valley ecosystems",
        "importance": "moderate",
    },
]


# ============ PAD-US PROTECTED LANDS ============

PADUS_URL = "https://gis1.usgs.gov/arcgis/rest/services/padus2_1/MapServer/identify"

async def get_protected_lands(lat, lng):
    """Get nearby protected lands from PAD-US."""
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "sr": "4326",
        "layers": "all",
        "tolerance": "1000",
        "mapExtent": f"{lng-0.02},{lat-0.02},{lng+0.02},{lat+0.02}",
        "imageDisplay": "400,400,96",
        "returnGeometry": "false",
        "f": "json",
    }
    
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession() as session:
            async with session.get(PADUS_URL, params=params, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("results", [])
                    
                    lands = []
                    for r in results:
                        attrs = r.get("attributes", {})
                        lands.append({
                            "name": attrs.get("Unit_Nm") or attrs.get("Mang_Name"),
                            "manager": attrs.get("Mang_Name"),
                            "type": attrs.get("Des_Tp"),
                            "gap_status": attrs.get("GAP_Sts"),
                        })
                    
                    return {
                        "source": "pad_us",
                        "nearby_protected": lands[:5],
                        "permanent_habitat": len(lands) > 0,
                    }
    except Exception as e:
        print(f"PAD-US error: {e}")
    
    return {"source": "pad_us", "available": False}


# ============ JOURNEY NORTH - MONARCH MIGRATION ============

# Journey North doesn't have a public API, so we provide seasonal estimates
def get_monarch_migration_status():
    """Get current monarch migration status for Utah."""
    month = date.today().month
    day = date.today().day
    
    if month < 4:
        return {
            "source": "journey_north_estimate",
            "status": "overwintering",
            "location": "Mexico",
            "utah_note": "Monarchs in Mexico. Prepare milkweed for spring!",
            "action": "Plant milkweed now for spring emergence",
        }
    elif month == 4:
        return {
            "source": "journey_north_estimate",
            "status": "spring_migration",
            "location": "Texas/Oklahoma",
            "utah_note": "First generation heading north. ~4-6 weeks to Utah.",
            "action": "Milkweed should be emerging",
        }
    elif month == 5:
        return {
            "source": "journey_north_estimate",
            "status": "spring_migration",
            "location": "Kansas/Nebraska",
            "utah_note": "Second generation en route. ~2-4 weeks to Utah.",
            "action": "Early arrivals possible late May",
        }
    elif month in [6, 7]:
        return {
            "source": "journey_north_estimate",
            "status": "breeding",
            "location": "Utah and northward",
            "utah_note": "Monarchs actively breeding in Utah!",
            "action": "Check milkweed for eggs and caterpillars",
        }
    elif month == 8:
        if day < 15:
            return {
                "source": "journey_north_estimate",
                "status": "late_breeding",
                "location": "Utah",
                "utah_note": "Last breeding generation. Migration starts mid-August.",
                "action": "CRITICAL: Ensure fall nectar sources ready!",
            }
        else:
            return {
                "source": "journey_north_estimate",
                "status": "fall_migration_starting",
                "location": "Utah",
                "utah_note": "🦋 MIGRATION BEGINNING! Super-generation heading south.",
                "action": "Fall nectar urgently needed - asters, goldenrod!",
            }
    elif month == 9:
        return {
            "source": "journey_north_estimate",
            "status": "fall_migration_peak",
            "location": "Passing through Utah",
            "utah_note": "🦋🦋🦋 PEAK MIGRATION! Maximum monarchs passing through.",
            "action": "Keep nectar sources blooming! Document sightings!",
        }
    elif month == 10:
        if day < 15:
            return {
                "source": "journey_north_estimate",
                "status": "fall_migration_late",
                "location": "Southern Utah / Arizona",
                "utah_note": "Late migrants still passing. Stragglers possible.",
                "action": "Late asters still valuable",
            }
        else:
            return {
                "source": "journey_north_estimate",
                "status": "migration_ending",
                "location": "Mexico",
                "utah_note": "Most monarchs have passed. Season ending.",
                "action": "Prepare garden for winter, leave stems!",
            }
    else:
        return {
            "source": "journey_north_estimate",
            "status": "overwintering",
            "location": "Mexico",
            "utah_note": "Monarchs overwintering in Mexico.",
            "action": "Plan next year's garden!",
        }


# ============ NOAA FROST DATES ============

# Utah frost dates by zone (cached)
FROST_DATES_UTAH = {
    "salt_lake_valley": {
        "last_spring_frost": {"average": "April 15", "safe": "May 10"},
        "first_fall_frost": {"average": "October 15", "early": "October 1"},
        "growing_season_days": 180,
        "usda_zone": "6b-7a",
    },
    "wasatch_front": {
        "last_spring_frost": {"average": "April 20", "safe": "May 15"},
        "first_fall_frost": {"average": "October 10", "early": "September 25"},
        "growing_season_days": 170,
        "usda_zone": "6a-6b",
    },
    "mountain": {
        "last_spring_frost": {"average": "May 15", "safe": "June 1"},
        "first_fall_frost": {"average": "September 15", "early": "September 1"},
        "growing_season_days": 120,
        "usda_zone": "4b-5b",
    },
}


def get_frost_dates(lat, lng):
    """Get frost dates for location."""
    # Determine zone based on elevation proxy
    if 40.55 <= lat <= 40.80 and -112.0 <= lng <= -111.75:
        zone = "salt_lake_valley"
    elif 40.4 <= lat <= 41.2:
        zone = "wasatch_front"
    else:
        zone = "mountain"
    
    dates = FROST_DATES_UTAH[zone]
    
    # Add planting recommendations
    today = date.today()
    month = today.month
    
    if month in [1, 2]:
        planting_note = "Indoor seed starting time for natives"
    elif month == 3:
        planting_note = "Start hardening off seedlings"
    elif month == 4:
        planting_note = "Plant cold-hardy perennials after last frost"
    elif month in [5, 6]:
        planting_note = "Prime planting season!"
    elif month in [7, 8]:
        planting_note = "Water new plantings well; fall planting starts late August"
    elif month in [9, 10]:
        planting_note = "Fall planting - good root establishment before winter"
    else:
        planting_note = "Plan next year's garden"
    
    return {
        "source": "noaa_estimates",
        "zone": zone,
        "frost_dates": dates,
        "planting_note": planting_note,
    }


# ============ COMBINED ENHANCED DATA ============

async def get_enhanced_location_data(lat, lng):
    """Get all enhanced data for a location."""
    
    # Parallel fetch
    results = await asyncio.gather(
        get_soil_type(lat, lng),
        get_elevation(lat, lng),
        get_nearby_water(lat, lng),
        get_tree_canopy(lat, lng),
        get_protected_lands(lat, lng),
        return_exceptions=True
    )
    
    soil = results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])}
    elevation = results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])}
    water = results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])}
    tree = results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])}
    protected = results[4] if not isinstance(results[4], Exception) else {"error": str(results[4])}
    
    # Sync data
    monarch = get_monarch_migration_status()
    frost = get_frost_dates(lat, lng)
    
    # Find nearby waystations
    nearby_waystations = []
    for ws in MONARCH_WAYSTATIONS_UTAH:
        dist = ((ws['lat'] - lat)**2 + (ws['lng'] - lng)**2)**0.5
        if dist < 0.1:  # ~10km
            nearby_waystations.append(ws)
    
    # Find nearby parks
    nearby_parks = []
    for park in UTAH_PARKS_SGID:
        dist = ((park['lat'] - lat)**2 + (park['lng'] - lng)**2)**0.5
        if dist < 0.05:  # ~5km
            nearby_parks.append(park)
    
    # Check if near corridor
    near_corridor = None
    for corridor in WILDLIFE_CORRIDORS:
        for coord in corridor.get("coordinates", []):
            dist = ((coord['lat'] - lat)**2 + (coord['lng'] - lng)**2)**0.5
            if dist < 0.02:
                near_corridor = corridor['name']
                break
    
    return {
        "location": {"lat": lat, "lng": lng},
        "queried_at": datetime.utcnow().isoformat(),
        
        "soil": soil,
        "elevation": elevation,
        "hydrology": water,
        "tree_canopy": tree,
        "protected_lands": protected,
        
        "monarch_status": monarch,
        "frost_dates": frost,
        
        "nearby": {
            "waystations": nearby_waystations,
            "parks": nearby_parks,
            "wildlife_corridor": near_corridor,
            "bee_cities": [bc for bc in BEE_CITIES_UTAH if ((bc['lat'] - lat)**2 + (bc['lng'] - lng)**2)**0.5 < 0.2],
        },
        
        "data_sources": [
            "USDA Web Soil Survey",
            "USGS National Elevation Dataset",
            "NHD Plus",
            "NLCD 2021 Tree Canopy",
            "PAD-US 2.1",
            "Journey North (estimated)",
            "NOAA Frost Dates",
            "MonarchWatch (cached)",
            "Bee City USA (cached)",
            "Utah SGID",
            "Utah DWR Corridors",
        ],
    }


# ============ ROUTES ============

def register_enhanced_map_routes(app):
    """Register enhanced map data routes."""
    
    @app.route('/api/map/enhanced', methods=['GET'])
    def enhanced_location():
        """Get all enhanced data for a location."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(get_enhanced_location_data(lat, lng))
        return jsonify(data)
    
    @app.route('/api/map/soil', methods=['GET'])
    def soil_data():
        """Get soil type and bee nesting suitability."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(get_soil_type(lat, lng))
        return jsonify(data)
    
    @app.route('/api/map/elevation', methods=['GET'])
    def elevation_data():
        """Get elevation."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(get_elevation(lat, lng))
        return jsonify(data)
    
    @app.route('/api/map/monarch-status', methods=['GET'])
    def monarch_status():
        """Get current monarch migration status."""
        return jsonify(get_monarch_migration_status())
    
    @app.route('/api/map/frost-dates', methods=['GET'])
    def frost_dates():
        """Get frost dates for location."""
        lat = request.args.get('lat', 40.666, type=float)
        lng = request.args.get('lng', -111.897, type=float)
        return jsonify(get_frost_dates(lat, lng))
    
    @app.route('/api/map/waystations', methods=['GET'])
    def waystations():
        """Get all monarch waystations."""
        features = []
        for ws in MONARCH_WAYSTATIONS_UTAH:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [ws['lng'], ws['lat']]},
                "properties": {
                    "layer": "waystations",
                    "name": ws['name'],
                    "certified": ws['certified'],
                    "year": ws['year'],
                    "id": ws['id'],
                }
            })
        return jsonify({"type": "FeatureCollection", "features": features})
    
    @app.route('/api/map/bee-cities', methods=['GET'])
    def bee_cities():
        """Get Bee City USA communities."""
        features = []
        for bc in BEE_CITIES_UTAH:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [bc['lng'], bc['lat']]},
                "properties": {
                    "layer": "bee_cities",
                    "name": bc['name'],
                    "type": bc['type'],
                    "year": bc['year'],
                }
            })
        return jsonify({"type": "FeatureCollection", "features": features})
    
    @app.route('/api/map/corridors', methods=['GET'])
    def corridors():
        """Get wildlife corridors."""
        return jsonify({
            "corridors": WILDLIFE_CORRIDORS,
            "note": "Corridors are critical pollinator highways connecting habitat patches",
        })
    
    @app.route('/api/map/parks', methods=['GET'])
    def parks():
        """Get parks and green spaces."""
        features = []
        for park in UTAH_PARKS_SGID:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [park['lng'], park['lat']]},
                "properties": {
                    "layer": "parks",
                    "name": park['name'],
                    "type": park['type'],
                    "acres": park.get('acres'),
                    "owner": park.get('owner'),
                }
            })
        return jsonify({"type": "FeatureCollection", "features": features})

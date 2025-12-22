"""
Wildlife Data API - Maximum Data Collection
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta

INAT_BASE = "https://api.inaturalist.org/v1"
GBIF_BASE = "https://api.gbif.org/v1"

TAXON_QUERIES = [
    {"id": 3, "name": "Birds", "gbif": 212},
    {"id": 47158, "name": "Insects", "gbif": 216},
    {"id": 47125, "name": "Plants", "gbif": 6},
    {"id": 40151, "name": "Mammals", "gbif": 359},
    {"id": 26036, "name": "Reptiles", "gbif": 358},
    {"id": 20978, "name": "Amphibians", "gbif": 131},
    {"id": 47170, "name": "Fungi", "gbif": 5},
    {"id": 47119, "name": "Arachnids", "gbif": 367},
]


async def fetch_inat_page(session, ssl_ctx, lat, lng, radius, taxon_id, days_back, page=1):
    """Fetch a page of iNaturalist observations."""
    url = f"{INAT_BASE}/observations"
    d1 = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    
    params = {
        "lat": lat, "lng": lng, "radius": radius, "taxon_id": taxon_id,
        "d1": d1, "per_page": 200, "page": page,
        "order": "desc", "order_by": "observed_on",
        "quality_grade": "research,needs_id",
    }
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=25) as resp:
            if resp.status == 200:
                data = await resp.json()
                observations = []
                for obs in data.get("results", []):
                    taxon = obs.get("taxon") or {}
                    coords = obs.get("geojson", {}).get("coordinates", [0, 0])
                    if coords[0] and coords[1]:
                        observations.append({
                            "id": f"inat-{obs.get('id')}",
                            "species": taxon.get("preferred_common_name") or taxon.get("name"),
                            "scientific_name": taxon.get("name"),
                            "iconic_taxon": taxon.get("iconic_taxon_name"),
                            "lat": coords[1], "lng": coords[0],
                            "observed_on": obs.get("observed_on"),
                            "year": int(obs.get("observed_on", "2000")[:4]) if obs.get("observed_on") else None,
                            "month": int(obs.get("observed_on", "2000-01")[5:7]) if obs.get("observed_on") else None,
                            "photo_url": obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                            "user": obs.get("user", {}).get("login"),
                            "source": "inaturalist",
                            "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
                        })
                return observations, data.get("total_results", 0)
    except Exception as e:
        print(f"iNat error: {e}")
    return [], 0


async def fetch_gbif_records(session, ssl_ctx, lat, lng, radius_km, taxon_key=None, limit=300):
    """Fetch GBIF occurrence records - includes historical museum data."""
    url = f"{GBIF_BASE}/occurrence/search"
    deg = radius_km / 111
    
    params = {
        "decimalLatitude": f"{lat-deg},{lat+deg}",
        "decimalLongitude": f"{lng-deg},{lng+deg}",
        "limit": limit,
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
    }
    if taxon_key:
        params["taxonKey"] = taxon_key
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=25) as resp:
            if resp.status == 200:
                data = await resp.json()
                records = []
                for occ in data.get("results", []):
                    if occ.get("decimalLatitude") and occ.get("decimalLongitude"):
                        # Map GBIF class to iconic taxon
                        iconic = None
                        if occ.get("class") == "Aves": iconic = "Aves"
                        elif occ.get("class") == "Insecta": iconic = "Insecta"
                        elif occ.get("class") == "Mammalia": iconic = "Mammalia"
                        elif occ.get("kingdom") == "Plantae": iconic = "Plantae"
                        elif occ.get("kingdom") == "Fungi": iconic = "Fungi"
                        elif occ.get("class") == "Reptilia": iconic = "Reptilia"
                        elif occ.get("class") == "Amphibia": iconic = "Amphibia"
                        elif occ.get("class") == "Arachnida": iconic = "Arachnida"
                        
                        records.append({
                            "id": f"gbif-{occ.get('gbifID')}",
                            "species": occ.get("species") or occ.get("genericName"),
                            "scientific_name": occ.get("scientificName"),
                            "iconic_taxon": iconic,
                            "lat": occ.get("decimalLatitude"),
                            "lng": occ.get("decimalLongitude"),
                            "observed_on": occ.get("eventDate", "")[:10] if occ.get("eventDate") else None,
                            "year": occ.get("year"),
                            "month": occ.get("month"),
                            "source": "gbif",
                            "institution": occ.get("institutionCode"),
                            "basis": occ.get("basisOfRecord"),
                        })
                return records
    except Exception as e:
        print(f"GBIF error: {e}")
    return []


async def fetch_all_wildlife(lat, lng, radius_km=30, days_back=365):
    """Fetch from all sources for maximum data."""
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    all_obs = []
    seen_ids = set()
    
    async with aiohttp.ClientSession() as session:
        # iNaturalist - fetch each taxon
        for taxon in TAXON_QUERIES:
            try:
                obs, total = await fetch_inat_page(session, ssl_ctx, lat, lng, radius_km, taxon["id"], days_back)
                for o in obs:
                    if o["id"] not in seen_ids:
                        seen_ids.add(o["id"])
                        all_obs.append(o)
                
                # If there are more results, fetch page 2
                if total > 200:
                    obs2, _ = await fetch_inat_page(session, ssl_ctx, lat, lng, radius_km, taxon["id"], days_back, page=2)
                    for o in obs2:
                        if o["id"] not in seen_ids:
                            seen_ids.add(o["id"])
                            all_obs.append(o)
            except Exception as e:
                print(f"Taxon {taxon['name']} error: {e}")
        
        # GBIF - historical records
        try:
            gbif_records = await fetch_gbif_records(session, ssl_ctx, lat, lng, radius_km)
            for r in gbif_records:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    all_obs.append(r)
        except Exception as e:
            print(f"GBIF error: {e}")
    
    return all_obs


def register_wildlife_routes(app):
    """Register wildlife API routes."""
    
    @app.route('/api/wildlife/unified', methods=['GET'])
    def unified_wildlife():
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        radius = request.args.get('radius', 30, type=int)
        days = request.args.get('days', 365, type=int)
        
        observations = asyncio.run(fetch_all_wildlife(lat, lng, radius, days))
        
        # Add year stats
        year_counts = {}
        for obs in observations:
            y = obs.get("year")
            if y:
                year_counts[y] = year_counts.get(y, 0) + 1
        
        return jsonify({
            "type": "FeatureCollection",
            "total_observations": len(observations),
            "year_distribution": year_counts,
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [obs["lng"], obs["lat"]]},
                    "properties": obs
                }
                for obs in observations
            ],
        })
    
    @app.route('/api/wildlife/sources', methods=['GET'])
    def wildlife_sources():
        return jsonify({
            "sources": ["inaturalist", "gbif"],
            "taxon_groups": [t["name"] for t in TAXON_QUERIES],
        })

"""
Wildlife Data Cache
====================
Pre-fetches and caches Utah wildlife data for fast access.
Stores in SQLite for persistence across restarts.
"""

import sqlite3
import json
import aiohttp
import asyncio
import ssl
import certifi
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "wildlife_cache.db"
INAT_BASE = "https://api.inaturalist.org/v1"

# Utah bounding box
UTAH_BOUNDS = {
    "swlat": 36.9979,
    "swlng": -114.0529,
    "nelat": 42.0013,
    "nelng": -109.0410
}

# Salt Lake Valley bounds (focused area)
SL_VALLEY_BOUNDS = {
    "swlat": 40.4,
    "swlng": -112.2,
    "nelat": 41.2,
    "nelng": -111.6
}

def init_db():
    """Initialize the cache database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS observations (
            id INTEGER PRIMARY KEY,
            source TEXT,
            species TEXT,
            scientific_name TEXT,
            iconic_taxon TEXT,
            lat REAL,
            lng REAL,
            observed_on TEXT,
            photo_url TEXT,
            user_name TEXT,
            url TEXT,
            quality_grade TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_lat_lng ON observations(lat, lng)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_taxon ON observations(iconic_taxon)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_observed ON observations(observed_on)
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS cache_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized at {DB_PATH}")


async def fetch_inat_page(session, ssl_ctx, params, page):
    """Fetch a single page of iNaturalist results."""
    params = {**params, "page": page}
    url = f"{INAT_BASE}/observations"
    
    try:
        async with session.get(url, params=params, ssl=ssl_ctx, timeout=30) as resp:
            if resp.status == 200:
                return await resp.json()
            elif resp.status == 429:  # Rate limited
                await asyncio.sleep(2)
                return None
    except Exception as e:
        print(f"  Error page {page}: {e}")
    return None


async def cache_inat_observations(bounds, days_back=365, max_pages=50):
    """
    Fetch and cache iNaturalist observations for a region.
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    d1 = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    
    params = {
        "swlat": bounds["swlat"],
        "swlng": bounds["swlng"],
        "nelat": bounds["nelat"],
        "nelng": bounds["nelng"],
        "d1": d1,
        "per_page": 200,
        "order": "desc",
        "order_by": "observed_on",
        "quality_grade": "research,needs_id",
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    total_added = 0
    
    async with aiohttp.ClientSession() as session:
        for page in range(1, max_pages + 1):
            print(f"  Fetching page {page}...")
            data = await fetch_inat_page(session, ssl_ctx, params, page)
            
            if not data or not data.get("results"):
                print(f"  No more results at page {page}")
                break
            
            results = data["results"]
            
            for obs in results:
                taxon = obs.get("taxon") or {}
                coords = obs.get("geojson", {}).get("coordinates", [None, None])
                
                if not coords[0] or not coords[1]:
                    continue
                
                try:
                    c.execute('''
                        INSERT OR REPLACE INTO observations 
                        (id, source, species, scientific_name, iconic_taxon, lat, lng, 
                         observed_on, photo_url, user_name, url, quality_grade)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        obs.get("id"),
                        "inaturalist",
                        taxon.get("preferred_common_name") or taxon.get("name"),
                        taxon.get("name"),
                        taxon.get("iconic_taxon_name"),
                        coords[1],
                        coords[0],
                        obs.get("observed_on"),
                        obs.get("photos", [{}])[0].get("url", "").replace("square", "medium") if obs.get("photos") else None,
                        obs.get("user", {}).get("login"),
                        f"https://www.inaturalist.org/observations/{obs.get('id')}",
                        obs.get("quality_grade"),
                    ))
                    total_added += 1
                except Exception as e:
                    pass
            
            conn.commit()
            
            # Rate limiting
            await asyncio.sleep(1)
            
            # Check if we've gotten all results
            if len(results) < 200:
                break
    
    # Update metadata
    c.execute('''
        INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
        VALUES (?, ?, ?)
    ''', ("last_cache_update", datetime.utcnow().isoformat(), datetime.utcnow()))
    
    c.execute("SELECT COUNT(*) FROM observations")
    total = c.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    print(f"✅ Added {total_added} observations. Total in cache: {total}")
    return total


def get_cached_observations(lat, lng, radius_km=25, taxon=None, limit=1000):
    """Get observations from cache."""
    if not DB_PATH.exists():
        return []
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Rough degree conversion
    deg = radius_km / 111
    
    query = '''
        SELECT id, source, species, scientific_name, iconic_taxon, 
               lat, lng, observed_on, photo_url, user_name, url
        FROM observations
        WHERE lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    '''
    params = [lat - deg, lat + deg, lng - deg, lng + deg]
    
    if taxon:
        query += " AND iconic_taxon = ?"
        params.append(taxon)
    
    query += f" ORDER BY observed_on DESC LIMIT {limit}"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    observations = []
    for row in rows:
        observations.append({
            "id": row[0],
            "source": row[1],
            "species": row[2],
            "scientific_name": row[3],
            "iconic_taxon": row[4],
            "lat": row[5],
            "lng": row[6],
            "observed_on": row[7],
            "photo_url": row[8],
            "user": row[9],
            "url": row[10],
        })
    
    return observations


def get_cache_stats():
    """Get cache statistics."""
    if not DB_PATH.exists():
        return {"status": "not initialized", "count": 0}
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM observations")
    total = c.fetchone()[0]
    
    c.execute("SELECT iconic_taxon, COUNT(*) FROM observations GROUP BY iconic_taxon ORDER BY COUNT(*) DESC")
    by_taxon = dict(c.fetchall())
    
    c.execute("SELECT MIN(observed_on), MAX(observed_on) FROM observations")
    date_range = c.fetchone()
    
    c.execute("SELECT value FROM cache_meta WHERE key = 'last_cache_update'")
    last_update = c.fetchone()
    
    conn.close()
    
    return {
        "status": "active",
        "total_observations": total,
        "by_taxon": by_taxon,
        "date_range": {"earliest": date_range[0], "latest": date_range[1]},
        "last_update": last_update[0] if last_update else None,
    }


# CLI for manual cache building
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "build":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 365
        pages = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        
        print(f"Building cache: {days} days, up to {pages} pages...")
        asyncio.run(cache_inat_observations(SL_VALLEY_BOUNDS, days, pages))
    
    elif len(sys.argv) > 1 and sys.argv[1] == "stats":
        stats = get_cache_stats()
        print(json.dumps(stats, indent=2))
    
    else:
        print("Usage:")
        print("  python wildlife_cache.py build [days] [max_pages]")
        print("  python wildlife_cache.py stats")

#!/usr/bin/env python3
"""
Expanded collection - gets ALL Utah observations including:
- All taxa (not just the main 8)
- Both research_grade and needs_id quality
- Casual observations
"""

import requests
import json
import time
import os
from datetime import datetime

OUTPUT_DIR = 'data/full_cache_expanded'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def log(msg):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {msg}")
    with open(f'{OUTPUT_DIR}/collection.log', 'a') as f:
        f.write(f"[{timestamp}] {msg}\n")

# Utah bounding box
UTAH_BOUNDS = {
    'swlat': 36.9979,
    'swlng': -114.0529,
    'nelat': 42.0013,
    'nelng': -109.0410
}

def collect_inaturalist_all():
    """Collect ALL iNaturalist observations for Utah"""
    log("=== Collecting ALL iNaturalist Utah observations ===")
    
    all_obs = []
    page = 1
    per_page = 200
    
    # Get total count first
    params = {
        **UTAH_BOUNDS,
        'per_page': 1,
        'page': 1,
    }
    
    r = requests.get('https://api.inaturalist.org/v1/observations', params=params, timeout=30)
    total = r.json().get('total_results', 0)
    log(f"Total iNaturalist observations in Utah: {total:,}")
    
    # iNaturalist has a 10,000 result limit per query
    # We need to paginate by date or other criteria
    
    # Collect by year to avoid the 10k limit
    years = range(2000, 2026)
    
    for year in years:
        log(f"\nCollecting year {year}...")
        year_obs = []
        page = 1
        
        while True:
            params = {
                **UTAH_BOUNDS,
                'per_page': per_page,
                'page': page,
                'd1': f'{year}-01-01',
                'd2': f'{year}-12-31',
                'order': 'asc',
                'order_by': 'observed_on',
            }
            
            try:
                r = requests.get('https://api.inaturalist.org/v1/observations', params=params, timeout=60)
                data = r.json()
                results = data.get('results', [])
                
                if not results:
                    break
                
                for obs in results:
                    if obs.get('location'):
                        lat, lng = map(float, obs['location'].split(','))
                        year_obs.append({
                            'type': 'Feature',
                            'geometry': {'type': 'Point', 'coordinates': [lng, lat]},
                            'properties': {
                                'id': f"inat_{obs['id']}",
                                'species': obs.get('taxon', {}).get('name', ''),
                                'common_name': obs.get('taxon', {}).get('preferred_common_name', ''),
                                'iconic_taxon': obs.get('taxon', {}).get('iconic_taxon_name', ''),
                                'year': int(obs.get('observed_on', '')[:4]) if obs.get('observed_on') else None,
                                'month': int(obs.get('observed_on', '')[5:7]) if obs.get('observed_on') and len(obs.get('observed_on', '')) >= 7 else None,
                                'quality': obs.get('quality_grade', ''),
                                'source': 'iNaturalist'
                            }
                        })
                
                log(f"  {year} page {page}: {len(results)} obs (total: {len(year_obs):,})")
                
                if len(results) < per_page:
                    break
                    
                page += 1
                time.sleep(1)  # Rate limit
                
                # Stop at 10k per year (API limit)
                if page > 50:
                    log(f"  Reached page limit for {year}")
                    break
                    
            except Exception as e:
                log(f"  Error: {e}")
                time.sleep(5)
                continue
        
        all_obs.extend(year_obs)
        log(f"  Year {year} complete: {len(year_obs):,} observations")
        
        # Save checkpoint
        checkpoint = {'features': all_obs, 'year': year}
        with open(f'{OUTPUT_DIR}/checkpoint_inat.json', 'w') as f:
            json.dump(checkpoint, f)
    
    return all_obs

def collect_gbif_all():
    """Collect ALL GBIF observations for Utah"""
    log("\n=== Collecting ALL GBIF Utah observations ===")
    
    all_obs = []
    offset = 0
    limit = 300
    
    # GBIF query for Utah
    params = {
        'decimalLatitude': '36.99,42.01',
        'decimalLongitude': '-114.06,-109.04',
        'hasCoordinate': 'true',
        'limit': limit,
        'offset': offset,
    }
    
    # Get total
    r = requests.get('https://api.gbif.org/v1/occurrence/search', params={**params, 'limit': 1}, timeout=30)
    total = r.json().get('count', 0)
    log(f"Total GBIF observations in Utah: {total:,}")
    
    while offset < min(total, 200000):  # GBIF has 200k limit
        params['offset'] = offset
        
        try:
            r = requests.get('https://api.gbif.org/v1/occurrence/search', params=params, timeout=60)
            data = r.json()
            results = data.get('results', [])
            
            if not results:
                break
            
            for obs in results:
                if obs.get('decimalLatitude') and obs.get('decimalLongitude'):
                    all_obs.append({
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [obs['decimalLongitude'], obs['decimalLatitude']]
                        },
                        'properties': {
                            'id': f"gbif_{obs.get('gbifID', obs.get('key', ''))}",
                            'species': obs.get('species', obs.get('scientificName', '')),
                            'common_name': obs.get('vernacularName', ''),
                            'iconic_taxon': obs.get('class', obs.get('phylum', '')),
                            'year': obs.get('year'),
                            'month': obs.get('month'),
                            'source': 'GBIF'
                        }
                    })
            
            log(f"  Offset {offset:,}: {len(results)} obs (total: {len(all_obs):,})")
            offset += limit
            time.sleep(0.5)
            
            # Checkpoint every 10k
            if len(all_obs) % 10000 < limit:
                with open(f'{OUTPUT_DIR}/checkpoint_gbif.json', 'w') as f:
                    json.dump({'features': all_obs}, f)
                    
        except Exception as e:
            log(f"  Error at offset {offset}: {e}")
            time.sleep(5)
            continue
    
    return all_obs

def main():
    log("=" * 60)
    log("EXPANDED COLLECTION - ALL UTAH OBSERVATIONS")
    log("=" * 60)
    
    # Collect from both sources
    inat_obs = collect_inaturalist_all()
    gbif_obs = collect_gbif_all()
    
    # Combine and deduplicate
    log("\n--- Combining and deduplicating ---")
    all_obs = inat_obs + gbif_obs
    log(f"Before dedup: {len(all_obs):,}")
    
    # Deduplicate by location + year
    seen = set()
    unique = []
    for obs in all_obs:
        coords = obs['geometry']['coordinates']
        props = obs['properties']
        key = (round(coords[0], 4), round(coords[1], 4), props.get('year'), props.get('species', '')[:20])
        if key not in seen:
            seen.add(key)
            unique.append(obs)
    
    log(f"After dedup: {len(unique):,}")
    
    # Save final output
    output = {
        'type': 'FeatureCollection',
        'generated': datetime.now().isoformat(),
        'features': unique
    }
    
    output_path = f'{OUTPUT_DIR}/utah_expanded_cache.json'
    with open(output_path, 'w') as f:
        json.dump(output, f)
    
    size_mb = os.path.getsize(output_path) / (1024*1024)
    
    log("\n" + "=" * 60)
    log(f"COLLECTION COMPLETE")
    log(f"Total observations: {len(unique):,}")
    log(f"File size: {size_mb:.1f} MB")
    log(f"Output: {output_path}")
    log("=" * 60)

if __name__ == '__main__':
    main()

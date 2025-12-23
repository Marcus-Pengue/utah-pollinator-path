#!/usr/bin/env python3
"""
Regenerate compressed download files from the full cache.
Run this whenever you update the full dataset.

Usage: python3 scripts/regenerate_downloads.py
"""

import json
import csv
import gzip
import shutil
import os
from datetime import datetime

SOURCE_FILE = 'data/full_cache/utah_full_cache.json'
OUTPUT_DIR = 'src/static/downloads'

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading source data...")
    
    with open(SOURCE_FILE, 'r') as f:
        data = json.load(f)
    
    obs_count = len(data['features'])
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {obs_count:,} observations")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Compressing JSON...")
    json_path = os.path.join(OUTPUT_DIR, 'utah_full_cache.json.gz')
    with gzip.open(json_path, 'wt', encoding='utf-8') as f:
        json.dump(data, f)
    json_size = os.path.getsize(json_path) / (1024*1024)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Converting to CSV...")
    csv_path = os.path.join(OUTPUT_DIR, 'utah_full_cache.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['species', 'common_name', 'latitude', 'longitude', 'year', 'month', 'day', 'source', 'taxon', 'observation_id'])
        for feat in data['features']:
            props = feat.get('properties', {})
            coords = feat.get('geometry', {}).get('coordinates', [None, None])
            writer.writerow([
                props.get('species', ''), props.get('common_name', ''),
                coords[1] if len(coords) > 1 else '', coords[0] if len(coords) > 0 else '',
                props.get('year', ''), props.get('month', ''), props.get('day', ''),
                props.get('source', ''), props.get('iconic_taxon', ''), props.get('id', ''),
            ])
    
    csv_gz_path = csv_path + '.gz'
    with open(csv_path, 'rb') as f_in:
        with gzip.open(csv_gz_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    os.remove(csv_path)
    csv_size = os.path.getsize(csv_gz_path) / (1024*1024)
    
    meta_path = os.path.join(OUTPUT_DIR, 'metadata.json')
    with open(meta_path, 'w') as f:
        json.dump({
            'observations': obs_count,
            'generated': datetime.utcnow().isoformat(),
            'files': {'json_gz': {'size_mb': round(json_size, 1)}, 'csv_gz': {'size_mb': round(csv_size, 1)}},
            'sources': ['iNaturalist', 'GBIF'],
            'date_range': '1871-2025',
        }, f, indent=2)
    
    print(f"\n✅ Done! {obs_count:,} observations ready.")
    print(f"   JSON.gz: {json_size:.1f} MB | CSV.gz: {csv_size:.1f} MB")

if __name__ == '__main__':
    main()

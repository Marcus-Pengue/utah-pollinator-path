"""
iNaturalist Batch Uploader
"""

import aiohttp
import ssl
import certifi
import asyncio
from typing import Dict, List
from datetime import datetime

SUPABASE_URL = "https://gqexnqmqwhpcrleksrkb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZXhucW1xd2hwY3JsZWtzcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzg1OTEsImV4cCI6MjA4MTg1NDU5MX0.glfXIcO8ofdyWUC9nlf9Y-6EzF30BXlxtIY8NXVEORM"

INAT_API_URL = "https://api.inaturalist.org/v1"
INAT_ACCESS_TOKEN = None  # Set via environment


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _ssl_context():
    return ssl.create_default_context(cafile=certifi.where())


async def get_pending_uploads(limit: int = 50) -> List[Dict]:
    """Get observations approved for iNaturalist upload."""
    url = (
        f"{SUPABASE_URL}/rest/v1/observations"
        f"?review_status=eq.approved"
        f"&observation_type=eq.wildlife"
        f"&order=created_at.asc"
        f"&limit={limit}"
    )
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers()) as resp:
            return await resp.json() if resp.status == 200 else []


async def get_pending_review(limit: int = 50) -> List[Dict]:
    """Get observations pending review."""
    url = (
        f"{SUPABASE_URL}/rest/v1/observations"
        f"?review_status=eq.pending_review"
        f"&order=created_at.asc"
        f"&limit={limit}"
    )
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(url, headers=_headers()) as resp:
            return await resp.json() if resp.status == 200 else []


async def update_observation_status(
    observation_id: str,
    review_status: str,
    reviewer_id: str = None,
    review_notes: str = None,
    inat_observation_id: int = None,
    inat_upload_error: str = None,
) -> Dict:
    """Update observation review status."""
    url = f"{SUPABASE_URL}/rest/v1/observations?id=eq.{observation_id}"
    
    data = {
        "review_status": review_status,
        "reviewed_at": datetime.utcnow().isoformat(),
    }
    if reviewer_id:
        data["reviewed_by"] = reviewer_id
    if review_notes:
        data["review_notes"] = review_notes
    if inat_observation_id:
        data["inat_observation_id"] = inat_observation_id
    if inat_upload_error:
        data["inat_upload_error"] = inat_upload_error
    
    connector = aiohttp.TCPConnector(ssl=_ssl_context())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.patch(url, headers=_headers(), json=data) as resp:
            if resp.status == 200:
                result = await resp.json()
                return {"success": True, "observation": result[0] if result else None}
            return {"success": False, "error": await resp.text()}


async def upload_to_inaturalist(observation: Dict) -> Dict:
    """Upload a single observation to iNaturalist."""
    if not INAT_ACCESS_TOKEN:
        return {"success": False, "error": "iNaturalist access token not configured"}
    
    # TODO: Implement actual iNat upload
    return {"success": False, "error": "iNat upload not yet implemented"}


async def run_batch_upload(limit: int = 10) -> Dict:
    """Run batch upload of approved observations."""
    pending = await get_pending_uploads(limit=limit)
    
    if not pending:
        return {"processed": 0, "uploaded": 0, "failed": 0, "message": "No approved observations"}
    
    uploaded = 0
    failed = 0
    
    for obs in pending:
        result = await upload_to_inaturalist(obs)
        if result.get("success"):
            await update_observation_status(obs["id"], "uploaded", inat_observation_id=result.get("inat_id"))
            uploaded += 1
        else:
            failed += 1
    
    return {"processed": len(pending), "uploaded": uploaded, "failed": failed}


async def get_review_stats() -> Dict:
    """Get statistics on observation review status."""
    stats = {}
    for status in ["pending_review", "approved", "rejected", "internal_only", "uploaded"]:
        url = f"{SUPABASE_URL}/rest/v1/observations?review_status=eq.{status}&select=id"
        connector = aiohttp.TCPConnector(ssl=_ssl_context())
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url, headers=_headers()) as resp:
                data = await resp.json() if resp.status == 200 else []
                stats[status] = len(data)
    return stats


if __name__ == "__main__":
    async def test():
        print("Review Stats:")
        stats = await get_review_stats()
        for status, count in stats.items():
            print(f"  {status}: {count}")
        
        print("\nPending Review:")
        pending = await get_pending_review(limit=5)
        for obs in pending:
            print(f"  - {obs['id'][:8]}... {obs.get('species_guess', 'Unknown')}")
    
    asyncio.run(test())

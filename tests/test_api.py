"""
API Test Harness
=================
Validates all endpoints work correctly.
Run: python tests/test_api.py
"""

import requests
import json
import time
import sys

# Config
BASE_URL = "https://utah-pollinator-path.onrender.com"
ADMIN_KEY = "8a56becc816d0f70f64bde106f5a8c13"
USER_TOKEN = None  # Set if testing authenticated endpoints

# Test results
results = {"passed": 0, "failed": 0, "skipped": 0, "errors": []}


def test(name, condition, details=""):
    """Record test result."""
    if condition:
        results["passed"] += 1
        print(f"  ✅ {name}")
    else:
        results["failed"] += 1
        results["errors"].append(f"{name}: {details}")
        print(f"  ❌ {name} - {details}")


def skip(name, reason=""):
    """Skip a test."""
    results["skipped"] += 1
    print(f"  ⏭️  {name} (skipped: {reason})")


def get(endpoint, headers=None, params=None):
    """GET request."""
    try:
        r = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params, timeout=30)
        return r.status_code, r.json() if r.headers.get('content-type', '').startswith('application/json') else r.text
    except Exception as e:
        return 0, str(e)


def post(endpoint, data=None, headers=None):
    """POST request."""
    try:
        h = {"Content-Type": "application/json"}
        if headers:
            h.update(headers)
        r = requests.post(f"{BASE_URL}{endpoint}", json=data, headers=h, timeout=30)
        return r.status_code, r.json() if r.headers.get('content-type', '').startswith('application/json') else r.text
    except Exception as e:
        return 0, str(e)


def admin_headers():
    return {"X-Admin-Key": ADMIN_KEY}


def auth_headers():
    if USER_TOKEN:
        return {"Authorization": f"Bearer {USER_TOKEN}"}
    return {}


# ============ TESTS ============

def test_health():
    """Test health endpoint."""
    print("\n📋 Health Check")
    status, data = get("/health")
    test("GET /health returns 200", status == 200, f"status={status}")
    test("Health has status field", isinstance(data, dict) and "status" in data)


def test_public_endpoints():
    """Test public endpoints (no auth required)."""
    print("\n📋 Public Endpoints")
    
    # Species
    status, data = get("/api/species/plants")
    test("GET /api/species/search", status == 200, f"status={status}")
    
    # Scoring methodology
    status, data = get("/api/scoring/methodology")
    test("GET /api/scoring/methodology", status == 200)
    test("Methodology has version", isinstance(data, dict) and "version" in data)
    
    # Scoring models
    status, data = get("/api/scoring/models")
    test("GET /api/scoring/models", status == 200)
    
    # Badges list
    status, data = get("/api/badges")
    test("GET /api/badges", status == 200)
    test("Badges returns array", isinstance(data, dict) and "badges" in data)
    
    # Challenges list
    status, data = get("/api/challenges")
    test("GET /api/challenges", status == 200)
    
    # Challenge templates
    status, data = get("/api/challenges/templates")
    test("GET /api/challenges/templates", status == 200)
    
    # Leaderboard
    status, data = get("/api/map/leaderboard")
    test("GET /api/leaderboard", status == 200)
    
    # Observations
    status, data = get("/api/observations")
    test("GET /api/observations", status == 200)
    
    # Stats (public)
    status, data = get("/api/stats")
    test("GET /api/stats", status == 200)
    test("Stats has stats field", isinstance(data, dict) and "stats" in data)
    
    # Event counts (public)
    status, data = get("/api/events/counts")
    test("GET /api/events/counts", status == 200)
    
    # Connectivity nearby (public)
    status, data = get("/api/connectivity/nearby?grid_hash=40.666_-111.897")
    test("GET /api/connectivity/nearby", status == 200)


def test_scoring_endpoints():
    """Test scoring endpoints."""
    print("\n📋 Scoring Endpoints")
    
    # V2 Score
    payload = {
        "lat": 40.6655,
        "lng": -111.8965,
        "plants": [
            {"species": "Showy Milkweed", "count": 3, "is_native": True, "is_milkweed": True, "bloom_seasons": ["summer"]},
            {"species": "Purple Coneflower", "count": 5, "is_native": True, "bloom_seasons": ["summer", "fall"]}
        ],
        "flower_coverage_pct": 20,
        "has_bare_ground": True,
        "bare_ground_sqft": 25,
        "neighbors_in_program": 2
    }
    status, data = post("/api/v2/score", payload)
    test("POST /api/v2/score", status == 200, f"status={status}")
    test("Score has score", isinstance(data, dict) and "score" in data)
    test("Score has grade", isinstance(data, dict) and "grade" in data)
    
    # Score leaderboard
    status, data = get("/api/scores/leaderboard")
    test("GET /api/scores/leaderboard", status == 200)


def test_admin_auth():
    """Test admin authentication."""
    print("\n📋 Admin Authentication")
    
    # Without key - should fail
    status, data = get("/api/admin/export")
    test("Admin export without key fails", status == 403, f"status={status}")
    
    # With wrong key - should fail
    status, data = get("/api/admin/export", headers={"X-Admin-Key": "wrong-key"})
    test("Admin export with wrong key fails", status == 403, f"status={status}")
    
    # With correct key - should work
    status, data = get("/api/admin/verify", headers=admin_headers())
    test("Admin verify with key succeeds", status == 200, f"status={status}")
    test("Admin verify returns valid=true", isinstance(data, dict) and data.get("valid") == True)


def test_admin_endpoints():
    """Test admin endpoints (with auth)."""
    print("\n📋 Admin Endpoints")
    
    status, data = get("/api/admin/export", headers=admin_headers())
    test("GET /api/admin/export", status == 200)
    test("Export has data field", isinstance(data, dict) and "data" in data)
    
    status, data = get("/api/admin/config", headers=admin_headers())
    test("GET /api/admin/config", status == 200)


def test_protected_endpoints():
    """Test endpoints requiring user auth."""
    print("\n📋 Protected Endpoints (require user auth)")
    
    if not USER_TOKEN:
        skip("GET /api/inventory", "No USER_TOKEN set")
        skip("GET /api/badges/my", "No USER_TOKEN set")
        skip("GET /api/challenges/my", "No USER_TOKEN set")
        skip("GET /api/referrals/my", "No USER_TOKEN set")
        skip("GET /api/alerts/my", "No USER_TOKEN set")
        skip("GET /api/scores/my", "No USER_TOKEN set")
        skip("GET /api/connectivity", "No USER_TOKEN set")
        return
    
    headers = auth_headers()
    
    status, data = get("/api/inventory", headers=headers)
    test("GET /api/inventory", status == 200, f"status={status}")
    
    status, data = get("/api/badges/my", headers=headers)
    test("GET /api/badges/my", status == 200, f"status={status}")
    
    status, data = get("/api/challenges/my", headers=headers)
    test("GET /api/challenges/my", status == 200, f"status={status}")
    
    status, data = get("/api/referrals/my", headers=headers)
    test("GET /api/referrals/my", status == 200, f"status={status}")
    
    status, data = get("/api/alerts/my", headers=headers)
    test("GET /api/alerts/my", status == 200, f"status={status}")
    
    status, data = get("/api/scores/my", headers=headers)
    test("GET /api/scores/my", status == 200, f"status={status}")


def test_jobs_endpoints():
    """Test jobs endpoints."""
    print("\n📋 Jobs Endpoints")
    
    status, data = get("/api/jobs/list")
    test("GET /api/jobs/list", status == 200)
    test("Jobs list has jobs array", isinstance(data, dict) and "jobs" in data)
    
    status, data = get("/api/jobs/history")
    test("GET /api/jobs/history", status == 200)
    
    # Running jobs requires admin
    status, data = post("/api/jobs/run/expire_challenges", headers=admin_headers())
    test("POST /api/jobs/run (admin)", status == 200, f"status={status}")


def test_stats_endpoints():
    """Test stats endpoints."""
    print("\n📋 Stats Endpoints")
    
    status, data = get("/api/stats/growth?days=7")
    test("GET /api/stats/growth", status == 200)
    
    status, data = get("/api/stats/geographic")
    test("GET /api/stats/geographic", status == 200)
    
    status, data = get("/api/stats/scores")
    test("GET /api/stats/scores", status == 200)
    
    status, data = get("/api/stats/challenges")
    test("GET /api/stats/challenges", status == 200)
    
    status, data = get("/api/stats/dashboard")
    test("GET /api/stats/dashboard", status == 200)


def test_events_endpoints():
    """Test event logging endpoints."""
    print("\n📋 Events Endpoints")
    
    status, data = get("/api/events/types")
    test("GET /api/events/types", status == 200)
    
    status, data = get("/api/events/daily?days=7")
    test("GET /api/events/daily", status == 200)
    
    # Recent events requires admin
    status, data = get("/api/events/recent", headers=admin_headers())
    test("GET /api/events/recent (admin)", status == 200, f"status={status}")


def print_summary():
    """Print test summary."""
    total = results["passed"] + results["failed"] + results["skipped"]
    
    print("\n" + "=" * 50)
    print(f"📊 TEST RESULTS")
    print("=" * 50)
    print(f"  ✅ Passed:  {results['passed']}")
    print(f"  ❌ Failed:  {results['failed']}")
    print(f"  ⏭️  Skipped: {results['skipped']}")
    print(f"  📋 Total:   {total}")
    
    if results["errors"]:
        print("\n❌ FAILURES:")
        for err in results["errors"]:
            print(f"  - {err}")
    
    print()
    return results["failed"] == 0


# ============ MAIN ============

if __name__ == "__main__":
    print("=" * 50)
    print("🧪 Utah Pollinator Path - API Test Suite")
    print(f"🌐 Testing: {BASE_URL}")
    print("=" * 50)
    
    # Check if user token provided
    if len(sys.argv) > 1:
        USER_TOKEN = sys.argv[1]
        print(f"🔑 User token provided")
    
    start = time.time()
    
    # Run tests
    test_health()
    test_public_endpoints()
    test_scoring_endpoints()
    test_admin_auth()
    test_admin_endpoints()
    test_protected_endpoints()
    test_jobs_endpoints()
    test_stats_endpoints()
    test_events_endpoints()
    
    elapsed = time.time() - start
    print(f"\n⏱️  Completed in {elapsed:.1f}s")
    
    success = print_summary()
    sys.exit(0 if success else 1)

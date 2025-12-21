"""
Utah Pollinator Path - Master Configuration
"""

PROJECT = {
    "name": "Utah Pollinator Path",
    "version": "1.1.0",
    "repo": "https://github.com/Marcus-Pengue/utah-pollinator-path",
    "api_live": "https://utah-pollinator-path.onrender.com",
    "api_local": "http://localhost:5001",
    "supabase": "https://gqexnqmqwhpcrleksrkb.supabase.co",
}

FEATURES = {
    "scoring_api":      {"enabled": True,  "status": "live"},
    "leaderboards":     {"enabled": True,  "status": "live"},  # NEW
    "supabase":         {"enabled": True,  "status": "live"},  # NEW
    "photo_proxy":      {"enabled": False, "status": "next"},
    "user_accounts":    {"enabled": False, "status": "planned"},
    "pledge_wall":      {"enabled": False, "status": "planned"},
    "yard_signs":       {"enabled": False, "status": "planned"},
    "sms_reminders":    {"enabled": False, "status": "planned"},
}

ENDPOINTS = {
    # Scoring
    "health":           "/health",
    "score_homeowner":  "/api/score/homeowner",
    "score_municipal":  "/api/score/municipal",
    
    # Leaderboards (NEW)
    "leaderboard_join": "/api/leaderboard/join",
    "leaderboard_state":"/api/leaderboard/state",
    "leaderboard_city": "/api/leaderboard/city?filter=CITY",
    "leaderboard_ward": "/api/leaderboard/ward?filter=WARD",
    "geocode":          "/api/geocode",
}

def print_status():
    print(f"\n{'='*50}")
    print(f"  {PROJECT['name']} v{PROJECT['version']}")
    print(f"{'='*50}")
    print(f"\n📡 Live: {PROJECT['api_live']}")
    print(f"🗄️  DB:   {PROJECT['supabase']}")
    print(f"\n🚀 FEATURES:")
    for name, info in FEATURES.items():
        icon = "✅" if info['enabled'] else "⬜"
        print(f"   {icon} {name} [{info['status']}]")
    print(f"\n{'='*50}\n")

if __name__ == "__main__":
    print_status()

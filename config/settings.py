"""Utah Pollinator Path - Master Configuration"""

PROJECT = {
    "name": "Utah Pollinator Path",
    "version": "1.2.0",
    "repo": "https://github.com/Marcus-Pengue/utah-pollinator-path",
    "api_live": "https://utah-pollinator-path.onrender.com",
    "supabase": "https://gqexnqmqwhpcrleksrkb.supabase.co",
}

FEATURES = {
    "scoring_api":      {"enabled": True,  "status": "live"},
    "leaderboards":     {"enabled": True,  "status": "live"},
    "supabase":         {"enabled": True,  "status": "live"},
    "photo_proxy":      {"enabled": True,  "status": "live"},  # NEW
    "user_accounts":    {"enabled": False, "status": "next"},
    "pledge_wall":      {"enabled": False, "status": "planned"},
    "yard_signs":       {"enabled": False, "status": "planned"},
    "sms_reminders":    {"enabled": False, "status": "planned"},
}

ENDPOINTS = {
    "health":             "/health",
    "score_homeowner":    "/api/score/homeowner",
    "score_municipal":    "/api/score/municipal",
    "leaderboard_join":   "/api/leaderboard/join",
    "leaderboard_state":  "/api/leaderboard/state",
    "observations_upload":"/api/observations/upload",  # NEW
    "observations_list":  "/api/observations",         # NEW
    "observations_stats": "/api/observations/stats",   # NEW
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

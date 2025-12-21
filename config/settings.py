"""
Utah Pollinator Path - Master Configuration
============================================
Single source of truth for all project components.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

# =============================================================================
# PROJECT META
# =============================================================================

PROJECT = {
    "name": "Utah Pollinator Path",
    "version": "1.0.0",
    "domain": "utahpollinatorpath.com",  # planned
    "repo": "https://github.com/Marcus-Pengue/utah-pollinator-path",
    "api_live": "https://utah-pollinator-path.onrender.com",
    "api_local": "http://localhost:5001",
}

# =============================================================================
# TOOLS (Two distinct products)
# =============================================================================

class Tool(Enum):
    HOMEOWNER = "homeowner"      # Competition/gamification for residents
    MUNICIPAL = "municipal"      # Intervention prioritization for gov/activists

TOOLS = {
    Tool.HOMEOWNER: {
        "name": "PollinatorPath",
        "description": "Homeowner competition scoring",
        "users": ["homeowners", "residents", "gardeners"],
        "algorithm": "homeowner_v1",
        "endpoint": "/api/score/homeowner",
        "status": "live",
    },
    Tool.MUNICIPAL: {
        "name": "Opportunity Finder", 
        "description": "Intervention site prioritization",
        "users": ["government", "activists", "planners"],
        "algorithm": "municipal_v1",
        "endpoint": "/api/score/municipal",
        "status": "live",
    },
}

# =============================================================================
# DATA SOURCES (External APIs)
# =============================================================================

class SourceStatus(Enum):
    ACTIVE = "active"
    DEGRADED = "degraded"
    DOWN = "down"
    PLANNED = "planned"

SOURCES = {
    "elevation": {
        "name": "USGS National Map",
        "url": "https://epqs.nationalmap.gov/v1/json",
        "provides": ["elevation_ft", "bloom_zone", "in_september_zone"],
        "rate_limit": "none",
        "status": SourceStatus.ACTIVE,
    },
    "water": {
        "name": "OpenStreetMap Overpass",
        "url": "https://overpass-api.de/api/interpreter",
        "provides": ["water_count", "water_types"],
        "rate_limit": "10k/day",
        "status": SourceStatus.ACTIVE,
    },
    "inaturalist": {
        "name": "iNaturalist API",
        "url": "https://api.inaturalist.org/v1",
        "provides": ["observations", "species_count", "monthly_distribution"],
        "rate_limit": "60/min",
        "status": SourceStatus.ACTIVE,
    },
    "greenspace": {
        "name": "OpenStreetMap Overpass",
        "url": "https://overpass-api.de/api/interpreter",
        "provides": ["green_count", "parks", "gardens"],
        "rate_limit": "10k/day",
        "status": SourceStatus.ACTIVE,
    },
    "built": {
        "name": "OpenStreetMap Overpass",
        "url": "https://overpass-api.de/api/interpreter",
        "provides": ["built_count", "heat_island_detection"],
        "rate_limit": "10k/day",
        "status": SourceStatus.ACTIVE,
    },
    "row": {
        "name": "OpenStreetMap Overpass",
        "url": "https://overpass-api.de/api/interpreter",
        "provides": ["row_count", "power_lines", "railways"],
        "rate_limit": "10k/day",
        "status": SourceStatus.ACTIVE,
    },
}

# =============================================================================
# SCORING FACTORS
# =============================================================================

HOMEOWNER_FACTORS = {
    "september_zone": {
        "weight": 0.30,
        "max_points": 30,
        "source": "elevation",
        "description": "Elevation 5,000-7,000 ft = optimal September bloom",
    },
    "water_proximity": {
        "weight": 0.25,
        "max_points": 25,
        "source": "water",
        "description": "Water sources within 1km",
    },
    "september_activity": {
        "weight": 0.20,
        "max_points": 20,
        "source": "inaturalist",
        "description": "September pollinator observations",
    },
    "solar_exposure": {
        "weight": 0.15,
        "max_points": 15,
        "source": "calculated",
        "description": "Estimated solar hours based on latitude",
    },
    "species_diversity": {
        "weight": 0.10,
        "max_points": 10,
        "source": "inaturalist",
        "description": "Pollinator species richness",
    },
}

MUNICIPAL_FACTORS = {
    "connectivity": {
        "weight": 0.45,
        "source": "greenspace",
        "formula": "0.5*(1 - min(dist/500,1)) + 0.5*min(green_count_500m/10,1)",
        "description": "Corridor bridging potential",
    },
    "need_proxy": {
        "weight": 0.30,
        "source": ["greenspace", "built"],
        "formula": "max(0, -microclimate_proxy)",
        "description": "Habitat deficit / heat island",
    },
    "row_feasibility": {
        "weight": 0.15,
        "source": "row",
        "description": "Rights-of-way availability",
    },
    "september_gap": {
        "weight": 0.10,
        "source": ["inaturalist", "elevation"],
        "description": "Late-season nectar deficit",
    },
}

# =============================================================================
# GRADING SYSTEM
# =============================================================================

GRADES = {
    "A+": {"min_score": 90, "label": "Premium Pollinator Site", "badge": "⭐"},
    "A":  {"min_score": 80, "label": "Excellent Potential", "badge": "🦋"},
    "B":  {"min_score": 70, "label": "Good Potential", "badge": "🐝"},
    "C":  {"min_score": 60, "label": "Moderate Potential", "badge": "🌻"},
    "D":  {"min_score": 50, "label": "Limited Potential", "badge": "🌱"},
    "F":  {"min_score": 0,  "label": "Challenging Site", "badge": ""},
}

IDENTITY_LEVELS = {
    "seedling":           {"min_score": 0,  "badge": "🌱", "title": "Seedling"},
    "pollinator_friend":  {"min_score": 40, "badge": "🐝", "title": "Pollinator Friend"},
    "habitat_guardian":   {"min_score": 60, "badge": "🦋", "title": "Habitat Guardian"},
    "migration_champion": {"min_score": 80, "badge": "👑", "title": "Migration Champion"},
    "pioneer":            {"min_score": 90, "badge": "⭐", "title": "Pollinator Path Pioneer"},
}

# =============================================================================
# SPECIES DATABASE
# =============================================================================

PRIORITY_SPECIES = {
    "tier1_september": {
        "description": "September bloomers - Premium for migration",
        "species": [
            {"scientific": "Asclepias fascicularis", "common": "Narrowleaf Milkweed", "bloom": "Jul-Oct"},
            {"scientific": "Asclepias incarnata", "common": "Swamp Milkweed", "bloom": "Jun-Sep"},
            {"scientific": "Ericameria nauseosa", "common": "Rabbitbrush", "bloom": "Sep-Oct"},
            {"scientific": "Chrysothamnus viscidiflorus", "common": "Yellow Rabbitbrush", "bloom": "Aug-Oct"},
            {"scientific": "Symphyotrichum", "common": "Asters", "bloom": "Aug-Oct"},
        ],
    },
    "tier2_summer": {
        "description": "Summer bloomers - Standard support",
        "species": [
            {"scientific": "Asclepias speciosa", "common": "Showy Milkweed", "bloom": "May-Jul"},
            {"scientific": "Solidago canadensis", "common": "Canada Goldenrod", "bloom": "Aug-Oct"},
            {"scientific": "Monarda fistulosa", "common": "Wild Bergamot", "bloom": "Jun-Sep"},
        ],
    },
}

POLLINATOR_TAXA = {
    "bees": 47201,
    "butterflies": 47224,
    "monarch": 48662,
    "hoverflies": 52775,
    "milkweed": 47605,
}

# =============================================================================
# GEOGRAPHIC BOUNDS
# =============================================================================

WASATCH_FRONT = {
    "name": "Wasatch Front",
    "bounds": {
        "north": 41.5,  # Ogden
        "south": 40.0,  # Provo
        "east": -111.5,
        "west": -112.2,
    },
    "optimal_elevation": {
        "min_ft": 5000,
        "max_ft": 7000,
        "description": "September bloom zone",
    },
}

# =============================================================================
# FEATURE FLAGS
# =============================================================================

FEATURES = {
    "scoring_api": {"enabled": True, "status": "live"},
    "photo_proxy": {"enabled": False, "status": "planned"},
    "leaderboards": {"enabled": False, "status": "planned"},
    "user_accounts": {"enabled": False, "status": "planned"},
    "pledge_wall": {"enabled": False, "status": "planned"},
    "yard_signs": {"enabled": False, "status": "planned"},
    "sms_reminders": {"enabled": False, "status": "planned"},
    "nursery_partnerships": {"enabled": False, "status": "planned"},
}

# =============================================================================
# INTEGRATIONS
# =============================================================================

INTEGRATIONS = {
    "supabase": {
        "status": "planned",
        "use_for": ["user_accounts", "observations", "leaderboards"],
    },
    "inaturalist_oauth": {
        "status": "planned", 
        "use_for": ["photo_proxy", "observation_uploads"],
    },
    "sendgrid": {
        "status": "planned",
        "use_for": ["confirmation_emails", "reminders"],
    },
    "twilio": {
        "status": "planned",
        "use_for": ["sms_reminders"],
    },
    "stripe": {
        "status": "planned",
        "use_for": ["seed_kit_orders", "donations"],
    },
}

# =============================================================================
# API ENDPOINTS
# =============================================================================

ENDPOINTS = {
    # Live
    "health":           {"method": "GET",  "path": "/health", "status": "live"},
    "score_homeowner":  {"method": "POST", "path": "/api/score/homeowner", "status": "live"},
    "score_municipal":  {"method": "POST", "path": "/api/score/municipal", "status": "live"},
    "score_batch":      {"method": "POST", "path": "/api/score/batch", "status": "live"},
    "recommendations":  {"method": "POST", "path": "/api/recommendations", "status": "live"},
    "data_priority":    {"method": "GET",  "path": "/api/data/priority200", "status": "live"},
    "data_connect":     {"method": "GET",  "path": "/api/data/connect200", "status": "live"},
    "data_public":      {"method": "GET",  "path": "/api/data/public200", "status": "live"},
    
    # Planned
    "upload_photo":     {"method": "POST", "path": "/api/observations/upload", "status": "planned"},
    "my_observations":  {"method": "GET",  "path": "/api/observations/mine", "status": "planned"},
    "leaderboard":      {"method": "GET",  "path": "/api/leaderboard", "status": "planned"},
    "pledge":           {"method": "POST", "path": "/api/pledge", "status": "planned"},
}

# =============================================================================
# CACHE SETTINGS
# =============================================================================

CACHE = {
    "ttl_hours": 24,
    "max_entries": 1000,
    "grid_precision": 3,  # ~100m cells
}

# =============================================================================
# BEHAVIORAL ECONOMICS TRIGGERS
# =============================================================================

NUDGES = {
    "loss_frame": {
        "enabled": True,
        "examples": [
            "You're losing {pct}% of potential monarch visits",
            "Your yard is part of a {miles}-mile nectar gap",
        ],
    },
    "social_proof": {
        "enabled": False,  # needs user data
        "examples": [
            "{count} families in {ward} have certified",
            "Your neighbor scored {score}%",
        ],
    },
    "countdown": {
        "enabled": True,
        "target_date": "September 1",
        "message": "Monarch migration in {days} days",
    },
}

# =============================================================================
# PRINT STATUS
# =============================================================================

def print_status():
    """Print current system status."""
    print(f"\n{'='*60}")
    print(f"  {PROJECT['name']} v{PROJECT['version']}")
    print(f"{'='*60}")
    print(f"\n📡 API: {PROJECT['api_live']}")
    print(f"📦 Repo: {PROJECT['repo']}")
    
    print(f"\n🔧 TOOLS:")
    for tool, info in TOOLS.items():
        print(f"   [{info['status']}] {info['name']} - {info['endpoint']}")
    
    print(f"\n📊 DATA SOURCES:")
    for name, info in SOURCES.items():
        status = "✅" if info['status'] == SourceStatus.ACTIVE else "⚠️"
        print(f"   {status} {name}: {info['name']}")
    
    print(f"\n🚀 FEATURES:")
    for name, info in FEATURES.items():
        status = "✅" if info['enabled'] else "⬜"
        print(f"   {status} {name} [{info['status']}]")
    
    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    print_status()

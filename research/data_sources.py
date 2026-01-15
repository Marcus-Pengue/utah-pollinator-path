"""
Wildlife Data Sources - API Reference
For Rainbow Road comprehensive wildlife tracking
"""

DATA_SOURCES = {
    # === CURRENTLY USING ===
    "iNaturalist": {
        "url": "https://api.inaturalist.org/v1/",
        "auth": "none",
        "rate_limit": "1/sec",
        "status": "ACTIVE - 311k collected, 1M+ in progress",
    },
    "GBIF": {
        "url": "https://api.gbif.org/v1/",
        "auth": "none", 
        "rate_limit": "3/sec",
        "status": "ACTIVE - merged with iNat",
    },
    
    # === PRIORITY TO ADD ===
    "eBird": {
        "url": "https://api.ebird.org/v2/",
        "auth": "API key (free)",
        "data": "bird sightings, hotspots",
        "get_key": "https://ebird.org/api/keygen",
        "priority": 1,
    },
    "Motus": {
        "url": "https://motus.org/data/",
        "auth": "R package or data request",
        "data": "radio telemetry bird/bat/insect tracking",
        "install": "R: install.packages('motus', repos='https://birdscanada.r-universe.dev')",
        "priority": 2,
    },
    "Movebank": {
        "url": "https://www.movebank.org/movebank/service/",
        "auth": "account + API key",
        "data": "GPS tracking paths, 3 billion records",
        "docs": "https://github.com/movebank/movebank-api-doc",
        "priority": 3,
    },
    "Monarch_Watch": {
        "url": "https://monarchwatch.org/",
        "data": "monarch tagging and sightings",
        "priority": 4,
    },
    
    # === ENVIRONMENTAL ===
    "NOAA_Climate": {
        "url": "https://www.ncdc.noaa.gov/cdo-web/api/v2/",
        "auth": "API key (free)",
        "data": "weather history for phenology",
    },
    "USDA_Plants": {
        "url": "https://plants.usda.gov/",
        "data": "plant distributions, bloom times",
    },
    
    # === FUTURE ===
    "Xeno_Canto": {"url": "https://xeno-canto.org/api/", "data": "bird audio"},
    "BirdCast": {"url": "https://birdcast.info/", "data": "migration forecasts"},
    "Bumble_Bee_Watch": {"url": "https://www.bumblebeewatch.org/", "data": "bumble bee sightings"},
}

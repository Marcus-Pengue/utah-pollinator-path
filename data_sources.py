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
        "data": "citizen science observations",
        "species": "all taxa",
        "coverage": "global",
        "status": "ACTIVE",
    },
    "GBIF": {
        "url": "https://api.gbif.org/v1/",
        "auth": "none", 
        "rate_limit": "3/sec",
        "data": "aggregated biodiversity records",
        "species": "all taxa",
        "coverage": "global",
        "status": "ACTIVE",
    },
    
    # === TO ADD: BIRD MIGRATION ===
    "Motus": {
        "url": "https://motus.org/data/",
        "auth": "account required",
        "access": "R package (motus) or data request",
        "data": "radio telemetry detections",
        "species": "birds, bats, insects with tags",
        "coverage": "Americas, expanding",
        "notes": "Need to request data access per project",
        "install": "R: install.packages('motus', repos='https://birdscanada.r-universe.dev')",
    },
    "eBird": {
        "url": "https://api.ebird.org/v2/",
        "auth": "API key (free)",
        "rate_limit": "100/hour",
        "data": "bird sightings, hotspots, checklists",
        "species": "birds only",
        "coverage": "global",
        "get_key": "https://ebird.org/api/keygen",
    },
    "Movebank": {
        "url": "https://www.movebank.org/movebank/service/",
        "auth": "account + API key",
        "data": "GPS tracking, telemetry paths",
        "species": "birds, mammals, fish, reptiles",
        "coverage": "global, 3 billion records",
        "docs": "https://github.com/movebank/movebank-api-doc",
    },
    "BirdCast": {
        "url": "https://birdcast.info/",
        "auth": "none (scrape forecasts)",
        "data": "migration forecasts, radar data",
        "species": "birds",
        "coverage": "USA",
    },
    
    # === TO ADD: POLLINATORS ===
    "Pollinator_Library": {
        "url": "https://jarrodfowler.com/apoid_pollinators.html",
        "auth": "none (static)",
        "data": "bee-plant associations",
        "species": "native bees",
        "coverage": "North America",
    },
    "Bumble_Bee_Watch": {
        "url": "https://www.bumblebeewatch.org/",
        "auth": "data request",
        "data": "bumble bee sightings",
        "species": "Bombus spp.",
        "coverage": "North America",
    },
    "Monarch_Watch": {
        "url": "https://monarchwatch.org/",
        "auth": "data download",
        "data": "monarch tagging, sightings",
        "species": "Danaus plexippus",
        "coverage": "North America",
    },
    "Xerces_Society": {
        "url": "https://xerces.org/",
        "auth": "partnership",
        "data": "pollinator surveys, habitat data",
        "species": "pollinators",
        "coverage": "North America",
    },
    
    # === TO ADD: PLANTS ===
    "USDA_Plants": {
        "url": "https://plants.usda.gov/",
        "auth": "none",
        "data": "plant distributions, characteristics",
        "species": "all plants",
        "coverage": "USA",
    },
    "Calflora": {
        "url": "https://www.calflora.org/",
        "auth": "API available",
        "data": "plant observations",
        "species": "California plants",
        "coverage": "California",
    },
    "SEINet": {
        "url": "https://swbiodiversity.org/seinet/",
        "auth": "data download",
        "data": "herbarium specimens",
        "species": "plants",
        "coverage": "Southwest USA incl. Utah",
    },
    
    # === TO ADD: ENVIRONMENTAL ===
    "NOAA_Climate": {
        "url": "https://www.ncdc.noaa.gov/cdo-web/api/v2/",
        "auth": "API key (free)",
        "data": "weather, climate history",
        "coverage": "USA",
    },
    "OpenWeather": {
        "url": "https://api.openweathermap.org/",
        "auth": "API key (free tier)",
        "data": "current weather, forecasts",
        "coverage": "global",
    },
    "USGS_Water": {
        "url": "https://waterservices.usgs.gov/",
        "auth": "none",
        "data": "stream flow, water quality",
        "coverage": "USA",
    },
    "NASA_MODIS": {
        "url": "https://modis.gsfc.nasa.gov/",
        "auth": "Earthdata login",
        "data": "NDVI, land cover, phenology",
        "coverage": "global",
    },
    
    # === TO ADD: ACOUSTIC ===
    "Xeno_Canto": {
        "url": "https://xeno-canto.org/api/",
        "auth": "none",
        "data": "bird recordings",
        "species": "birds",
        "coverage": "global",
    },
    "Macaulay_Library": {
        "url": "https://www.macaulaylibrary.org/",
        "auth": "Cornell account",
        "data": "bird/wildlife audio & video",
        "species": "all",
        "coverage": "global",
    },
    
    # === TO ADD: MARINE (future expansion) ===
    "OBIS_SEAMAP": {
        "url": "https://seamap.env.duke.edu/",
        "auth": "none",
        "data": "marine mammal, seabird, turtle tracking",
        "species": "marine",
        "coverage": "global oceans",
    },
    "Animal_Telemetry_Network": {
        "url": "https://atn.ioos.us/",
        "auth": "data request",
        "data": "acoustic telemetry, satellite tags",
        "species": "fish, sharks, marine mammals",
        "coverage": "US waters",
    },
}

# Priority for Utah pollinator project
PRIORITY_ORDER = [
    "iNaturalist",      # DONE
    "GBIF",             # DONE  
    "eBird",            # High value, easy API
    "Movebank",         # Migration paths
    "Motus",            # Tagged bird detections
    "USDA_Plants",      # Plant-pollinator matching
    "Monarch_Watch",    # Monarch migration
    "NOAA_Climate",     # Phenology correlation
]

if __name__ == "__main__":
    print("=== Wildlife Data Sources ===\n")
    for name, info in DATA_SOURCES.items():
        status = info.get("status", "TODO")
        print(f"{name}: {status}")
        print(f"  URL: {info['url']}")
        print(f"  Auth: {info['auth']}")
        print()

"""
Utah Pollinator Species Database
================================
Native plants and pollinators with scoring and metadata.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class BloomSeason(Enum):
    EARLY_SPRING = "early_spring"      # March-April
    LATE_SPRING = "late_spring"        # May-June
    EARLY_SUMMER = "early_summer"      # June-July
    LATE_SUMMER = "late_summer"        # July-August
    EARLY_FALL = "early_fall"          # August-September (CRITICAL)
    LATE_FALL = "late_fall"            # September-October


class SunRequirement(Enum):
    FULL_SUN = "full_sun"
    PARTIAL_SHADE = "partial_shade"
    FULL_SHADE = "full_shade"


class WaterNeed(Enum):
    LOW = "low"           # Xeric/drought tolerant
    MODERATE = "moderate"
    HIGH = "high"


@dataclass
class Plant:
    common_name: str
    scientific_name: str
    bloom_seasons: List[BloomSeason]
    monarch_value: int          # 1-10, how valuable for monarchs
    pollinator_value: int       # 1-10, general pollinator value
    native_to_utah: bool
    sun: SunRequirement
    water: WaterNeed
    description: str
    planting_tips: str
    tags: List[str]             # e.g., ["milkweed", "host_plant", "nectar"]


@dataclass
class Pollinator:
    common_name: str
    scientific_name: str
    category: str               # butterfly, bee, moth, hummingbird
    active_months: List[int]    # 1-12
    host_plants: List[str]      # Plants larvae feed on
    nectar_plants: List[str]    # Plants adults feed on
    description: str
    identification_tips: str
    conservation_status: str    # common, declining, endangered


# =============================================================================
# UTAH NATIVE PLANTS DATABASE
# =============================================================================

PLANTS: Dict[str, Plant] = {
    # CRITICAL SEPTEMBER BLOOMERS
    "rabbitbrush": Plant(
        common_name="Rubber Rabbitbrush",
        scientific_name="Ericameria nauseosa",
        bloom_seasons=[BloomSeason.EARLY_FALL, BloomSeason.LATE_FALL],
        monarch_value=10,
        pollinator_value=10,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="THE most important September nectar source for migrating monarchs in Utah. Bright yellow flowers cover this shrub in fall.",
        planting_tips="Extremely drought tolerant. Plant in full sun. Needs no supplemental water once established. Can grow 3-6 feet.",
        tags=["september_critical", "nectar", "drought_tolerant", "shrub"]
    ),
    
    "showy_goldenrod": Plant(
        common_name="Showy Goldenrod",
        scientific_name="Solidago speciosa",
        bloom_seasons=[BloomSeason.LATE_SUMMER, BloomSeason.EARLY_FALL],
        monarch_value=9,
        pollinator_value=9,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Tall golden flower spikes in late summer/fall. Critical late-season nectar source.",
        planting_tips="Does NOT cause allergies (that's ragweed). Easy to grow, spreads by rhizomes.",
        tags=["september_critical", "nectar", "perennial"]
    ),
    
    "new_england_aster": Plant(
        common_name="New England Aster",
        scientific_name="Symphyotrichum novae-angliae",
        bloom_seasons=[BloomSeason.EARLY_FALL, BloomSeason.LATE_FALL],
        monarch_value=9,
        pollinator_value=9,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.MODERATE,
        description="Purple-pink daisy-like flowers in fall. One of the last nectar sources of the season.",
        planting_tips="Cut back in early summer for bushier growth. Divide every 3-4 years.",
        tags=["september_critical", "nectar", "perennial"]
    ),
    
    "smooth_aster": Plant(
        common_name="Smooth Blue Aster",
        scientific_name="Symphyotrichum laeve",
        bloom_seasons=[BloomSeason.LATE_SUMMER, BloomSeason.EARLY_FALL],
        monarch_value=8,
        pollinator_value=8,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Blue-purple flowers on smooth stems. More drought tolerant than New England Aster.",
        planting_tips="Native to Utah's dry conditions. Good for xeriscaping.",
        tags=["september_critical", "nectar", "drought_tolerant", "perennial"]
    ),
    
    # MILKWEEDS - HOST PLANTS
    "showy_milkweed": Plant(
        common_name="Showy Milkweed",
        scientific_name="Asclepias speciosa",
        bloom_seasons=[BloomSeason.LATE_SPRING, BloomSeason.EARLY_SUMMER],
        monarch_value=10,
        pollinator_value=8,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.MODERATE,
        description="THE native milkweed for Utah. Large pink flower clusters. Essential host plant for monarch caterpillars.",
        planting_tips="Spreads by rhizomes - give it space. Takes 2-3 years to establish from seed.",
        tags=["host_plant", "milkweed", "monarch_essential", "perennial"]
    ),
    
    "narrowleaf_milkweed": Plant(
        common_name="Narrowleaf Milkweed",
        scientific_name="Asclepias fascicularis",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER],
        monarch_value=10,
        pollinator_value=7,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Narrow leaves, white-pink flowers. More compact than Showy Milkweed.",
        planting_tips="Good for smaller gardens. More drought tolerant than Showy Milkweed.",
        tags=["host_plant", "milkweed", "monarch_essential", "drought_tolerant", "perennial"]
    ),
    
    "swamp_milkweed": Plant(
        common_name="Swamp Milkweed",
        scientific_name="Asclepias incarnata",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER],
        monarch_value=9,
        pollinator_value=8,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.HIGH,
        description="Pink flowers, tolerates wet conditions. Good for rain gardens.",
        planting_tips="Needs consistent moisture. Good near downspouts or low spots.",
        tags=["host_plant", "milkweed", "monarch_essential", "rain_garden", "perennial"]
    ),
    
    # SUMMER BLOOMERS
    "blanket_flower": Plant(
        common_name="Blanket Flower",
        scientific_name="Gaillardia aristata",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER],
        monarch_value=6,
        pollinator_value=8,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Red and yellow daisy-like flowers. Long blooming period.",
        planting_tips="Very drought tolerant. Deadhead for continuous blooms.",
        tags=["nectar", "drought_tolerant", "long_blooming", "perennial"]
    ),
    
    "purple_coneflower": Plant(
        common_name="Purple Coneflower",
        scientific_name="Echinacea purpurea",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER],
        monarch_value=7,
        pollinator_value=9,
        native_to_utah=False,  # Native to eastern US but grows well
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Classic purple coneflower. Excellent for bees and butterflies.",
        planting_tips="Leave seed heads for birds in winter. Drought tolerant once established.",
        tags=["nectar", "drought_tolerant", "perennial"]
    ),
    
    "black_eyed_susan": Plant(
        common_name="Black-eyed Susan",
        scientific_name="Rudbeckia hirta",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER, BloomSeason.EARLY_FALL],
        monarch_value=6,
        pollinator_value=8,
        native_to_utah=False,  # Naturalized
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.MODERATE,
        description="Cheerful yellow flowers with dark centers. Long blooming.",
        planting_tips="Self-seeds readily. Good for mass plantings.",
        tags=["nectar", "long_blooming", "perennial"]
    ),
    
    "bee_balm": Plant(
        common_name="Wild Bergamot / Bee Balm",
        scientific_name="Monarda fistulosa",
        bloom_seasons=[BloomSeason.EARLY_SUMMER, BloomSeason.LATE_SUMMER],
        monarch_value=7,
        pollinator_value=10,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Lavender tubular flowers. Extremely attractive to bees and butterflies.",
        planting_tips="Spreads by rhizomes. Good for naturalizing. Aromatic foliage.",
        tags=["nectar", "native", "perennial", "hummingbird"]
    ),
    
    "penstemon": Plant(
        common_name="Rocky Mountain Penstemon",
        scientific_name="Penstemon strictus",
        bloom_seasons=[BloomSeason.LATE_SPRING, BloomSeason.EARLY_SUMMER],
        monarch_value=5,
        pollinator_value=9,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Striking blue-purple tubular flowers. Utah native.",
        planting_tips="Needs excellent drainage. Don't overwater.",
        tags=["nectar", "native", "drought_tolerant", "perennial", "hummingbird"]
    ),
    
    "lavender": Plant(
        common_name="English Lavender",
        scientific_name="Lavandula angustifolia",
        bloom_seasons=[BloomSeason.LATE_SPRING, BloomSeason.EARLY_SUMMER],
        monarch_value=5,
        pollinator_value=9,
        native_to_utah=False,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Fragrant purple flowers. Excellent for bees.",
        planting_tips="Needs excellent drainage. Don't mulch close to crown.",
        tags=["nectar", "drought_tolerant", "perennial", "fragrant"]
    ),
    
    # SPRING BLOOMERS
    "golden_currant": Plant(
        common_name="Golden Currant",
        scientific_name="Ribes aureum",
        bloom_seasons=[BloomSeason.EARLY_SPRING, BloomSeason.LATE_SPRING],
        monarch_value=3,
        pollinator_value=8,
        native_to_utah=True,
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        description="Early yellow flowers, edible berries. Important early nectar source.",
        planting_tips="Very adaptable shrub. Berries attract birds.",
        tags=["nectar", "native", "shrub", "edible", "early_season"]
    ),
}


# =============================================================================
# UTAH POLLINATORS DATABASE
# =============================================================================

POLLINATORS: Dict[str, Pollinator] = {
    "monarch": Pollinator(
        common_name="Monarch Butterfly",
        scientific_name="Danaus plexippus",
        category="butterfly",
        active_months=[5, 6, 7, 8, 9, 10],
        host_plants=["Milkweed (Asclepias species)"],
        nectar_plants=["Rabbitbrush", "Goldenrod", "Asters", "Milkweed", "Coneflower"],
        description="Iconic orange and black butterfly. Migrates through Utah in September heading to Mexico.",
        identification_tips="Large orange butterfly with black veins. White spots on black wing borders.",
        conservation_status="declining"
    ),
    
    "painted_lady": Pollinator(
        common_name="Painted Lady",
        scientific_name="Vanessa cardui",
        category="butterfly",
        active_months=[4, 5, 6, 7, 8, 9, 10],
        host_plants=["Thistle", "Mallow", "Hollyhock"],
        nectar_plants=["Asters", "Cosmos", "Zinnia", "Rabbitbrush"],
        description="Common orange-brown butterfly with black and white spots.",
        identification_tips="Similar to monarch but smaller, more muted orange, different wing pattern.",
        conservation_status="common"
    ),
    
    "western_tiger_swallowtail": Pollinator(
        common_name="Western Tiger Swallowtail",
        scientific_name="Papilio rutulus",
        category="butterfly",
        active_months=[5, 6, 7, 8, 9],
        host_plants=["Cottonwood", "Willow", "Aspen"],
        nectar_plants=["Milkweed", "Penstemon", "Bee Balm", "Butterfly Bush"],
        description="Large yellow butterfly with black tiger stripes.",
        identification_tips="Very large, bright yellow with black stripes. Distinctive tails on hindwings.",
        conservation_status="common"
    ),
    
    "honeybee": Pollinator(
        common_name="Western Honeybee",
        scientific_name="Apis mellifera",
        category="bee",
        active_months=[3, 4, 5, 6, 7, 8, 9, 10],
        host_plants=[],
        nectar_plants=["Almost anything in bloom"],
        description="Most common bee. Golden-brown with dark stripes.",
        identification_tips="Medium-sized, fuzzy, golden-brown. Often seen carrying pollen on legs.",
        conservation_status="managed"
    ),
    
    "bumblebee": Pollinator(
        common_name="Bumblebee",
        scientific_name="Bombus species",
        category="bee",
        active_months=[3, 4, 5, 6, 7, 8, 9, 10],
        host_plants=[],
        nectar_plants=["Penstemon", "Bee Balm", "Clover", "Lavender"],
        description="Large, fuzzy bee. Several species native to Utah.",
        identification_tips="Large, very fuzzy, black and yellow. Loud buzzing.",
        conservation_status="some species declining"
    ),
    
    "hummingbird": Pollinator(
        common_name="Broad-tailed Hummingbird",
        scientific_name="Selasphorus platycercus",
        category="hummingbird",
        active_months=[4, 5, 6, 7, 8, 9],
        host_plants=[],
        nectar_plants=["Penstemon", "Bee Balm", "Salvia", "Columbine"],
        description="Common Utah hummingbird. Male has rose-red throat.",
        identification_tips="Tiny, iridescent green. Males have bright red throat. Wing trill in flight.",
        conservation_status="common"
    ),
}


# =============================================================================
# SEARCH & QUERY FUNCTIONS
# =============================================================================

def search_plants(
    query: str = None,
    bloom_season: BloomSeason = None,
    min_monarch_value: int = None,
    native_only: bool = False,
    sun: SunRequirement = None,
    water: WaterNeed = None,
    tags: List[str] = None,
) -> List[Plant]:
    """Search plants with filters."""
    results = list(PLANTS.values())
    
    if query:
        query = query.lower()
        results = [p for p in results if 
                   query in p.common_name.lower() or 
                   query in p.scientific_name.lower() or
                   query in p.description.lower()]
    
    if bloom_season:
        results = [p for p in results if bloom_season in p.bloom_seasons]
    
    if min_monarch_value:
        results = [p for p in results if p.monarch_value >= min_monarch_value]
    
    if native_only:
        results = [p for p in results if p.native_to_utah]
    
    if sun:
        results = [p for p in results if p.sun == sun]
    
    if water:
        results = [p for p in results if p.water == water]
    
    if tags:
        results = [p for p in results if any(t in p.tags for t in tags)]
    
    return results


def get_september_critical_plants() -> List[Plant]:
    """Get plants critical for September monarch migration."""
    return search_plants(tags=["september_critical"])


def get_milkweeds() -> List[Plant]:
    """Get all milkweed varieties."""
    return search_plants(tags=["milkweed"])


def search_pollinators(query: str = None, category: str = None, month: int = None) -> List[Pollinator]:
    """Search pollinators."""
    results = list(POLLINATORS.values())
    
    if query:
        query = query.lower()
        results = [p for p in results if
                   query in p.common_name.lower() or
                   query in p.scientific_name.lower()]
    
    if category:
        results = [p for p in results if p.category == category]
    
    if month:
        results = [p for p in results if month in p.active_months]
    
    return results


def validate_species(name: str) -> Optional[Dict]:
    """
    Check if a species name is valid.
    Returns match info or None.
    """
    name_lower = name.lower()
    
    # Check plants
    for key, plant in PLANTS.items():
        if (name_lower in plant.common_name.lower() or 
            name_lower in plant.scientific_name.lower()):
            return {
                "type": "plant",
                "key": key,
                "common_name": plant.common_name,
                "scientific_name": plant.scientific_name,
                "monarch_value": plant.monarch_value,
            }
    
    # Check pollinators
    for key, pollinator in POLLINATORS.items():
        if (name_lower in pollinator.common_name.lower() or
            name_lower in pollinator.scientific_name.lower()):
            return {
                "type": "pollinator",
                "key": key,
                "common_name": pollinator.common_name,
                "scientific_name": pollinator.scientific_name,
            }
    
    return None


def get_planting_recommendations(
    sun: SunRequirement = SunRequirement.FULL_SUN,
    water: WaterNeed = WaterNeed.LOW,
    has_september_gap: bool = True,
) -> Dict:
    """Get personalized planting recommendations."""
    
    recs = {
        "critical": [],
        "recommended": [],
        "nice_to_have": [],
    }
    
    # September critical plants always first
    if has_september_gap:
        sept_plants = get_september_critical_plants()
        for p in sept_plants:
            if p.sun == sun or sun == SunRequirement.FULL_SUN:
                recs["critical"].append({
                    "plant": p.common_name,
                    "reason": "Critical for September monarch migration",
                    "monarch_value": p.monarch_value,
                })
    
    # Milkweeds
    milkweeds = get_milkweeds()
    for m in milkweeds:
        if m.water == water or (water == WaterNeed.MODERATE):
            recs["critical"].append({
                "plant": m.common_name,
                "reason": "Host plant - monarchs lay eggs on milkweed",
                "monarch_value": m.monarch_value,
            })
    
    # Other high-value plants matching conditions
    others = search_plants(min_monarch_value=6, sun=sun, water=water)
    for p in others:
        if p.common_name not in [r["plant"] for r in recs["critical"]]:
            recs["recommended"].append({
                "plant": p.common_name,
                "reason": p.description[:100],
                "monarch_value": p.monarch_value,
            })
    
    return recs


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    print("=" * 50)
    print("Utah Pollinator Species Database")
    print("=" * 50)
    
    print(f"\n📌 {len(PLANTS)} plants in database")
    print(f"🦋 {len(POLLINATORS)} pollinators in database")
    
    print("\n🔴 SEPTEMBER CRITICAL PLANTS:")
    for p in get_september_critical_plants():
        print(f"   - {p.common_name} (Monarch value: {p.monarch_value}/10)")
    
    print("\n🌿 MILKWEEDS:")
    for p in get_milkweeds():
        print(f"   - {p.common_name} ({p.scientific_name})")
    
    print("\n🔍 Validate 'monarch':", validate_species("monarch"))
    print("🔍 Validate 'milkweed':", validate_species("milkweed"))
    print("🔍 Validate 'unknown':", validate_species("unicorn"))
    
    print("\n📋 RECOMMENDATIONS (full sun, low water, September gap):")
    recs = get_planting_recommendations(
        sun=SunRequirement.FULL_SUN,
        water=WaterNeed.LOW,
        has_september_gap=True
    )
    print("   Critical:")
    for r in recs["critical"][:3]:
        print(f"      - {r['plant']}: {r['reason'][:50]}...")

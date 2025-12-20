"""
Utah Pollinator Path - Homeowner Algorithm
==========================================
Tool 1: Competition scoring for residential properties.
"""

import yaml
import os
from typing import Dict, Any, List
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.engine import (ScoringAlgorithm, ScoringFactor, FactorResult, 
                         ScoringResult, Location, HabitatGrade, Recommendation)


class SeptemberZoneFactor(ScoringFactor):
    """Elevation-based September bloom zone scoring."""
    
    def __init__(self, max_pts: float = 30):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "september_zone"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["elevation"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        elev = data.get("elevation", {})
        elevation_ft = elev.get("elevation_ft")
        if elevation_ft is None:
            return FactorResult(name=self.name, raw_value=None, normalized_score=0.0, metadata={"error": "No elevation data"})
        if 5000 <= elevation_ft <= 7000:
            normalized = 1.0
        elif 4500 <= elevation_ft < 5000 or 7000 < elevation_ft <= 7500:
            normalized = 0.75
        elif 4000 <= elevation_ft < 4500 or 7500 < elevation_ft <= 8000:
            normalized = 0.5
        elif 3500 <= elevation_ft < 4000:
            normalized = 0.35
        else:
            normalized = 0.2
        return FactorResult(name=self.name, raw_value=elevation_ft, normalized_score=normalized,
                           metadata={"elevation_ft": elevation_ft, "bloom_zone": elev.get("bloom_zone"),
                                    "in_optimal_range": 5000 <= elevation_ft <= 7000})
    
    def get_recommendations(self, result: FactorResult) -> List[Recommendation]:
        recs = []
        if result.metadata.get("in_optimal_range"):
            recs.append(Recommendation(priority="HIGH", action="Plant narrowleaf milkweed (Asclepias fascicularis)",
                                       reason="Your elevation is perfect for September monarch migration",
                                       impact="+15-20 potential points",
                                       species=["Asclepias fascicularis", "Asclepias incarnata", "Ericameria nauseosa"]))
        return recs


class WaterProximityFactor(ScoringFactor):
    """Score based on nearby water sources."""
    
    def __init__(self, max_pts: float = 25):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "water_proximity"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["water"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        water = data.get("water", {})
        count = water.get("water_count", 0)
        normalized = min(count / 5.0, 1.0)
        return FactorResult(name=self.name, raw_value=count, normalized_score=normalized,
                           metadata={"water_count": count, "water_types": water.get("water_types", {})})
    
    def get_recommendations(self, result: FactorResult) -> List[Recommendation]:
        if result.raw_value == 0:
            return [Recommendation(priority="HIGH", action="Add a shallow water feature",
                                  reason="No natural water detected within 1km", impact="+10-15 potential points")]
        return []


class SeptemberActivityFactor(ScoringFactor):
    """Score based on September pollinator observations."""
    
    def __init__(self, max_pts: float = 20):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "september_activity"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["inaturalist"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        inat = data.get("inaturalist", {})
        sept_obs = inat.get("september_observations", 0)
        total_obs = inat.get("total_observations", 0)
        normalized = min(sept_obs / 15.0, 1.0)
        sept_ratio = sept_obs / total_obs if total_obs > 0 else 0
        return FactorResult(name=self.name, raw_value=sept_obs, normalized_score=normalized,
                           metadata={"september_observations": sept_obs, "total_observations": total_obs,
                                    "september_ratio": round(sept_ratio, 3), "monarch_count": inat.get("monarch_count", 0)})
    
    def get_recommendations(self, result: FactorResult) -> List[Recommendation]:
        if (result.raw_value or 0) < 5:
            return [Recommendation(priority="HIGH", action="Add late-blooming natives",
                                  reason="Low September pollinator activity - critical nectar gap",
                                  impact="+15-20 potential points",
                                  species=["Ericameria nauseosa (Rabbitbrush)", "Symphyotrichum (Asters)", "Solidago (Goldenrod)"])]
        return []


class SolarExposureFactor(ScoringFactor):
    """Score based on estimated solar exposure."""
    
    def __init__(self, max_pts: float = 15):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "solar_exposure"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        location = data.get("_location")
        if not location:
            return FactorResult(name=self.name, raw_value=None, normalized_score=0.5)
        lat = location.lat
        solar_hours = max(5, min(9, 8.0 - abs(lat - 40) * 0.5))
        normalized = min(solar_hours / 7.0, 1.0)
        return FactorResult(name=self.name, raw_value=solar_hours, normalized_score=normalized,
                           metadata={"estimated_solar_hours": round(solar_hours, 1), "latitude": lat})


class SpeciesDiversityFactor(ScoringFactor):
    """Score based on observed pollinator species diversity."""
    
    def __init__(self, max_pts: float = 10):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "species_diversity"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["inaturalist"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        inat = data.get("inaturalist", {})
        species_count = inat.get("species_count", 0)
        normalized = min(species_count / 15.0, 1.0)
        return FactorResult(name=self.name, raw_value=species_count, normalized_score=normalized,
                           metadata={"species_count": species_count, "species_list": inat.get("species_list", [])[:10]})


class HomeownerAlgorithm(ScoringAlgorithm):
    """Homeowner competition scoring algorithm."""
    
    def __init__(self, config: Dict = None):
        self.config = config or self._default_config()
        self._factors = self._create_factors()
    
    def _default_config(self) -> Dict:
        return {
            "factors": {
                "september_zone": {"weight": 0.30, "max_points": 30, "enabled": True},
                "water_proximity": {"weight": 0.25, "max_points": 25, "enabled": True},
                "september_activity": {"weight": 0.20, "max_points": 20, "enabled": True},
                "solar_exposure": {"weight": 0.15, "max_points": 15, "enabled": True},
                "species_diversity": {"weight": 0.10, "max_points": 10, "enabled": True}
            }
        }
    
    def _create_factors(self) -> Dict[str, ScoringFactor]:
        factor_classes = {
            "september_zone": SeptemberZoneFactor,
            "water_proximity": WaterProximityFactor,
            "september_activity": SeptemberActivityFactor,
            "solar_exposure": SolarExposureFactor,
            "species_diversity": SpeciesDiversityFactor
        }
        factors = {}
        for name, cls in factor_classes.items():
            cfg = self.config.get("factors", {}).get(name, {})
            if cfg.get("enabled", True):
                factors[name] = cls(max_pts=cfg.get("max_points", 20))
        return factors
    
    @property
    def name(self) -> str:
        return "homeowner_v1"
    
    @property
    def tool(self) -> str:
        return "homeowner"
    
    def calculate(self, location: Location, data: Dict[str, Any]) -> ScoringResult:
        factor_results = []
        total_weighted = 0.0
        max_possible = 0.0
        all_recommendations = []
        for name, factor in self._factors.items():
            cfg = self.config.get("factors", {}).get(name, {})
            weight = cfg.get("weight", 0.1)
            result = factor.calculate(data)
            result.weight = weight
            result.weighted_score = result.normalized_score * factor.max_points * weight
            factor_results.append(result)
            total_weighted += result.weighted_score
            max_possible += factor.max_points * weight
            all_recommendations.extend(factor.get_recommendations(result))
        percentage = (total_weighted / max_possible * 100) if max_possible > 0 else 0
        grade = HabitatGrade.from_score(percentage)
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}
        all_recommendations.sort(key=lambda r: priority_order.get(r.priority, 99))
        return ScoringResult(location=location, total_score=round(total_weighted, 2),
                            max_possible=round(max_possible, 2), percentage=round(percentage, 1),
                            grade=grade, factors=factor_results, recommendations=all_recommendations,
                            algorithm=self.name, tool=self.tool)


def load_homeowner_config(config_path: str = None) -> Dict:
    if config_path is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "..", "config", "homeowner.yaml")
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    return {}


def create_homeowner_algorithm(config_path: str = None) -> HomeownerAlgorithm:
    config = load_homeowner_config(config_path)
    return HomeownerAlgorithm(config)

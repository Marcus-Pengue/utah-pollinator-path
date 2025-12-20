"""
Utah Pollinator Path - Municipal Algorithm
==========================================
Tool 2: Opportunity Finder for government/activists.
"""

import yaml
import os
from typing import Dict, Any, List
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.engine import (ScoringAlgorithm, ScoringFactor, FactorResult,
                         ScoringResult, Location, HabitatGrade, Recommendation)


class ConnectivityFactor(ScoringFactor):
    """Connectivity index based on proximity to green spaces."""
    
    def __init__(self, max_pts: float = 100):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "connectivity"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["greenspace"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        green = data.get("greenspace", {})
        green_count_500 = green.get("green_count_500m") or green.get("green_count", 0)
        if green_count_500 == 0:
            dist_term = 0.0
        else:
            dist_term = min(green_count_500 / 5.0, 1.0)
        density_term = min(green_count_500 / 10.0, 1.0)
        connectivity_index = 0.5 * dist_term + 0.5 * density_term
        return FactorResult(name=self.name, raw_value=connectivity_index, normalized_score=connectivity_index,
                           metadata={"green_count_500m": green_count_500, "connectivity_index": round(connectivity_index, 3)})


class NeedProxyFactor(ScoringFactor):
    """Habitat deficit based on microclimate."""
    
    def __init__(self, max_pts: float = 100):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "need_proxy"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["greenspace", "built"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        green = data.get("greenspace", {})
        built = data.get("built", {})
        green_250 = green.get("green_count_250m", 0)
        built_250 = built.get("built_count_250m", 0)
        green_term = min(green_250 / 5.0, 1.0)
        built_term = min(built_250 / 8.0, 1.0)
        microclimate_proxy = green_term - built_term
        need_proxy = max(0.0, -microclimate_proxy)
        return FactorResult(name=self.name, raw_value=need_proxy, normalized_score=need_proxy,
                           metadata={"green_count_250m": green_250, "built_count_250m": built_250,
                                    "microclimate_proxy": round(microclimate_proxy, 3), "is_heat_island": microclimate_proxy < 0})


class ROWFeasibilityFactor(ScoringFactor):
    """Rights-of-Way feasibility for intervention."""
    
    def __init__(self, max_pts: float = 100):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "row_feasibility"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["row"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        row = data.get("row", {})
        row_count = row.get("row_count", 0)
        if row_count >= 3:
            normalized = 1.0
        elif row_count >= 1:
            normalized = 0.7
        else:
            normalized = 0.0
        return FactorResult(name=self.name, raw_value=row_count, normalized_score=normalized,
                           metadata={"row_count": row_count, "has_row": row.get("has_row", False),
                                    "row_types": row.get("row_type_list", [])})
    
    def get_recommendations(self, result: FactorResult) -> List[Recommendation]:
        if result.metadata.get("has_row"):
            return [Recommendation(priority="HIGH", 
                                  action=f"Target ROW corridor: {', '.join(result.metadata.get('row_types', []))}",
                                  reason="Rights-of-way present - lower implementation barrier",
                                  impact="High feasibility for linear habitat corridor")]
        return []


class SeptemberGapFactor(ScoringFactor):
    """September nectar availability gap."""
    
    def __init__(self, max_pts: float = 100):
        self._max_points = max_pts
    
    @property
    def name(self) -> str:
        return "september_gap"
    
    @property
    def max_points(self) -> float:
        return self._max_points
    
    @property
    def required_sources(self) -> List[str]:
        return ["inaturalist", "elevation"]
    
    def calculate(self, data: Dict[str, Any]) -> FactorResult:
        inat = data.get("inaturalist", {})
        elev = data.get("elevation", {})
        sept_obs = inat.get("september_observations", 0)
        total_obs = max(inat.get("total_observations", 0), 1)
        in_sept_zone = elev.get("in_september_zone", False)
        sept_ratio = sept_obs / total_obs
        if in_sept_zone and sept_ratio < 0.1:
            gap_score = 1.0
        elif in_sept_zone and sept_ratio < 0.2:
            gap_score = 0.8
        elif sept_ratio < 0.1:
            gap_score = 0.6
        elif sept_ratio < 0.2:
            gap_score = 0.4
        else:
            gap_score = 0.2
        severity = "critical" if gap_score >= 0.8 else "high" if gap_score >= 0.6 else "moderate"
        return FactorResult(name=self.name, raw_value=sept_ratio, normalized_score=gap_score,
                           metadata={"september_ratio": round(sept_ratio, 3), "in_september_zone": in_sept_zone,
                                    "gap_severity": severity})
    
    def get_recommendations(self, result: FactorResult) -> List[Recommendation]:
        if result.metadata.get("gap_severity") in ["critical", "high"]:
            return [Recommendation(priority="HIGH", action="Address September nectar gap",
                                  reason=f"Only {result.metadata.get('september_ratio', 0)*100:.0f}% September activity",
                                  impact="Critical for monarch migration corridor",
                                  species=["Asclepias fascicularis", "Ericameria nauseosa", "Chrysothamnus viscidiflorus"])]
        return []


class MunicipalAlgorithm(ScoringAlgorithm):
    """Municipal opportunity finder algorithm."""
    
    def __init__(self, config: Dict = None):
        self.config = config or self._default_config()
        self._factors = self._create_factors()
    
    def _default_config(self) -> Dict:
        return {
            "factors": {
                "connectivity": {"weight": 0.45, "enabled": True},
                "need_proxy": {"weight": 0.30, "enabled": True},
                "row_feasibility": {"weight": 0.15, "enabled": True},
                "september_gap": {"weight": 0.10, "enabled": True}
            }
        }
    
    def _create_factors(self) -> Dict[str, ScoringFactor]:
        factor_classes = {
            "connectivity": ConnectivityFactor,
            "need_proxy": NeedProxyFactor,
            "row_feasibility": ROWFeasibilityFactor,
            "september_gap": SeptemberGapFactor
        }
        factors = {}
        for name, cls in factor_classes.items():
            cfg = self.config.get("factors", {}).get(name, {})
            if cfg.get("enabled", True):
                factors[name] = cls()
        return factors
    
    @property
    def name(self) -> str:
        return "municipal_v1"
    
    @property
    def tool(self) -> str:
        return "municipal"
    
    def calculate(self, location: Location, data: Dict[str, Any]) -> ScoringResult:
        factor_results = []
        total_weighted = 0.0
        total_weight = 0.0
        all_recommendations = []
        for name, factor in self._factors.items():
            cfg = self.config.get("factors", {}).get(name, {})
            weight = cfg.get("weight", 0.1)
            result = factor.calculate(data)
            result.weight = weight
            result.weighted_score = result.normalized_score * weight
            factor_results.append(result)
            total_weighted += result.weighted_score
            total_weight += weight
            all_recommendations.extend(factor.get_recommendations(result))
        opportunity_score = total_weighted / total_weight if total_weight > 0 else 0
        percentage = opportunity_score * 100
        if percentage >= 70:
            grade = HabitatGrade.A_PLUS
        elif percentage >= 55:
            grade = HabitatGrade.A
        elif percentage >= 40:
            grade = HabitatGrade.B
        elif percentage >= 25:
            grade = HabitatGrade.C
        else:
            grade = HabitatGrade.D
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}
        all_recommendations.sort(key=lambda r: priority_order.get(r.priority, 99))
        return ScoringResult(location=location, total_score=round(opportunity_score, 3),
                            max_possible=1.0, percentage=round(percentage, 1), grade=grade,
                            factors=factor_results, recommendations=all_recommendations,
                            algorithm=self.name, tool=self.tool,
                            metadata={"opportunity_score": round(opportunity_score, 3),
                                     "priority_level": "high" if percentage >= 55 else "medium" if percentage >= 30 else "low"})


def load_municipal_config(config_path: str = None) -> Dict:
    if config_path is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "..", "config", "municipal.yaml")
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    return {}


def create_municipal_algorithm(config_path: str = None) -> MunicipalAlgorithm:
    config = load_municipal_config(config_path)
    return MunicipalAlgorithm(config)

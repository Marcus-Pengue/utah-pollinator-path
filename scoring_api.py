from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import random

app = FastAPI()

# CORS - must be before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoringRequest(BaseModel):
    latitude: float
    longitude: float
    address: str = ""

def score_to_grade(score):
    if score >= 90: return "A+"
    if score >= 85: return "A"
    if score >= 80: return "A-"
    if score >= 77: return "B+"
    if score >= 73: return "B"
    if score >= 70: return "B-"
    if score >= 67: return "C+"
    if score >= 63: return "C"
    if score >= 60: return "C-"
    if score >= 50: return "D"
    return "F"

@app.get("/health")
def health():
    return {"status": "ok", "mode": "mock"}

@app.post("/api/score")
def calculate_score(req: ScoringRequest):
    # Use location to generate consistent "random" scores
    seed = int((req.latitude * 1000 + req.longitude * 1000) % 10000)
    random.seed(seed)
    
    # Generate realistic scores
    act_score = random.randint(5, 20)
    sept_score = random.randint(0, 18)  # Usually low - the September gap!
    conn_score = random.randint(8, 18)
    div_score = random.randint(3, 12)
    bloom_score = random.randint(2, 8)
    
    overall = act_score + sept_score + conn_score + div_score + bloom_score
    
    nearby_obs = random.randint(10, 150)
    species_count = random.randint(5, 35)
    
    return {
        "overall_score": overall,
        "max_score": 100,
        "grade": score_to_grade(overall),
        "factors": {
            "pollinatorActivity": {
                "score": act_score, "max_score": 25,
                "percentage": round(act_score/25*100, 1),
                "details": {"observations_within_radius": nearby_obs, "radius_km": 0.5},
                "recommendations": ["Add flowering plants to attract more pollinators"] if act_score < 15 else []
            },
            "septemberGap": {
                "score": sept_score, "max_score": 30,
                "percentage": round(sept_score/30*100, 1),
                "details": {
                    "september_observations": random.randint(0, 5),
                    "peak_month": "Jul",
                    "peak_observations": random.randint(15, 40),
                    "september_to_peak_ratio": round(sept_score/30*100, 1),
                    "status": "Severe September gap" if sept_score < 12 else "Moderate gap"
                },
                "recommendations": ["🚨 PRIORITY: Plant late-blooming species for September", "Recommended: Rabbitbrush, Goldenrod, Aster, Sedum"] if sept_score < 18 else []
            },
            "connectivity": {
                "score": conn_score, "max_score": 20,
                "percentage": round(conn_score/20*100, 1),
                "details": {"nearest_observation_m": random.randint(50, 400)},
                "recommendations": ["Add stepping-stone plantings"] if conn_score < 12 else []
            },
            "speciesDiversity": {
                "score": div_score, "max_score": 15,
                "percentage": round(div_score/15*100, 1),
                "details": {
                    "unique_species_count": species_count,
                    "sample_species": ["Western Honey Bee", "Painted Lady", "Black-chinned Hummingbird", "Monarch", "Bumblebee"][:min(5, species_count)]
                },
                "recommendations": ["Plant variety of flower shapes"] if div_score < 9 else []
            },
            "bloomCoverage": {
                "score": bloom_score, "max_score": 10,
                "percentage": round(bloom_score/10*100, 1),
                "details": {
                    "active_months": random.randint(3, 9),
                    "monthly_breakdown": {"Jan": 0, "Feb": 0, "Mar": 2, "Apr": 5, "May": 8, "Jun": 12, "Jul": 15, "Aug": 10, "Sep": 2, "Oct": 1, "Nov": 0, "Dec": 0}
                },
                "recommendations": ["Fill bloom gaps in early spring and fall"] if bloom_score < 6 else []
            }
        },
        "top_recommendations": (
            (["🚨 PRIORITY: Plant late-blooming species for September"] if sept_score < 18 else []) +
            (["Add flowering plants to attract pollinators"] if act_score < 15 else []) +
            (["Increase plant diversity"] if div_score < 9 else [])
        )[:3],
        "nearby_observations": nearby_obs,
        "unique_species": species_count,
        "calculated_at": datetime.now().isoformat(),
        "methodology_version": "1.0.0-mock"
    }

if __name__ == "__main__":
    import uvicorn
    print("🐝 BeehiveConnect Scoring API (Mock Mode)")
    print("   Ready at http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

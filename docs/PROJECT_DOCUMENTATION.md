# Utah Pollinator Path - Project Documentation

## Project Overview

**Mission:** Create a scientifically defensible system to improve pollinator habitat along Utah's Wasatch Front corridor, with a focus on the September nectar gap critical for monarch migration.

**North Star Metric:** Actual biological value to insects, measured through evidence-based approaches that don't backfire.

---

## What We're Trying to Solve

### The Core Problem
- Monarchs migrate through Utah in September heading to Mexico
- **84.5% nectar deficit** during peak pollinator activity (your research finding)
- Most gardens lack late-season blooming plants
- No system exists to coordinate distributed habitat creation

### Why Homeowner Yards Matter
- Residential yards can function as "stepping stones" in habitat networks
- Small-scale residential projects avoid major ecological trap risks (research-backed)
- Distributed approach: when one garden fails, pollinators use adjacent habitat
- Lower concentration = lower disease transmission risk

---

## Evidence-Based Scoring System

### Validated Weighting Scheme (From Research Synthesis)

| Factor | Weight | R² with Pollinator Outcomes |
|--------|--------|----------------------------|
| **Floral Resources** | 35% | 0.45-0.75 |
| **Nesting Sites** | 30% | 0.35-0.65 |
| **Connectivity** | 25% | 0.30-0.55 |
| **Habitat Quality** | 15% | Composite |
| **Impervious Surface** | -10% penalty | 0.84 (strongest predictor!) |

### September Critical Finding
Your research: **84.5% nectar deficit in September during PEAK pollinator activity**
- September-blooming plants get 1.5-2× scoring weight
- This is when queens build winter fat reserves
- This is when monarchs need fuel for migration

### Key September-Critical Plants
1. Rubber Rabbitbrush (Ericameria nauseosa) - Monarch value: 10/10
2. Showy Goldenrod (Solidago speciosa) - Monarch value: 9/10
3. New England Aster (Symphyotrichum novae-angliae) - Monarch value: 9/10
4. Smooth Blue Aster (Symphyotrichum laeve) - Monarch value: 8/10

---

## Ecological Trap Risks to Avoid

| Risk | Mitigation |
|------|------------|
| Roadside mortality (26.8 bees/km/day) | Don't recommend roadside plantings |
| Disease spread | Promote distributed, diverse yards |
| Monoculture risk | Score DIVERSITY, not just specific plants |
| Invasive introduction | Utah-native only in species database |
| Overpromising | Honest uncertainty ranges |

---

## Validation Framework Required

1. Establish 20-30 monitoring sites spanning score gradient
2. Conduct standardized surveys (3-5 visits/season, 2-3 years)
3. Calculate correlation between scores and observed pollinators
4. Target R² ≥ 0.60 for model adequacy
5. Document all assumptions transparently

---

## Drone Survey Research (Future)

### What RGB Drones CAN Do
- Map vegetation coverage %
- Detect flowering (bright yellow/purple)
- Calculate impervious surface %

### What RGB Drones CANNOT Do
- Identify specific plant species (76% max accuracy)
- Assess plant health (needs multispectral)
- Distinguish native vs non-native

### Recommendation
User-reported plant inventories are MORE valuable for species-level data than RGB drone imagery. Use drones only for corridor-scale mapping.

---

## System Architecture (Built)

### Backend API
- Live at: https://utah-pollinator-path.onrender.com
- Scoring, leaderboards, observations, species database, admin review

### Database (Supabase)
- profiles, leaderboard_entries, observations tables
- Photo storage bucket

### Key Endpoints
- POST /api/score/homeowner - Property scoring
- POST /api/observations/upload - Photo upload (wildlife/planted)
- GET /api/species/plants/september - Critical fall bloomers
- POST /api/advisor/ask - Claude-powered garden advice

---

## What Still Needs to Be Built

### High Priority
- Implement evidence-based scoring formula
- User plant inventory feature
- Validation monitoring plan

### Medium Priority
- Ward challenges
- Achievement badges
- Polish frontend

### Future
- Drone corridor mapping
- ML flower detection
- Partner nursery API

---

## Open Questions

1. How to verify user-reported plants without site visits at scale?
2. Minimum viable monitoring for scientific defensibility?
3. Score individual yards or neighborhoods?
4. Handle >22% impervious threshold (apartments)?
5. Position on non-native but beneficial plants?

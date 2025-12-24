# Utah Pollinator Path - Master TODO List

## 📊 Current Stats
- **Observations:** 574,264 (local) / 100k sample (deployed)
- **Date Range:** 1871-2025
- **Sources:** iNaturalist + GBIF
- **Taxon Groups:** 8+ (Birds, Insects, Plants, Mammals, Fungi, Arachnids, Reptiles, Amphibians)
- **Registered Gardens:** 14

---

## ✅ COMPLETED

### Core Features (Dec 22, 2025)
- [x] 105k observation cache (1871-2025)
- [x] Timeline with eras, seasons, animation
- [x] Split-view comparison slider
- [x] Garden registration system
- [x] Species search autocomplete
- [x] Overnight collection script
- [x] Government presentation maps
- [x] Heatmap + grid visualization
- [x] Mode-based unified interface (Government/Homeowner/Academic)
- [x] Taxa filter system with visibility toggles
- [x] City filtering with bounding boxes
- [x] iNaturalist account linking and observation sync
- [x] Neighbor Discovery with anonymous messaging
- [x] Admin dashboard (press 'x' 5x, password: xercesblue)
- [x] Verification system for gardens
- [x] Privacy protection for garden locations
- [x] Neighbor recruitment with referral codes

### Session - December 23, 2025
- [x] Garden Planner with 16 Utah native plants
  - [x] Bloom calendar visualization (12 months)
  - [x] Gap detection for missing bloom periods
  - [x] Plant recommendations to fill gaps
  - [x] Filter by type, water needs, native status
- [x] Enhanced Corridor Visualization
  - [x] Species-specific flight ranges (bee: 300m, butterfly: 800m, hummingbird: 1.2km, moth: 500m)
  - [x] Network health statistics panel
  - [x] Hub detection (gardens with 3+ connections)
  - [x] Gap zone identification with clickable ➕ markers
  - [x] Potential corridors (red dashed) vs active corridors (green)
  - [x] Species dropdown selector
- [x] Bloom Tracker with 20 Utah pollinator plants
  - [x] Monthly calendar showing bloom counts
  - [x] Peak bloom indicators with ⭐
  - [x] Filter by pollinator type (bees, butterflies, hummingbirds, moths)
  - [x] Three views: Now Blooming, Coming Soon, Calendar
  - [x] Season guide for Utah
- [x] Seasonal Timeline Animation ("Time Travel")
  - [x] Play/pause animation through months and years
  - [x] Speed control (slow/normal/fast)
  - [x] Month, year, and season modes
  - [x] Observation counts per time period
  - [x] Peak activity indicator
  - [x] Observations filter dynamically as timeline plays
- [x] Achievement Badges System
  - [x] 20+ badges across 5 categories (garden, observations, community, seasonal, special)
  - [x] Bronze/Silver/Gold/Platinum tiers
  - [x] Progress tracking with visual bars
  - [x] Connected to real user data
  - [x] Toast notifications for badge unlocks
- [x] Data collection expanded to 574k observations
- [x] 100k representative sample created for git/deployment
- [x] GBIF collector v2 with error handling

---

## 🔄 IN PROGRESS

### Data Collection
- [ ] GBIF collector running in background
  - Check: `ps aux | grep build_cache_gbif | grep -v grep`
  - Log: `tail -20 data/expanded_cache/collector_v2.log`

---

## 📋 PLANNED FEATURES

### PHASE 1: Foundation & Quick Wins
**Homeowner Mode:**
- [ ] Companion Planting Guide
  - Plant compatibility database
  - Visual matrix showing good/bad combinations
  - Recommendations engine
- [ ] Cost Estimator
  - Plant & materials pricing database
  - Project budget calculator
  - Savings projections
- [ ] Rebate Finder
  - Utah water rebate programs
  - Native plant incentives
  - Application form links

**Academic Mode:**
- [ ] Phenology Tracking
  - Bloom date recording
  - Emergence date tracking
  - Year-over-year comparison charts

**Government Mode:**
- [ ] Endangered Species Tracking
  - Utah listed species database
  - Observation overlap alerts
  - Critical habitat mapping

---

### PHASE 2: Government Analytics
- [ ] Corridor Gap Analysis (enhanced)
  - Identify isolated gardens
  - Calculate optimal new garden locations
  - Priority scoring algorithm
- [ ] Cost-Benefit Reports
  - ROI calculations
  - PDF export with charts
  - Funding justification templates
- [ ] Grant Application Generator
  - Common grant templates
  - Auto-fill from project data
  - Submission tracking

---

### PHASE 3: Map Overlays
- [ ] Zoning Overlay
  - Utah AGRC zoning data
  - Pollinator potential by zone type
  - Development opportunity scoring
- [ ] Urban Heat Island Overlay
  - NASA/USGS temperature data
  - Priority heat zones
  - Correlation with garden locations
- [ ] Green Infrastructure Mapping
  - Bioswales, rain gardens, green roofs
  - Stormwater facility locations
- [ ] Pesticide Use Mapping
  - State ag department data
  - Buffer zone visualization
  - Risk assessment overlay
- [ ] Stormwater Management
  - Pollinator gardens as flood mitigation
  - Runoff reduction calculations
- [ ] Mitigation Banking
  - Track habitat credits/debits
  - Developer offset requirements

---

### PHASE 4: Social & Gamification
- [ ] Neighbor Competitions
  - Block vs block pollinator scores
  - Weekly/monthly challenges
  - Prize/recognition system
- [ ] Photo Contests
  - Monthly themes
  - Voting system
  - Winner showcase
- [ ] Trading Post
  - Swap seeds/cuttings with neighbors
  - Request/offer system
  - Pickup location privacy

---

### PHASE 5: Interactive Tools
- [ ] Garden Layout Planner
  - Drag-and-drop visual garden designer
  - Plant spacing guides
  - Sun/shade mapping
  - Export/print layouts
- [ ] Social Media Auto-Post
  - Share achievements to Facebook/Instagram
  - Auto-generate shareable images

---

### PHASE 6: Advanced Analytics (Academic)
- [ ] Statistical Analysis Tools
  - Data export formats (CSV, JSON, Darwin Core)
  - Basic stats calculations
  - R/Python code snippets
- [ ] Species Distribution Modeling
  - Climate envelope matching
  - Habitat suitability scores
  - Range prediction maps
- [ ] Population Trend Analysis
  - Long-term species trajectories
  - Trend significance testing
- [ ] Occupancy Modeling
  - Detection probability calculations
  - Site occupancy estimates
- [ ] Genetic Connectivity Modeling
  - Gene flow between populations
  - Corridor effectiveness metrics

---

### PHASE 7: Cutting Edge
- [ ] AR Garden Preview
  - See how plants will look in your yard
  - AR.js or 8th Wall integration
- [ ] Smart Irrigation Sync
  - Rachio/Hunter integration
  - Water schedule optimization

---

## 📊 DATA TO ACQUIRE

### Phase 1 (Create/Research):
- [ ] Companion planting matrix
- [ ] Utah native plant pricing (from nurseries)
- [ ] Utah water rebate programs (from utilities)
- [ ] Utah endangered species list (USFWS)

### Phase 2-3 (Download/Request):
- [ ] Utah zoning GIS data (AGRC - free)
- [ ] Urban heat island data (NASA ECOSTRESS)
- [ ] Green infrastructure locations (municipalities)
- [ ] Pesticide use data (Utah Dept of Ag)
- [ ] Stormwater facilities (local GIS)

### Phase 6 (Scientific):
- [ ] Historical climate data (PRISM)
- [ ] Terrain data (USGS NED)
- [ ] Soil data (SSURGO)

---

## 🐛 KNOWN ISSUES

- [ ] Large cache files (180MB) excluded from git - using 100k sample for deployment
- [ ] GBIF API has 100k offset limit per taxon
- [ ] Render deployment needs sample file fallback (implemented)

---

## 📝 QUICK REFERENCE

### Commands
```bash
# Check collector status
ps aux | grep build_cache_gbif | grep -v grep
tail -20 data/expanded_cache/collector_v2.log

# Check observation counts
python3 -c "import json; d=json.load(open('static/wildlife_cache.json')); print(f'Total: {len(d[\"features\"]):,}')"

# Start collector
python3 -u build_cache_gbif_v2.py 2>&1 | tee data/expanded_cache/collector_v2.log &

# Admin access
# Press 'x' 5 times, password: xercesblue
```

### Deployment
- **Backend:** https://utah-pollinator-path.onrender.com
- **Frontend:** localhost:3000 (dev)
- **GitHub:** https://github.com/Marcus-Pengue/utah-pollinator-path

### Key Files
- `frontend/src/components/DiscoveryMap.tsx` - Main map
- `frontend/src/components/UserDashboard.tsx` - Homeowner dashboard
- `frontend/src/components/UnifiedInterface.tsx` - Mode controls
- `frontend/src/components/GardenPlanner.tsx` - Plant planner
- `frontend/src/components/BloomTracker.tsx` - Bloom calendar
- `frontend/src/components/SeasonalTimeline.tsx` - Time travel
- `frontend/src/components/AchievementBadges.tsx` - Badges system
- `frontend/src/components/CorridorVisualization.tsx` - Corridor network

---

*Last updated: December 23, 2025 @ 9:45 PM MST*

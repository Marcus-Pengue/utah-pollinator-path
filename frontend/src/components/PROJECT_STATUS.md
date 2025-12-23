# Utah Pollinator Path - Project Status
**Last Updated:** December 23, 2025

## 🎯 Project Overview
A community science platform mapping pollinator corridors along Utah's Wasatch Front, enabling homeowners to register gardens, track habitat connectivity, and contribute to conservation efforts.

**Live Demo:** https://utah-pollinator-path.onrender.com
**GitHub:** https://github.com/Marcus-Pengue/utah-pollinator-path

---

## ✅ COMPLETED FEATURES

### Data Collection & Processing
- [x] iNaturalist API integration (200k+ observations)
- [x] GBIF historical data (1871-2025)
- [x] **311k observations** in current dataset
- [x] **Expanded collection running** (targeting 500k-1M)
- [x] Deduplication pipeline
- [x] Salt Lake County subset for web performance (60k obs)
- [x] Compressed downloads (GeoJSON.gz, CSV.gz)

### Map Interface
- [x] Mapbox GL JS integration
- [x] Wildlife observation points with clustering
- [x] 8 taxa filters (Birds, Insects, Plants, Mammals, etc.)
- [x] Species search with autocomplete
- [x] Grid/points view toggle
- [x] Opportunity zones layer (40 sample locations)
- [x] Press [H] to hide/show control panel

### Garden Registration System
- [x] **Xerces Society scoring methodology**
  - 35% Floral resources
  - 30% Nesting sites
  - 20% Connectivity
  - 15% Habitat quality
- [x] **Fall bloomer priority** (84.5% September deficit addressed)
- [x] Live score calculation as user selects options
- [x] Certification tiers (Seedling → Champion)
- [x] Size multipliers (1x, 1.5x, 2x)
- [x] Plant species with point values
- [x] Nesting/habitat features

### Connectivity Scoring
- [x] Distance calculations (Haversine)
- [x] Nearby garden detection (500m radius)
- [x] Opportunity zone proximity bonus
- [x] Gap filler bonus (+40 pts)
- [x] Network effect bonus (+15-30 pts)
- [x] Pioneer bonus (+20 pts for first in area)
- [x] Property observation stats

### iNaturalist Integration
- [x] Username-based sync
- [x] **500m property radius restriction**
- [x] Only user's own observations count
- [x] Research grade bonus
- [x] Species diversity bonus
- [x] Photo thumbnails in sync results

### Privacy Protection
- [x] Anonymous garden IDs (UPP-XXXXXX)
- [x] Location offset (~50m) on public map
- [x] No names/emails shown publicly
- [x] Clear privacy notice in registration
- [x] "Utah Pollinator Path" attribution (not usernames)

### Export & Sharing
- [x] Current view export (GeoJSON, CSV)
- [x] Full dataset download (311k obs)
- [x] Copy link sharing
- [x] Native mobile share
- [x] Twitter/Facebook share buttons
- [x] Floating action buttons (Export, Share)

### Xerces Report Generation
- [x] HTML report (printable)
- [x] Plain text report
- [x] Score breakdown
- [x] Plant inventory
- [x] Improvement recommendations
- [x] Xerces submission links

### Neighbor Recruitment
- [x] Referral code generation
- [x] Invite link sharing
- [x] Email invite template
- [x] Referral tracking in backend
- [x] Bonus point structure:
  - First neighbor: +50 pts
  - Each additional: +25 pts
  - Cluster bonus (5+): +100 pts
  - Champion referral: +50 pts
- [x] Nearby gardens list (anonymized)
- [x] Cluster progress bar

### Backend API
- [x] Flask server on Render
- [x] GET/POST /api/gardens
- [x] Anonymized public garden data
- [x] /api/downloads/full-json, /api/downloads/full-csv
- [x] /api/downloads/info (metadata)
- [x] /api/referral endpoints
- [x] /api/gardens/nearby
- [x] /api/gardens/export/csv (Xerces format)

---

## 🔄 IN PROGRESS

### Expanded Data Collection
- [ ] Running: `collect_all_expanded.py`
- [ ] 16 taxa groups (vs original 8)
- [ ] Year-by-year pagination (bypasses 10k limit)
- [ ] Target: 500k-1M observations
- [ ] ETA: Several hours

---

## 📋 TODO - HIGH PRIORITY

### Admin/Internal Tools
- [ ] **Garden admin CSV export** (all garden data for internal use)
- [ ] Weekly automated Xerces report email
- [ ] Garden moderation/verification queue
- [ ] Admin dashboard

### Garden Features
- [ ] Photo upload for garden verification
- [ ] Edit/update registered garden
- [ ] Delete garden option
- [ ] Garden profile page
- [ ] Year-over-year tracking

### Connectivity Model
- [ ] Validate opportunity zone model
- [ ] Real connectivity index calculation
- [ ] Corridor visualization on map
- [ ] Heat map of habitat gaps

### User Accounts (Future)
- [ ] Authentication system
- [ ] User dashboard
- [ ] Garden ownership verification
- [ ] Email verification

---

## 📋 TODO - MEDIUM PRIORITY

### UI/UX Improvements
- [ ] Mobile responsive design
- [ ] Loading states/spinners
- [ ] Error handling improvements
- [ ] Tooltips for scoring
- [ ] Onboarding tour

### Leaderboard
- [ ] Real garden data integration
- [ ] City rankings by total score
- [ ] Neighborhood clusters
- [ ] Monthly/seasonal updates

### Data Quality
- [ ] Observation quality filtering
- [ ] Duplicate detection improvements
- [ ] Data freshness indicator
- [ ] Incremental updates (not full refresh)

---

## 📋 TODO - LOW PRIORITY / FUTURE

### Integrations
- [ ] eBird data integration
- [ ] Utah Native Plant Society partnership
- [ ] Bee City USA connection
- [ ] School/community group features

### Advanced Features
- [ ] Phenology calendar (bloom times)
- [ ] Species recommendation engine
- [ ] Garden design templates
- [ ] Native plant nursery locator
- [ ] Weather/climate integration

### Expansion
- [ ] Other Utah regions (beyond Wasatch Front)
- [ ] Multi-state support
- [ ] API for third-party apps

---

## 🐛 KNOWN ISSUES

1. ~~Gardens 404 error~~ - Silenced (endpoint now exists)
2. Large files can't push to GitHub (using .gitignore)
3. Full dataset downloads require backend deployment verification

---

## 📊 METRICS

| Metric | Value |
|--------|-------|
| Wildlife Observations | 311,039 (expanding to 500k+) |
| Taxa Groups | 8 (expanding to 16) |
| Date Range | 1871-2025 |
| Gardens Registered | TBD (new feature) |
| Download Size (JSON.gz) | ~10 MB |
| Download Size (CSV.gz) | ~5 MB |

---

## 🔧 TECH STACK

- **Frontend:** React, TypeScript, Mapbox GL JS
- **Backend:** Flask (Python)
- **Hosting:** Render
- **Data Sources:** iNaturalist, GBIF
- **Methodology:** Xerces Society habitat assessment

---

## 📁 KEY FILES
```
utah-pollinator-path/
├── frontend/src/components/
│   ├── DiscoveryMap.tsx        # Main map component
│   ├── GardenRegistration.tsx  # Registration with Xerces scoring
│   ├── ConnectivityScoring.tsx # Distance/bonus calculations
│   ├── INaturalistSync.tsx     # iNat sync feature
│   ├── NeighborRecruitment.tsx # Referral system
│   ├── QuickActions.tsx        # Export/Share buttons
│   ├── XercesReportGenerator.tsx
│   └── PrivacyUtils.tsx
├── src/
│   ├── api.py                  # Flask backend
│   └── static/
│       ├── wildlife_cache.json # 60k observations
│       ├── gardens.json        # Registered gardens
│       └── downloads/          # Compressed datasets
├── data/
│   ├── full_cache/             # 311k observations
│   └── expanded_cache/         # New collection (in progress)
└── scripts/
    └── regenerate_downloads.py
```

---

## 🚀 NEXT SESSION PRIORITIES

1. Verify expanded data collection completes
2. Update wildlife_cache.json with new data
3. Add admin garden CSV export
4. Mobile responsive fixes
5. Test full registration → referral flow

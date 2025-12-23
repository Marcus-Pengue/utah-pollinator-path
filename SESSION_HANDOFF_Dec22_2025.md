# Utah Pollinator Path - Session Handoff
**Date:** December 22, 2025
**Last Session End:** ~10:30 PM MST

---

## Project Overview

**Goal:** Build a pollinator corridor tracking platform for Utah's Wasatch Front, connecting homeowner gardens to create habitat pathways for monarchs and other pollinators migrating to Mexico.

**Live URLs:**
- Backend API: https://utah-pollinator-path.onrender.com
- Frontend: http://localhost:3000 (not yet deployed publicly)
- GitHub: https://github.com/Marcus-Pengue/utah-pollinator-path

---

## User Preferences & Workflows

### Marcus's Preferences
1. **Iterative development** - Build features incrementally, test locally, then commit
2. **Python for complex edits** - Use Python scripts for multi-line file modifications (sed can be unreliable)
3. **Commit frequently** - After each working feature
4. **Visual feedback** - Prefers UI elements that show counts, stats, progress
5. **Data-driven** - Values comprehensive datasets (went from 20k → 105k observations)
6. **Practical features** - Government presentation maps, comparison tools, garden registration

### Development Workflow
1. Make changes to code
2. Hard refresh browser (Cmd+Shift+R) to test
3. Check for console errors
4. Commit when working: `git add . && git commit -m "message" && git push origin main`
5. Render auto-deploys backend on push

### File Structure Preferences
- Backend API runs from `src/api.py` (not app.py)
- Frontend in `frontend/` directory
- Static files (cache) in `src/static/`
- Build scripts in project root

---

## Current Technical State

### Backend (Flask on Render)
```
src/
├── api.py              # Main Flask app - ALL routes here
├── gardens_api.py      # Garden registration blueprint
├── static/
│   └── wildlife_cache.json  # 105k observations (43MB)
└── data/
    └── gardens.json    # Registered gardens
```

**Key Endpoints:**
- `GET /api/wildlife/cached` - Returns 105k cached observations
- `GET /api/wildlife/cached/stats` - Cache metadata
- `POST /api/gardens` - Register a garden
- `GET /api/gardens` - Get all gardens (GeoJSON)

### Frontend (React + Mapbox)
```
frontend/src/components/
├── DiscoveryMap.tsx       # Main map component (~600 lines)
├── GardenRegistration.tsx # Garden signup modal
└── SpeciesSearch.tsx      # Species autocomplete search
```

**Key Features Implemented:**
1. **Heatmap visualization** - Green-yellow-red density
2. **Grid view** - Clickable cells with observation counts
3. **Timeline** - Year slider, play/pause animation, seasons
4. **Compare mode** - Split-view slider, presets (100 Years, Historic, etc.)
5. **Garden registration** - Click map, select plants/features
6. **Species search** - Autocomplete, filter map, fly-to location

### Data Sources
- **iNaturalist API** - 73,045 observations (2016-2025)
- **GBIF API** - 32,602 museum records (1871-2025)
- **Combined** - 105,647 unique observations spanning 154 years

---

## Overnight Task Running

**Script:** `collect_all_observations.py`
**Command:** `caffeinate -i python3 collect_all_observations.py`

**What it does:**
- Collects ALL Utah observations (entire state, not just SLC)
- Sources: iNaturalist + GBIF
- Saves checkpoints per taxon (can resume if interrupted)
- Deduplicates by location + date
- Expected output: 500k-2M observations
- Output: `data/full_cache/utah_full_cache.json`

**After completion:**
1. Check `data/full_cache/collection.log` for results
2. Replace `src/static/wildlife_cache.json` with new cache
3. Commit and push to deploy

---

## Updated TODO List

### Immediate (Next Session)
- [ ] Check overnight collection results
- [ ] Deploy frontend to Vercel (get public URL)
- [ ] Test species search with more data
- [ ] Add loading indicator during species filter

### Short Term
- [ ] Export data button (CSV/GeoJSON download)
- [ ] Garden leaderboard / gamification
- [ ] Mobile-responsive design improvements
- [ ] User accounts for garden management

### Medium Term
- [ ] Corridor analysis visualization (connect gardens)
- [ ] Seasonal migration animation
- [ ] Plant recommendations based on location
- [ ] Integration with local nurseries

### Long Term
- [ ] Government analytics dashboard
- [ ] School/community garden programs
- [ ] Real-time observation submissions
- [ ] Native app (React Native)

### Completed This Session ✅
- [x] Timeline improvements (era, seasons, speed)
- [x] Split-view comparison slider
- [x] Garden registration system
- [x] Species search with autocomplete
- [x] Overnight collection script
- [x] Fixed deployment issues (cache routes)

---

## Key Code Patterns

### Adding new state to DiscoveryMap
```typescript
const [newFeature, setNewFeature] = useState<Type>(initial);
```

### Adding filter logic
```typescript
// In filterAll() or filterByYear() functions
if (newFilter) {
  const value = props.someField;
  if (!matchesFilter(value)) return false;
}
```

### Python file edits (preferred method)
```python
python3 << 'PYEOF'
with open('file.tsx', 'r') as f:
    content = f.read()
content = content.replace('old', 'new')
with open('file.tsx', 'w') as f:
    f.write(content)
PYEOF
```

---

## Environment Notes

- **Node:** v18+ required
- **Python:** 3.x with requests library
- **Mapbox Token:** In `frontend/.env` as `REACT_APP_MAPBOX_TOKEN`
- **Render:** Auto-deploys from main branch, free tier (60s timeout)

---

## Session Context for AI

When continuing this project:
1. Always check if frontend is running (`npm start` in frontend/)
2. Backend changes require push to deploy on Render
3. Large file edits → use Python, not sed
4. User prefers concise responses with clear next steps
5. Test locally before committing
6. The main map component is large (~600 lines) - make targeted edits

---

## Recent Git History
```
36f19bb Fix handleFlyTo function placement
a8ad721 Add species search with autocomplete, fly-to, and filtering
16844e1 Add homeowner garden registration
5184c97 Fix comparison presets, dynamic labels, split-view slider
7343cca Add split-view comparison slider with clip-path masking
e50e8ff Add wildlife cache routes to api.py and copy cache to src/static
```

---

*Generated: Dec 22, 2025 ~10:30 PM*

# Utah Pollinator Path - Master TODO & Implementation Plan

**Last Updated:** December 21, 2025
**Status:** Homeowner Backend Engine Complete ✅

---

## 🎯 Project Overview

Two-sided platform connecting:
1. **Homeowners** - Track plants, earn scores, join challenges, build habitat network
2. **Government** - Monitor program adoption, identify priority areas, measure outcomes

---

## ✅ COMPLETED - Homeowner Backend Engine

### Core Scoring
- [x] Evidence-based scoring v2 (ESTIMAP R²=0.80, InVEST R²=0.65-0.80)
- [x] September weighting (84.5% nectar deficit finding)
- [x] Pioneer bonus for early adopters
- [x] Impervious surface penalty (Berlin study R²=0.84)
- [x] Dynamic model versioning for validation

### Data Management
- [x] Plant inventory API + species database
- [x] Habitat assessments (Xerces Society compatible)
- [x] Score persistence + history tracking
- [x] Event logging for analytics

### Gamification
- [x] Achievement badges (14 badges, auto-award triggers)
- [x] Ward challenges with templates
- [x] Auto-contribute to challenges on plant add/observation
- [x] Referral system → connectivity points

### Infrastructure
- [x] Admin authentication (API key)
- [x] Stats/export endpoints
- [x] Scheduled jobs engine (expire challenges, seasonal alerts)
- [x] API test harness (39 tests passing)

---

## 🏗️ IN PROGRESS - Government Backend Engine

### Priority Analysis
- [ ] Grid-based coverage analysis
- [ ] Priority area identification (low adoption + high potential)
- [ ] Ward/city aggregation stats
- [ ] Connectivity gap analysis

### Reporting
- [ ] Program adoption metrics by area
- [ ] Temporal trends (month-over-month growth)
- [ ] Challenge effectiveness analytics
- [ ] Export for council presentations

### Management Tools
- [ ] Bulk participant management
- [ ] Challenge creation for wards
- [ ] Observation review queue
- [ ] Alert broadcast to areas

### Maps & Visualization Data
- [ ] GeoJSON export for mapping
- [ ] Heat map data (adoption density)
- [ ] Corridor analysis (connectivity paths)
- [ ] Before/after comparison data

---

## 📱 TODO - Frontend (After Backend Complete)

### Homeowner UI
- [ ] Landing page (polished, clear value prop)
- [ ] Onboarding flow (signup → location → first plant)
- [ ] Garden inventory management
- [ ] Score dashboard with breakdown
- [ ] Habitat assessment questionnaire
- [ ] Challenges list + join/progress
- [ ] Badges showcase
- [ ] Neighbor invite sharing
- [ ] Alerts/notifications center
- [ ] Profile/settings

### Government UI
- [ ] Admin dashboard (key metrics at glance)
- [ ] Geographic view (map with adoption overlay)
- [ ] Priority areas list with actions
- [ ] Ward/city drill-down reports
- [ ] Challenge management console
- [ ] Observation review interface
- [ ] Export/report generator
- [ ] Settings/configuration

---

## 🎤 Government Pitch Materials

### Demo Flow
1. Show current Murray adoption stats
2. Demo homeowner signup → plant add → score
3. Show neighborhood connectivity building
4. Display challenge engagement
5. Show government dashboard with insights
6. Present priority area recommendations

### Key Metrics to Show
- Households participating
- Total plants logged
- Native species diversity
- Fall bloomer coverage %
- Estimated pollinator habitat sq ft
- Connectivity score by ward

### Presentation Assets
- [ ] One-page program summary PDF
- [ ] Stats dashboard screenshot/export
- [ ] Before/after scenario visualization
- [ ] ROI calculation (cost vs habitat created)
- [ ] Comparison to traditional programs

---

## 🔧 Infrastructure TODO

### Cron/Automation
- [ ] GitHub Actions for daily jobs
- [ ] Auto-expire challenges
- [ ] Send seasonal reminders
- [ ] Weekly stats email to admins

### Notifications
- [ ] Email service integration (SendGrid/Resend)
- [ ] Welcome email on signup
- [ ] Badge earned notifications
- [ ] Challenge milestone alerts
- [ ] Seasonal action reminders

### Data Quality
- [ ] Input validation schemas
- [ ] Rate limiting on public endpoints
- [ ] Error tracking (Sentry)
- [ ] Backup automation

---

## 📊 Model Validation Plan

### Data Collection
1. Gather habitat assessments (structured input data)
2. Link to actual pollinator observations
3. Track score predictions vs observed biodiversity

### Validation Metrics
- Correlation: predicted score vs observed species count
- Calibration: do 80-score properties have more pollinators than 50-score?
- Component validation: does fall bloom weight predict monarch presence?

### Iteration
- Export validation dataset: `/api/assessments/export/validation`
- Analyze correlation in Python/R
- Adjust weights in `scoring_config.py`
- Track model version in all scores

---

## 🗓️ Timeline

### Week 1 (Current)
- [x] Complete homeowner backend
- [ ] Build government backend engine
- [ ] Create basic UI for demo

### Week 2
- [ ] Polish demo flow
- [ ] Prepare pitch materials
- [ ] Government meeting prep

### Week 3+
- [ ] Iterate based on feedback
- [ ] Soft launch with test neighborhood
- [ ] Collect validation data

---

## 📁 File Structure
```
utah-pollinator-path/
├── src/
│   ├── api.py                 # Main Flask app
│   ├── scoring_v2.py          # Evidence-based scoring
│   ├── scoring_config.py      # Dynamic weights
│   ├── inventory_api.py       # Plant management
│   ├── assessments_api.py     # Habitat assessments
│   ├── challenges_api.py      # Ward challenges
│   ├── badges_api.py          # Achievement system
│   ├── referrals_api.py       # Neighbor invites
│   ├── connectivity_engine.py # Network analysis
│   ├── score_engine.py        # Score persistence
│   ├── badge_engine.py        # Auto-award logic
│   ├── challenge_hooks.py     # Auto-contribute
│   ├── jobs_engine.py         # Scheduled tasks
│   ├── event_logger.py        # Analytics
│   ├── stats_api.py           # System stats
│   ├── admin_auth.py          # Security
│   ├── government_api.py      # [TODO] Government endpoints
│   └── static/                # Frontend files
├── tests/
│   └── test_api.py            # API test harness
├── TODO.md                    # This file
└── README.md
```

---

## 🔗 Live URLs

- **API Base:** https://utah-pollinator-path.onrender.com
- **Health:** https://utah-pollinator-path.onrender.com/health
- **Methodology:** https://utah-pollinator-path.onrender.com/api/scoring/methodology
- **Stats:** https://utah-pollinator-path.onrender.com/api/stats

---

## 📝 Notes

- Admin API Key stored in Render environment variables
- Supabase handles auth and database
- All scores track model version for validation
- Xerces-compatible export for potential certification tie-in

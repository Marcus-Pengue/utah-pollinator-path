# Utah Pollinator Path - iNaturalist Photo Proxy

## Problem
Current iNaturalist flow has too much friction:
1. Download app
2. Create account
3. Learn interface
4. Take photo
5. Add location
6. Submit
7. Wait for ID

**Result:** Only dedicated naturalists participate.

## Solution: Zero-Friction Proxy

User snaps photo → We handle everything else.
```
User sees butterfly
    ↓
Opens app, taps camera
    ↓
Snaps photo
    ↓
Confirms location (auto-detected)
    ↓
Done. 10 seconds.
```

## Architecture
```
┌──────────────────────────────────────────────┐
│  USER: Photo + GPS + Timestamp + Name        │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  POLLINATOR PATH API                         │
│  - Store photo (Supabase)                    │
│  - Validate GPS                              │
│  - Queue for upload                          │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  UPLOAD QUEUE (Daily Cron)                   │
│  - Batch upload to iNaturalist               │
│  - Credit observer in description            │
│  - Tag: utah-pollinator-path                 │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  FEEDBACK LOOP                               │
│  - Poll for community confirmations          │
│  - Notify user: "Your butterfly = Monarch!"  │
│  - Update user stats                         │
└──────────────────────────────────────────────┘
```

## Database Schema
```sql
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_url TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    observer_name TEXT,
    observer_email TEXT,
    species_guess TEXT,
    status TEXT DEFAULT 'pending',  -- pending, uploaded, confirmed
    inat_observation_id INTEGER,
    inat_confirmed_taxon TEXT,
    grid_hash TEXT
);
```

## API Endpoints

### POST /api/observations/upload
```json
{
  "photo": "<base64>",
  "latitude": 40.6655,
  "longitude": -111.8965,
  "observed_at": "2025-09-15T14:30:00Z",
  "observer_name": "John Smith"
}
```

Response:
```json
{
  "id": "uuid",
  "status": "pending",
  "message": "Photo received! We'll notify you when confirmed."
}
```

### GET /api/observations/mine
```json
{
  "observations": [...],
  "stats": {
    "total": 12,
    "confirmed": 8,
    "species_count": 6
  }
}
```

## iNaturalist Upload Template
```
Description:
  Observed by {name} via Utah Pollinator Path app.
  Location: {city}, Utah
  
  Submitted through Utah Pollinator Path community science.
  Learn more: utahpollinatorpath.com

Tags:
  - utah-pollinator-path
  - proxy-upload
  - wasatch-front
```

## Implementation Phases

### Phase 1: MVP (2 weeks)
- Basic photo upload endpoint
- Supabase storage
- Manual weekly batch upload
- Email on confirmation

### Phase 2: Automation (2 weeks)
- Daily cron job uploads
- Automatic confirmation polling
- User dashboard

### Phase 3: Enhancement (4 weeks)
- Species pre-ID with iNat CV
- Push notifications
- Scoring integration (bonus points)

## Costs

| Service | Monthly |
|---------|---------|
| Supabase (MVP) | $0 |
| iNaturalist API | $0 |
| Hosting (Render) | $0 |
| **Total MVP** | **$0** |

At scale (10k obs/month): ~$32/month

## Success Metrics

| Metric | Year 1 Target |
|--------|---------------|
| Photos submitted | 5,000 |
| Unique observers | 500 |
| Research-grade rate | 60% |
| September observations | 2,000 |
| Time to submit | <15 seconds |

*Created: December 20, 2025*

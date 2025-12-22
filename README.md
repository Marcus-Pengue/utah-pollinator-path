# Utah Pollinator Path

Modular scoring engine for pollinator habitat assessment.

## Quick Start
```bash
source venv/bin/activate
cd src && PORT=5001 python api.py
```

## Test
```bash
curl -X POST http://localhost:5001/api/score/homeowner \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.6655, "lng": -111.8965}'
```

## Two Tools
- **Homeowner**: Competition scoring (100-point scale)
- **Municipal**: Intervention prioritization (opportunity score)

## Key Discovery
September is peak pollinator month in Utah (90 butterfly + 108 bee observations vs 3-4 in summer).
# Rebuild trigger Sun Dec 21 16:28:37 MST 2025
# External data Sun Dec 21 17:35:32 MST 2025

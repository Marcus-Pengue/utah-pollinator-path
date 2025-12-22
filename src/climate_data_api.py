"""
Climate Data API
================
Historical and current climate data from Open-Meteo (free, no API key).
"""

import aiohttp
import asyncio
import ssl
import certifi
from flask import request, jsonify
from datetime import datetime, timedelta

OPEN_METEO_BASE = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_CURRENT = "https://api.open-meteo.com/v1/forecast"


async def fetch_historical_climate(lat, lng, start_date, end_date):
    """
    Fetch historical daily climate data.
    Available: 1940-present
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum,snowfall_sum",
        "temperature_unit": "fahrenheit",
        "precipitation_unit": "inch",
        "timezone": "America/Denver"
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(OPEN_METEO_BASE, params=params, ssl=ssl_ctx, timeout=30) as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception as e:
        print(f"Climate API error: {e}")
    return None


async def fetch_current_weather(lat, lng):
    """Fetch current conditions and 7-day forecast."""
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        "temperature_unit": "fahrenheit",
        "precipitation_unit": "inch",
        "timezone": "America/Denver",
        "forecast_days": 7
    }
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(OPEN_METEO_CURRENT, params=params, ssl=ssl_ctx, timeout=15) as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception as e:
        print(f"Weather API error: {e}")
    return None


def calculate_growing_degree_days(daily_data, base_temp=50):
    """
    Calculate Growing Degree Days (GDD).
    GDD = ((Tmax + Tmin) / 2) - base_temp
    Used to predict plant/insect development.
    """
    if not daily_data:
        return []
    
    gdd_values = []
    cumulative = 0
    
    dates = daily_data.get("time", [])
    tmax = daily_data.get("temperature_2m_max", [])
    tmin = daily_data.get("temperature_2m_min", [])
    
    for i, date in enumerate(dates):
        if i < len(tmax) and i < len(tmin) and tmax[i] and tmin[i]:
            avg = (tmax[i] + tmin[i]) / 2
            gdd = max(0, avg - base_temp)
            cumulative += gdd
            gdd_values.append({
                "date": date,
                "daily_gdd": round(gdd, 1),
                "cumulative_gdd": round(cumulative, 1)
            })
    
    return gdd_values


def analyze_frost_dates(daily_data):
    """Find last spring frost and first fall frost."""
    if not daily_data:
        return None
    
    dates = daily_data.get("time", [])
    tmin = daily_data.get("temperature_2m_min", [])
    
    last_spring_frost = None
    first_fall_frost = None
    
    for i, date in enumerate(dates):
        if i >= len(tmin) or tmin[i] is None:
            continue
            
        month = int(date[5:7])
        
        # Spring: Jan-Jun, find last frost
        if month <= 6 and tmin[i] <= 32:
            last_spring_frost = date
        
        # Fall: Jul-Dec, find first frost
        if month >= 7 and tmin[i] <= 32 and first_fall_frost is None:
            first_fall_frost = date
    
    return {
        "last_spring_frost": last_spring_frost,
        "first_fall_frost": first_fall_frost,
    }


def get_pollinator_conditions(current_data):
    """Assess current conditions for pollinator activity."""
    if not current_data or "current" not in current_data:
        return None
    
    current = current_data["current"]
    temp = current.get("temperature_2m", 0)
    humidity = current.get("relative_humidity_2m", 0)
    wind = current.get("wind_speed_10m", 0)
    precip = current.get("precipitation", 0)
    
    # Pollinator activity scoring
    score = 100
    notes = []
    
    # Temperature (optimal: 60-85°F)
    if temp < 50:
        score -= 40
        notes.append("Too cold for most pollinators")
    elif temp < 60:
        score -= 20
        notes.append("Cool - reduced activity")
    elif temp > 95:
        score -= 30
        notes.append("Too hot - pollinators seeking shade")
    elif temp > 85:
        score -= 10
        notes.append("Warm - peak afternoon activity reduced")
    else:
        notes.append("Ideal temperature for pollinators")
    
    # Wind (optimal: < 10 mph)
    if wind > 20:
        score -= 30
        notes.append("High winds - bees grounded")
    elif wind > 15:
        score -= 15
        notes.append("Windy - reduced flight activity")
    elif wind > 10:
        score -= 5
    
    # Precipitation
    if precip > 0:
        score -= 25
        notes.append("Rain - pollinators sheltering")
    
    # Humidity (optimal: 40-70%)
    if humidity > 85:
        score -= 10
        notes.append("High humidity")
    elif humidity < 20:
        score -= 10
        notes.append("Very dry conditions")
    
    activity_level = "High" if score >= 80 else "Moderate" if score >= 50 else "Low"
    
    return {
        "score": max(0, score),
        "activity_level": activity_level,
        "conditions": {
            "temperature_f": temp,
            "humidity_pct": humidity,
            "wind_mph": wind,
            "precipitation_in": precip,
        },
        "notes": notes,
    }


async def get_climate_trends(lat, lng, years=10):
    """
    Analyze climate trends over multiple years.
    Shows changes in temperature, frost dates, etc.
    """
    current_year = datetime.now().year
    yearly_data = []
    
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    
    async with aiohttp.ClientSession() as session:
        for year in range(current_year - years, current_year):
            params = {
                "latitude": lat,
                "longitude": lng,
                "start_date": f"{year}-01-01",
                "end_date": f"{year}-12-31",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "temperature_unit": "fahrenheit",
                "precipitation_unit": "inch",
                "timezone": "America/Denver"
            }
            
            try:
                async with session.get(OPEN_METEO_BASE, params=params, ssl=ssl_ctx, timeout=30) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        daily = data.get("daily", {})
                        
                        tmax = [t for t in daily.get("temperature_2m_max", []) if t is not None]
                        tmin = [t for t in daily.get("temperature_2m_min", []) if t is not None]
                        precip = [p for p in daily.get("precipitation_sum", []) if p is not None]
                        
                        frost_info = analyze_frost_dates(daily)
                        
                        yearly_data.append({
                            "year": year,
                            "avg_high": round(sum(tmax) / len(tmax), 1) if tmax else None,
                            "avg_low": round(sum(tmin) / len(tmin), 1) if tmin else None,
                            "total_precip": round(sum(precip), 1) if precip else None,
                            "last_spring_frost": frost_info.get("last_spring_frost") if frost_info else None,
                            "first_fall_frost": frost_info.get("first_fall_frost") if frost_info else None,
                        })
            except Exception as e:
                print(f"Error fetching {year}: {e}")
    
    # Calculate trends
    if len(yearly_data) >= 3:
        temps = [y["avg_high"] for y in yearly_data if y["avg_high"]]
        if len(temps) >= 3:
            trend = (temps[-1] - temps[0]) / len(temps)
            trend_direction = "warming" if trend > 0.1 else "cooling" if trend < -0.1 else "stable"
        else:
            trend_direction = "insufficient data"
    else:
        trend_direction = "insufficient data"
    
    return {
        "location": {"lat": lat, "lng": lng},
        "years_analyzed": years,
        "trend": trend_direction,
        "yearly_data": yearly_data,
    }


# ============ ROUTES ============
def register_climate_routes(app):
    """Register climate data API routes."""
    
    @app.route('/api/climate/current', methods=['GET'])
    def current_weather():
        """Current conditions and 7-day forecast."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(fetch_current_weather(lat, lng))
        if not data:
            return jsonify({"error": "Failed to fetch weather"}), 500
        
        pollinator_conditions = get_pollinator_conditions(data)
        
        return jsonify({
            "weather": data,
            "pollinator_activity": pollinator_conditions,
        })
    
    @app.route('/api/climate/historical', methods=['GET'])
    def historical_climate():
        """Historical daily climate data."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        # Default to last 365 days
        end = datetime.now()
        start = end - timedelta(days=365)
        
        start_date = request.args.get('start', start.strftime("%Y-%m-%d"))
        end_date = request.args.get('end', end.strftime("%Y-%m-%d"))
        
        data = asyncio.run(fetch_historical_climate(lat, lng, start_date, end_date))
        if not data:
            return jsonify({"error": "Failed to fetch climate data"}), 500
        
        return jsonify(data)
    
    @app.route('/api/climate/gdd', methods=['GET'])
    def growing_degree_days():
        """Growing Degree Days calculation."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        year = request.args.get('year', datetime.now().year, type=int)
        base = request.args.get('base', 50, type=int)
        
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31" if year < datetime.now().year else datetime.now().strftime("%Y-%m-%d")
        
        data = asyncio.run(fetch_historical_climate(lat, lng, start_date, end_date))
        if not data or "daily" not in data:
            return jsonify({"error": "Failed to fetch climate data"}), 500
        
        gdd = calculate_growing_degree_days(data["daily"], base)
        
        return jsonify({
            "year": year,
            "base_temp_f": base,
            "location": {"lat": lat, "lng": lng},
            "gdd_data": gdd,
            "current_cumulative": gdd[-1]["cumulative_gdd"] if gdd else 0,
            "note": "GDD helps predict plant/insect development stages"
        })
    
    @app.route('/api/climate/frost', methods=['GET'])
    def frost_analysis():
        """Frost date analysis for a year."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        data = asyncio.run(fetch_historical_climate(lat, lng, f"{year}-01-01", f"{year}-12-31"))
        if not data or "daily" not in data:
            return jsonify({"error": "Failed to fetch climate data"}), 500
        
        frost = analyze_frost_dates(data["daily"])
        
        return jsonify({
            "year": year,
            "location": {"lat": lat, "lng": lng},
            "frost_dates": frost,
        })
    
    @app.route('/api/climate/trends', methods=['GET'])
    def climate_trends():
        """Multi-year climate trend analysis."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        years = request.args.get('years', 10, type=int)
        years = min(years, 30)  # Cap at 30 years
        
        data = asyncio.run(get_climate_trends(lat, lng, years))
        return jsonify(data)
    
    @app.route('/api/climate/pollinator-forecast', methods=['GET'])
    def pollinator_forecast():
        """7-day pollinator activity forecast based on weather."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        if not lat or not lng:
            return jsonify({"error": "lat and lng required"}), 400
        
        data = asyncio.run(fetch_current_weather(lat, lng))
        if not data or "daily" not in data:
            return jsonify({"error": "Failed to fetch forecast"}), 500
        
        daily = data["daily"]
        forecast = []
        
        for i, date in enumerate(daily.get("time", [])):
            tmax = daily["temperature_2m_max"][i] if i < len(daily.get("temperature_2m_max", [])) else None
            tmin = daily["temperature_2m_min"][i] if i < len(daily.get("temperature_2m_min", [])) else None
            precip = daily["precipitation_sum"][i] if i < len(daily.get("precipitation_sum", [])) else 0
            
            if tmax and tmin:
                avg_temp = (tmax + tmin) / 2
                
                # Simple activity prediction
                if precip > 0.1:
                    activity = "Low"
                    reason = "Rain expected"
                elif avg_temp < 55:
                    activity = "Low"
                    reason = "Too cool"
                elif avg_temp > 90:
                    activity = "Moderate"
                    reason = "Hot - morning/evening best"
                elif 65 <= avg_temp <= 85:
                    activity = "High"
                    reason = "Ideal conditions"
                else:
                    activity = "Moderate"
                    reason = "Fair conditions"
                
                forecast.append({
                    "date": date,
                    "high_f": tmax,
                    "low_f": tmin,
                    "precip_in": precip,
                    "activity": activity,
                    "reason": reason,
                })
        
        return jsonify({
            "location": {"lat": lat, "lng": lng},
            "forecast": forecast,
            "best_days": [f["date"] for f in forecast if f["activity"] == "High"],
        })

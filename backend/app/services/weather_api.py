import httpx
import asyncio
from typing import Dict, Any

# Open-Meteo Base URLs
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

async def fetch_live_signals(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetches real-time weather and air quality signals from Open-Meteo.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Fetch Weather (Rain, Temperature)
            weather_task = client.get(
                WEATHER_URL,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,rain,showers,snowfall",
                }
            )

            # 2. Fetch Air Quality (PM2.5, PM10, AQI)
            aq_task = client.get(
                AIR_QUALITY_URL,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "pm2_5,pm10,us_aqi",
                }
            )

            w_resp, aq_resp = await asyncio.gather(weather_task, aq_task)
            
            w_data = w_resp.json()
            aq_data = aq_resp.json()

            current_w = w_data.get("current", {})
            current_aq = aq_data.get("current", {})

            # Calculate a synthetic flood risk based on rain and showers (0.0 to 1.0)
            rain_mm = float(current_w.get("rain", 0)) + float(current_w.get("showers", 0))
            flood_risk = min(1.0, rain_mm / 100.0) # 100mm = 1.0 risk

            return {
                "temperature": current_w.get("temperature_2m", 25),
                "rainfall_mm": rain_mm,
                "flood_risk": round(flood_risk, 2),
                "aqi": int(current_aq.get("us_aqi", 50)),
                "pm25": float(current_aq.get("pm2_5", 10)),
                "pm10": float(current_aq.get("pm10", 20)),
                "status": "live",
                "source": "Open-Meteo"
            }
        except Exception as e:
            # Fallback for connectivity issues
            print(f"Weather API Error: {e}")
            return {
                "temperature": 25,
                "rainfall_mm": 0,
                "flood_risk": 0.1,
                "aqi": 50,
                "status": "fallback",
                "error": str(e)
            }

async def get_zone_update(zone_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches zone static data with live signals.
    """
    lat = zone_data.get("latitude")
    lon = zone_data.get("longitude")
    
    if lat is None or lon is None:
        return zone_data

    live = await fetch_live_signals(lat, lon)
    
    updated_zone = dict(zone_data)
    updated_zone.update({
        "temperature": live["temperature"],
        "flood_risk": live["flood_risk"],
        "aqi": live["aqi"],
        "rainfall_mm": live["rainfall_mm"],
        "live_source": live["source"]
    })
    
    return updated_zone

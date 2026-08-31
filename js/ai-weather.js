/**
 * Autonomous Agritech and Perimeter Security System
 * AI Weather Intelligence & Smart Irrigation Advisory Module
 * 
 * Uses Open-Meteo API (free, no API key) for weather forecasts.
 * Cross-references with soil moisture sensors, crop requirements,
 * and tank levels to generate intelligent irrigation recommendations.
 */

const aiWeatherModule = (() => {
  // =========================================================================
  // CONFIGURATION
  // =========================================================================
  const DEFAULT_LAT = 13.0827;  // Chennai, Tamil Nadu
  const DEFAULT_LON = 80.2707;
  const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  const WMO_WEATHER_CODES = {
    0: { desc: "Clear sky", icon: "fa-sun", class: "sunny" },
    1: { desc: "Mainly clear", icon: "fa-sun", class: "sunny" },
    2: { desc: "Partly cloudy", icon: "fa-cloud-sun", class: "cloudy" },
    3: { desc: "Overcast", icon: "fa-cloud", class: "overcast" },
    45: { desc: "Foggy", icon: "fa-smog", class: "foggy" },
    48: { desc: "Depositing rime fog", icon: "fa-smog", class: "foggy" },
    51: { desc: "Light drizzle", icon: "fa-cloud-rain", class: "drizzle" },
    53: { desc: "Moderate drizzle", icon: "fa-cloud-rain", class: "drizzle" },
    55: { desc: "Dense drizzle", icon: "fa-cloud-rain", class: "rainy" },
    61: { desc: "Slight rain", icon: "fa-cloud-showers-heavy", class: "rainy" },
    63: { desc: "Moderate rain", icon: "fa-cloud-showers-heavy", class: "rainy" },
    65: { desc: "Heavy rain", icon: "fa-cloud-showers-heavy", class: "heavy-rain" },
    71: { desc: "Slight snow", icon: "fa-snowflake", class: "snowy" },
    73: { desc: "Moderate snow", icon: "fa-snowflake", class: "snowy" },
    75: { desc: "Heavy snow", icon: "fa-snowflake", class: "snowy" },
    80: { desc: "Slight rain showers", icon: "fa-cloud-showers-heavy", class: "rainy" },
    81: { desc: "Moderate rain showers", icon: "fa-cloud-showers-heavy", class: "rainy" },
    82: { desc: "Violent rain showers", icon: "fa-cloud-bolt", class: "storm" },
    95: { desc: "Thunderstorm", icon: "fa-cloud-bolt", class: "storm" },
    96: { desc: "Thunderstorm with slight hail", icon: "fa-cloud-bolt", class: "storm" },
    99: { desc: "Thunderstorm with heavy hail", icon: "fa-cloud-bolt", class: "storm" }
  };

  let currentLat = DEFAULT_LAT;
  let currentLon = DEFAULT_LON;
  let locationName = "Chennai, Tamil Nadu";
  let forecastData = null;
  let refreshTimer = null;
  let countdownTimer = null;
  let nextRefreshTime = null;
  let forecastChart = null;
  let initialized = false;
  let savingsData = {
    irrigationsSkipped: 0,
    waterSavedLiters: 0,
    electricitySavedKWh: 0
  };

  // =========================================================================
  // OPEN-METEO API FETCHER
  // =========================================================================
  async function fetchForecast(lat, lon) {
    const url = `https://open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,` +
      `weather_code,wind_speed_10m,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,` +
      `precipitation_sum,precipitation_probability_max,uv_index_max` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,` +
      `apparent_temperature,precipitation` +
      `&timezone=auto&forecast_days=3`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Open-Meteo API fetch failed:", err);
      return null;
    }
  }

  // Generate realistic demo forecast data
  function generateDemoForecast() {
    const now = new Date();
    const hourly = {
      time: [],
      temperature_2m: [],
      relative_humidity_2m: [],
      precipitation_probability: [],
      precipitation: [],
      weather_code: [],
      wind_speed_10m: [],
      apparent_temperature: []
    };

    // Generate 72 hours of data
    for (let i = 0; i < 72; i++) {
      const t = new Date(now.getTime() + i * 3600000);
      hourly.time.push(t.toISOString().slice(0, 16));

      const hour = t.getHours();
      // Temperature: cooler at night, warmer midday
      const baseTemp = 28 + 6 * Math.sin((hour - 6) * Math.PI / 12);
      hourly.temperature_2m.push(parseFloat((baseTemp + (Math.random() - 0.5) * 3).toFixed(1)));
      hourly.apparent_temperature.push(parseFloat((baseTemp + 2 + (Math.random() - 0.5) * 3).toFixed(1)));

      // Humidity: inverse of temperature pattern
      const baseHumidity = 65 - 15 * Math.sin((hour - 6) * Math.PI / 12);
      hourly.relative_humidity_2m.push(Math.round(baseHumidity + (Math.random() - 0.5) * 10));

      // Precipitation: simulate a rain window between hours 8-16
      let rainProb = 0;
      let rainAmount = 0;
      let code = 0;
      if (i >= 6 && i <= 14) {
        rainProb = Math.min(95, 30 + Math.round(Math.random() * 50));
        if (rainProb > 50) {
          rainAmount = parseFloat((Math.random() * 4).toFixed(1));
          code = rainAmount > 2 ? 63 : (rainAmount > 0.5 ? 61 : 51);
        } else {
          code = 2;
        }
      } else if (i >= 24 && i <= 30) {
        rainProb = Math.min(80, 20 + Math.round(Math.random() * 40));
        if (rainProb > 40) {
          rainAmount = parseFloat((Math.random() * 2).toFixed(1));
          code = rainAmount > 1 ? 61 : 51;
        } else {
          code = 3;
        }
      } else {
        rainProb = Math.round(Math.random() * 15);
        code = hour > 6 && hour < 18 ? (Math.random() > 0.7 ? 2 : 1) : 0;
      }
      hourly.precipitation_probability.push(rainProb);
      hourly.precipitation.push(rainAmount);
      hourly.weather_code.push(code);
      hourly.wind_speed_10m.push(parseFloat((5 + Math.random() * 15).toFixed(1)));
    }

    const daily = {
      time: [],
      weather_code: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
      sunrise: [],
      sunset: [],
      precipitation_sum: [],
      precipitation_probability_max: [],
      uv_index_max: []
    };

    for (let d = 0; d < 3; d++) {
      const dayDate = new Date(now.getTime() + d * 86400000);
      daily.time.push(dayDate.toISOString().slice(0, 10));
      daily.temperature_2m_max.push(parseFloat((34 + Math.random() * 4).toFixed(1)));
      daily.temperature_2m_min.push(parseFloat((24 + Math.random() * 3).toFixed(1)));
      daily.weather_code.push(d === 0 ? 61 : (d === 1 ? 3 : 1));
      daily.precipitation_sum.push(parseFloat((d === 0 ? 5 + Math.random() * 8 : Math.random() * 2).toFixed(1)));
      daily.precipitation_probability_max.push(d === 0 ? 85 : (d === 1 ? 45 : 10));
      daily.uv_index_max.push(parseFloat((6 + Math.random() * 4).toFixed(1)));

      const sr = new Date(dayDate);
      sr.setHours(6, 5 + Math.round(Math.random() * 10), 0);
      daily.sunrise.push(sr.toISOString().slice(0, 16));

      const ss = new Date(dayDate);
      ss.setHours(18, 20 + Math.round(Math.random() * 15), 0);
      daily.sunset.push(ss.toISOString().slice(0, 16));
    }

    const current = {
      temperature_2m: hourly.temperature_2m[0],
      relative_humidity_2m: hourly.relative_humidity_2m[0],
      weather_code: hourly.weather_code[0],
      wind_speed_10m: hourly.wind_speed_10m[0],
      apparent_temperature: hourly.apparent_temperature[0],
      precipitation: hourly.precipitation[0]
    };

    return {
      current: current,
      hourly: hourly,
      daily: daily,
      timezone: "Asia/Kolkata"
    };
  }

  // =========================================================================
  // GEOLOCATION
  // =========================================================================
  function detectLocation() {
    const statusEl = document.getElementById("ai-location-status");
    if (statusEl) {
      statusEl.textContent = "Detecting location...";
      statusEl.className = "location-status detecting";
    }

    if (!navigator.geolocation) {
      if (statusEl) {
        statusEl.textContent = "Geolocation not supported. Using default.";
        statusEl.className = "location-status error";
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        currentLat = parseFloat(pos.coords.latitude.toFixed(4));
        currentLon = parseFloat(pos.coords.longitude.toFixed(4));

        // Reverse geocode with OpenStreetMap Nominatim for accurate district data
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}&zoom=10&addressdetails=1`);
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
             const addr = geoData.address;
             // Prioritize district-level names
             const district = addr.state_district || addr.county || addr.city_district || addr.city || addr.town || addr.village;
             const state = addr.state || addr.country;
             locationName = district ? `${district}, ${state}` : state;
          } else {
             locationName = `${currentLat}°N, ${currentLon}°E`;
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          locationName = `${currentLat}°N, ${currentLon}°E`;
        }

        const locNameEl = document.getElementById("ai-location-name");
        if (locNameEl) locNameEl.textContent = locationName;
        if (statusEl) {
          statusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Detected: <strong>${locationName}</strong>`;
          statusEl.className = "location-status success";
        }

        await refreshForecast();
      },
      (err) => {
        console.warn("Geolocation failed:", err.message);
        if (statusEl) {
          statusEl.textContent = "Using default location (Chennai).";
          statusEl.className = "location-status error";
        }
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  // =========================================================================
  // AI IRRIGATION ADVISOR ENGINE
  // =========================================================================
  function generateAdvisory(forecast) {
    const advisories = [];
    if (!forecast || !forecast.hourly) return advisories;

    const now = new Date();
    const hourlyTimes = forecast.hourly.time.map(t => new Date(t));

    // Find the index closest to current time
    let startIdx = 0;
    for (let i = 0; i < hourlyTimes.length; i++) {
      if (hourlyTimes[i] >= now) { startIdx = i; break; }
    }

    // Calculate rain probabilities for different windows
    const windows = [
      { label: "Next 3 hours", hours: 3 },
      { label: "Next 6 hours", hours: 6 },
      { label: "Next 12 hours", hours: 12 },
      { label: "Next 24 hours", hours: 24 }
    ];

    const windowStats = windows.map(w => {
      const end = Math.min(startIdx + w.hours, forecast.hourly.precipitation_probability.length);
      const probs = forecast.hourly.precipitation_probability.slice(startIdx, end);
      const rains = forecast.hourly.precipitation.slice(startIdx, end);
      const avgProb = probs.length > 0 ? probs.reduce((a, b) => a + b, 0) / probs.length : 0;
      const maxProb = probs.length > 0 ? Math.max(...probs) : 0;
      const totalRain = rains.reduce((a, b) => a + b, 0);
      const rainyHours = probs.filter(p => p > 40).length;
      return { ...w, avgProb, maxProb, totalRain, rainyHours };
    });

    // Get cached sensor/crop data from the database module
    const sensorData = getSensorData();
    const tankLevel = getTankLevel();

    // ---- RULE ENGINE ----

    // Rule 1: Imminent rain + adequate moisture → SKIP
    const next3h = windowStats[0];
    const next6h = windowStats[1];
    const next12h = windowStats[2];
    const next24h = windowStats[3];

    if (next3h.maxProb >= 60) {
      const rainTime = findNextRainTime(forecast, startIdx, 3);
      advisories.push({
        severity: "skip",
        icon: "fa-cloud-showers-heavy",
        title: "Rain Expected Soon — Skip Irrigation",
        message: `${next3h.maxProb}% chance of rain ${rainTime}. Expected ~${next3h.totalRain.toFixed(1)}mm rainfall. ` +
          `Save water and electricity by deferring irrigation until after the rain.`,
        confidence: next3h.maxProb,
        savings: { water: Math.round(next3h.totalRain * 10), electricity: 0.3 }
      });
    }

    // Rule 2: Rain in 6-12h + moisture above 50% target → REDUCE
    if (next3h.maxProb < 60 && next12h.maxProb >= 40) {
      advisories.push({
        severity: "reduce",
        icon: "fa-cloud-sun-rain",
        title: "Rain Possible Later — Reduce Irrigation",
        message: `Up to ${next12h.maxProb}% precipitation probability in the next 12 hours (${next12h.rainyHours} rainy hours expected). ` +
          `Consider reducing irrigation duration by 40-50% to conserve water.`,
        confidence: next12h.avgProb,
        savings: { water: Math.round(next12h.totalRain * 5), electricity: 0.15 }
      });
    }

    // Rule 3: No rain forecast → IRRIGATE
    if (next24h.maxProb < 20) {
      const bestTime = findOptimalIrrigationTime(forecast, startIdx);
      advisories.push({
        severity: "irrigate",
        icon: "fa-faucet-drip",
        title: "No Rain Forecast — Irrigate Fields",
        message: `Very low precipitation probability (max ${next24h.maxProb}%) for the next 24 hours. ` +
          `Recommended irrigation window: ${bestTime}. Ensure all fields receive adequate water today.`,
        confidence: 100 - next24h.maxProb,
        savings: null
      });
    }

    // Rule 4: Per-field soil moisture advice
    sensorData.forEach(field => {
      const deficit = field.target - field.moisture;
      if (deficit > 10 && next6h.maxProb < 40) {
        advisories.push({
          severity: "irrigate",
          icon: "fa-seedling",
          title: `${field.name}: Soil Moisture Below Target`,
          message: `Current moisture is ${field.moisture}% (target: ${field.target}% for ${field.crop}). ` +
            `Deficit of ${deficit}%. No significant rain expected soon — irrigation recommended now.`,
          confidence: 85,
          savings: null
        });
      } else if (deficit > 5 && next6h.maxProb >= 40) {
        advisories.push({
          severity: "reduce",
          icon: "fa-leaf",
          title: `${field.name}: Wait for Rain`,
          message: `Moisture is ${field.moisture}% (target: ${field.target}% for ${field.crop}). ` +
            `Rain is ${next6h.maxProb}% likely in the next 6 hours — the expected ${next6h.totalRain.toFixed(1)}mm may cover the ${deficit}% deficit.`,
          confidence: next6h.maxProb,
          savings: { water: deficit * 3, electricity: 0.1 }
        });
      } else if (deficit <= 0) {
        advisories.push({
          severity: "skip",
          icon: "fa-circle-check",
          title: `${field.name}: Moisture Sufficient`,
          message: `Current moisture ${field.moisture}% meets the ${field.target}% target for ${field.crop}. ` +
            `No irrigation needed. Water level is adequate for today.`,
          confidence: 95,
          savings: { water: field.target * 2, electricity: 0.2 }
        });
      }
    });

    // Rule 5: Tank level warning
    if (tankLevel < 20) {
      advisories.unshift({
        severity: "irrigate",
        icon: "fa-triangle-exclamation",
        title: "Low Tank Level — Conserve Water!",
        message: `Water tank is critically low at ${tankLevel}%. Prioritize essential crops only. ` +
          (next24h.maxProb > 30 ? `Rain forecast (${next24h.maxProb}% chance) may help replenish.` : `No rain expected — consider manual refill.`),
        confidence: 100,
        savings: null
      });
    }

    // Rule 6: Optimal irrigation timing based on temperature
    if (advisories.filter(a => a.severity === "irrigate").length > 0) {
      const bestWindow = findOptimalIrrigationTime(forecast, startIdx);
      advisories.push({
        severity: "info",
        icon: "fa-clock",
        title: "Best Irrigation Window",
        message: `Optimal irrigation time: ${bestWindow} — when temperature is lowest and evaporation rate is minimal. ` +
          `This maximizes water absorption by 25-40% compared to midday irrigation.`,
        confidence: 90,
        savings: { water: 15, electricity: 0.05 }
      });
    }

    // Calculate total savings
    let totalWaterSaved = 0;
    let totalElectricitySaved = 0;
    advisories.forEach(a => {
      if (a.savings) {
        totalWaterSaved += a.savings.water || 0;
        totalElectricitySaved += a.savings.electricity || 0;
      }
    });
    savingsData.waterSavedLiters += totalWaterSaved;
    savingsData.electricitySavedKWh += totalElectricitySaved;

    return advisories;
  }

  function findNextRainTime(forecast, startIdx, windowHours) {
    for (let i = startIdx; i < startIdx + windowHours && i < forecast.hourly.time.length; i++) {
      if (forecast.hourly.precipitation_probability[i] >= 50) {
        const t = new Date(forecast.hourly.time[i]);
        return `around ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    return "within the next few hours";
  }

  function findOptimalIrrigationTime(forecast, startIdx) {
    if (!forecast || !forecast.hourly) return "5:00 AM - 7:00 AM";

    // Find the coolest upcoming hours (early morning or late evening)
    let bestHour = null;
    let lowestTemp = 999;
    const maxSearch = Math.min(startIdx + 24, forecast.hourly.temperature_2m.length);

    for (let i = startIdx; i < maxSearch; i++) {
      const t = new Date(forecast.hourly.time[i]);
      const hour = t.getHours();
      const temp = forecast.hourly.temperature_2m[i];
      const rainProb = forecast.hourly.precipitation_probability[i];

      // Prefer hours 4-7 AM or 6-8 PM with low rain probability
      if (rainProb < 30 && (hour >= 4 && hour <= 7 || hour >= 18 && hour <= 20)) {
        if (temp < lowestTemp) {
          lowestTemp = temp;
          bestHour = t;
        }
      }
    }

    if (bestHour) {
      const start = bestHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const end = new Date(bestHour.getTime() + 2 * 3600000);
      const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${start} — ${endStr} (${lowestTemp.toFixed(1)}°C)`;
    }
    return "5:00 AM — 7:00 AM (early morning)";
  }

  function getSensorData() {
    const fields = [];
    // Try to read from the database module's cached data
    if (window.databaseModule && typeof window.databaseModule._getCachedFields === 'function') {
      const cached = window.databaseModule._getCachedFields();
      if (cached) {
        Object.keys(cached).forEach(key => {
          const f = cached[key];
          const sensorKeys = Object.keys(f).filter(k => k.startsWith("sensor"));
          const moisture = f.average !== undefined ? f.average :
            (f[sensorKeys[0]] || 0);
          fields.push({
            name: f.name || key,
            moisture: Math.round(moisture),
            target: f.target_moisture || 40,
            crop: f.selected_crop || "General"
          });
        });
        return fields;
      }
    }

    // Fallback: try reading from mock state in demo mode
    if (typeof mockDbState !== 'undefined' && mockDbState.fields) {
      Object.keys(mockDbState.fields).forEach(key => {
        const f = mockDbState.fields[key];
        const sensorKeys = Object.keys(f).filter(k => k.startsWith("sensor"));
        const moisture = f.average !== undefined ? f.average : (f[sensorKeys[0]] || 0);
        fields.push({
          name: f.name || key,
          moisture: Math.round(moisture),
          target: f.target_moisture || 40,
          crop: f.selected_crop || "General"
        });
      });
      return fields;
    }

    // Absolute fallback
    return [
      { name: "Field 1", moisture: 35, target: 40, crop: "Tomato" },
      { name: "Field 2", moisture: 42, target: 45, crop: "Corn" }
    ];
  }

  function getTankLevel() {
    // Try from database module cached system
    if (window.databaseModule && typeof window.databaseModule._getCachedSystem === 'function') {
      const sys = window.databaseModule._getCachedSystem();
      if (sys && sys.tank_level !== undefined) return sys.tank_level;
    }
    // Fallback to mock state
    if (typeof mockDbState !== 'undefined') {
      return mockDbState.system.tank_level || 68;
    }
    return 68;
  }

  // =========================================================================
  // UI RENDERING
  // =========================================================================

  async function refreshForecast() {
    const loadingEl = document.getElementById("ai-weather-loading");
    if (loadingEl) loadingEl.classList.remove("hidden");

    if (isDemoMode) {
      forecastData = generateDemoForecast();
    } else {
      const data = await fetchForecast(currentLat, currentLon);
      if (data) {
        forecastData = data;
      } else {
        // Fallback to demo data if API fails
        forecastData = generateDemoForecast();
      }
    }

    if (loadingEl) loadingEl.classList.add("hidden");
    renderAll();
    startCountdown();

    // Log the refresh
    if (typeof logSystemEvent === "function") {
      logSystemEvent("AI Weather Intelligence: Forecast data refreshed.", "weather");
    }
  }

  function renderAll() {
    if (!forecastData) return;
    renderCurrentConditions();
    renderRainTimeline();
    renderAdvisory();
    renderDailyForecast();
    renderForecastChart();
    renderSavings();
  }

  function renderCurrentConditions() {
    const current = forecastData.current;
    if (!current) return;

    const wmo = WMO_WEATHER_CODES[current.weather_code] || WMO_WEATHER_CODES[0];

    const el = document.getElementById("ai-current-conditions");
    if (!el) return;

    el.innerHTML = `
      <div class="current-weather-main">
        <div class="current-weather-icon-wrap ${wmo.class}">
          <i class="fa-solid ${wmo.icon}"></i>
          ${wmo.class === 'rainy' || wmo.class === 'heavy-rain' || wmo.class === 'drizzle' ? '<div class="rain-drops-anim"><span></span><span></span><span></span><span></span><span></span></div>' : ''}
          ${wmo.class === 'sunny' ? '<div class="sun-rays-anim"></div>' : ''}
        </div>
        <div class="current-weather-info">
          <span class="current-temp">${current.temperature_2m}°C</span>
          <span class="current-desc">${wmo.desc}</span>
          <span class="current-feels">Feels like ${current.apparent_temperature}°C</span>
        </div>
      </div>
      <div class="current-weather-details">
        <div class="weather-detail-item">
          <i class="fa-solid fa-droplet"></i>
          <span class="detail-val">${current.relative_humidity_2m}%</span>
          <span class="detail-label">Humidity</span>
        </div>
        <div class="weather-detail-item">
          <i class="fa-solid fa-wind"></i>
          <span class="detail-val">${current.wind_speed_10m} km/h</span>
          <span class="detail-label">Wind</span>
        </div>
        <div class="weather-detail-item">
          <i class="fa-solid fa-cloud-rain"></i>
          <span class="detail-val">${current.precipitation} mm</span>
          <span class="detail-label">Rain Now</span>
        </div>
        <div class="weather-detail-item">
          <i class="fa-solid fa-location-dot"></i>
          <span class="detail-val" id="ai-location-name">${locationName}</span>
          <span class="detail-label">Location</span>
        </div>
      </div>
    `;
  }

  function renderRainTimeline() {
    const container = document.getElementById("ai-rain-timeline");
    if (!container || !forecastData.hourly) return;

    const now = new Date();
    const times = forecastData.hourly.time;
    let startIdx = 0;
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]) >= now) { startIdx = i; break; }
    }

    let html = '<div class="rain-timeline-scroll">';
    const hours = Math.min(24, times.length - startIdx);

    for (let i = 0; i < hours; i++) {
      const idx = startIdx + i;
      const t = new Date(times[idx]);
      const prob = forecastData.hourly.precipitation_probability[idx];
      const rain = forecastData.hourly.precipitation[idx];
      const code = forecastData.hourly.weather_code[idx];
      const wmo = WMO_WEATHER_CODES[code] || WMO_WEATHER_CODES[0];

      let barColor = 'var(--glass-border)';
      let barClass = '';
      if (prob >= 70) { barColor = '#3b82f6'; barClass = 'high'; }
      else if (prob >= 40) { barColor = '#60a5fa'; barClass = 'medium'; }
      else if (prob >= 20) { barColor = '#93c5fd'; barClass = 'low'; }

      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isNow = i === 0;

      html += `
        <div class="rain-hour-col ${isNow ? 'now' : ''} ${barClass}">
          <span class="rain-hour-prob">${prob}%</span>
          <div class="rain-hour-bar-wrap">
            <div class="rain-hour-bar" style="height: ${Math.max(4, prob)}%; background: ${barColor};"></div>
          </div>
          <i class="fa-solid ${wmo.icon} rain-hour-icon" title="${wmo.desc}"></i>
          <span class="rain-hour-rain">${rain > 0 ? rain + 'mm' : '—'}</span>
          <span class="rain-hour-time">${isNow ? 'Now' : timeStr}</span>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderAdvisory() {
    const container = document.getElementById("ai-advisory-cards");
    if (!container) return;

    const advisories = generateAdvisory(forecastData);

    if (advisories.length === 0) {
      container.innerHTML = `
        <div class="advisory-empty">
          <i class="fa-solid fa-robot"></i>
          <p>No active recommendations. Weather data is being analyzed...</p>
        </div>`;
      return;
    }

    let html = '';
    advisories.forEach((adv, idx) => {
      const severityClass = adv.severity; // skip, reduce, irrigate, info
      html += `
        <div class="advisory-card ${severityClass}" style="animation-delay: ${idx * 0.1}s">
          <div class="advisory-severity-bar"></div>
          <div class="advisory-content">
            <div class="advisory-header">
              <div class="advisory-icon-wrap">
                <i class="fa-solid ${adv.icon}"></i>
              </div>
              <div class="advisory-title-area">
                <h4>${adv.title}</h4>
                <div class="confidence-badge">
                  <div class="confidence-fill" style="width: ${adv.confidence}%"></div>
                  <span>${adv.confidence}% confidence</span>
                </div>
              </div>
            </div>
            <p class="advisory-message">${adv.message}</p>
            ${adv.savings ? `
              <div class="advisory-savings-tag">
                <i class="fa-solid fa-leaf"></i>
                ${adv.savings.water > 0 ? `Save ~${adv.savings.water}L water` : ''}
                ${adv.savings.electricity > 0 ? ` · ${adv.savings.electricity} kWh electricity` : ''}
              </div>` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderDailyForecast() {
    const container = document.getElementById("ai-daily-forecast");
    if (!container || !forecastData.daily) return;

    let html = '';
    const days = forecastData.daily;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < days.time.length; i++) {
      const dt = new Date(days.time[i] + 'T00:00:00');
      const wmo = WMO_WEATHER_CODES[days.weather_code[i]] || WMO_WEATHER_CODES[0];
      const dayName = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayNames[dt.getDay()]);

      const sunrise = new Date(days.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sunset = new Date(days.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="daily-forecast-card">
          <div class="daily-day">${dayName}</div>
          <div class="daily-icon ${wmo.class}">
            <i class="fa-solid ${wmo.icon}"></i>
          </div>
          <div class="daily-temps">
            <span class="daily-high">${days.temperature_2m_max[i]}°</span>
            <span class="daily-low">${days.temperature_2m_min[i]}°</span>
          </div>
          <div class="daily-rain-badge ${days.precipitation_probability_max[i] > 40 ? 'likely' : ''}">
            <i class="fa-solid fa-droplet"></i> ${days.precipitation_probability_max[i]}%
          </div>
          <div class="daily-details-row">
            <span title="Total Precipitation"><i class="fa-solid fa-cloud-rain"></i> ${days.precipitation_sum[i]}mm</span>
            <span title="UV Index"><i class="fa-solid fa-sun"></i> UV ${days.uv_index_max[i].toFixed(0)}</span>
          </div>
          <div class="daily-sun-times">
            <span><i class="fa-solid fa-sunrise"></i> ${sunrise}</span>
            <span><i class="fa-solid fa-sunset"></i> ${sunset}</span>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function renderForecastChart() {
    const canvas = document.getElementById("chart-ai-forecast");
    if (!canvas || !forecastData.hourly) return;

    const now = new Date();
    const times = forecastData.hourly.time;
    let startIdx = 0;
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]) >= now) { startIdx = i; break; }
    }

    const hours = Math.min(48, times.length - startIdx);
    const labels = [];
    const tempData = [];
    const humidityData = [];
    const rainProbData = [];

    for (let i = 0; i < hours; i++) {
      const idx = startIdx + i;
      const t = new Date(times[idx]);
      labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      tempData.push(forecastData.hourly.temperature_2m[idx]);
      humidityData.push(forecastData.hourly.relative_humidity_2m[idx]);
      rainProbData.push(forecastData.hourly.precipitation_probability[idx]);
    }

    if (forecastChart) {
      forecastChart.destroy();
    }

    const ctx = canvas.getContext("2d");
    forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: tempData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            yAxisID: 'y',
            pointRadius: 0,
            pointHoverRadius: 4
          },
          {
            label: 'Humidity (%)',
            data: humidityData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.05)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y1',
            pointRadius: 0,
            pointHoverRadius: 4,
            borderDash: [5, 5]
          },
          {
            label: 'Rain Probability (%)',
            data: rainProbData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            yAxisID: 'y1',
            pointRadius: 0,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: 'rgba(255,255,255,0.7)',
              font: { family: "'Inter', sans-serif", size: 11 },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 20, 40, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.8)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12
          }
        },
        scales: {
          x: {
            ticks: {
              color: 'rgba(255,255,255,0.4)',
              font: { size: 10 },
              maxTicksLimit: 12,
              maxRotation: 45
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: 'rgba(249, 115, 22, 0.7)',
              font: { size: 11 }
            },
            ticks: { color: 'rgba(249, 115, 22, 0.6)', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Probability / Humidity (%)',
              color: 'rgba(59, 130, 246, 0.7)',
              font: { size: 11 }
            },
            ticks: { color: 'rgba(59, 130, 246, 0.6)', font: { size: 10 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function renderSavings() {
    const waterEl = document.getElementById("ai-savings-water");
    const elecEl = document.getElementById("ai-savings-electricity");
    const skippedEl = document.getElementById("ai-savings-skipped");

    // Load persisted savings
    const stored = localStorage.getItem("agritech_ai_savings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        savingsData.irrigationsSkipped = parsed.irrigationsSkipped || 0;
        savingsData.waterSavedLiters = parsed.waterSavedLiters || 0;
        savingsData.electricitySavedKWh = parsed.electricitySavedKWh || 0;
      } catch (e) { /* ignore */ }
    }

    // Count advisories that recommend skipping
    const advisories = generateAdvisory(forecastData);
    const skips = advisories.filter(a => a.severity === 'skip').length;
    if (skips > 0) {
      savingsData.irrigationsSkipped = Math.max(savingsData.irrigationsSkipped, skips);
    }

    if (waterEl) waterEl.textContent = `${savingsData.waterSavedLiters}L`;
    if (elecEl) elecEl.textContent = `${savingsData.electricitySavedKWh.toFixed(2)} kWh`;
    if (skippedEl) skippedEl.textContent = savingsData.irrigationsSkipped;

    // Persist
    localStorage.setItem("agritech_ai_savings", JSON.stringify(savingsData));
  }

  // =========================================================================
  // COUNTDOWN TIMER
  // =========================================================================
  function startCountdown() {
    nextRefreshTime = Date.now() + REFRESH_INTERVAL_MS;
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, nextRefreshTime - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const el = document.getElementById("ai-refresh-countdown");
      if (el) el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (remaining <= 0) {
        refreshForecast();
      }
    }, 1000);
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    if (initialized) return;
    initialized = true;

    console.log("AI Weather Intelligence Module initializing...");

    // Bind location detect button
    const detectBtn = document.getElementById("ai-detect-location-btn");
    if (detectBtn) {
      detectBtn.addEventListener("click", detectLocation);
    }

    // Bind manual refresh button
    const refreshBtn = document.getElementById("ai-manual-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        refreshForecast();
      });
    }

    // Initial fetch
    refreshForecast();

    // Auto-refresh timer
    refreshTimer = setInterval(refreshForecast, REFRESH_INTERVAL_MS);
  }

  function destroy() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    if (forecastChart) forecastChart.destroy();
    initialized = false;
  }

  function resizeChart() {
    if (forecastChart) {
      forecastChart.resize();
    }
  }

  return {
    init,
    destroy,
    resizeChart,
    refreshForecast
  };
})();

window.aiWeatherModule = aiWeatherModule;

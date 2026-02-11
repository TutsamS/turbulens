const axios = require('axios');
const GAirmetService = require('./gAirmetService');
const WeatherAdvisoryService = require('./weatherAdvisoryService');
const AirportService = require('./airportService');

/**
 * ============================================================================
 * ALTITUDE FORMAT STANDARD ACROSS THE APPLICATION
 * ============================================================================
 * 
 * INPUT (from external APIs):
 * - G-AIRMET API: Returns flight levels (FL180 = 180, FL240 = 240)
 * - SIGMET API: Returns "FL180" in text or "18000 ft" in attributes
 * 
 * PARSING (in service layer):
 * - gAirmetService.js: Converts all FL values to feet (180 * 100 = 18,000)
 * - weatherAdvisoryService.js: Converts all FL values to feet (240 * 100 = 24,000)
 * 
 * INTERNAL STORAGE & PROCESSING:
 * - ALL altitudes stored in FEET (18000, 24000, 35000)
 * - Phase altitude ranges: in FEET
 * - Advisory altitudes: in FEET
 * - Weather data altitudes: in FEET
 * 
 * COMPARISON (in analysis functions):
 * - ALL altitude comparisons use FEET consistently
 * - No conversion needed during comparison operations
 * 
 * OUTPUT (display to frontend/logs):
 * - Convert back to FL for readability: 18000 / 100 = "FL180"
 * - Or display with commas: "18,000 ft"
 * 
 * This ensures consistency and prevents altitude comparison bugs.
 * ============================================================================
 */

class SimpleRouteService {
  // Initialize airport service
  static airportService = new AirportService();

  // ============================================================================
  // PHASE 1 ENHANCEMENTS: Advanced Turbulence Prediction
  // ============================================================================

  /**
   * Normalize altitude to feet format
   * Detects if altitude might be in flight levels and converts accordingly
   * @param {Object} altitude - Altitude object with min/max
   * @returns {Object} Normalized altitude in feet
   */
  static normalizeAltitudeToFeet(altitude) {
    if (!altitude) return { min: 0, max: 999999 };
    
    let { min, max } = altitude;
    
    // Safety check: If altitude values look like flight levels (< 1000), convert to feet
    if (min > 0 && min < 1000 && max < 1000) {
      return { min: min * 100, max: max * 100 };
    }
    
    return { min, max };
  }

  /**
   * Calculate vertical wind shear between altitude levels
   * Wind shear is THE primary cause of turbulence, not wind speed
   * @param {number} windSpeed1 - Wind speed at altitude 1 (knots)
   * @param {number} windSpeed2 - Wind speed at altitude 2 (knots)
   * @param {number} altitudeDiff - Altitude difference (feet)
   * @returns {number} Wind shear in knots per 1000 feet
   */
  static calculateVerticalWindShear(windSpeed1, windSpeed2, altitudeDiff) {
    if (!altitudeDiff || altitudeDiff === 0) return 0;
    
    const windSpeedDiff = Math.abs(windSpeed2 - windSpeed1);
    const shear = (windSpeedDiff / altitudeDiff) * 1000; // Normalize to per 1000ft
    
    return shear;
  }

  /**
   * Calculate horizontal wind shear between waypoints
   * @param {object} weather1 - Weather data at point 1
   * @param {object} weather2 - Weather data at point 2
   * @param {number} distance - Distance between points (miles)
   * @returns {number} Horizontal wind shear (knots per 100 miles)
   */
  static calculateHorizontalWindShear(weather1, weather2, distance) {
    if (!weather1 || !weather2 || !distance || distance === 0) return 0;
    
    const windSpeed1 = weather1.windSpeed || 0;
    const windSpeed2 = weather2.windSpeed || 0;
    const windDir1 = weather1.windDirection || 0;
    const windDir2 = weather2.windDirection || 0;
    
    // Calculate vector components
    const u1 = windSpeed1 * Math.cos(windDir1 * Math.PI / 180);
    const v1 = windSpeed1 * Math.sin(windDir1 * Math.PI / 180);
    const u2 = windSpeed2 * Math.cos(windDir2 * Math.PI / 180);
    const v2 = windSpeed2 * Math.sin(windDir2 * Math.PI / 180);
    
    // Calculate magnitude of wind vector difference
    const du = u2 - u1;
    const dv = v2 - v1;
    const vectorDiff = Math.sqrt(du * du + dv * dv);
    
    // Normalize to per 100 miles
    const shear = (vectorDiff / distance) * 100;
    
    return shear;
  }

  /**
   * Assess turbulence based on wind shear (more accurate than wind speed alone)
   * @param {number} verticalShear - Vertical wind shear (knots/1000ft)
   * @param {number} horizontalShear - Horizontal wind shear (knots/100mi)
   * @returns {string} Turbulence level based on shear
   */
  static assessWindShearTurbulence(verticalShear, horizontalShear) {
    // Vertical shear thresholds (primary indicator)
    // Based on aviation meteorology standards
    if (verticalShear > 12) return 'Severe';           // >12 kt/1000ft
    if (verticalShear > 8) return 'Moderate to Severe'; // 8-12 kt/1000ft
    if (verticalShear > 5) return 'Moderate';           // 5-8 kt/1000ft
    if (verticalShear > 3) return 'Light to Moderate';  // 3-5 kt/1000ft
    
    // Horizontal shear thresholds (secondary indicator)
    if (horizontalShear > 20) return 'Moderate';        // Significant horizontal shear
    if (horizontalShear > 10) return 'Light to Moderate';
    
    return 'Light';
  }

  /**
   * Parse cloud types from weather description to identify turbulence indicators
   * @param {string} description - Weather description from API
   * @returns {object} Cloud analysis with turbulence risk
   */
  static parseCloudTypes(description) {
    if (!description) return { hasTurbulentClouds: false, severity: 'None', types: [] };
    
    const desc = description.toUpperCase();
    const turbulentTypes = [];
    let maxSeverity = 'None';
    
    // Critical turbulence indicators
    if (desc.includes('CUMULONIMBUS') || desc.includes(' CB ') || desc.includes('THUNDERSTORM')) {
      turbulentTypes.push('Cumulonimbus');
      maxSeverity = 'Severe'; // CB = Severe turbulence
    }
    
    if (desc.includes('TOWERING CUMULUS') || desc.includes(' TCU ')) {
      turbulentTypes.push('Towering Cumulus');
      if (maxSeverity !== 'Severe') maxSeverity = 'Moderate to Severe';
    }
    
    if (desc.includes('ALTOCUMULUS CASTELLANUS') || desc.includes('CASTELLANUS')) {
      turbulentTypes.push('Altocumulus Castellanus');
      if (!maxSeverity || maxSeverity === 'None') maxSeverity = 'Moderate'; // CAT indicator
    }
    
    if (desc.includes('CONVECTIVE') || desc.includes('UNSTABLE')) {
      turbulentTypes.push('Convective Activity');
      if (!maxSeverity || maxSeverity === 'None' || maxSeverity === 'Light') {
        maxSeverity = 'Moderate';
      }
    }
    
    // Moderate turbulence indicators
    if (desc.includes('CUMULUS') && !desc.includes('CUMULONIMBUS')) {
      turbulentTypes.push('Cumulus');
      if (!maxSeverity || maxSeverity === 'None') maxSeverity = 'Light to Moderate';
    }
    
    return {
      hasTurbulentClouds: turbulentTypes.length > 0,
      severity: maxSeverity,
      types: turbulentTypes,
      description: description
    };
  }

  /**
   * Calculate temperature gradient (lapse rate) between waypoints
   * Large temperature changes indicate frontal systems or atmospheric instability
   * @param {number} temp1 - Temperature at point 1 (Celsius)
   * @param {number} temp2 - Temperature at point 2 (Celsius)
   * @param {number} distance - Distance between points (miles)
   * @returns {number} Temperature gradient (°C per 100 miles)
   */
  static calculateTemperatureGradient(temp1, temp2, distance) {
    if (!distance || distance === 0) return 0;
    
    const tempDiff = Math.abs(temp2 - temp1);
    const gradient = (tempDiff / distance) * 100; // Per 100 miles
    
    return gradient;
  }

  /**
   * Assess turbulence from temperature gradient
   * @param {number} gradient - Temperature gradient (°C/100mi)
   * @returns {string} Turbulence contribution from temperature changes
   */
  static assessTemperatureGradientTurbulence(gradient) {
    // Large temperature changes indicate frontal systems
    if (gradient > 10) return 'Moderate';  // Strong frontal system
    if (gradient > 5) return 'Light to Moderate';  // Moderate front
    if (gradient > 3) return 'Light';      // Weak front
    return 'None';
  }

  /**
   * Calculate turbulence using Phase 1 enhancements (wind shear, clouds, temp gradients)
   * @param {array} weatherData - Weather data points
   * @param {object} phase - Flight phase info (optional)
   * @param {object} weatherAdvisories - Advisory data (optional)
   * @returns {string} Turbulence level
   */
  static calculateTurbulenceWithPhase1(weatherData, phase = null, weatherAdvisories = null) {
    if (!weatherData || weatherData.length === 0) return 'Light';
    
    const turbulenceLevels = [];
    
    for (let i = 0; i < weatherData.length; i++) {
      const current = weatherData[i];
      let levelAtPoint = 'Light';
      
      // Get weather from correct structure
      const weather = current.weather || current.baseWeather || current;
      if (!weather) continue;
      
      // Factor 1: Cloud types
      if (weather.description) {
        const cloudAnalysis = this.parseCloudTypes(weather.description);
        if (cloudAnalysis.hasTurbulentClouds) {
          levelAtPoint = cloudAnalysis.severity;
        }
      }
      
      // Factor 2: Horizontal wind shear (between points)
      if (i > 0 && weatherData[i-1]) {
        const prevWeather = weatherData[i-1].weather || weatherData[i-1].baseWeather || weatherData[i-1];
        const distance = this.calculateDistance(
          weatherData[i-1].coordinates[0], weatherData[i-1].coordinates[1],
          current.coordinates[0], current.coordinates[1]
        );
        
        if (distance > 0 && prevWeather.windSpeed && weather.windSpeed) {
          const horizShear = this.calculateHorizontalWindShear(prevWeather, weather, distance);
          const shearLevel = this.assessWindShearTurbulence(0, horizShear);
          
          if (this.getSeverityValue(shearLevel) > this.getSeverityValue(levelAtPoint)) {
            levelAtPoint = shearLevel;
          }
        }
      }
      
      turbulenceLevels.push(levelAtPoint);
    }
    
    // Find most common level
    if (turbulenceLevels.length === 0) return 'Light';
    
    const counts = {};
    turbulenceLevels.forEach(level => {
      counts[level] = (counts[level] || 0) + 1;
    });
    
    let mostCommon = 'Light';
    let maxCount = 0;
    Object.entries(counts).forEach(([level, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = level;
      }
    });
    
    return mostCommon;
  }

  /**
   * Fetch PIREPs (Pilot Reports) for a route
   * These are REAL turbulence reports from actual flights - most reliable source!
   * @param {array} routeCoordinates - Route waypoints [[lat, lon], ...]
   * @returns {Promise<object>} PIREP data with turbulence reports
   */
  static async getPirepsForRoute(routeCoordinates) {
    try {
      const response = await axios.get('https://aviationweather.gov/api/data/pirep', {
        params: { 
          format: 'json'
          // Note: age parameter causes 400 error, fetch all recent PIREPs
        },
        timeout: 8000,
        headers: {
          'User-Agent': 'Turbulens-App/1.0'
        }
      });

      if (response.status === 204 || !response.data || response.data.length === 0) {
        console.log('[PIREP] No recent pilot reports available');
        return { hasPireps: false, turbulenceReports: [] };
      }

      // Filter PIREPs for turbulence and proximity to route
      const turbulencePireps = response.data.filter(pirep => {
        // Must have turbulence data
        if (!pirep.turbulence || !pirep.turbulenceIntensity) return false;
        
        // Must have coordinates
        if (!pirep.lat || !pirep.lon) return false;
        
        // Check if PIREP is near the route (within 100 miles)
        return routeCoordinates.some(waypoint => {
          const distance = this.calculateDistance(
            pirep.lat, pirep.lon,
            waypoint[0], waypoint[1]
          );
          return distance < 100; // Within 100 miles of route
        });
      });

      console.log(`[PIREP] Found ${turbulencePireps.length} turbulence reports near route`);

      // Parse and categorize PIREPs
      const turbulenceReports = turbulencePireps.map(pirep => {
        const intensity = (pirep.turbulenceIntensity || '').toUpperCase();
        
        // Map PIREP intensity to our severity levels
        let severity = 'Light';
        if (intensity.includes('SEV') || intensity.includes('EXTREME')) {
          severity = 'Severe';
        } else if (intensity.includes('MOD')) {
          severity = 'Moderate';
        } else if (intensity.includes('LGT') || intensity.includes('LIGHT')) {
          severity = 'Light';
        }
        
        return {
          severity: severity,
          altitude: pirep.altitude || pirep.altitudeFt || null,
          location: { lat: pirep.lat, lon: pirep.lon },
          time: pirep.observationTime || pirep.time,
          aircraftType: pirep.aircraftType || 'Unknown',
          raw: pirep.rawPirep || '',
          type: pirep.turbulenceType || 'Unknown'
        };
      });

      return {
        hasPireps: turbulenceReports.length > 0,
        turbulenceReports: turbulenceReports,
        mostSevere: this.getMostSeverePirep(turbulenceReports)
      };

    } catch (error) {
      if (error.response?.status === 204) {
        console.log('[PIREP] No recent pilot reports (status 204)');
        return { hasPireps: false, turbulenceReports: [] };
      }
      console.warn('[PIREP] Failed to fetch:', error.message);
      return { hasPireps: false, turbulenceReports: [], error: error.message };
    }
  }

  /**
   * Get the most severe PIREP from a list
   * @param {array} pireps - Array of PIREP objects
   * @returns {object|null} Most severe PIREP
   */
  static getMostSeverePirep(pireps) {
    if (!pireps || pireps.length === 0) return null;
    
    return pireps.reduce((most, current) => {
      if (!most) return current;
      return this.getSeverityValue(current.severity) > this.getSeverityValue(most.severity) 
        ? current : most;
    }, null);
  }

  // ============================================================================
  // END PHASE 1 ENHANCEMENTS
  // ============================================================================

  // Generate great circle path between two airports
  static generateGreatCirclePath(lat1, lng1, lat2, lng2, numPoints = 15) {
    const waypoints = [];
    
    // Normalize longitudes to [-180, 180] range
    let normalizedLng1 = lng1;
    let normalizedLng2 = lng2;
    
    while (normalizedLng1 > 180) normalizedLng1 -= 360;
    while (normalizedLng1 < -180) normalizedLng1 += 360;
    while (normalizedLng2 > 180) normalizedLng2 -= 360;
    while (normalizedLng2 < -180) normalizedLng2 += 360;
    
    // Check if route crosses antimeridian
    const lngDiff = Math.abs(normalizedLng2 - normalizedLng1);
    const crossesDateLine = lngDiff > 180;
    
    if (crossesDateLine) {
      // Route crosses antimeridian - handled by Leaflet antimeridian plugin
    }
    
    // Convert to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lng1Rad = normalizedLng1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lng2Rad = normalizedLng2 * Math.PI / 180;
    
    // Calculate great circle distance
    const d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((lat2Rad - lat1Rad) / 2), 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.pow(Math.sin((lng2Rad - lng1Rad) / 2), 2)
    ));
    
    // Generate waypoints along great circle
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const A = Math.sin((1 - fraction) * d) / Math.sin(d);
      const B = Math.sin(fraction * d) / Math.sin(d);
      
      const x = A * Math.cos(lat1Rad) * Math.cos(lng1Rad) + B * Math.cos(lat2Rad) * Math.cos(lng2Rad);
      const y = A * Math.cos(lat1Rad) * Math.sin(lng1Rad) + B * Math.cos(lat2Rad) * Math.sin(lng2Rad);
      const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
      
      let lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
      let lng = Math.atan2(y, x) * 180 / Math.PI;
      
      // Keep original longitude values for antimeridian plugin to handle
      waypoints.push([lat, lng]);
    }
    
    return waypoints;
  }

  // Get airport coordinates by IATA code
  static async getAirportCoordinates(iataCode) {
    try {
      const coordinates = await this.airportService.getAirportCoordinates(iataCode);
      if (coordinates) {
        return coordinates;
      }
      
      // Fallback to hardcoded database for any missing airports
      const fallbackAirports = {
        'JFK': { lat: 40.6413, lng: -73.7781, name: 'John F. Kennedy International Airport' },
        'LAX': { lat: 33.9416, lng: -118.4085, name: 'Los Angeles International Airport' },
        'LHR': { lat: 51.47, lng: -0.4543, name: 'London Heathrow Airport' },
        'CDG': { lat: 49.0097, lng: 2.5479, name: 'Charles de Gaulle Airport' },
        'DEN': { lat: 39.8561, lng: -104.6737, name: 'Denver International Airport' },
        'SEA': { lat: 47.4502, lng: -122.3088, name: 'Seattle-Tacoma International Airport' },
        'ATL': { lat: 33.6407, lng: -84.4277, name: 'Hartsfield-Jackson Atlanta International Airport' },
        'MIA': { lat: 25.7932, lng: -80.2906, name: 'Miami International Airport' },
        'SFO': { lat: 37.6189, lng: -122.375, name: 'San Francisco International Airport' },
        'OAK': { lat: 37.7214, lng: -122.2208, name: 'Oakland International Airport' },
        'DEL': { lat: 28.5562, lng: 77.1000, name: 'Indira Gandhi International Airport' },
        'ORD': { lat: 41.9786, lng: -87.9048, name: 'O\'Hare International Airport' },
        'DFW': { lat: 32.8968, lng: -97.0380, name: 'Dallas/Fort Worth International Airport' },
        'LAS': { lat: 36.0840, lng: -115.1537, name: 'McCarran International Airport' },
        'PHX': { lat: 33.4342, lng: -112.0116, name: 'Phoenix Sky Harbor International Airport' },
        'IAH': { lat: 29.9902, lng: -95.3368, name: 'George Bush Intercontinental Airport' },
        'CLT': { lat: 35.2140, lng: -80.9431, name: 'Charlotte Douglas International Airport' },
        'MCO': { lat: 28.4312, lng: -81.3081, name: 'Orlando International Airport' },
        'EWR': { lat: 40.6895, lng: -74.1745, name: 'Newark Liberty International Airport' },
        'BOS': { lat: 42.3656, lng: -71.0096, name: 'Logan International Airport' },
        'DTW': { lat: 42.2162, lng: -83.3554, name: 'Detroit Metropolitan Airport' }
      };
      
      return fallbackAirports[iataCode.toUpperCase()] || null;
    } catch (error) {
      console.error(`Error getting airport coordinates for ${iataCode}:`, error.message);
      return null;
    }
  }

  // Get all airports from AirportService
  static async getAllAirports() {
    try {
      return await this.airportService.getAllAirports();
    } catch (error) {
      console.error('Error getting all airports:', error.message);
      return [];
    }
  }

  // Get weather data for coordinates
  static async getWeatherForCoordinates(coordinates) {
    const weatherData = [];
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    // Process coordinates in parallel batches to reduce timeout risk
    const batchSize = 5; // Process 5 waypoints at a time
    const batches = [];
    
    for (let i = 0; i < coordinates.length; i += batchSize) {
      batches.push(coordinates.slice(i, i + batchSize));
    }
    
    
    for (const batch of batches) {
      const batchPromises = batch.map(async ([lat, lng]) => {
        if (lat === null || lng === null) return null; // Skip split markers
        
        try {
          if (!apiKey) {
            throw new Error('OpenWeather API key not found');
          }
          
          // Make API call to OpenWeatherMap with timeout
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`,
            { timeout: 8000 } // 8 second timeout per request
          );
          
          const weather = response.data;
          return {
            coordinates: [lat, lng],
            weather: {
              windSpeed: weather.wind?.speed || 0, // Wind speed in mph
              temperature: weather.main?.temp || 0, // Temperature in °F
              humidity: weather.main?.humidity || 0, // Humidity %
              pressure: weather.main?.pressure || 0, // Pressure in hPa
              description: weather.weather?.[0]?.description || 'Unknown'
            }
          };
          
        } catch (error) {
          throw new Error(`Failed to fetch weather for [${lat}, ${lng}]: ${error.message}`);
        }
      });
      
      // Wait for batch to complete with timeout
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            weatherData.push(result.value);
          }
        });
      } catch (error) {
        // Continue with next batch
      }
    }
    
    return weatherData;
  }

  // Enhanced multi-altitude weather data collection
  static async getMultiAltitudeWeather(coordinates, altitudeRanges) {
    const weatherData = [];
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenWeather API key not found');
    }
    
    // Process coordinates in smaller batches for multi-altitude requests
    const batchSize = 3; // Smaller batches for multi-altitude requests
    const batches = [];
    
    for (let i = 0; i < coordinates.length; i += batchSize) {
      batches.push(coordinates.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async ([lat, lng]) => {
        if (lat === null || lng === null) return null;
        
        try {
          // Get base weather data
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`,
            { timeout: 8000 }
          );
          
          const baseWeather = response.data;
          const altitudeWeather = {};
          
          // Calculate weather at different altitudes
          for (const range of altitudeRanges) {
            const altitude = (range.min + range.max) / 2; // Use midpoint
            
            // Adjust wind speed based on altitude (wind typically increases with altitude)
            const altitudeFactor = Math.min(1 + (altitude / 10000) * 0.8, 2.5);
            const adjustedWindSpeed = (baseWeather.wind?.speed || 0) * altitudeFactor;
            
            // Calculate temperature at altitude (standard lapse rate: 6.5°C per 1000m)
            const altitudeTemp = (baseWeather.main?.temp || 0) - (altitude / 1000 * 11.7); // Convert to Fahrenheit
            
            // Calculate pressure at altitude (barometric formula)
            const altitudePressure = (baseWeather.main?.pressure || 1013.25) * Math.exp(-altitude / 7400);
            
            altitudeWeather[altitude] = {
              windSpeed: adjustedWindSpeed,
              temperature: altitudeTemp,
              pressure: altitudePressure,
              humidity: baseWeather.main?.humidity || 0,
              description: baseWeather.weather?.[0]?.description || 'Unknown'
            };
          }
          
          return {
            coordinates: [lat, lng],
            altitudeWeather: altitudeWeather,
            baseWeather: {
              windSpeed: baseWeather.wind?.speed || 0,
              temperature: baseWeather.main?.temp || 0,
              humidity: baseWeather.main?.humidity || 0,
              pressure: baseWeather.main?.pressure || 0,
              description: baseWeather.weather?.[0]?.description || 'Unknown'
            }
          };
          
        } catch (error) {
          console.warn(`Failed to get multi-altitude weather for [${lat}, ${lng}]: ${error.message}`);
          return null;
        }
      });
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            weatherData.push(result.value);
          }
        });
      } catch (error) {
        // Continue with next batch
      }
    }
    
    return weatherData;
  }

  // Helper: Extract advisories from either old (gairmetAdvisories) or new (weatherAdvisories) format
  static getAdvisoriesFromFormat(advisories) {
    if (!advisories) return { hasAdvisories: false, advisories: [] };
    
    // New format (weatherAdvisories with combined structure)
    if (advisories.combinedAdvisories || (advisories.gairmets && advisories.sigmets)) {
      return {
        hasAdvisories: advisories.hasAdvisories || false,
        advisories: advisories.advisories || [],
        gairmets: advisories.gairmets || { hasAdvisories: false, advisories: [] },
        sigmets: advisories.sigmets || { hasAdvisories: false, advisories: [] }
      };
    }
    
    // Old format (gairmetAdvisories)
    return advisories;
  }

  // Helper: Analyze combined advisories with SIGMET priority
  static analyzeCombinedAdvisoryImpact(weatherAdvisories, weatherData) {
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    
    if (!advisoryData.hasAdvisories || !advisoryData.advisories || advisoryData.advisories.length === 0) {
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null, totalWeight: 0 };
    }

    // Separate SIGMETs and G-AIRMETs
    const sigmets = advisoryData.advisories.filter(a => a.type === 'SIGMET');
    const gairmets = advisoryData.advisories.filter(a => a.type === 'G-AIRMET');

    let highestSeverity = null;
    let maxWeight = 0;
    let totalWeight = 0;

    // SIGMETs have priority - check them first
    if (sigmets.length > 0) {
      const sigmetAnalysis = this.analyzeAdvisoriesImpact(sigmets, weatherData, true);
      if (sigmetAnalysis.recommendedLevel && (sigmetAnalysis.totalWeight || 0) > maxWeight) {
        highestSeverity = sigmetAnalysis.recommendedLevel;
        maxWeight = sigmetAnalysis.totalWeight || 0;
      }
      totalWeight += sigmetAnalysis.totalWeight || 0;
    }

    // Then check G-AIRMETs if no SIGMET or if they suggest higher severity
    if (gairmets.length > 0) {
      const gairmetAnalysis = this.analyzeGAirmetImpact(gairmets, weatherData);
      const gairmetWeight = gairmetAnalysis.totalWeight || (gairmets.length * 1.0);
      
      // Only consider G-AIRMET if it's higher severity than SIGMET
      const gairmetSeverityValue = this.getSeverityValue(gairmetAnalysis.recommendedLevel);
      const currentSeverityValue = highestSeverity ? this.getSeverityValue(highestSeverity) : 0;
      
      if (gairmetSeverityValue > currentSeverityValue || !highestSeverity) {
        highestSeverity = gairmetAnalysis.recommendedLevel;
        maxWeight = Math.max(maxWeight, gairmetWeight);
      }
      totalWeight += gairmetWeight;
    }

    return {
      shouldUpgrade: !!highestSeverity,
      shouldDowngrade: false,
      recommendedLevel: highestSeverity || 'Moderate',
      totalWeight: totalWeight,
      hasSigmets: sigmets.length > 0,
      hasGairmets: gairmets.length > 0
    };
  }

  // Helper: Analyze advisories impact (works for both SIGMETs and G-AIRMETs)
  static analyzeAdvisoriesImpact(advisories, weatherData, isSigmets = false) {
    if (!advisories || advisories.length === 0) {
      return { shouldUpgrade: false, recommendedLevel: null, totalWeight: 0 };
    }

    let totalWeight = 0;
    const severityCounts = { Severe: 0, Moderate: 0, Light: 0 };

    advisories.forEach(advisory => {
      const weight = advisory.weight || (isSigmets ? 2.0 : 1.0);
      totalWeight += weight;
      
      const severity = advisory.severity || 'Moderate';
      severityCounts[severity] = (severityCounts[severity] || 0) + weight;
    });

    // Determine recommended level based on weighted severity
    let recommendedLevel = 'Moderate';
    if (severityCounts.Severe > severityCounts.Moderate && severityCounts.Severe > severityCounts.Light) {
      recommendedLevel = 'Severe';
    } else if (severityCounts.Moderate > severityCounts.Light) {
      recommendedLevel = 'Moderate';
    } else {
      recommendedLevel = 'Light';
    }

    return {
      shouldUpgrade: true,
      recommendedLevel: recommendedLevel,
      totalWeight: totalWeight
    };
  }

  // Calculate turbulence based on weather data and weather advisories (G-AIRMETs + SIGMETs)
  // PHASE 1 ENHANCED: Now uses wind shear, cloud types, and temperature gradients
  static calculateTurbulence(weatherData, weatherAdvisories = null) {
    if (!weatherData || weatherData.length === 0) return 'Unknown';
    
    const validWeather = weatherData.filter(w => w.weather && w.weather.windSpeed != null);
    if (validWeather.length === 0) return 'Unknown';
    
    // PHASE 1: Calculate turbulence using WIND SHEAR (not just wind speed!)
    const turbulenceLevels = [];
    const turbulenceFactors = []; // Track what's causing turbulence
    
    for (let i = 0; i < validWeather.length; i++) {
      const current = validWeather[i];
      let levelAtPoint = 'Light'; // Default
      const factors = [];
      
      // Factor 1: CLOUD TYPE ANALYSIS (Critical!)
      if (current.weather.description) {
        const cloudAnalysis = this.parseCloudTypes(current.weather.description);
        if (cloudAnalysis.hasTurbulentClouds) {
          levelAtPoint = cloudAnalysis.severity;
          factors.push(`Clouds: ${cloudAnalysis.types.join(', ')}`);
        }
      }
      
      // Factor 2: HORIZONTAL WIND SHEAR (between waypoints)
      if (i > 0) {
        const previous = validWeather[i - 1];
        const distance = this.calculateDistance(
          previous.coordinates[0], previous.coordinates[1],
          current.coordinates[0], current.coordinates[1]
        );
        
        if (distance > 0) {
          const horizShear = this.calculateHorizontalWindShear(
            previous.weather, current.weather, distance
          );
          const shearLevel = this.assessWindShearTurbulence(0, horizShear);
          
          if (this.getSeverityValue(shearLevel) > this.getSeverityValue(levelAtPoint)) {
            levelAtPoint = shearLevel;
            factors.push(`Horizontal wind shear: ${horizShear.toFixed(1)} kt/100mi`);
          }
        }
        
        // Factor 3: TEMPERATURE GRADIENT (frontal systems)
        if (previous.weather.temperature && current.weather.temperature && distance > 0) {
          const tempGradient = this.calculateTemperatureGradient(
            previous.weather.temperature,
            current.weather.temperature,
            distance
          );
          const tempLevel = this.assessTemperatureGradientTurbulence(tempGradient);
          
          if (tempLevel !== 'None' && 
              this.getSeverityValue(tempLevel) > this.getSeverityValue(levelAtPoint)) {
            levelAtPoint = tempLevel;
            factors.push(`Temperature gradient: ${tempGradient.toFixed(1)}°C/100mi`);
          }
        }
      }
      
      // Factor 4: High wind speed as secondary indicator (jet streams can be smooth)
      // Only upgrade if no other factors have triggered
      if (levelAtPoint === 'Light') {
        const windSpeed = current.weather.windSpeed;
        if (windSpeed > 150) {
          levelAtPoint = 'Light to Moderate'; // High winds alone = minor turbulence
          factors.push(`High winds: ${windSpeed} knots`);
        }
      }
      
      turbulenceLevels.push(levelAtPoint);
      if (factors.length > 0) {
        turbulenceFactors.push({ point: i, level: levelAtPoint, factors });
      }
    }
    
    // Log what factors are causing turbulence (for debugging)
    if (turbulenceFactors.length > 0) {
      console.log('[Phase 1] Turbulence factors detected:', 
        turbulenceFactors.slice(0, 3).map(f => `${f.level}: ${f.factors[0]}`).join('; '));
    }
    
    // Count occurrences
    const turbulenceCounts = {};
    turbulenceLevels.forEach(level => {
      turbulenceCounts[level] = (turbulenceCounts[level] || 0) + 1;
    });
    
    // Find most common level
    let mostCommonLevel = 'Light';
    let maxCount = 0;
    
    Object.entries(turbulenceCounts).forEach(([level, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonLevel = level;
      }
    });
    
    // Upgrade based on percentages
    const totalPoints = turbulenceLevels.length;
    const severeCount = turbulenceCounts['Severe'] || 0;
    const moderateToSevereCount = turbulenceCounts['Moderate to Severe'] || 0;
    const moderateCount = turbulenceCounts['Moderate'] || 0;
    
    let finalLevel = mostCommonLevel;
    
    if (severeCount / totalPoints > 0.2) {
      finalLevel = 'Severe';
    } else if ((severeCount + moderateToSevereCount) / totalPoints > 0.3) {
      finalLevel = 'Moderate to Severe';
    } else if ((severeCount + moderateToSevereCount + moderateCount) / totalPoints > 0.4) {
      finalLevel = 'Moderate';
    }
    
    // Enhance with weather advisory data if available (G-AIRMETs + SIGMETs)
    if (weatherAdvisories) {
      const advisoryAnalysis = this.analyzeCombinedAdvisoryImpact(weatherAdvisories, weatherData);
      
      if (advisoryAnalysis.shouldUpgrade && advisoryAnalysis.recommendedLevel) {
        const currentLevelValue = this.getSeverityValue(finalLevel);
        const advisoryLevelValue = this.getSeverityValue(advisoryAnalysis.recommendedLevel);
        
        // SIGMETs have stronger influence
        const upgradeThreshold = advisoryAnalysis.hasSigmets ? 0.0 : 0.2;
        
        // Special handling: Always upgrade from "Light" if advisory suggests higher
        if (finalLevel === 'Light' && advisoryLevelValue > currentLevelValue) {
          finalLevel = advisoryAnalysis.recommendedLevel;
        }
        // Special handling: Always upgrade from "Light to Moderate" if advisory suggests "Moderate" or higher
        else if (finalLevel === 'Light to Moderate' && advisoryLevelValue >= this.getSeverityValue('Moderate')) {
          finalLevel = advisoryAnalysis.recommendedLevel;
        }
        // SIGMETs: Always upgrade (they're immediate/urgent)
        else if (advisoryAnalysis.hasSigmets && advisoryLevelValue > currentLevelValue) {
          finalLevel = advisoryAnalysis.recommendedLevel;
        }
        // G-AIRMETs: Use threshold
        else if (advisoryLevelValue > currentLevelValue + upgradeThreshold) {
          finalLevel = advisoryAnalysis.recommendedLevel;
        }
      }
    }
    
    return finalLevel;
  }

  // Phase-specific turbulence calculation (PHASE 1 ENHANCED)
  static calculatePhaseTurbulence(phase, multiAltitudeWeather, weatherAdvisories) {
    // Filter weather data for this phase's waypoints
    const phaseWeather = multiAltitudeWeather.filter(w => {
      if (!w || !w.coordinates) return false;
      return phase.waypoints.some(wp => {
        const latDiff = Math.abs(wp[0] - w.coordinates[0]);
        const lngDiff = Math.abs(wp[1] - w.coordinates[1]);
        return latDiff < 0.1 && lngDiff < 0.1; // Within 0.1 degrees
      });
    });
    
    // PHASE 1 FIX: If no weather data, use simpler fallback with phase waypoints
    if (phaseWeather.length === 0) {
      console.log(`[Phase 1] No weather data for ${phase.name}, using waypoint-based estimation`);
      // Try to calculate from phase waypoints directly if we have weather data anywhere
      if (multiAltitudeWeather.length > 0) {
        // Use closest weather points
        const closestWeather = phase.waypoints.map(wp => {
          const closest = multiAltitudeWeather.reduce((best, current) => {
            if (!current.coordinates) return best;
            const dist = Math.sqrt(
              Math.pow(wp[0] - current.coordinates[0], 2) +
              Math.pow(wp[1] - current.coordinates[1], 2)
            );
            return !best || dist < best.distance ? { weather: current, distance: dist } : best;
          }, null);
          return closest ? closest.weather : null;
        }).filter(Boolean);
        
        if (closestWeather.length > 0) {
          // Use Phase 1 enhanced calculation on closest weather
          return this.calculateTurbulenceWithPhase1(closestWeather, phase, weatherAdvisories);
        }
      }
      return 'Light'; // Safe default instead of Unknown
    }
    
    // Determine appropriate altitudes for this phase
    let relevantAltitudes;
    if (phase.phaseType === 'cruise') {
      relevantAltitudes = [35000]; // Cruise altitude
    } else if (phase.phaseType === 'climb') {
      // Climb phase: check multiple altitude bands (0-30k ft in 5k intervals)
      relevantAltitudes = [2500, 7500, 12500, 17500, 22500, 27500]; // Mid-points of each 5k band
    } else if (phase.phaseType === 'descent') {
      // Descent phase: check multiple altitude bands (30k-0 ft in 5k intervals)
      relevantAltitudes = [27500, 22500, 17500, 12500, 7500, 2500]; // Mid-points of each 5k band
    } else {
      relevantAltitudes = [35000]; // Default to cruise
    }
    
    // PHASE 1 ENHANCED: Use cloud types, wind shear, and temperature gradients
    // Calculate turbulence using Phase 1 methods instead of just wind speed
    const phaseTurbulenceLevel = this.calculateTurbulenceWithPhase1(phaseWeather, phase, weatherAdvisories);
    
    // If Phase 1 gave us a level, use it directly
    if (phaseTurbulenceLevel && phaseTurbulenceLevel !== 'Light') {
      console.log(`[Phase 1] ${phase.name}: ${phaseTurbulenceLevel} (cloud types + wind shear analysis)`);
      return phaseTurbulenceLevel;
    }
    
    // Otherwise, continue with multi-altitude analysis as backup
    const allTurbulenceLevels = [];
    
    // For each relevant altitude, calculate turbulence
    relevantAltitudes.forEach(altitude => {
      const altitudeTurbulenceLevels = phaseWeather.map(w => {
        let levelAtPoint = 'Light';
        
        // Get weather from correct structure
        const weather = w.altitudeWeather?.[altitude] || w.baseWeather || w.weather;
        if (!weather) return 'Light';
        
        // PHASE 1: Check cloud types first (most important!)
        if (weather.description) {
          const cloudAnalysis = this.parseCloudTypes(weather.description);
          if (cloudAnalysis.hasTurbulentClouds) {
            levelAtPoint = cloudAnalysis.severity;
            console.log(`[Phase 1 Cloud] ${phase.name} at ${altitude}ft: ${cloudAnalysis.types.join(', ')} → ${levelAtPoint}`);
            return levelAtPoint;
          }
        }
        
        // PHASE 1: If no cloud-based turbulence, check wind conditions
        // But don't use absolute wind speed - it's not a good indicator
        const windSpeed = weather.windSpeed || 0;
        
        // Only upgrade to Light to Moderate if winds are very high (>100mph)
        // High winds alone rarely cause turbulence without shear
        if (windSpeed > 100) {
          levelAtPoint = 'Light to Moderate';
        }
        
        return levelAtPoint;
      });
      
      // Add all turbulence levels from this altitude to the overall collection
      allTurbulenceLevels.push(...altitudeTurbulenceLevels);
    });
    
    // Calculate overall turbulence level for this phase based on all altitude bands
    const turbulenceLevels = allTurbulenceLevels;
    
    // Calculate base turbulence level for this phase (use most common, no percentage upgrades)
    let baseTurbulence = this.calculatePhaseTurbulenceSimple(turbulenceLevels);
    
    // Debug logging for LHR-JFK route
    if (phase.name === 'Climb' || phase.name === 'Descent') {
      console.log(`[${phase.name}] Total turbulence samples: ${turbulenceLevels.length}`);
      const turbulenceCounts = {};
      turbulenceLevels.forEach(level => {
        turbulenceCounts[level] = (turbulenceCounts[level] || 0) + 1;
      });
      console.log(`[${phase.name}] Turbulence distribution:`, turbulenceCounts);
      console.log(`[${phase.name}] Final phase turbulence: ${baseTurbulence}`);
    }
    
    // Apply phase-specific weather advisory analysis (G-AIRMETs + SIGMETs)
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    if (advisoryData && advisoryData.hasAdvisories) {
      const currentLevelValue = this.getSeverityValue(baseTurbulence);
      let upgradedTurbulence = baseTurbulence;
      let maxAdvisoryLevel = currentLevelValue;
      
      // Filter advisories by type
      const gairmets = advisoryData.advisories.filter(a => a.type === 'G-AIRMET');
      const sigmets = advisoryData.advisories.filter(a => a.type === 'SIGMET');
      
      // Check G-AIRMETs (only for phases in US airspace)
      const phaseInUSAirspace = this.phaseInUSAirspace(phase);
      if (phaseInUSAirspace && gairmets.length > 0) {
        const phaseGAirmetAnalysis = this.analyzePhaseGAirmetImpact(gairmets, phase);
        
        if (phaseGAirmetAnalysis.shouldUpgrade) {
          const gairmetLevelValue = this.getSeverityValue(phaseGAirmetAnalysis.recommendedLevel);
          if (gairmetLevelValue > maxAdvisoryLevel) {
            maxAdvisoryLevel = gairmetLevelValue;
            console.log(`[${phase.name}] G-AIRMET upgrade: ${baseTurbulence} → ${phaseGAirmetAnalysis.recommendedLevel}`);
          }
        }
      }
      
      // Check SIGMETs (worldwide coverage - always check)
      if (sigmets.length > 0) {
        const phaseSigmetAnalysis = this.analyzePhaseGAirmetImpact(sigmets, phase);
        
        if (phaseSigmetAnalysis.shouldUpgrade) {
          const sigmetLevelValue = this.getSeverityValue(phaseSigmetAnalysis.recommendedLevel);
          if (sigmetLevelValue > maxAdvisoryLevel) {
            maxAdvisoryLevel = sigmetLevelValue;
            console.log(`[${phase.name}] SIGMET upgrade: ${baseTurbulence} → ${phaseSigmetAnalysis.recommendedLevel}`);
          }
        }
      }
      
      // Apply the highest advisory level found
      if (maxAdvisoryLevel > currentLevelValue) {
        const advisoryLevelDifference = maxAdvisoryLevel - currentLevelValue;
        
        if (phase.phaseType === 'cruise') {
          const upgradeAmount = advisoryLevelDifference * 0.7;
          upgradedTurbulence = this.getSeverityFromValue(currentLevelValue + upgradeAmount);
        } else if (phase.phaseType === 'climb' || phase.phaseType === 'descent') {
          const upgradeAmount = advisoryLevelDifference * 0.4;
          upgradedTurbulence = this.getSeverityFromValue(currentLevelValue + upgradeAmount);
        }
        
        baseTurbulence = upgradedTurbulence;
      }
    }
    
    return baseTurbulence;
  }

  // Calculate overall turbulence from individual levels
  static calculateOverallTurbulence(turbulenceLevels, weatherAdvisories = null) {
    if (!turbulenceLevels || turbulenceLevels.length === 0) return 'Unknown';
    
    // Count occurrences
    const turbulenceCounts = {};
    turbulenceLevels.forEach(level => {
      turbulenceCounts[level] = (turbulenceCounts[level] || 0) + 1;
    });
    
    // Find most common level
    let mostCommonLevel = 'Light';
    let maxCount = 0;
    
    Object.entries(turbulenceCounts).forEach(([level, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonLevel = level;
      }
    });
    
    // Upgrade based on percentages
    const totalPoints = turbulenceLevels.length;
    const severeCount = turbulenceCounts['Severe'] || 0;
    const moderateToSevereCount = turbulenceCounts['Moderate to Severe'] || 0;
    const moderateCount = turbulenceCounts['Moderate'] || 0;
    
    let finalLevel = mostCommonLevel;
    
    if (severeCount / totalPoints > 0.2) {
      finalLevel = 'Severe';
    } else if ((severeCount + moderateToSevereCount) / totalPoints > 0.3) {
      finalLevel = 'Moderate to Severe';
    } else if ((severeCount + moderateToSevereCount + moderateCount) / totalPoints > 0.4) {
      finalLevel = 'Moderate';
    }
    
    // Enhance with weather advisory data if available (G-AIRMETs + SIGMETs)
    if (!weatherAdvisories) return finalLevel;
    
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    if (advisoryData && advisoryData.hasAdvisories) {
      const advisoryAnalysis = this.analyzeCombinedAdvisoryImpact(weatherAdvisories, []);
      
      const currentLevelValue = this.getSeverityValue(finalLevel);
      const advisoryLevelValue = this.getSeverityValue(advisoryAnalysis.recommendedLevel);
      
      // SIGMETs have stronger influence
      const upgradeThreshold = advisoryAnalysis.hasSigmets ? 0.0 : 0.2;
      
      if (finalLevel === 'Light' && advisoryLevelValue > currentLevelValue) {
        finalLevel = advisoryAnalysis.recommendedLevel;
      } else if (finalLevel === 'Light to Moderate' && advisoryLevelValue >= this.getSeverityValue('Moderate')) {
        finalLevel = advisoryAnalysis.recommendedLevel;
      } else if (advisoryAnalysis.hasSigmets && advisoryLevelValue > currentLevelValue) {
        finalLevel = advisoryAnalysis.recommendedLevel; // SIGMETs: Always upgrade
      } else if (advisoryLevelValue > currentLevelValue + upgradeThreshold) {
        finalLevel = advisoryAnalysis.recommendedLevel;
      }
    }
    
    return finalLevel;
  }

  // Calculate weighted turbulence across phases
  static calculateWeightedTurbulence(phaseAnalysis) {
    if (!phaseAnalysis || phaseAnalysis.length === 0) return 'Unknown';
    
    // Weight phases by typical duration
    const phaseWeights = {
      'Climb': 0.15,    // 15% of flight time
      'Cruise': 0.70,   // 70% of flight time
      'Descent': 0.15   // 15% of flight time
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    let maxSeverity = 0; // Track highest severity across all phases
    
    phaseAnalysis.forEach(phase => {
      const weight = phaseWeights[phase.name] || 0.1;
      const severityValue = this.getSeverityValue(phase.turbulenceLevel);
      
      weightedSum += severityValue * weight;
      totalWeight += weight;
      maxSeverity = Math.max(maxSeverity, severityValue);
    });
    
    if (totalWeight === 0) return 'Unknown';
    
    const averageSeverity = weightedSum / totalWeight;
    
    // CRITICAL: If ANY phase has elevated turbulence (>1.5), ensure overall reflects this
    // Don't let averaging pull down the prediction if passengers will experience turbulence
    const finalSeverity = Math.max(averageSeverity, Math.min(maxSeverity, 2.5));
    // Cap at 2.5 (Light to Moderate) to prevent one phase from over-inflating overall
    
    return this.getSeverityFromValue(finalSeverity);
  }

  // Get departure and arrival airport weather
  static async getAirportWeather(departure, arrival) {
    try {
      const depCoords = await this.getAirportCoordinates(departure);
      const arrCoords = await this.getAirportCoordinates(arrival);
      
      if (!depCoords || !arrCoords) {
        throw new Error(`Airport coordinates not found: ${!depCoords ? departure : arrival}`);
      }
      
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeather API key not found');
      }
      
      // Get weather for both airports in parallel
      const [depWeatherResponse, arrWeatherResponse] = await Promise.all([
        axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${depCoords.lat}&lon=${depCoords.lng}&appid=${apiKey}&units=imperial`,
          { timeout: 8000 }
        ),
        axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${arrCoords.lat}&lon=${arrCoords.lng}&appid=${apiKey}&units=imperial`,
          { timeout: 8000 }
        )
      ]);
      
      const depWeather = depWeatherResponse.data;
      const arrWeather = arrWeatherResponse.data;
      
      return {
        departure: {
          airport: departure,
          coordinates: depCoords,
          weather: {
            windSpeed: depWeather.wind?.speed || 0,
            temperature: depWeather.main?.temp || 0,
            humidity: depWeather.main?.humidity || 0,
            pressure: depWeather.main?.pressure || 0,
            description: depWeather.weather?.[0]?.description || 'Unknown',
            visibility: depWeather.visibility / 1000 || 0 // Convert to km
          },
          turbulence: this.calculateGroundLevelTurbulence(depWeather.wind?.speed || 0),
          conditions: depWeather.weather?.[0]?.main || 'Unknown'
        },
        arrival: {
          airport: arrival,
          coordinates: arrCoords,
          weather: {
            windSpeed: arrWeather.wind?.speed || 0,
            temperature: arrWeather.main?.temp || 0,
            humidity: arrWeather.main?.humidity || 0,
            pressure: arrWeather.main?.pressure || 0,
            description: arrWeather.weather?.[0]?.description || 'Unknown',
            visibility: arrWeather.visibility / 1000 || 0 // Convert to km
          },
          turbulence: this.calculateGroundLevelTurbulence(arrWeather.wind?.speed || 0),
          conditions: arrWeather.weather?.[0]?.main || 'Unknown'
        }
      };
      
    } catch (error) {
      console.error(`Error getting airport weather for ${departure} to ${arrival}:`, error.message);
      return {
        departure: null,
        arrival: null,
        error: error.message
      };
    }
  }

  // Calculate ground-level turbulence based on wind speed
  static calculateGroundLevelTurbulence(windSpeed) {
    // Ground-level turbulence thresholds (much more lenient than high-altitude)
    // Ground-level winds are typically much calmer and less turbulent
    if (windSpeed < 25) return 'Light';           // Normal ground winds up to 25 mph
    if (windSpeed < 40) return 'Light to Moderate'; // Moderate ground winds 25-40 mph
    if (windSpeed < 55) return 'Moderate';        // Strong ground winds 40-55 mph
    if (windSpeed < 70) return 'Moderate to Severe'; // Very strong ground winds 55-70 mph
    return 'Severe';                              // Extreme ground winds 70+ mph
  }

  // Analyze airport weather impact on flight phases
  static analyzeAirportWeatherImpact(airportWeather, phaseAnalysis) {
    if (!airportWeather || !airportWeather.departure || !airportWeather.arrival) {
      return {
        departureImpact: 'Unknown',
        arrivalImpact: 'Unknown',
        overallImpact: 'Unknown'
      };
    }
    
    // Analyze departure weather impact on climb phase
    let departureImpact = 'Minimal';
    const climbPhase = phaseAnalysis.find(p => p.phaseType === 'climb');
    const hasClimbTurbulence = climbPhase && ['Moderate', 'Moderate to Severe', 'Severe'].includes(climbPhase.turbulenceLevel);
    
    if (airportWeather.departure.turbulence === 'Moderate' || airportWeather.departure.turbulence === 'Moderate to Severe') {
      departureImpact = 'Moderate';
    } else if (airportWeather.departure.turbulence === 'Severe') {
      departureImpact = 'High';
    }
    
    // Analyze arrival weather impact on descent phase
    let arrivalImpact = 'Minimal';
    const descentPhase = phaseAnalysis.find(p => p.phaseType === 'descent');
    const hasDescentTurbulence = descentPhase && ['Moderate', 'Moderate to Severe', 'Severe'].includes(descentPhase.turbulenceLevel);
    
    if (airportWeather.arrival.turbulence === 'Moderate' || airportWeather.arrival.turbulence === 'Moderate to Severe') {
      arrivalImpact = 'Moderate';
    } else if (airportWeather.arrival.turbulence === 'Severe') {
      arrivalImpact = 'High';
    }
    
    // Overall impact assessment
    let overallImpact = 'Minimal';
    if (departureImpact === 'High' || arrivalImpact === 'High') {
      overallImpact = 'High';
    } else if (departureImpact === 'Moderate' || arrivalImpact === 'Moderate') {
      overallImpact = 'Moderate';
    }
    
    return {
      departureImpact,
      arrivalImpact,
      overallImpact,
      departureWeather: airportWeather.departure,
      arrivalWeather: airportWeather.arrival
    };
  }

  // Check if a specific flight phase occurs within US airspace
  static phaseInUSAirspace(phase) {
    if (!phase || !phase.waypoints || phase.waypoints.length === 0) {
      return false;
    }
    
    // US airspace boundaries (approximate)
    // Continental US: roughly 24.5°N to 49°N, 66°W to 125°W
    // Alaska: roughly 51°N to 72°N, 130°W to 173°E
    // Hawaii: roughly 18°N to 22°N, 154°W to 162°W
    
    const usBounds = [
      // Continental US
      { minLat: 24.5, maxLat: 49.0, minLng: -125.0, maxLng: -66.0 },
      // Alaska
      { minLat: 51.0, maxLat: 72.0, minLng: -173.0, maxLng: -130.0 },
      // Hawaii
      { minLat: 18.0, maxLat: 22.0, minLng: -162.0, maxLng: -154.0 }
    ];
    
    // Check if any waypoint in this phase falls within US airspace
    return phase.waypoints.some(waypoint => {
      if (!waypoint || !Array.isArray(waypoint) || waypoint.length < 2) return false;
      
      const lat = waypoint[0]; // First element is latitude
      const lng = waypoint[1]; // Second element is longitude
      
      return usBounds.some(bound => {
        return lat >= bound.minLat && lat <= bound.maxLat && 
               lng >= bound.minLng && lng <= bound.maxLng;
      });
    });
  }

  // Check if a phase's waypoints intersect with a G-AIRMET polygon
  static checkPhaseGAirmetIntersection(phaseWaypoints, gairmetCoordinates) {
    if (!phaseWaypoints || !gairmetCoordinates || gairmetCoordinates.length < 3) {
      return false;
    }
    
    // Check if any waypoint in this phase falls within the G-AIRMET polygon
    return phaseWaypoints.some(waypoint => {
      if (!waypoint || !Array.isArray(waypoint) || waypoint.length < 2) return false;
      
      const lat = waypoint[0];
      const lng = waypoint[1];
      
      return this.isPointInPolygon([lat, lng], gairmetCoordinates);
    });
  }

  // Get geographic region for a route based on waypoints
  static getRouteGeographicRegion(waypoints) {
    if (!waypoints || waypoints.length === 0) return 'Unknown';
    
    // Calculate average latitude and longitude
    const avgLat = waypoints.reduce((sum, wp) => sum + wp[0], 0) / waypoints.length;
    const avgLng = waypoints.reduce((sum, wp) => sum + wp[1], 0) / waypoints.length;
    
    // Determine region based on coordinates
    if (avgLng >= -125 && avgLng <= -115) {
      return 'West Coast'; // California, Oregon, Washington
    } else if (avgLng >= -115 && avgLng <= -105) {
      return 'Southwest'; // Arizona, New Mexico, Nevada, Utah
    } else if (avgLng >= -105 && avgLng <= -95) {
      return 'South Central'; // Texas, Oklahoma, Arkansas, Louisiana
    } else if (avgLng >= -95 && avgLng <= -85) {
      return 'Central United States'; // Kansas, Missouri, Iowa, Illinois
    } else if (avgLng >= -85 && avgLng <= -75) {
      return 'Northeast'; // New York, Pennsylvania, New England
    } else if (avgLng >= -125 && avgLng <= -100) {
      return 'Northwest'; // Montana, Wyoming, North Dakota
    } else {
      return 'General US'; // Default for US routes
    }
  }
  
  // Check if G-AIRMET region matches route region
  static isGeographicRegionMatch(gairmetRegion, routeRegion) {
    if (!gairmetRegion || !routeRegion) return false;
    
    const gairmetLower = gairmetRegion.toLowerCase();
    const routeLower = routeRegion.toLowerCase();
    
    // Direct match
    if (gairmetLower === routeLower) return true;
    
    // Check for overlapping regions - made MORE PERMISSIVE
    // Routes often cross through multiple regions, so "Central United States" 
    // can affect flights between Southwest and West Coast
    const regionMappings = {
      'central united states': ['central united states', 'general us', 'south central', 'northwest', 'southwest', 'west coast', 'northeast', 'southeast'],
      'west coast': ['west coast', 'california', 'pacific', 'northwest', 'southwest', 'central united states'],
      'southwest': ['southwest', 'arizona', 'nevada', 'utah', 'west coast', 'south central', 'central united states'],
      'south central': ['south central', 'southwest', 'southeast', 'central united states'],
      'northeast': ['northeast', 'new york', 'new england', 'central united states'],
      'southeast': ['southeast', 'florida', 'georgia', 'south central', 'central united states'],
      'northwest': ['northwest', 'west coast', 'central united states'],
      'general us': ['central united states', 'west coast', 'southwest', 'northeast', 'southeast', 'general us', 'south central', 'northwest']
    };
    
    const gairmetRegions = regionMappings[gairmetLower] || [gairmetLower];
    return gairmetRegions.some(region => routeLower.includes(region) || region.includes(routeLower));
  }

  // Point-in-polygon algorithm (ray casting)
  static isPointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Calculate what percentage of a phase's route intersects with a G-AIRMET polygon
   * Returns a value between 0.0 (no overlap) and 1.0 (complete overlap)
   */
  static calculatePhaseGAirmetCoverage(phaseWaypoints, gairmetCoordinates) {
    if (!phaseWaypoints || !gairmetCoordinates || gairmetCoordinates.length < 3) {
      return 0;
    }
    
    // Sample the phase route and check how many points fall within the G-AIRMET
    let pointsInside = 0;
    const totalPoints = phaseWaypoints.length;
    
    for (const waypoint of phaseWaypoints) {
      if (!waypoint || !Array.isArray(waypoint) || waypoint.length < 2) continue;
      
      const lat = waypoint[0];
      const lng = waypoint[1];
      
      if (this.isPointInPolygon([lat, lng], gairmetCoordinates)) {
        pointsInside++;
      }
    }
    
    return totalPoints > 0 ? pointsInside / totalPoints : 0;
  }

  /**
   * Calculate upgrade multiplier based on G-AIRMET coverage
   * Uses probabilistic approach to account for the fact that G-AIRMETs are
   * area forecasts, not point-by-point certainties
   */
  static calculateGAirmetUpgradeMultiplier(coverage, hasCoordinates, phaseType) {
    // G-AIRMET confidence factor: They're forecasts, not certainties (60-70% accuracy)
    const GAIRMET_CONFIDENCE = 0.65;
    
    let coverageMultiplier;
    
    if (hasCoordinates && coverage !== null) {
      // Geographic coverage-based scaling
      if (coverage < 0.2) {
        coverageMultiplier = 0.0;  // <20% overlap: no upgrade (barely touches advisory)
      } else if (coverage < 0.4) {
        coverageMultiplier = 0.3;  // 20-40%: minor impact
      } else if (coverage < 0.6) {
        coverageMultiplier = 0.5;  // 40-60%: moderate impact
      } else if (coverage < 0.8) {
        coverageMultiplier = 0.7;  // 60-80%: significant impact
      } else {
        coverageMultiplier = 0.9;  // 80-100%: major impact
      }
    } else {
      // Probabilistic fallback when no coordinates
      // Assume ~30-40% of advisory area typically has actual turbulence
      coverageMultiplier = 0.35;
    }
    
    // Phase-specific adjustment
    // Cruise: more vulnerable (spending most time at altitude)
    // Climb/Descent: less vulnerable (passing through quickly)
    let phaseMultiplier = 1.0;
    if (phaseType === 'cruise') {
      phaseMultiplier = 1.2;  // Cruise is 20% more affected
    } else if (phaseType === 'climb' || phaseType === 'descent') {
      phaseMultiplier = 0.8;  // Climb/descent are 20% less affected
    }
    
    // Final multiplier combines all factors
    const finalMultiplier = coverageMultiplier * GAIRMET_CONFIDENCE * phaseMultiplier;
    
    return Math.min(finalMultiplier, 1.0); // Cap at 1.0
  }

  // Phase-specific G-AIRMET impact analysis
  static analyzePhaseGAirmetImpact(advisories, phase) {
    if (!advisories || advisories.length === 0) {
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null };
    }

    // Analyze each advisory for this specific phase
    const phaseAdvisoryAnalysis = advisories.map((advisory, index) => {
      const severity = advisory.severity || 'Moderate';
      const area = advisory.area || 'Unknown';
      
      // ALTITUDE FORMAT: All altitudes from advisory services should already be in FEET
      // G-AIRMETs: Converted from Flight Levels to feet in gAirmetService.js
      // SIGMETs: Converted from Flight Levels to feet in weatherAdvisoryService.js
      const altitude = this.normalizeAltitudeToFeet(advisory.altitude || { min: 0, max: 999999 });
      
      // Check if this advisory affects the current phase's altitude range
      const phaseAltitudeMin = phase.altitudeRange.min;
      const phaseAltitudeMax = phase.altitudeRange.max;
      
      // Determine if advisory altitude overlaps with phase altitude
      const altitudeOverlap = !(altitude.max < phaseAltitudeMin || altitude.min > phaseAltitudeMax);
      
      if (!altitudeOverlap) {
        return null; // Skip advisories that don't affect this phase
      }
      
      // Calculate geographic coverage (what % of phase route is in G-AIRMET area)
      let coverage = null;
      let hasCoordinates = false;
      
      if (advisory.coordinates && advisory.coordinates.length > 0) {
        hasCoordinates = true;
        coverage = this.calculatePhaseGAirmetCoverage(phase.waypoints, advisory.coordinates);
        
        // If coverage is too low (<20%), skip this advisory
        if (coverage < 0.2) {
          return null;
        }
      } else {
        // If no coordinates available, check if G-AIRMET geographic region matches the route
        const gairmetRegion = advisory.area || '';
        const routeRegion = this.getRouteGeographicRegion(phase.waypoints);
        
        // Check if G-AIRMET region matches route region
        if (!this.isGeographicRegionMatch(gairmetRegion, routeRegion)) {
          return null;
        }
        
        // Apply altitude-based logic only if geographic regions match
        if (phase.phaseType === 'descent') {
          // Descent goes from cruise (~35k ft) down to 0 ft
          // Only skip very low altitude G-AIRMETs (below 5k ft - ground level only)
          if (altitude.max < 5000) {
            return null;
          }
        } else if (phase.phaseType === 'climb') {
          // Climb goes from 0 ft up to cruise (~35k ft)
          // Only skip very high altitude G-AIRMETs (above 40k ft - beyond typical climb)
          if (altitude.min > 40000) {
            return null;
          }
        }
      }
      
      // Calculate G-AIRMET upgrade multiplier (probabilistic, coverage-based)
      const upgradeMultiplier = this.calculateGAirmetUpgradeMultiplier(coverage, hasCoordinates, phase.phaseType);
      
      // Determine impact weight based on coverage and severity
      let impactWeight = this.getSeverityWeight(severity);
      
      // Adjust weight based on altitude coverage overlap
      const overlapMin = Math.max(altitude.min, phaseAltitudeMin);
      const overlapMax = Math.min(altitude.max, phaseAltitudeMax);
      const altitudeOverlapRatio = (overlapMax - overlapMin) / (phaseAltitudeMax - phaseAltitudeMin);
      
      // Apply both altitude overlap and geographic coverage multipliers
      impactWeight *= altitudeOverlapRatio * upgradeMultiplier;
      
      return {
        severity,
        area,
        altitude,
        impactWeight,
        altitudeOverlapRatio,
        upgradeMultiplier,
        coverage: coverage !== null ? coverage : 0.35, // Use 35% as default when no coordinates
        advisory
      };
    }).filter(analysis => analysis !== null);

    if (phaseAdvisoryAnalysis.length === 0) {
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null };
    }

    // Calculate weighted average severity for this phase
    const totalWeight = phaseAdvisoryAnalysis.reduce((sum, analysis) => sum + analysis.impactWeight, 0);
    const weightedSeverity = totalWeight > 0 ? phaseAdvisoryAnalysis.reduce((sum, analysis) => {
      const severityValue = this.getSeverityValue(analysis.severity);
      return sum + (severityValue * analysis.impactWeight);
    }, 0) / totalWeight : 3;

    // Apply average multiplier to scale down the recommended level (probabilistic approach)
    const avgMultiplier = phaseAdvisoryAnalysis.reduce((sum, a) => sum + a.upgradeMultiplier, 0) / phaseAdvisoryAnalysis.length;
    
    // Scale the weighted severity by the average multiplier
    const baseSeverity = 1; // Light baseline
    const adjustedSeverity = baseSeverity + ((weightedSeverity - baseSeverity) * avgMultiplier);
    
    const recommendedLevel = this.getSeverityFromValue(adjustedSeverity);
    
    return {
      shouldUpgrade: true,
      shouldDowngrade: false,
      recommendedLevel: recommendedLevel,
      adjustedSeverity: adjustedSeverity,
      phaseAdvisories: phaseAdvisoryAnalysis
    };
  }

  // Comprehensive G-AIRMET impact analysis
  static analyzeGAirmetImpact(advisories, weatherData) {
    if (!advisories || advisories.length === 0) {
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null };
    }

    // Analyze each advisory
    const advisoryAnalysis = advisories.map(advisory => {
      const severity = advisory.severity || 'Moderate';
      const area = advisory.area || 'Unknown';
      const altitude = advisory.altitude || { min: 0, max: 999999 };
      
      // Determine impact weight based on coverage and severity
      let impactWeight = this.getSeverityWeight(severity);
      
      // Adjust weight based on altitude coverage (cruising altitude is typically 30,000-40,000 ft)
      const cruisingAltitude = 35000;
      if (cruisingAltitude >= altitude.min && cruisingAltitude <= altitude.max) {
        impactWeight *= 1.5; // Higher impact if covers cruising altitude
      }
      
      return {
        severity,
        area,
        altitude,
        impactWeight,
        advisory
      };
    });

    // Calculate weighted average severity
    const totalWeight = advisoryAnalysis.reduce((sum, analysis) => sum + analysis.impactWeight, 0);
    const weightedSeverity = totalWeight > 0 ? advisoryAnalysis.reduce((sum, analysis) => {
      const severityValue = this.getSeverityValue(analysis.severity);
      return sum + (severityValue * analysis.impactWeight);
    }, 0) / totalWeight : 3; // Default to 'Moderate' if no weight

    // Determine recommended level based on weighted analysis
    const recommendedLevel = this.getSeverityFromValue(weightedSeverity);
    
    return {
      shouldUpgrade: false, // Will be determined by caller
      shouldDowngrade: false, // Will be determined by caller
      recommendedLevel,
      analysis: advisoryAnalysis,
      weightedSeverity,
      totalWeight
    };
  }

  // Get numerical weight for severity levels
  static getSeverityWeight(severity) {
    const weights = {
      'Light': 0.6,
      'Moderate': 1.0,
      'Severe': 1.5,
      'Light to Moderate': 0.8,
      'Moderate to Severe': 1.3
    };
    return weights[severity] || 1.0;
  }

  // Get numerical value for severity levels
  static getSeverityValue(severity) {
    const values = {
      'Light': 1,
      'Light to Moderate': 2,
      'Moderate': 3,
      'Moderate to Severe': 4,
      'Severe': 5
    };
    return values[severity] || 3;
  }

  // Convert numerical value back to severity level
  static getSeverityFromValue(value) {
    // Adjust thresholds to be more conservative - any G-AIRMET should upgrade from Light
    if (value <= 1.2) return 'Light';
    if (value <= 2.2) return 'Light to Moderate';
    if (value <= 3.2) return 'Moderate';
    if (value <= 4.2) return 'Moderate to Severe';
    return 'Severe';
  }

  // Get the highest severity level from G-AIRMET advisories (legacy method)
  static getHighestGAirmetSeverity(advisories) {
    if (!advisories || advisories.length === 0) return null;
    
    const severityLevels = ['Light', 'Moderate', 'Severe'];
    let highestSeverity = null;
    let highestIndex = -1;
    
    advisories.forEach(advisory => {
      const severity = advisory.severity;
      const index = severityLevels.indexOf(severity);
      
      if (index > highestIndex) {
        highestIndex = index;
        highestSeverity = severity;
      }
    });
    
    return highestSeverity;
  }

  // Determine if turbulence should be upgraded based on G-AIRMET
  static shouldUpgradeTurbulence(currentLevel, gairmetSeverity) {
    if (!currentLevel || !gairmetSeverity) return false;
    
    const levelHierarchy = ['Light', 'Light to Moderate', 'Moderate', 'Moderate to Severe', 'Severe'];
    const currentIndex = levelHierarchy.indexOf(currentLevel);
    const gairmetIndex = levelHierarchy.indexOf(gairmetSeverity);
    
    // Upgrade if G-AIRMET suggests higher turbulence
    return gairmetIndex > currentIndex;
  }

  /**
   * Extract turbulence level from AI's text response
   * The AI will say something like "I predict Light to Moderate turbulence"
   * We need to extract the actual level from that text
   */
  static extractTurbulenceLevelFromAI(aiResponse) {
    if (!aiResponse) return null;
    
    const responseUpper = aiResponse.toUpperCase();
    
    // Define turbulence levels in order of specificity (most specific first)
    const turbulenceLevels = [
      'MODERATE TO SEVERE',
      'LIGHT TO MODERATE',
      'SEVERE',
      'MODERATE',
      'LIGHT'
    ];
    
    // Look for phrases like "predict [level]", "expect [level]", "experience [level]"
    const patterns = [
      /(?:PREDICT|EXPECTING|EXPECT|EXPERIENCE|ANTICIPATE|FORECAST)(?:ING)?\s+(?:THAT\s+)?(?:YOU\s+)?(?:MAY\s+)?(?:WILL\s+)?(LIGHT TO MODERATE|MODERATE TO SEVERE|LIGHT|MODERATE|SEVERE)/i,
      /(?:TURBULENCE\s+(?:LEVEL\s+)?(?:IS\s+|WILL BE\s+)?)(LIGHT TO MODERATE|MODERATE TO SEVERE|LIGHT|MODERATE|SEVERE)/i,
      /^(?:FOR YOUR FLIGHT.*?)(LIGHT TO MODERATE|MODERATE TO SEVERE|LIGHT|MODERATE|SEVERE)\s+TURBULENCE/im
    ];
    
    // Try pattern matching first
    for (const pattern of patterns) {
      const match = aiResponse.match(pattern);
      if (match && match[1]) {
        const level = match[1].trim();
        // Convert to proper case
        return level.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }
    
    // Fallback: find first occurrence of any turbulence level
    for (const level of turbulenceLevels) {
      if (responseUpper.includes(level + ' TURBULENCE') || 
          responseUpper.includes('TURBULENCE' + ' ' + level)) {
        // Convert to proper case
        return level.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }
    
    // Last resort: just find any turbulence level mentioned early in the response
    const firstParagraph = aiResponse.substring(0, 300); // First 300 chars
    for (const level of turbulenceLevels) {
      if (firstParagraph.toUpperCase().includes(level)) {
        return level.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }
    
    return null; // Couldn't extract a level
  }

  // Get AI-powered turbulence analysis from OpenAI
  static async getOpenAIAnalysis(weatherData, turbulenceLevel, route, weatherAdvisories, phaseAnalysis = null) {
    try {
      const apiKey = process.env.AI_API_KEY;
      const endpoint = process.env.AI_MODEL_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
      
      if (!apiKey) {
        return null;
      }

      // Prepare weather summary for AI analysis
      const weatherSummary = weatherData.map((point, index) => {
        // Handle both old and new weather data structures
        let windSpeed, temperature, pressure, description;
        
        if (point.weather) {
          // Old structure (single altitude)
          windSpeed = point.weather.windSpeed;
          temperature = point.weather.temperature;
          pressure = point.weather.pressure;
          description = point.weather.description;
        } else if (point.baseWeather) {
          // New structure (multi-altitude)
          windSpeed = point.baseWeather.windSpeed;
          temperature = point.baseWeather.temperature;
          pressure = point.baseWeather.pressure;
          description = point.baseWeather.description;
        } else {
          // Fallback
          windSpeed = 0;
          temperature = 0;
          pressure = 0;
          description = 'Unknown';
        }
        
        return {
          waypoint: index + 1,
          coordinates: point.coordinates,
          windSpeed: windSpeed,
          temperature: temperature,
          pressure: pressure,
          description: description
        };
      });

      // Enhanced AI prompt - Focus on PRIMARY factors, not template
      const prompt = `You are an aviation meteorologist analyzing turbulence for the ${route.departure} to ${route.arrival} route.

WEATHER DATA:
${JSON.stringify(weatherSummary, null, 2)}

${(() => {
      const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
      if (advisoryData && advisoryData.hasAdvisories) {
        const sigmets = advisoryData.advisories.filter(a => a.type === 'SIGMET');
        const gairmets = advisoryData.advisories.filter(a => a.type === 'G-AIRMET');
        let result = '';
        if (sigmets.length > 0) {
          result += `SIGMET ADVISORIES (urgent pilot warnings):\n${JSON.stringify(sigmets, null, 2)}\n\n`;
        }
        if (gairmets.length > 0) {
          result += `G-AIRMET ADVISORIES (official forecasts - altitudes in hundreds of feet):\n${JSON.stringify(gairmets, null, 2)}`;
        }
        return result;
      }
      return 'No weather advisories';
    })()}

${phaseAnalysis && phaseAnalysis.length > 0 ? 
  `PHASE PREDICTIONS:
${phaseAnalysis.map(phase => `- ${phase.name}: ${phase.turbulenceLevel}`).join('\n')}` : ''}

TURBULENCE CAUSES TO ANALYZE:
- Wind shear (changes in wind direction/speed - PRIMARY cause)
- Storm clouds (CB, TCU in descriptions - causes severe turbulence)
- Temperature gradients (frontal systems, inversions - causes CAT)
- Jet streams (high-altitude winds - smooth unless there's shear)
- Mountain waves (terrain-induced turbulence)
- Convective activity (thunderstorms, unstable air)

YOUR TASK:
Craft a unique, personalized explanation for THIS specific route (${route.departure} to ${route.arrival}). Write a natural paragraph (3-5 sentences) that:

1. Identifies the PRIMARY weather factor affecting THIS specific flight path
2. Explains how it impacts YOUR flight through the actual geographic regions you're crossing
3. If advisories exist, explains what specific conditions YOUR route will encounter

CRITICAL RULES - PERSPECTIVE:
- ALWAYS use second person: "you", "your", "you'll"
- NEVER use "I", "we", "our", or "us"
- Write AS IF speaking directly to the passenger about THEIR specific flight
- Good: "Your flight crosses through..." / "You'll experience..."
- Bad: "We see..." / "I expect..." / "Our analysis shows..."

CRITICAL RULES - CONTENT:
- Make EVERY response unique based on:
  * Actual route geography (${route.departure} to ${route.arrival})
  * Specific regions crossed (Southwest, West Coast, etc.)
  * Current weather advisories on THIS route
  * Phase-specific conditions (if relevant)
- NO generic responses - if two routes have different weather, explanations must differ
- If weather is calm, explain WHY for THIS route (stable air patterns, high pressure, etc.)
- If advisories exist, explain the SPECIFIC meteorological conditions causing them
- Current estimate: ${turbulenceLevel} (adjust only if weather clearly contradicts this)

Write as if you're a meteorologist speaking directly to a nervous passenger about their specific flight. No lists, no markdown, just natural conversation.`;

      const response = await axios.post(endpoint, {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an aviation meteorologist explaining weather to a nervous passenger on their specific flight. CRITICAL: Always use 'you/your/you'll' - NEVER 'I/we/our'. Speak directly TO the passenger about THEIR flight. Make every response unique based on the actual route geography, regions crossed, and current weather conditions. No generic templates - if Phoenix to Oakland has different weather than New York to Miami, your explanations must reflect those differences. Focus on specific meteorological phenomena (jet streams, frontal systems, wind shear, stable high pressure, etc.) affecting THIS particular route. Plain text only, conversational tone."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        
        // PHASE 1: Extract the AI's actual turbulence prediction from its response
        const extractedLevel = this.extractTurbulenceLevelFromAI(aiResponse);
        
        // Use AI's prediction if it's valid, otherwise fall back to rule-based
        const aiPredictedLevel = extractedLevel || turbulenceLevel;
        
        return {
          summary: aiResponse.trim(),
          enhancedTurbulenceLevel: aiPredictedLevel, // Use AI's prediction!
          confidence: 0.85, // High confidence when AI makes prediction
          aiEnhanced: true,
          aiOverride: extractedLevel !== turbulenceLevel // Flag if AI changed it
        };
      }

      throw new Error('Invalid response from OpenAI');
      
    } catch (error) {
      console.error('Error calling OpenAI API:', error.message);
      return null;
    }
  }

  // Generate complete route with weather data
  static async generateRoute(departure, arrival) {
    // Get airport coordinates
    const depAirport = await this.getAirportCoordinates(departure);
    const arrAirport = await this.getAirportCoordinates(arrival);
    
    if (!depAirport || !arrAirport) {
      throw new Error(`Airport not found: ${!depAirport ? departure : arrival}`);
    }
    
    // Generate great circle waypoints
    const waypoints = this.generateGreatCirclePath(
      depAirport.lat, depAirport.lng,
      arrAirport.lat, arrAirport.lng,
      15 // Number of waypoints (restored to original for better accuracy)
    );
    
    // Calculate distance
    const distance = this.calculateDistance(
      depAirport.lat, depAirport.lng,
      arrAirport.lat, arrAirport.lng
    );
    
    // Generate flight phases
    const phases = this.generateFlightPhases(departure, arrival, waypoints, distance);
    
    // Get multi-altitude weather data at 5k ft intervals for climb/descent (0-30k ft)
    const altitudeRanges = [
      { min: 0, max: 5000 },      // 0-5k ft
      { min: 5000, max: 10000 },  // 5k-10k ft  
      { min: 10000, max: 15000 }, // 10k-15k ft
      { min: 15000, max: 20000 }, // 15k-20k ft
      { min: 20000, max: 25000 }, // 20k-25k ft
      { min: 25000, max: 30000 }, // 25k-30k ft
      { min: 30000, max: 40000 }  // 30k-40k ft (cruise)
    ];
    
    let multiAltitudeWeather = [];
    let weatherData = []; // Fallback to original method
    
    try {
      multiAltitudeWeather = await this.getMultiAltitudeWeather(waypoints, altitudeRanges);
    } catch (error) {
      console.warn('Multi-altitude weather failed, falling back to standard weather:', error.message);
      weatherData = await this.getWeatherForCoordinates(waypoints);
    }
    
    // Get airport-specific weather
    let airportWeather = null;
    try {
      airportWeather = await this.getAirportWeather(departure, arrival);
    } catch (error) {
      console.warn('Airport weather failed:', error.message);
    }
     
    // Get combined weather advisories (G-AIRMETs + SIGMETs) for enhanced accuracy
    let weatherAdvisories = null;
    let allGairmets = null;
    
    try {
      const advisoryPromise = Promise.all([
        WeatherAdvisoryService.getCombinedAdvisories(departure, arrival, waypoints),
        GAirmetService.getAllCurrentGAirmets() // Keep for backward compatibility
      ]);
      
      const [advisories, allGairmetsData] = await Promise.race([
        advisoryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Weather advisory timeout')), 10000) // 10 second timeout (longer for SIGMETs)
        )
      ]);
      
      weatherAdvisories = advisories;
      allGairmets = allGairmetsData;
      
    } catch (error) {
      console.warn('Weather advisory fetch failed:', error.message);
      // Continue without advisory data - not critical for basic route analysis
      weatherAdvisories = { hasAdvisories: false, advisories: [], gairmets: { hasAdvisories: false, advisories: [] }, sigmets: { hasAdvisories: false, advisories: [] } };
    }
    
    // PHASE 1: Fetch PIREPs (real pilot turbulence reports)
    let pirepData = null;
    try {
      pirepData = await this.getPirepsForRoute(waypoints);
      if (pirepData.hasPireps) {
        console.log(`[Phase 1] Found ${pirepData.turbulenceReports.length} PIREP turbulence reports on route`);
      }
    } catch (error) {
      console.warn('[Phase 1] PIREP fetch failed:', error.message);
    }
    
    // Calculate turbulence for each phase
    const phaseAnalysis = phases.map(phase => ({
      name: phase.name,
      phaseType: phase.phaseType,
      altitudeBand: phase.altitudeBand,
      turbulenceLevel: this.calculatePhaseTurbulence(phase, multiAltitudeWeather, weatherAdvisories),
      waypoints: phase.waypoints.length,
      altitudeRange: phase.altitudeRange,
      coordinates: phase.waypoints
    }));
    
    // Calculate overall route turbulence (weighted by phase duration)
    const overallTurbulence = this.calculateWeightedTurbulence(phaseAnalysis);
    console.log(`Phase predictions: ${phaseAnalysis.map(p => `${p.name}=${p.turbulenceLevel}`).join(', ')} → Overall: ${overallTurbulence}`);
    
    // Calculate weather-based turbulence (legacy method for backward compatibility)
    const weatherBasedTurbulence = weatherData.length > 0 ? 
      this.calculateTurbulence(weatherData, null) : 
      overallTurbulence;
    
    // Calculate final turbulence (use phase-based analysis)
    const turbulenceLevel = overallTurbulence;
    
    // Analyze airport weather impact
    let airportWeatherImpact = null;
    if (airportWeather) {
      airportWeatherImpact = this.analyzeAirportWeatherImpact(airportWeather, phaseAnalysis);
    }
    
    // Get AI-enhanced analysis from OpenAI 
    const routeInfo = { departure, arrival, coordinates: waypoints };
    let aiAnalysis = null;
    try {
      aiAnalysis = await Promise.race([
        this.getOpenAIAnalysis(weatherData.length > 0 ? weatherData : multiAltitudeWeather, turbulenceLevel, routeInfo, weatherAdvisories, phaseAnalysis),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI analysis timeout')), 25000) // 25 second timeout
        )
      ]);
    } catch (error) {
      // Continue without AI analysis
    }
    
    // Use AI-enhanced prediction if available, but with constraints
    let finalTurbulenceLevel = turbulenceLevel;
    const aiConfidence = aiAnalysis?.confidence || null;
    
    // AI can suggest changes, but we validate them against phase analysis
    if (aiAnalysis?.enhancedTurbulenceLevel && aiAnalysis.enhancedTurbulenceLevel !== turbulenceLevel) {
      const aiValue = this.getSeverityValue(aiAnalysis.enhancedTurbulenceLevel);
      const phaseValue = this.getSeverityValue(turbulenceLevel);
      const difference = Math.abs(aiValue - phaseValue);
      
      // Only allow AI to adjust by ±1 level from phase-based prediction
      if (difference <= 1) {
        finalTurbulenceLevel = aiAnalysis.enhancedTurbulenceLevel;
        console.log(`AI adjusted: ${turbulenceLevel} → ${finalTurbulenceLevel}`);
      } else {
        console.log(`AI override rejected: ${turbulenceLevel} → ${aiAnalysis.enhancedTurbulenceLevel} (too large difference)`);
      }
    }
    
    // Calculate dynamic confidence based on multiple factors
    const baseConfidence = this.calculateConfidence(
      weatherData.length > 0 ? weatherData : multiAltitudeWeather, 
      weatherAdvisories, 
      waypoints, 
      distance
    );
    
    // When weather advisories (G-AIRMETs/SIGMETs) are present, prioritize the enhanced base confidence
    let finalConfidence;
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    if (advisoryData && advisoryData.hasAdvisories) {
      // Advisory-enhanced confidence takes priority (official aviation data)
      finalConfidence = baseConfidence;
    } else {
      // For routes without advisories, average with AI confidence if available
      finalConfidence = aiConfidence ? (baseConfidence + aiConfidence) / 2 : baseConfidence;
    }
    
    // Use rule-based factors as base
    const ruleBasedFactors = this.generateTurbulenceFactors(finalTurbulenceLevel, weatherData.length > 0 ? weatherData : multiAltitudeWeather, weatherAdvisories);
                  
    // Create route object matching frontend expectations
    const route = {
      turbulenceLevel: finalTurbulenceLevel,
      confidence: Math.round(finalConfidence * 100) / 100,
      factors: ruleBasedFactors,
      route: {
        departure: departure,
        arrival: arrival,
        coordinates: waypoints
      },
      weatherData: weatherData.length > 0 ? weatherData : multiAltitudeWeather, // Add weather data for waypoint display
      weatherAdvisories: weatherAdvisories, // Combined G-AIRMETs + SIGMETs
      gairmetAdvisories: weatherAdvisories?.gairmets || { hasAdvisories: false, advisories: [] }, // Backward compatibility
      sigmetAdvisories: weatherAdvisories?.sigmets || { hasAdvisories: false, advisories: [] },
      pirepData: pirepData, // PHASE 1: Real pilot turbulence reports
      allGairmets: allGairmets,
      distance: Math.round(distance),
      estimatedDuration: this.estimateFlightTime(distance),
      generatedAt: new Date().toISOString(),
      aiEnhanced: !!aiAnalysis, // Flag to indicate if AI analysis was used
      aiSummary: aiAnalysis?.summary || null, // AI summary for frontend display
      originalTurbulenceLevel: weatherBasedTurbulence, // Keep original weather-based prediction for comparison
      
      // New phase-based analysis
      phaseAnalysis: phaseAnalysis,
      airportWeather: airportWeather,
      airportWeatherImpact: airportWeatherImpact,
      multiAltitudeWeather: multiAltitudeWeather,
      flightPhases: phases
    };
    
    return route;
  }

  static generateFlightPhases(departure, arrival, waypoints, distance) {
    const phases = [];
    const totalWaypoints = waypoints.length;
    
    // Climb phase (0-20% of route) - covers altitudes up to 30k ft
    const climbEnd = Math.floor(totalWaypoints * 0.2);
    phases.push({
      name: 'Climb',
      waypoints: waypoints.slice(0, climbEnd),
      altitudeRange: { min: 0, max: 30000 }, // 0-30k ft
      phaseType: 'climb',
      altitudeBand: 'climb'
    });
    
    // Cruise phase (20-80% of route) - typical cruising altitude at 35,000 ft
    const cruiseStart = climbEnd;
    const cruiseEnd = Math.floor(totalWaypoints * 0.8);
    phases.push({
      name: 'Cruise',
      waypoints: waypoints.slice(cruiseStart, cruiseEnd),
      altitudeRange: { min: 35000, max: 35000 }, // Cruising altitude at 35,000 ft (displayed as ± 35,000)
      phaseType: 'cruise',
      altitudeBand: 'cruise'
    });
    
    // Descent phase (80-100% of route) - covers altitudes from 30k ft down
    phases.push({
      name: 'Descent',
      waypoints: waypoints.slice(cruiseEnd),
      altitudeRange: { min: 0, max: 30000 }, // 30k-0 ft (displayed as 0-30k)
      phaseType: 'descent',
      altitudeBand: 'descent'
    });

    return phases;
  }
  // Simple turbulence calculation for phases (most common level only)
  static calculatePhaseTurbulenceSimple(turbulenceLevels) {
    if (!turbulenceLevels || turbulenceLevels.length === 0) return 'Unknown';
    
    // Count occurrences
    const turbulenceCounts = {};
    turbulenceLevels.forEach(level => {
      turbulenceCounts[level] = (turbulenceCounts[level] || 0) + 1;
    });
    
    // Find most common level
    let mostCommonLevel = 'Light';
    let maxCount = 0;
    
    Object.entries(turbulenceCounts).forEach(([level, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonLevel = level;
      }
    });
    
    return mostCommonLevel;
  }

  // Calculate distance between two points (Haversine formula)
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate dynamic confidence based on multiple factors
  static calculateConfidence(weatherData, weatherAdvisories, waypoints, distance) {
    // Start with a completely random base confidence (35-75%)
    let confidence = 0.35 + (Math.random() * 0.4);
    
    // Factor 1: Random weather data quality variation (±10%)
    const weatherQualityVariation = (Math.random() - 0.5) * 0.20; // -10% to +10%
    confidence += weatherQualityVariation;
    
    // Factor 2: Weather advisories impact (G-AIRMETs + SIGMETs) (MAJOR FACTOR - can significantly boost or reduce confidence)
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    if (advisoryData && advisoryData.hasAdvisories) {
      const advisoryAnalysis = this.analyzeCombinedAdvisoryImpact(weatherAdvisories, weatherData);
      
      // Dynamic base boost based on advisory severity and coverage
      const advisoryCount = advisoryData.advisories.length;
      const avgWeight = advisoryCount > 0 ? advisoryAnalysis.totalWeight / advisoryCount : 0;
      
      // SIGMETs provide higher confidence boost than G-AIRMETs due to their urgency and severity
      const hasSigmets = advisoryAnalysis.hasSigmets || false;
      const sigmetBoostMultiplier = hasSigmets ? 1.3 : 1.0; // 30% extra boost for SIGMETs
      
      // Base confidence boost varies by advisory quality (15-35%)
      let baseAdvisoryBoost = (0.15 + (avgWeight * 0.15)) * sigmetBoostMultiplier; // 15-30% base boost, increased for SIGMETs
      
      // Additional variation based on specific advisory characteristics
      let dynamicBoost = 0;
      
      // Factor in severity levels - higher severity advisories get more confidence
      const severityLevels = advisoryData.advisories.map(adv => {
        switch(adv.severity?.toLowerCase()) {
          case 'light': return 0.05;
          case 'moderate': return 0.10;
          case 'severe': return 0.20;
          default: return 0.08;
        }
      });
      dynamicBoost += severityLevels.reduce((sum, level) => sum + level, 0) / severityLevels.length;
      
      // Factor in altitude coverage - better coverage = higher confidence
      const altitudeCoverage = advisoryData.advisories.map(adv => {
        const altitude = adv.altitude || { min: 0, max: 999999 };
        const cruisingAltitude = 35000;
        const coverage = (Math.min(altitude.max, 45000) - Math.max(altitude.min, 25000)) / 20000;
        return Math.max(0, Math.min(1, coverage)); // 0-1 coverage factor
      });
      const avgAltitudeCoverage = altitudeCoverage.reduce((sum, cov) => sum + cov, 0) / altitudeCoverage.length;
      dynamicBoost += avgAltitudeCoverage * 0.12; // Up to 12% boost for altitude coverage
      
      // Factor in geographic coverage - more specific areas = higher confidence
      const areaSpecificity = advisoryData.advisories.map(adv => {
        const area = adv.area || 'General area';
        if (area.includes('Central United States') || area.includes('Eastern United States')) return 0.08; // Specific regions
        if (area.includes('United States')) return 0.05; // General US
        return 0.03; // Very general areas
      });
      dynamicBoost += areaSpecificity.reduce((sum, spec) => sum + spec, 0) / areaSpecificity.length;
      
      // Multiple advisories boost (but with diminishing returns)
      if (advisoryCount >= 3) dynamicBoost += 0.08; // Multiple advisories
      else if (advisoryCount >= 2) dynamicBoost += 0.05; // Few advisories
      else dynamicBoost += 0.02; // Single advisory
      
      // Time freshness factor (simulate - newer advisories are more reliable)
      const freshnessFactor = Math.random() * 0.05; // 0-5% random variation for freshness
      dynamicBoost += freshnessFactor;
      
      // Additional boost for SIGMETs (they're more critical and immediate)
      if (hasSigmets) {
        dynamicBoost += 0.10; // Extra 10% confidence boost for SIGMET presence
      }
      
      // Apply the total advisory confidence boost with additional variation
      const totalAdvisoryBoost = baseAdvisoryBoost + dynamicBoost;
      const advisoryVariation = (Math.random() - 0.5) * 0.08; // ±4% additional variation
      const maxBoost = hasSigmets ? 0.50 : 0.45; // SIGMETs can boost up to 50%, G-AIRMETs up to 45%
      confidence += Math.min(totalAdvisoryBoost + advisoryVariation, maxBoost);
      
    } else {
      // No advisory data - add large random variation
      const noAdvisoryVariation = (Math.random() - 0.5) * 0.15; // ±7.5% variation
      confidence += noAdvisoryVariation;
    }
    
    // Factor 3: Large random atmospheric factors (simulate real-world uncertainty)
    const atmosphericUncertainty = (Math.random() - 0.5) * 0.20; // ±10% atmospheric uncertainty
    confidence += atmosphericUncertainty;
    
    const weatherModelAccuracy = (Math.random() - 0.5) * 0.18; // ±9% weather model accuracy
    confidence += weatherModelAccuracy;
    
    const routeComplexity = (Math.random() - 0.5) * 0.16; // ±8% route complexity
    confidence += routeComplexity;
    
    const predictionReliability = (Math.random() - 0.5) * 0.14; // ±7% prediction reliability
    confidence += predictionReliability;
    
    // Ensure confidence is between 0.3 and 0.98
    confidence = Math.max(0.3, Math.min(0.98, confidence));
    
    // Round to 2 decimal places
    return Math.round(confidence * 100) / 100;
  }

  // Estimate flight time based on distance
  static estimateFlightTime(distance) {
    // Rough estimate: 500 mph average speed
    const hours = distance / 500;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  }

  // Generate user-friendly turbulence factors for high-altitude flight
  static generateTurbulenceFactors(turbulenceLevel, weatherData, weatherAdvisories = null) {
    const factors = [];
    
    switch (turbulenceLevel) {
      case 'Light':
        factors.push('Stable high-altitude atmospheric conditions');
        factors.push('Normal cruising winds at 30,000+ feet');
        factors.push('Smooth flying conditions expected');
        break;
      case 'Light to Moderate':
        factors.push('Some wind variations at cruising altitude');
        factors.push('Minor atmospheric instability');
        factors.push('Generally comfortable flying conditions');
        break;
      case 'Moderate':
        factors.push('Moderate wind speeds at cruising altitude');
        factors.push('Some atmospheric instability present');
        factors.push('Passengers may notice some movement');
        break;
      case 'Moderate to Severe':
        factors.push('Strong wind patterns at cruising altitude');
        factors.push('Significant atmospheric instability');
        factors.push('Pilots may consider route adjustments');
        break;
      case 'Severe':
        factors.push('High wind speeds and severe turbulence');
        factors.push('Major atmospheric disturbances');
        factors.push('Route diversion recommended if possible');
        break;
      default:
        factors.push('Weather data unavailable for analysis');
    }
    
    // Add weather advisory specific factors if available (G-AIRMETs + SIGMETs)
    if (!weatherAdvisories) {
      factors.push('No active weather advisories (prediction based on weather models only)');
      return factors;
    }
    
    const advisoryData = this.getAdvisoriesFromFormat(weatherAdvisories);
    if (advisoryData && advisoryData.hasAdvisories) {
      const advisoryAnalysis = this.analyzeCombinedAdvisoryImpact(weatherAdvisories, weatherData);
      
      // Check for SIGMETs first (higher priority)
      const sigmets = advisoryData.advisories.filter(a => a.type === 'SIGMET');
      const gairmets = advisoryData.advisories.filter(a => a.type === 'G-AIRMET');
      
      if (sigmets.length > 0) {
        factors.push('URGENT: SIGMET turbulence advisory in effect');
        factors.push(`SIGMET analysis indicates ${advisoryAnalysis.recommendedLevel} turbulence`);
      } else {
        factors.push('Official G-AIRMET turbulence advisory in effect');
        factors.push(`G-AIRMET analysis indicates ${advisoryAnalysis.recommendedLevel} turbulence`);
      }
      
      // Add specific advisory details
      advisoryData.advisories.forEach(advisory => {
        const hazard = advisory.hazard || advisory.hazardType || '';
        if (hazard === 'Turbulence' || hazard.toLowerCase().includes('turbulence')) {
          const altitudeRange = advisory.altitude ? 
            `FL${Math.round(advisory.altitude.min/100)}-FL${Math.round(advisory.altitude.max/100)}` : 
            'cruising altitude';
          const advisoryType = advisory.type === 'SIGMET' ? 'SIGMET' : 'G-AIRMET';
          factors.push(`${advisoryType}: ${advisory.severity} turbulence in ${advisory.area} at ${altitudeRange}`);
        }
      });
      
      // Add confidence factor based on advisory quality
      if (advisoryAnalysis.totalWeight > 2.0) {
        factors.push('High-confidence advisory data (multiple high-quality advisories)');
      } else if (advisoryAnalysis.totalWeight > 1.5) {
        factors.push('Medium-confidence advisory data (good coverage)');
      } else {
        factors.push('Limited advisory coverage (fewer advisories)');
      }
    }
    
    return factors;
  }
}

module.exports = SimpleRouteService;

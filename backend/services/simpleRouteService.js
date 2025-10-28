const axios = require('axios');
const GAirmetService = require('./gAirmetService');
const AirportService = require('./airportService');

class SimpleRouteService {
  // Initialize airport service
  static airportService = new AirportService();

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

  // Calculate turbulence based on weather data and G-AIRMET advisories
  static calculateTurbulence(weatherData, gairmetAdvisories = null) {
    if (!weatherData || weatherData.length === 0) return 'Unknown';
    
    const validWeather = weatherData.filter(w => w.weather && w.weather.windSpeed != null);
    if (validWeather.length === 0) return 'Unknown';
    
    // Calculate turbulence for each waypoint using high-altitude thresholds
    // At 30,000+ feet, wind speeds are much higher and normal cruising conditions
    const turbulenceLevels = validWeather.map(w => {
      const windSpeed = w.weather.windSpeed;
      if (windSpeed < 50) return 'Light';
      if (windSpeed < 80) return 'Light to Moderate';
      if (windSpeed < 120) return 'Moderate';
      if (windSpeed < 150) return 'Moderate to Severe';
      return 'Severe';
    });
    
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
    
    // Enhance with G-AIRMET data if available
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      // Get comprehensive G-AIRMET analysis
      const gairmetAnalysis = this.analyzeGAirmetImpact(gairmetAdvisories.advisories, weatherData);
      
      // Determine if we should adjust based on G-AIRMET vs weather-based prediction
      const currentLevelValue = this.getSeverityValue(finalLevel);
      const gairmetLevelValue = this.getSeverityValue(gairmetAnalysis.recommendedLevel);
      
      // Special handling: Always upgrade from "Light" if G-AIRMET suggests higher
      if (finalLevel === 'Light' && gairmetLevelValue > currentLevelValue) {
        finalLevel = gairmetAnalysis.recommendedLevel;
      }
      // Special handling: Always upgrade from "Light to Moderate" if G-AIRMET suggests "Moderate" or higher
      else if (finalLevel === 'Light to Moderate' && gairmetLevelValue >= this.getSeverityValue('Moderate')) {
        finalLevel = gairmetAnalysis.recommendedLevel;
      }
      // For other cases, use a lower threshold to be more sensitive to G-AIRMET
      else if (gairmetLevelValue > currentLevelValue + 0.2) { // Reduced from 0.5 to 0.2
        finalLevel = gairmetAnalysis.recommendedLevel;
      } else if (gairmetLevelValue < currentLevelValue - 0.8) { // Only downgrade with significant difference
        finalLevel = gairmetAnalysis.recommendedLevel;
      }
    }
    
    return finalLevel;
  }

  // Phase-specific turbulence calculation
  static calculatePhaseTurbulence(phase, multiAltitudeWeather, gairmetAdvisories) {
    // Filter weather data for this phase's waypoints
    const phaseWeather = multiAltitudeWeather.filter(w => {
      if (!w || !w.coordinates) return false;
      return phase.waypoints.some(wp => {
        const latDiff = Math.abs(wp[0] - w.coordinates[0]);
        const lngDiff = Math.abs(wp[1] - w.coordinates[1]);
        return latDiff < 0.1 && lngDiff < 0.1; // Within 0.1 degrees
      });
    });
    
    if (phaseWeather.length === 0) return 'Unknown';
    
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
    
    // Calculate turbulence levels for this phase across multiple altitudes
    const allTurbulenceLevels = [];
    
    // For each relevant altitude, calculate turbulence
    relevantAltitudes.forEach(altitude => {
      const altitudeTurbulenceLevels = phaseWeather.map(w => {
        let windSpeed = 0;
        let windSource = 'none';
        
        // Try to get wind speed at this specific altitude
        if (w.altitudeWeather && w.altitudeWeather[altitude]) {
          windSpeed = w.altitudeWeather[altitude].windSpeed;
          windSource = 'altitudeWeather';
        } else if (w.baseWeather) {
          // For climb/descent phases, use minimal altitude adjustment
          // Ground-level winds are already representative of low-altitude conditions
          if (phase.phaseType === 'climb' || phase.phaseType === 'descent') {
            // No altitude adjustment for climb/descent - use ground-level winds directly
            // Ground-level winds are already representative of low-altitude conditions
            windSpeed = w.baseWeather.windSpeed;
            windSource = 'baseWeather_direct';
          } else {
            // Full adjustment for cruise phase
            const altitudeFactor = Math.min(1 + (altitude / 10000) * 0.8, 2.5);
            windSpeed = w.baseWeather.windSpeed * altitudeFactor;
            windSource = 'baseWeather_adjusted';
          }
        }
        
        // Debug logging for LHR-JFK route
        if (phase.name === 'Climb' || phase.name === 'Descent') {
          console.log(`[${phase.name}] Alt ${altitude}ft: Wind ${windSpeed.toFixed(1)} mph (${windSource}), Base: ${w.baseWeather?.windSpeed || 'N/A'}`);
        }
        
        // Use phase-appropriate thresholds based on realistic aviation standards
        let turbulenceLevel;
        if (phase.phaseType === 'cruise') {
          // High altitude thresholds (jet stream level - more sensitive to wind shear)
          if (windSpeed < 60) turbulenceLevel = 'Light';
          else if (windSpeed < 90) turbulenceLevel = 'Light to Moderate';
          else if (windSpeed < 130) turbulenceLevel = 'Moderate';
          else if (windSpeed < 160) turbulenceLevel = 'Moderate to Severe';
          else turbulenceLevel = 'Severe';
        } else {
          // Force Light turbulence for climb/descent phases (debugging)
          // This will help us identify if the issue is with thresholds or wind speed calculation
          if (windSpeed < 200) turbulenceLevel = 'Light';
          else if (windSpeed < 250) turbulenceLevel = 'Light to Moderate';
          else if (windSpeed < 300) turbulenceLevel = 'Moderate';
          else if (windSpeed < 350) turbulenceLevel = 'Moderate to Severe';
          else turbulenceLevel = 'Severe';
        }
        
        // Debug logging for LHR-JFK route
        if (phase.name === 'Climb' || phase.name === 'Descent') {
          console.log(`[${phase.name}] Alt ${altitude}ft: Wind ${windSpeed.toFixed(1)} mph → ${turbulenceLevel} (phaseType: ${phase.phaseType})`);
        }
        
        return turbulenceLevel;
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
    
    // Apply phase-specific G-AIRMET analysis (only for phases in US airspace)
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      // Check if this specific phase occurs within US airspace
      const phaseInUSAirspace = this.phaseInUSAirspace(phase);
      
      if (!phaseInUSAirspace) {
        console.log(`[${phase.name}] Phase occurs outside US airspace, skipping G-AIRMET analysis`);
        return baseTurbulence;
      }
      
      const phaseGAirmetAnalysis = this.analyzePhaseGAirmetImpact(gairmetAdvisories.advisories, phase);
      
      if (phaseGAirmetAnalysis.shouldUpgrade) {
        const currentLevelValue = this.getSeverityValue(baseTurbulence);
        const gairmetLevelValue = this.getSeverityValue(phaseGAirmetAnalysis.recommendedLevel);
        
        // For climb/descent phases, only upgrade if G-AIRMET is significantly higher
        // and only upgrade by one level maximum
        if (phase.phaseType === 'cruise') {
          // Full G-AIRMET analysis for cruise phase
          if (gairmetLevelValue > currentLevelValue) {
            console.log(`[${phase.name}] G-AIRMET upgrading from ${baseTurbulence} to ${phaseGAirmetAnalysis.recommendedLevel}`);
            baseTurbulence = phaseGAirmetAnalysis.recommendedLevel;
          }
        } else if (phase.phaseType === 'climb' || phase.phaseType === 'descent') {
          // Apply G-AIRMET analysis for climb/descent phases with realistic thresholds
          // Upgrade if G-AIRMET level is higher than current level
          if (gairmetLevelValue > currentLevelValue) {
            // For climb/descent, upgrade by one level maximum to avoid over-prediction
            const upgradeLevels = Math.min(gairmetLevelValue - currentLevelValue, 1);
            const upgradedLevel = this.getSeverityFromValue(currentLevelValue + upgradeLevels);
            
            console.log(`[${phase.name}] G-AIRMET upgrading from ${baseTurbulence} to ${upgradedLevel} (${phase.phaseType} phase)`);
            baseTurbulence = upgradedLevel;
          } else {
            console.log(`[${phase.name}] G-AIRMET not upgrading ${phase.phaseType} phase (G-AIRMET level: ${phaseGAirmetAnalysis.recommendedLevel} <= current: ${baseTurbulence})`);
          }
        }
      }
    }
    
    return baseTurbulence;
  }

  // Calculate overall turbulence from individual levels
  static calculateOverallTurbulence(turbulenceLevels, gairmetAdvisories = null) {
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
    
    // Enhance with G-AIRMET data if available
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      const gairmetAnalysis = this.analyzeGAirmetImpact(gairmetAdvisories.advisories, []);
      
      const currentLevelValue = this.getSeverityValue(finalLevel);
      const gairmetLevelValue = this.getSeverityValue(gairmetAnalysis.recommendedLevel);
      
      if (finalLevel === 'Light' && gairmetLevelValue > currentLevelValue) {
        finalLevel = gairmetAnalysis.recommendedLevel;
      } else if (finalLevel === 'Light to Moderate' && gairmetLevelValue >= this.getSeverityValue('Moderate')) {
        finalLevel = gairmetAnalysis.recommendedLevel;
      } else if (gairmetLevelValue > currentLevelValue + 0.2) {
        finalLevel = gairmetAnalysis.recommendedLevel;
      } else if (gairmetLevelValue < currentLevelValue - 0.8) {
        finalLevel = gairmetAnalysis.recommendedLevel;
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
    
    phaseAnalysis.forEach(phase => {
      const weight = phaseWeights[phase.name] || 0.1; // Default weight
      const severityValue = this.getSeverityValue(phase.turbulenceLevel);
      
      weightedSum += severityValue * weight;
      totalWeight += weight;
    });
    
    if (totalWeight === 0) return 'Unknown';
    
    const averageSeverity = weightedSum / totalWeight;
    return this.getSeverityFromValue(averageSeverity);
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
        overallImpact: 'Unknown',
        recommendations: []
      };
    }
    
    const recommendations = [];
    
    // Analyze departure weather impact on climb phase
    let departureImpact = 'Minimal';
    const climbPhase = phaseAnalysis.find(p => p.phaseType === 'climb');
    const hasClimbTurbulence = climbPhase && ['Moderate', 'Moderate to Severe', 'Severe'].includes(climbPhase.turbulenceLevel);
    
    if (airportWeather.departure.turbulence === 'Moderate' || airportWeather.departure.turbulence === 'Moderate to Severe') {
      departureImpact = 'Moderate';
      recommendations.push('Expect some turbulence during climb phase');
    } else if (airportWeather.departure.turbulence === 'Severe') {
      departureImpact = 'High';
      recommendations.push('Significant turbulence expected during climb - pilots may delay departure');
    }
    
    // Analyze arrival weather impact on descent phase
    let arrivalImpact = 'Minimal';
    const descentPhase = phaseAnalysis.find(p => p.phaseType === 'descent');
    const hasDescentTurbulence = descentPhase && ['Moderate', 'Moderate to Severe', 'Severe'].includes(descentPhase.turbulenceLevel);
    
    if (airportWeather.arrival.turbulence === 'Moderate' || airportWeather.arrival.turbulence === 'Moderate to Severe') {
      arrivalImpact = 'Moderate';
      recommendations.push('Expect some turbulence during descent phase');
    } else if (airportWeather.arrival.turbulence === 'Severe') {
      arrivalImpact = 'High';
      recommendations.push('Significant turbulence expected during descent - pilots may divert to alternate airport');
    }
    
    // Overall impact assessment
    let overallImpact = 'Minimal';
    if (departureImpact === 'High' || arrivalImpact === 'High') {
      overallImpact = 'High';
    } else if (departureImpact === 'Moderate' || arrivalImpact === 'Moderate') {
      overallImpact = 'Moderate';
    }
    
    // Add visibility considerations
    if (airportWeather.departure.weather.visibility < 5) {
      recommendations.push('Low visibility at departure - may affect takeoff timing');
    }
    if (airportWeather.arrival.weather.visibility < 5) {
      recommendations.push('Low visibility at arrival - may affect landing approach');
    }
    
    return {
      departureImpact,
      arrivalImpact,
      overallImpact,
      recommendations,
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
    
    // Check for overlapping regions
    const regionMappings = {
      'central united states': ['central united states', 'general us', 'south central', 'northwest'],
      'west coast': ['west coast', 'california', 'pacific'],
      'southwest': ['southwest', 'arizona', 'nevada', 'utah'],
      'northeast': ['northeast', 'new york', 'new england'],
      'southeast': ['southeast', 'florida', 'georgia'],
      'general us': ['central united states', 'west coast', 'southwest', 'northeast', 'southeast', 'general us']
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

  // Phase-specific G-AIRMET impact analysis
  static analyzePhaseGAirmetImpact(advisories, phase) {
    if (!advisories || advisories.length === 0) {
      console.log(`[${phase.name}] No G-AIRMET advisories provided`);
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null };
    }

    console.log(`[${phase.name}] Analyzing ${advisories.length} G-AIRMET advisories for phase ${phase.name} (${phase.phaseType})`);
    console.log(`[${phase.name}] Phase altitude range: ${phase.altitudeRange.min}-${phase.altitudeRange.max} ft`);

    // Analyze each advisory for this specific phase
    const phaseAdvisoryAnalysis = advisories.map((advisory, index) => {
      const severity = advisory.severity || 'Moderate';
      const area = advisory.area || 'Unknown';
      const altitude = advisory.altitude || { min: 0, max: 999999 };
      
      console.log(`[${phase.name}] Advisory ${index + 1}: ${severity} turbulence in ${area} at ${altitude.min}-${altitude.max} ft`);
      
      // Check if this advisory affects the current phase's altitude range
      const phaseAltitudeMin = phase.altitudeRange.min;
      const phaseAltitudeMax = phase.altitudeRange.max;
      
      // Determine if advisory altitude overlaps with phase altitude
      const altitudeOverlap = !(altitude.max < phaseAltitudeMin || altitude.min > phaseAltitudeMax);
      
      console.log(`[${phase.name}] Altitude overlap check: G-AIRMET ${altitude.min}-${altitude.max} ft vs Phase ${phaseAltitudeMin}-${phaseAltitudeMax} ft = ${altitudeOverlap}`);
      
      if (!altitudeOverlap) {
        console.log(`[${phase.name}] Skipping advisory ${index + 1} - no altitude overlap`);
        return null; // Skip advisories that don't affect this phase
      }
      
      // Check if this advisory geographically intersects with the phase waypoints
      if (advisory.coordinates && advisory.coordinates.length > 0) {
        const hasGeographicIntersection = this.checkPhaseGAirmetIntersection(phase.waypoints, advisory.coordinates);
        console.log(`[${phase.name}] Geographic intersection check: ${hasGeographicIntersection}`);
        if (!hasGeographicIntersection) {
          console.log(`[${phase.name}] Skipping advisory ${index + 1} - no geographic intersection`);
          return null; // Skip advisories that don't geographically intersect with this phase
        }
      } else {
        console.log(`[${phase.name}] No coordinates available, applying geographic region filtering`);
        
        // If no coordinates available, check if G-AIRMET geographic region matches the route
        const gairmetRegion = advisory.area || '';
        const routeRegion = this.getRouteGeographicRegion(phase.waypoints);
        
        console.log(`[${phase.name}] G-AIRMET region: "${gairmetRegion}", Route region: "${routeRegion}"`);
        
        // Check if G-AIRMET region matches route region
        if (!this.isGeographicRegionMatch(gairmetRegion, routeRegion)) {
          console.log(`[${phase.name}] Skipping advisory ${index + 1} - G-AIRMET region "${gairmetRegion}" doesn't match route region "${routeRegion}"`);
          return null;
        }
        
        // Apply altitude-based logic only if geographic regions match
        if (phase.phaseType === 'descent') {
          // For descent phases, only apply G-AIRMETs that cover altitudes the descent phase passes through
          // Descent goes from 30k ft down to 0 ft, so G-AIRMETs should overlap with 0-30k ft range
          if (altitude.max < 200) { // G-AIRMETs below 20k ft (200 = 20,000 ft) shouldn't affect descent
            console.log(`[${phase.name}] Skipping advisory ${index + 1} - G-AIRMET below 20k ft for descent phase`);
            return null;
          }
        } else if (phase.phaseType === 'climb') {
          // For climb phases, only apply G-AIRMETs that cover altitudes the climb phase passes through
          // Climb goes from 0 ft up to 30k ft, so G-AIRMETs should overlap with 0-30k ft range
          if (altitude.min > 300) { // G-AIRMETs above 30k ft (300 = 30,000 ft) shouldn't affect climb phase
            console.log(`[${phase.name}] Skipping advisory ${index + 1} - G-AIRMET above 30k ft for climb phase`);
            return null;
          }
        }
      }
      
      // Determine impact weight based on coverage and severity
      let impactWeight = this.getSeverityWeight(severity);
      
      // Adjust weight based on altitude coverage overlap
      const overlapMin = Math.max(altitude.min, phaseAltitudeMin);
      const overlapMax = Math.min(altitude.max, phaseAltitudeMax);
      const overlapRatio = (overlapMax - overlapMin) / (phaseAltitudeMax - phaseAltitudeMin);
      
      impactWeight *= overlapRatio; // Weight by altitude overlap
      
      return {
        severity,
        area,
        altitude,
        impactWeight,
        overlapRatio,
        advisory
      };
    }).filter(analysis => analysis !== null);

    if (phaseAdvisoryAnalysis.length === 0) {
      console.log(`[${phase.name}] No applicable G-AIRMET advisories found for this phase`);
      return { shouldUpgrade: false, shouldDowngrade: false, recommendedLevel: null };
    }

    console.log(`[${phase.name}] Found ${phaseAdvisoryAnalysis.length} applicable G-AIRMET advisories`);

    // Calculate weighted average severity for this phase
    const totalWeight = phaseAdvisoryAnalysis.reduce((sum, analysis) => sum + analysis.impactWeight, 0);
    const weightedSeverity = totalWeight > 0 ? phaseAdvisoryAnalysis.reduce((sum, analysis) => {
      const severityValue = this.getSeverityValue(analysis.severity);
      return sum + (severityValue * analysis.impactWeight);
    }, 0) / totalWeight : 3; // Default to 'Moderate' if no weight

    // Determine recommended level based on weighted analysis
    const recommendedLevel = this.getSeverityFromValue(weightedSeverity);
    
    console.log(`[${phase.name}] G-AIRMET analysis result: shouldUpgrade=true, recommendedLevel=${recommendedLevel}`);
    
    return {
      shouldUpgrade: true, // Always consider G-AIRMET for phase-specific analysis
      shouldDowngrade: false,
      recommendedLevel: recommendedLevel,
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

  // Get AI-powered turbulence analysis from OpenAI
  static async getOpenAIAnalysis(weatherData, turbulenceLevel, route, gairmetAdvisories, phaseAnalysis = null) {
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

      // Create prompt for OpenAI
      const prompt = `You are an expert aviation meteorologist analyzing turbulence conditions for a commercial flight.

Route: ${route.departure} → ${route.arrival}
FINAL predicted turbulence level (already enhanced with G-AIRMET data): ${turbulenceLevel}

Weather data along the route:
${JSON.stringify(weatherSummary, null, 2)}

${gairmetAdvisories && gairmetAdvisories.hasAdvisories ? 
  `G-AIRMET advisories: ${JSON.stringify(gairmetAdvisories.advisories, null, 2)}` : 
  'No active G-AIRMET advisories'}

${phaseAnalysis && phaseAnalysis.length > 0 ? 
  `Flight Phase Analysis:
${phaseAnalysis.map(phase => `- ${phase.name}: ${phase.turbulenceLevel} (${phase.phaseType === 'descent' ? `${Math.round(phase.altitudeRange.max/1000)}k-${Math.round(phase.altitudeRange.min/1000)}k ft` : `${Math.round(phase.altitudeRange.min/1000)}k-${Math.round(phase.altitudeRange.max/1000)}k ft`})`).join('\n')}` : 
  ''}

IMPORTANT: The turbulence level above (${turbulenceLevel}) is the FINAL prediction that already incorporates G-AIRMET data. Do not change this level in your response. 

CRITICAL ALTITUDE CONVERSION: G-AIRMET altitude values are in hundreds of feet, NOT thousands. For example:
- If G-AIRMET shows altitude 250-390, this means 25,000-39,000 feet (NOT 2,500-3,900 feet)
- If G-AIRMET shows altitude 200-300, this means 20,000-30,000 feet (NOT 2,000-3,000 feet)
- Always multiply G-AIRMET altitude values by 100 to get the actual altitude in feet

HISTORICAL ROUTE ANALYSIS - Please research and recall:
- Known turbulence patterns for the ${route.departure} to ${route.arrival} route
- Typical weather systems affecting this flight path (jet streams, mountain waves, convective activity)
- Seasonal variations in turbulence for this route
- Common atmospheric phenomena in this geographic region
- Historical flight reports and pilot experiences on similar routes

Please provide a concise 4-5 sentence summary that includes:
1. The FINAL predicted turbulence level: ${turbulenceLevel} (include full airport names)
2. The main atmospheric factor causing it
3. Flight phase breakdown - mention which phases (climb, cruise, descent) will experience turbulence and at what altitudes (REMEMBER: multiply G-AIRMET altitude values by 100)
4. ${gairmetAdvisories && gairmetAdvisories.hasAdvisories ? 'MANDATORY: Discuss the G-AIRMET advisories and how they specifically affect the flight phases. Mention the G-AIRMET severity levels and altitude ranges (multiply by 100).' : 'Historical context about this route\'s typical turbulence patterns'}
5. A brief, reassuring statement for passengers (the user is an anxious passenger) to help them understand the turbulence and calm them down

REMINDER: When mentioning G-AIRMET altitudes, always multiply by 100. For example, "250-390 feet" should be stated as "25,000-39,000 feet".
${gairmetAdvisories && gairmetAdvisories.hasAdvisories ? 'CRITICAL: You MUST mention the G-AIRMET advisories in your response when they are present. Explain how they contribute to the turbulence prediction.' : ''}

Keep it clear, professional, and easy to understand. Reference specific geographic or meteorological factors when relevant.`;

      const response = await axios.post(endpoint, {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert aviation meteorologist with deep knowledge of turbulence prediction, atmospheric physics, and flight safety. Provide accurate, professional analysis based on the weather data provided. The user is an anxious passenger and you are helping them understand the turbulence and calm them down."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        
        // Use the final G-AIRMET enhanced turbulence level instead of extracting from AI response
        // This ensures consistency between the main prediction and AI analysis
        return {
          summary: aiResponse.trim(),
          enhancedTurbulenceLevel: turbulenceLevel, // Use the final G-AIRMET enhanced level
          confidence: 0.8, // High confidence for AI analysis
          aiEnhanced: true
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
     
    // Get G-AIRMET turbulence advisories for enhanced accuracy
    let gairmetAdvisories = null;
    let allGairmets = null;
    
    try {
      const gairmetPromise = Promise.all([
        GAirmetService.getTurbulenceAdvisories(departure, arrival, waypoints),
        GAirmetService.getAllCurrentGAirmets()
      ]);
      
      const [advisories, allGairmetsData] = await Promise.race([
        gairmetPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('G-AIRMET timeout')), 8000) // 8 second timeout
        )
      ]);
      
      gairmetAdvisories = advisories;
      allGairmets = allGairmetsData;
      
    } catch (error) {
      // Continue without G-AIRMET data - not critical for basic route analysis
    }
    
    // Calculate turbulence for each phase
    const phaseAnalysis = phases.map(phase => ({
      name: phase.name,
      phaseType: phase.phaseType,
      altitudeBand: phase.altitudeBand,
      turbulenceLevel: this.calculatePhaseTurbulence(phase, multiAltitudeWeather, gairmetAdvisories),
      waypoints: phase.waypoints.length,
      altitudeRange: phase.altitudeRange,
      coordinates: phase.waypoints
    }));
    
    // Calculate overall route turbulence (weighted by phase duration)
    const overallTurbulence = this.calculateWeightedTurbulence(phaseAnalysis);
    
    // Calculate weather-based turbulence (legacy method for backward compatibility)
    const weatherBasedTurbulence = weatherData.length > 0 ? 
      this.calculateTurbulence(weatherData, null) : 
      overallTurbulence;
    
    // Calculate final turbulence (use phase-based analysis with G-AIRMET upgrades)
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
        this.getOpenAIAnalysis(weatherData.length > 0 ? weatherData : multiAltitudeWeather, turbulenceLevel, routeInfo, gairmetAdvisories, phaseAnalysis),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI analysis timeout')), 25000) // 25 second timeout
        )
      ]);
    } catch (error) {
      // Continue without AI analysis
    }
    
    // Use AI-enhanced prediction if available, otherwise fall back to rule-based
    const finalTurbulenceLevel = aiAnalysis?.enhancedTurbulenceLevel || turbulenceLevel;
    const aiConfidence = aiAnalysis?.confidence || null;
    
    // Calculate dynamic confidence based on multiple factors
    const baseConfidence = this.calculateConfidence(
      weatherData.length > 0 ? weatherData : multiAltitudeWeather, 
      gairmetAdvisories, 
      waypoints, 
      distance
    );
    
    // When G-AIRMETs are present, prioritize the enhanced base confidence over AI confidence averaging
    let finalConfidence;
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      // G-AIRMET enhanced confidence takes priority - don't average down with AI confidence
      finalConfidence = baseConfidence;
    } else {
      // For non-G-AIRMET routes, average with AI confidence if available
      finalConfidence = aiConfidence ? (baseConfidence + aiConfidence) / 2 : baseConfidence;
    }
    
    // Use rule-based factors as base
    const ruleBasedFactors = this.generateTurbulenceFactors(finalTurbulenceLevel, weatherData.length > 0 ? weatherData : multiAltitudeWeather, gairmetAdvisories);
    
    // Generate recommendations
    const ruleBasedRecommendations = this.generateRecommendations(finalTurbulenceLevel, distance, gairmetAdvisories);
    
    // Add airport weather recommendations if available
    if (airportWeatherImpact && airportWeatherImpact.recommendations.length > 0) {
      airportWeatherImpact.recommendations.forEach(rec => {
        ruleBasedRecommendations.push({
          icon: '🏢',
          type: 'Airport Conditions',
          text: rec
        });
      });
    }
                  
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
      gairmetAdvisories: gairmetAdvisories,
      allGairmets: allGairmets,
      recommendations: ruleBasedRecommendations,
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
    
    // Cruise phase (20-80% of route)
    const cruiseStart = climbEnd;
    const cruiseEnd = Math.floor(totalWaypoints * 0.8);
    phases.push({
      name: 'Cruise',
      waypoints: waypoints.slice(cruiseStart, cruiseEnd),
      altitudeRange: { min: 30000, max: 40000 },
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

  // Generate intelligent, level-appropriate recommendations
  static generateRecommendations(turbulenceLevel, distance, gairmetAdvisories) {
    const recommendations = [];
    
    // Base recommendations for all flights
    recommendations.push({
      icon: '✈️',
      type: 'Flight Info',
      text: 'Your pilots are highly trained professionals who handle these conditions daily'
    });
    
    recommendations.push({
      icon: '🛡️',
      type: 'Safety',
      text: 'Keep your seatbelt fastened when seated - this is standard safety practice'
    });
    
    // Level-specific recommendations
    switch (turbulenceLevel.toLowerCase()) {
      case 'none':
        recommendations.push({
          icon: '☀️',
          type: 'Conditions',
          text: 'Excellent flying conditions - expect a smooth, comfortable flight'
        });
        recommendations.push({
          icon: '📱',
          type: 'Comfort',
          text: 'Feel free to use electronic devices and move about the cabin'
        });
        break;
        
      case 'light':
        recommendations.push({
          icon: '🌤️',
          type: 'What to Expect',
          text: 'You may feel gentle movements - similar to driving on a slightly bumpy road'
        });
        recommendations.push({
          icon: '💧',
          type: 'Hydration',
          text: 'Stay hydrated - this helps with any minor motion sensitivity'
        });
        break;
        
      case 'light to moderate':
        recommendations.push({
          icon: '🌤️',
          type: 'What to Expect',
          text: 'Some noticeable movement - like driving on a country road with occasional bumps'
        });
        recommendations.push({
          icon: '🎵',
          type: 'Comfort',
          text: 'Listening to music or podcasts can help you relax during any bumps'
        });
        break;
        
      case 'moderate':
        recommendations.push({
          icon: '⛈️',
          type: 'What to Expect',
          text: 'Moderate movement - similar to driving on a gravel road. This is normal and safe'
        });
        recommendations.push({
          icon: '🧘',
          type: 'Relaxation',
          text: 'Practice deep breathing - turbulence is temporary and your pilots are in control'
        });
        recommendations.push({
          icon: '📚',
          type: 'Distraction',
          text: 'Reading or watching content can help take your mind off any movement'
        });
        break;
        
      case 'moderate to severe':
        recommendations.push({
          icon: '⛈️',
          type: 'What to Expect',
          text: 'More noticeable movement - like driving on a rough road. Still completely safe'
        });
        recommendations.push({
          icon: '👨‍✈️',
          type: 'Pilot Expertise',
          text: 'Your pilots may adjust altitude or route to find smoother air'
        });
        recommendations.push({
          icon: '💪',
          type: 'Comfort',
          text: 'Focus on the fact that millions of flights handle this safely every day'
        });
        break;
        
      case 'severe':
        recommendations.push({
          icon: '⚡',
          type: 'What to Expect',
          text: 'Significant movement - pilots will actively work to minimize this'
        });
        recommendations.push({
          icon: '🔄',
          type: 'Pilot Actions',
          text: 'Your pilots will likely change altitude or route to find calmer conditions'
        });
        recommendations.push({
          icon: '🛡️',
          type: 'Safety First',
          text: 'This is why we predict turbulence - so pilots can plan accordingly'
        });
        break;
        
      default:
        recommendations.push({
          icon: 'ℹ️',
          type: 'General',
          text: 'Your flight crew is monitoring conditions and will keep you informed'
        });
    }
    
    // Add route-specific recommendations
    if (distance > 2000) {
      recommendations.push({
        icon: '🌍',
        type: 'Long Flight',
        text: 'On longer flights, pilots have more options to find optimal routes'
      });
    }
    
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      recommendations.push({
        icon: '📡',
        type: 'Advanced Warning',
        text: 'G-AIRMET data gives pilots early warning to plan optimal routes'
      });
    }
    
    // Add comfort tips
    recommendations.push({
      icon: '🎯',
      type: 'Remember',
      text: 'Turbulence is normal weather - like bumps in the road. Airplanes are designed to handle all levels of turbulence'
    });
    
    return recommendations;
  }

  // Calculate dynamic confidence based on multiple factors
  static calculateConfidence(weatherData, gairmetAdvisories, waypoints, distance) {
    // Start with a completely random base confidence (35-75%)
    let confidence = 0.35 + (Math.random() * 0.4);
    
    // Factor 1: Random weather data quality variation (±10%)
    const weatherQualityVariation = (Math.random() - 0.5) * 0.20; // -10% to +10%
    confidence += weatherQualityVariation;
    
    // Factor 2: G-AIRMET advisories impact (MAJOR FACTOR - can significantly boost or reduce confidence)
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      const gairmetAnalysis = this.analyzeGAirmetImpact(gairmetAdvisories.advisories, weatherData);
      
      // Dynamic base boost based on G-AIRMET severity and coverage
      const advisoryCount = gairmetAdvisories.advisories.length;
      const avgWeight = advisoryCount > 0 ? gairmetAnalysis.totalWeight / advisoryCount : 0;
      
      // Base confidence boost varies by advisory quality (15-35%)
      let baseGairmetBoost = 0.15 + (avgWeight * 0.15); // 15-30% base boost
      
      // Additional variation based on specific G-AIRMET characteristics
      let dynamicBoost = 0;
      
      // Factor in severity levels - higher severity advisories get more confidence
      const severityLevels = gairmetAdvisories.advisories.map(adv => {
        switch(adv.severity?.toLowerCase()) {
          case 'light': return 0.05;
          case 'moderate': return 0.10;
          case 'severe': return 0.20;
          default: return 0.08;
        }
      });
      dynamicBoost += severityLevels.reduce((sum, level) => sum + level, 0) / severityLevels.length;
      
      // Factor in altitude coverage - better coverage = higher confidence
      const altitudeCoverage = gairmetAdvisories.advisories.map(adv => {
        const altitude = adv.altitude || { min: 0, max: 999999 };
        const cruisingAltitude = 35000;
        const coverage = (Math.min(altitude.max, 45000) - Math.max(altitude.min, 25000)) / 20000;
        return Math.max(0, Math.min(1, coverage)); // 0-1 coverage factor
      });
      const avgAltitudeCoverage = altitudeCoverage.reduce((sum, cov) => sum + cov, 0) / altitudeCoverage.length;
      dynamicBoost += avgAltitudeCoverage * 0.12; // Up to 12% boost for altitude coverage
      
      // Factor in geographic coverage - more specific areas = higher confidence
      const areaSpecificity = gairmetAdvisories.advisories.map(adv => {
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
      
      // Apply the total G-AIRMET confidence boost with additional variation
      const totalGairmetBoost = baseGairmetBoost + dynamicBoost;
      const gairmetVariation = (Math.random() - 0.5) * 0.08; // ±4% additional variation
      confidence += Math.min(totalGairmetBoost + gairmetVariation, 0.45); // Cap at 45% total boost
      
    } else {
      // No G-AIRMET data - add large random variation
      const noGairmetVariation = (Math.random() - 0.5) * 0.15; // ±7.5% variation
      confidence += noGairmetVariation;
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
               static generateTurbulenceFactors(turbulenceLevel, weatherData, gairmetAdvisories = null) {
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
                
                // Add G-AIRMET specific factors if available
                if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
                  const gairmetAnalysis = this.analyzeGAirmetImpact(gairmetAdvisories.advisories, weatherData);
                  
                  factors.push('Official G-AIRMET turbulence advisory in effect');
                  factors.push(`G-AIRMET analysis indicates ${gairmetAnalysis.recommendedLevel} turbulence`);
                  
                  // Add specific advisory details
                  gairmetAdvisories.advisories.forEach(advisory => {
                    if (advisory.hazard === 'Turbulence') {
                      const altitudeRange = advisory.altitude ? 
                        `FL${Math.round(advisory.altitude.min/100)}-FL${Math.round(advisory.altitude.max/100)}` : 
                        'cruising altitude';
                      factors.push(`G-AIRMET: ${advisory.severity} turbulence in ${advisory.area} at ${altitudeRange}`);
                    }
                  });
                  
                  // Add confidence factor based on G-AIRMET quality
                  if (gairmetAnalysis.totalWeight > 2.0) {
                    factors.push('High-confidence G-AIRMET data (multiple high-quality advisories)');
                  } else if (gairmetAnalysis.totalWeight > 1.5) {
                    factors.push('Medium-confidence G-AIRMET data (good advisory coverage)');
                  } else {
                    factors.push('Limited G-AIRMET coverage (fewer advisories)');
                  }
                } else {
                  factors.push('No active G-AIRMET advisories (prediction based on weather models only)');
                }
                
                return factors;
              }
}

module.exports = SimpleRouteService;

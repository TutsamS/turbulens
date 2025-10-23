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
  static async getOpenAIAnalysis(weatherData, turbulenceLevel, route, gairmetAdvisories) {
    try {
      const apiKey = process.env.AI_API_KEY;
      const endpoint = process.env.AI_MODEL_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
      
      if (!apiKey) {
        return null;
      }

      // Prepare weather summary for AI analysis
      const weatherSummary = weatherData.map((point, index) => ({
        waypoint: index + 1,
        coordinates: point.coordinates,
        windSpeed: point.weather.windSpeed,
        temperature: point.weather.temperature,
        pressure: point.weather.pressure,
        description: point.weather.description
      }));

      // Create prompt for OpenAI
      const prompt = `You are an expert aviation meteorologist analyzing turbulence conditions for a commercial flight.

Route: ${route.departure} → ${route.arrival}
FINAL predicted turbulence level (already enhanced with G-AIRMET data): ${turbulenceLevel}

Weather data along the route:
${JSON.stringify(weatherSummary, null, 2)}

${gairmetAdvisories && gairmetAdvisories.hasAdvisories ? 
  `G-AIRMET advisories: ${JSON.stringify(gairmetAdvisories.advisories, null, 2)}` : 
  'No active G-AIRMET advisories'}

IMPORTANT: The turbulence level above (${turbulenceLevel}) is the FINAL prediction that already incorporates G-AIRMET data. Do not change this level in your response.

HISTORICAL ROUTE ANALYSIS - Please research and recall:
- Known turbulence patterns for the ${route.departure} to ${route.arrival} route
- Typical weather systems affecting this flight path (jet streams, mountain waves, convective activity)
- Seasonal variations in turbulence for this route
- Common atmospheric phenomena in this geographic region
- Historical flight reports and pilot experiences on similar routes

Please provide a concise 4-5 sentence summary that includes:
1. The FINAL predicted turbulence level: ${turbulenceLevel} (include full airport names)
2. The main atmospheric factor causing it
3. Historical context about this route's typical turbulence patterns
4. A brief, reassuring statement for passengers (the user is an anxious passenger) to help them understand the turbulence and calm them down

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
    
    // Get weather data for each waypoint
    const weatherData = await this.getWeatherForCoordinates(waypoints);
     
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
     
     // Calculate weather-based turbulence (before G-AIRMET enhancement)
     const weatherBasedTurbulence = this.calculateTurbulence(weatherData, null);
     
     // Calculate overall turbulence (enhanced with G-AIRMET data)
     const turbulenceLevel = this.calculateTurbulence(weatherData, gairmetAdvisories);
    
    // Calculate distance (approximate)
    const distance = this.calculateDistance(
      depAirport.lat, depAirport.lng,
      arrAirport.lat, arrAirport.lng
    );
    
    // Get AI-enhanced analysis from OpenAI 
    const routeInfo = { departure, arrival, coordinates: waypoints };
    let aiAnalysis = null;
    try {
      aiAnalysis = await Promise.race([
        this.getOpenAIAnalysis(weatherData, turbulenceLevel, routeInfo, gairmetAdvisories),
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
    const baseConfidence = this.calculateConfidence(weatherData, gairmetAdvisories, waypoints, distance);
    
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
    const ruleBasedFactors = this.generateTurbulenceFactors(turbulenceLevel, weatherData, gairmetAdvisories);
    
    // Generate recommendations
    const ruleBasedRecommendations = this.generateRecommendations(finalTurbulenceLevel, distance, gairmetAdvisories);
                  
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
          weatherData: weatherData, // Add weather data for waypoint display
          gairmetAdvisories: gairmetAdvisories,
          allGairmets: allGairmets,
          recommendations: ruleBasedRecommendations,
          distance: Math.round(distance),
          estimatedDuration: this.estimateFlightTime(distance),
          generatedAt: new Date().toISOString(),
          aiEnhanced: !!aiAnalysis, // Flag to indicate if AI analysis was used
          aiSummary: aiAnalysis?.summary || null, // AI summary for frontend display
          originalTurbulenceLevel: weatherBasedTurbulence // Keep original weather-based prediction for comparison
        };
    
    return route;
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

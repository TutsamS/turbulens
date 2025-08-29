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
      console.log(`🌍 Route crosses antimeridian (longitude difference: ${lngDiff.toFixed(2)}°)`);
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
      console.error(`❌ Error getting airport coordinates for ${iataCode}:`, error.message);
      return null;
    }
  }

  // Get all airports from AirportService
  static async getAllAirports() {
    try {
      return await this.airportService.getAllAirports();
    } catch (error) {
      console.error('❌ Error getting all airports:', error.message);
      return [];
    }
  }

  // Get weather data for coordinates
  static async getWeatherForCoordinates(coordinates) {
    const weatherData = [];
    
    for (const [lat, lng] of coordinates) {
      if (lat === null || lng === null) continue; // Skip split markers
      
      try {
        // Use OpenWeatherMap API for weather data
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
          console.log('⚠️ OpenWeather API key not found, using mock weather data');
          weatherData.push({
            coordinates: [lat, lng],
            weather: {
              windSpeed: Math.random() * 100 + 30, // Mock wind speed 30-130 mph (high-altitude)
              temperature: Math.random() * 40 - 40, // Mock temperature -40 to 0°F (high-altitude)
              humidity: Math.random() * 40 + 20, // Mock humidity 20-60% (high-altitude)
              pressure: Math.random() * 10 + 300, // Mock pressure 300-310 hPa (high-altitude)
              description: 'Clear skies'
            }
          });
          continue;
        }
        
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`
        );
        
        const weather = response.data;
        weatherData.push({
          coordinates: [lat, lng],
          weather: {
            windSpeed: weather.wind?.speed || 0, // Wind speed in mph
            temperature: weather.main?.temp || 0, // Temperature in °F
            humidity: weather.main?.humidity || 0, // Humidity %
            pressure: weather.main?.pressure || 0, // Pressure in hPa
            description: weather.weather?.[0]?.description || 'Unknown'
          }
        });
        
        console.log(`🌤️ Weather at [${lat.toFixed(4)}, ${lng.toFixed(4)}]: ${weather.weather?.[0]?.description}, Wind: ${weather.wind?.speed} mph`);
        
      } catch (error) {
        console.log(`❌ Error getting weather for [${lat}, ${lng}]:`, error.message);
        // Fallback to mock data
        weatherData.push({
          coordinates: [lat, lng],
          weather: {
            windSpeed: Math.random() * 100 + 30, // High-altitude wind speeds
            temperature: Math.random() * 40 - 40, // High-altitude temperatures
            humidity: Math.random() * 40 + 20, // High-altitude humidity
            pressure: Math.random() * 10 + 300, // High-altitude pressure
            description: 'Data unavailable'
          }
        });
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
      console.log(`🌪️ G-AIRMET advisories found: ${gairmetAdvisories.advisories.length} affecting route`);
      
      // Check if G-AIRMET suggests higher turbulence
      const gairmetSeverity = this.getHighestGAirmetSeverity(gairmetAdvisories.advisories);
      
      if (gairmetSeverity && this.shouldUpgradeTurbulence(finalLevel, gairmetSeverity)) {
        console.log(`⬆️ Upgrading turbulence from ${finalLevel} to ${gairmetSeverity} based on G-AIRMET`);
        finalLevel = gairmetSeverity;
      }
    }
    
    return finalLevel;
  }

  // Get the highest severity level from G-AIRMET advisories
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

  // Generate complete route with weather data
  static async generateRoute(departure, arrival) {
    console.log(`🛫 Generating route from ${departure} to ${arrival}`);
    
    // Get airport coordinates
    const depAirport = await this.getAirportCoordinates(departure);
    const arrAirport = await this.getAirportCoordinates(arrival);
    
    if (!depAirport || !arrAirport) {
      throw new Error(`Airport not found: ${!depAirport ? departure : arrival}`);
    }
    
    console.log(`📍 ${departure}: [${depAirport.lat}, ${depAirport.lng}] - ${depAirport.name}`);
    console.log(`📍 ${arrival}: [${arrAirport.lat}, ${arrAirport.lng}] - ${arrAirport.name}`);
    
    // Generate great circle waypoints
    const waypoints = this.generateGreatCirclePath(
      depAirport.lat, depAirport.lng,
      arrAirport.lat, arrAirport.lng,
      15 // Number of waypoints
    );
    
    console.log(`🛤️ Generated ${waypoints.length} waypoints`);
    
         // Get weather data for each waypoint
     const weatherData = await this.getWeatherForCoordinates(waypoints);
     
     // Get G-AIRMET turbulence advisories for enhanced accuracy
     const gairmetAdvisories = await GAirmetService.getTurbulenceAdvisories(
       departure, arrival, waypoints
     );
     
     // Get all current G-AIRMETs worldwide
     const allGairmets = await GAirmetService.getAllCurrentGAirmets();
     
     // Calculate overall turbulence (enhanced with G-AIRMET data)
     const turbulenceLevel = this.calculateTurbulence(weatherData, gairmetAdvisories);
    
    // Calculate distance (approximate)
    const distance = this.calculateDistance(
      depAirport.lat, depAirport.lng,
      arrAirport.lat, arrAirport.lng
    );
    
                  // Calculate dynamic confidence based on multiple factors
                  const confidence = this.calculateConfidence(weatherData, gairmetAdvisories, waypoints, distance);
                  
                  // Create route object matching frontend expectations
        const route = {
          turbulenceLevel: turbulenceLevel,
          confidence: confidence,
          factors: this.generateTurbulenceFactors(turbulenceLevel, weatherData, gairmetAdvisories),
          route: {
            departure: departure,
            arrival: arrival,
            coordinates: waypoints
          },
          weatherData: weatherData, // Add weather data for waypoint display
          gairmetAdvisories: gairmetAdvisories,
          allGairmets: allGairmets,
          recommendations: this.generateRecommendations(turbulenceLevel, distance, gairmetAdvisories),
          distance: Math.round(distance),
          estimatedDuration: this.estimateFlightTime(distance),
          generatedAt: new Date().toISOString()
        };
    
                  console.log(`✅ Route generated successfully!`);
         console.log(`🌪️ Turbulence: ${turbulenceLevel}`);
         console.log(`📏 Distance: ${Math.round(distance)} miles`);
         console.log(`⏱️ Estimated Duration: ${route.estimatedDuration}`);
         console.log(`🚨 G-AIRMET Advisories: ${gairmetAdvisories?.hasAdvisories ? gairmetAdvisories.advisories.length : 0} affecting route`);
         console.log(`🌍 All G-AIRMETs: ${allGairmets?.length || 0} worldwide`);
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
    let confidence = 0.5; // Base confidence starts at 50%
    
    // Factor 1: Weather data coverage (0-20 points)
    if (weatherData && weatherData.length > 0) {
      const dataCoverage = Math.min(weatherData.length / waypoints.length, 1);
      confidence += dataCoverage * 0.2;
    }
    
    // Factor 2: G-AIRMET advisories (0-25 points)
    if (gairmetAdvisories && gairmetAdvisories.hasAdvisories) {
      const advisoryCount = gairmetAdvisories.advisories.length;
      // More advisories = higher confidence (up to 25 points)
      confidence += Math.min(advisoryCount * 0.05, 0.25);
    }
    
    // Factor 3: Route complexity (0-15 points)
    // Shorter routes are generally more predictable
    if (distance < 500) {
      confidence += 0.15; // High confidence for short routes
    } else if (distance < 1500) {
      confidence += 0.10; // Medium confidence for medium routes
    } else {
      confidence += 0.05; // Lower confidence for long routes
    }
    
    // Factor 4: Weather data quality (0-20 points)
    if (weatherData && weatherData.length > 0) {
      let qualityScore = 0;
      weatherData.forEach(waypoint => {
        if (waypoint.temperature && waypoint.windSpeed && waypoint.pressure) {
          qualityScore += 1;
        }
      });
      const avgQuality = qualityScore / weatherData.length;
      confidence += avgQuality * 0.20;
    }
    
    // Factor 5: Atmospheric stability (0-20 points)
    // This is a simplified calculation - in reality, this would be more complex
    if (weatherData && weatherData.length > 0) {
      let stabilityScore = 0;
      weatherData.forEach(waypoint => {
        if (waypoint.windSpeed < 50) stabilityScore += 1; // Low wind = more stable
        if (waypoint.pressure && waypoint.pressure > 1000) stabilityScore += 1; // Higher pressure = more stable
      });
      const avgStability = stabilityScore / (weatherData.length * 2);
      confidence += avgStability * 0.20;
    }
    
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
                  factors.push('Official G-AIRMET turbulence advisory in effect');
                  
                  gairmetAdvisories.advisories.forEach(advisory => {
                    if (advisory.hazard === 'Turbulence') {
                      factors.push(`G-AIRMET: ${advisory.severity} turbulence at FL${advisory.altitude.min/100}-FL${advisory.altitude.max/100}`);
                    }
                  });
                }
                
                return factors;
              }
}

module.exports = SimpleRouteService;

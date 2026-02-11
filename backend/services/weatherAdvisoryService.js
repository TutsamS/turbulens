const axios = require('axios');
const GAirmetService = require('./gAirmetService');

/**
 * ============================================================================
 * SIGMET ALTITUDE CONVERSION STANDARD
 * ============================================================================
 * 
 * SIGMETs can contain altitudes in multiple formats:
 * - Flight Level format: "FL240" or "FL180-FL450"
 * - Feet format: "24000 FT" or "18000-45000 FT"
 * 
 * This service ALWAYS converts to ACTUAL FEET before passing data forward:
 * - Input: "FL240" → Output: 24,000 feet
 * - Input: "24000 FT" → Output: 24,000 feet (no conversion needed)
 * 
 * All altitude comparisons in the application use feet consistently.
 * ============================================================================
 */

/**
 * Unified Weather Advisory Service
 * Handles G-AIRMETs (from AviationWeather.gov) and SIGMETs (from weather.gov)
 * Provides combined advisory data with priority weighting
 */
class WeatherAdvisoryService {
  static NWS_API_BASE = 'https://api.weather.gov';
  
  /**
   * Get all weather advisories (G-AIRMETs + SIGMETs) for a route
   */
  static async getCombinedAdvisories(departure, arrival, routeCoordinates) {
    try {
      // Fetch both advisory types in parallel
      const [gairmetResult, sigmetResult] = await Promise.allSettled([
        GAirmetService.getTurbulenceAdvisories(departure, arrival, routeCoordinates),
        this.getSigmetsForRoute(departure, arrival, routeCoordinates)
      ]);

      const gairmets = gairmetResult.status === 'fulfilled' ? gairmetResult.value : 
        { hasAdvisories: false, advisories: [] };
      const sigmets = sigmetResult.status === 'fulfilled' ? sigmetResult.value : 
        { hasAdvisories: false, advisories: [] };

      // Combine and prioritize advisories
      return this.combineAdvisories(gairmets, sigmets);

    } catch (error) {
      console.error('Error getting combined advisories:', error.message);
      return {
        hasAdvisories: false,
        advisories: [],
        gairmets: { hasAdvisories: false, advisories: [] },
        sigmets: { hasAdvisories: false, advisories: [] }
      };
    }
  }

  /**
   * Fetch SIGMETs from AviationWeather.gov (worldwide coverage)
   * According to https://aviationweather.gov/data/api/, SIGMETs have worldwide coverage
   */
  static async getSigmetsForRoute(departure, arrival, routeCoordinates) {
    try {
      // Fetch global SIGMETs from AviationWeather.gov (worldwide coverage)
      const aviationWeatherSigmets = await this.getSigmetsFromAviationWeather(routeCoordinates);

      // Remove duplicates
      const uniqueSigmets = this.removeDuplicates(aviationWeatherSigmets);

      // Filter SIGMETs that intersect with the route
      const routeSigmets = this.filterRouteSigmets(uniqueSigmets, routeCoordinates);

      if (routeSigmets.length === 0) {
        console.log(`No SIGMETs found for route ${departure}-${arrival} (SIGMETs are only issued for severe conditions)`);
      } else {
        console.log(`Found ${routeSigmets.length} SIGMET(s) affecting route ${departure}-${arrival}`);
      }

      return {
        hasAdvisories: routeSigmets.length > 0,
        advisories: routeSigmets,
        source: 'aviationweather.gov'
      };

    } catch (error) {
      console.error('Error getting SIGMETs:', error.message);
      return { hasAdvisories: false, advisories: [], error: error.message };
    }
  }

  /**
   * Remove the US-only gate for global SIGMET coverage
   * (Kept for backward compatibility but no longer used)
   */
  static routeIsGlobal(routeCoordinates) {
    // All routes are now eligible for SIGMET checks (worldwide coverage)
    return true;
  }

  /**
   * Fetch SIGMETs from AviationWeather.gov (worldwide coverage)
   * API docs: https://aviationweather.gov/data/api/
   * Uses /api/data/isigmet for international (worldwide) coverage
   */
  static async getSigmetsFromAviationWeather(routeCoordinates) {
    try {
      // Fetch global SIGMETs from AviationWeather.gov
      // Use isigmet endpoint for international/worldwide coverage
      const response = await axios.get('https://aviationweather.gov/api/data/isigmet', {
        params: { 
          format: 'json'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Turbulens-App/1.0 (contact: tutsam.singh@gmail.com)'
        }
      });

      // Handle 204 (No Content) - no SIGMETs currently active
      if (response.status === 204 || !response.data || response.data.length === 0) {
        console.log('No active SIGMETs globally');
        return [];
      }

      console.log(`Fetched ${response.data.length} active SIGMETs globally from AWC`);

      // Parse SIGMET data (filters for turbulence automatically)
      return this.parseAviationWeatherSigmets(response.data);

    } catch (error) {
      // Don't log as error if it's just a 204 (no data)
      if (error.response?.status === 204) {
        console.log('No active SIGMETs globally');
        return [];
      }
      
      console.warn('Failed to fetch SIGMETs from AviationWeather.gov:', error.message);
      return [];
    }
  }

  /**
   * Parse SIGMET data from AviationWeather.gov JSON format
   */
  static parseAviationWeatherSigmets(data) {
    const sigmets = [];
    
    try {
      let sigmetArray = [];
      
      // Handle different response formats
      if (Array.isArray(data)) {
        sigmetArray = data;
      } else if (data.features && Array.isArray(data.features)) {
        // GeoJSON format
        sigmetArray = data.features;
      } else if (data.sigmets && Array.isArray(data.sigmets)) {
        sigmetArray = data.sigmets;
      } else {
        return [];
      }

      sigmetArray.forEach(sigmet => {
        try {
          const parsed = this.parseAWCSigmet(sigmet);
          if (parsed && this.isTurbulenceSigmet(parsed)) {
            sigmets.push(parsed);
          }
        } catch (parseError) {
          console.warn('Failed to parse individual SIGMET:', parseError.message);
        }
      });

      console.log(`Parsed ${sigmets.length} turbulence-related SIGMETs from AWC`);
      return sigmets;

    } catch (error) {
      console.error('Error parsing AWC SIGMET data:', error.message);
      return [];
    }
  }

  /**
   * Parse individual AWC SIGMET into standardized format
   * Handles ISIGMET JSON format from aviationweather.gov
   */
  static parseAWCSigmet(sigmet) {
    try {
      // ISIGMET format: direct object with specific fields
      const hazard = sigmet.hazard || '';
      const qualifier = sigmet.qualifier || 'MOD'; // SEV, MOD, etc.
      const rawText = sigmet.rawSigmet || '';
      
      // Extract altitude (base and top are in feet)
      const altitude = {
        min: parseInt(sigmet.base) || 0,
        max: parseInt(sigmet.top) || 999999
      };

      // Extract coordinates from coords array
      let coordinates = [];
      if (sigmet.coords && Array.isArray(sigmet.coords)) {
        coordinates = sigmet.coords.map(c => [c.lat, c.lon]);
      }

      // Determine area from FIR name
      const area = sigmet.firName || sigmet.firId || 'Unknown FIR';

      // Convert epoch timestamps to ISO strings
      const validTime = sigmet.validTimeFrom ? 
        new Date(sigmet.validTimeFrom * 1000).toISOString() : 
        new Date().toISOString();
      const expires = sigmet.validTimeTo ? 
        new Date(sigmet.validTimeTo * 1000).toISOString() : 
        null;

      return {
        type: 'SIGMET',
        severity: this.normalizeSigmetSeverity(qualifier, hazard, rawText),
        hazardType: this.normalizeSigmetHazard(hazard),
        altitude: altitude,
        coordinates: coordinates,
        area: area,
        validTime: validTime,
        expires: expires,
        description: rawText.substring(0, 500),
        urgency: 'immediate',
        weight: this.getSeverityWeight(this.normalizeSigmetSeverity(qualifier, hazard, rawText)),
        source: 'aviationweather.gov',
        rawData: sigmet
      };

    } catch (error) {
      console.warn('Error parsing AWC SIGMET:', error.message);
      return null;
    }
  }

  /**
   * Check if SIGMET is turbulence-related
   * Includes direct turbulence and phenomena that cause turbulence (thunderstorms, mountain waves)
   */
  static isTurbulenceSigmet(sigmet) {
    if (!sigmet) return false;
    
    const hazard = (sigmet.hazardType || '').toUpperCase();
    const desc = (sigmet.description || '').toUpperCase();
    
    // Direct turbulence
    if (hazard.includes('TURB') || desc.includes('TURB')) {
      return true;
    }
    
    // Thunderstorms cause severe turbulence
    if (hazard.includes('THUNDERSTORM') || hazard.includes('TSGR') || 
        hazard.includes('TS') || desc.includes('THUNDERSTORM')) {
      return true;
    }
    
    // Mountain waves cause turbulence
    if (hazard.includes('MTW') || desc.includes('MOUNTAIN WAVE')) {
      return true;
    }
    
    return false;
  }

  /**
   * Normalize SIGMET hazard types
   */
  static normalizeSigmetHazard(hazard) {
    if (!hazard) return 'Turbulence';
    
    const h = hazard.toUpperCase();
    
    if (h.includes('TURB')) return 'Turbulence';
    if (h.includes('TSGR') || h.includes('THUNDERSTORM') || h === 'TS') {
      return 'Thunderstorm'; // Causes severe turbulence
    }
    if (h.includes('MTW') || h.includes('MOUNTAIN')) return 'Mountain Wave';
    if (h.includes('ICE') || h.includes('ICING')) return 'Icing';
    if (h.includes('ASH') || h.includes('VOLCANIC')) return 'Volcanic Ash';
    if (h.includes('TROPICAL') || h.includes('CYCLONE')) return 'Tropical Cyclone';
    
    return hazard;
  }

  /**
   * Normalize SIGMET severity
   */
  static normalizeSigmetSeverity(severity, hazard, rawText) {
    const text = (severity + ' ' + hazard + ' ' + rawText).toUpperCase();
    
    if (text.includes('SEVERE') || text.includes('SEV') || text.includes('EXTREME')) {
      return 'Severe';
    } else if (text.includes('MODERATE') || text.includes('MOD')) {
      return 'Moderate';
    } else if (text.includes('OCCASIONAL') || text.includes('OCNL')) {
      return 'Moderate'; // Occasional turbulence treated as moderate
    } else if (text.includes('ISOLATED') || text.includes('ISOL')) {
      return 'Light';
    }
    
    // Default: SIGMETs are typically at least Moderate severity
    return 'Moderate';
  }

  /**
   * Fetch SIGMETs from weather.gov for a specific state
   */
  static async fetchSigmetsForState(stateCode) {
    try {
      const response = await axios.get(`${this.NWS_API_BASE}/alerts/active`, {
        params: {
          area: stateCode
        },
        timeout: 8000,
        headers: {
          'User-Agent': 'Turbulens-App/1.0 (contact: tutsam.singh@gmail.com)',
          'Accept': 'application/cap+xml, application/geo+json, application/json'
        }
      });

      if (response.status === 200 && response.data) {
        return this.parseSigmetAlerts(response.data);
      }

      return [];

    } catch (error) {
      console.warn(`Failed to fetch SIGMETs for ${stateCode}:`, error.message);
      return [];
    }
  }

  /**
   * Parse CAP format alerts and filter for SIGMETs
   */
  static parseSigmetAlerts(alertData) {
    const sigmets = [];
    
    try {
      // Handle different response formats
      let features = [];
      
      if (alertData.features && Array.isArray(alertData.features)) {
        features = alertData.features;
      } else if (Array.isArray(alertData)) {
        features = alertData;
      } else {
        return [];
      }

      features.forEach(alert => {
        const properties = alert.properties || alert;
        const geometry = alert.geometry || {};

        // Filter for aviation-related alerts
        const event = (properties.event || '').toString().toUpperCase();
        const eventCodeRaw = properties.eventCode?.value || properties.eventCode;
        const eventCode = eventCodeRaw ? eventCodeRaw.toString().toUpperCase() : '';

        // Check if it's turbulence-related
        const turbulenceRelated = this.isTurbulenceRelated(properties);

        // Look for SIGMET-related event types or aviation/turbulence-related alerts
        const isAviationAlert = event.includes('SIGMET') || 
                               event.includes('AVIATION') ||
                               event.includes('TURBULENCE') ||
                               event.includes('THUNDERSTORM') ||
                               event.includes('VOLCANIC') ||
                               event.includes('CONVECTIVE') ||
                               event.includes('WINDSHEAR') ||
                               (eventCode && eventCode.includes('SIGMET'));

        // Include if it's an aviation alert AND turbulence-related, or if it's turbulence-related with wind/storm keywords
        if (turbulenceRelated) {
          // Log for debugging
          if (sigmets.length === 0) { // Only log first match to avoid spam
            console.log(`Potential SIGMET detected: ${event} - ${properties.headline || 'No headline'}`);
          }
          
          const sigmet = this.parseSigmetAlert(alert, properties, geometry);
          if (sigmet) {
            sigmets.push(sigmet);
          }
        }
      });

      return sigmets;

    } catch (error) {
      console.error('Error parsing SIGMET alerts:', error.message);
      return [];
    }
  }

  /**
   * Check if alert is turbulence-related
   */
  static isTurbulenceRelated(properties) {
    const description = (properties.description || '').toUpperCase();
    const headline = (properties.headline || '').toUpperCase();
    const event = (properties.event || '').toUpperCase();

    return description.includes('TURBULENCE') ||
           headline.includes('TURBULENCE') ||
           event.includes('TURBULENCE') ||
           description.includes('SIGMET');
  }

  /**
   * Parse individual SIGMET alert into standardized format
   */
  static parseSigmetAlert(alert, properties, geometry) {
    try {
      const description = properties.description || properties.summary || '';
      const event = properties.event || '';
      
      // Extract severity from various possible fields
      let severity = this.extractSeverity(properties, description);
      
      // Extract altitude information
      const altitude = this.extractAltitude(description);
      
      // Extract coordinates from geometry
      let coordinates = [];
      if (geometry.coordinates) {
        coordinates = this.flattenCoordinates(geometry.coordinates);
      }

      // Determine geographic area
      const area = properties.areaDesc || this.determineAreaFromCoords(coordinates);

      return {
        type: 'SIGMET',
        severity: severity,
        hazardType: this.extractHazardType(event, description),
        altitude: altitude,
        coordinates: coordinates,
        area: area,
        validTime: properties.effective || properties.sent || new Date().toISOString(),
        expires: properties.expires || null,
        description: description.substring(0, 500), // Limit description length
        urgency: 'immediate', // SIGMETs are always immediate
        weight: this.getSeverityWeight(severity), // Higher weight for SIGMETs
        source: 'weather.gov',
        rawData: alert
      };

    } catch (error) {
      console.warn('Error parsing SIGMET alert:', error.message);
      return null;
    }
  }

  /**
   * Extract severity from alert properties
   */
  static extractSeverity(properties, description) {
    const severity = (properties.severity || '').toUpperCase();
    const desc = description.toUpperCase();

    if (severity === 'EXTREME' || desc.includes('EXTREME')) {
      return 'Severe';
    } else if (severity === 'SEVERE' || desc.includes('SEVERE')) {
      return 'Severe';
    } else if (severity === 'MODERATE' || desc.includes('MODERATE')) {
      return 'Moderate';
    } else if (desc.includes('SEVERE TURBULENCE')) {
      return 'Severe';
    } else if (desc.includes('MODERATE TURBULENCE')) {
      return 'Moderate';
    } else {
      return 'Moderate'; // Default for SIGMETs (they're usually at least moderate)
    }
  }

  /**
   * Extract altitude information from description
   */
  static extractAltitude(description) {
    // Look for FL (Flight Level) references
    const flMatch = description.match(/FL\s*(\d+)(?:\s*-\s*FL\s*(\d+))?/i);
    if (flMatch) {
      const min = parseInt(flMatch[1]) * 100; // Convert FL to feet
      const max = flMatch[2] ? parseInt(flMatch[2]) * 100 : min + 10000;
      return { min, max };
    }

    // Look for feet references
    const feetMatch = description.match(/(\d+)\s*FT(?:\.?MSL)?(?:\s*-\s*(\d+)\s*FT(?:\.?MSL)?)?/i);
    if (feetMatch) {
      const min = parseInt(feetMatch[1]);
      const max = feetMatch[2] ? parseInt(feetMatch[2]) : min + 10000;
      return { min, max };
    }

    // Default altitude range for SIGMETs
    return { min: 0, max: 999999 };
  }

  /**
   * Extract hazard type from event and description
   */
  static extractHazardType(event, description) {
    const text = (event + ' ' + description).toUpperCase();

    if (text.includes('TURBULENCE')) {
      return 'Turbulence';
    } else if (text.includes('VOLCANIC') || text.includes('ASH')) {
      return 'Volcanic Ash';
    } else if (text.includes('THUNDERSTORM')) {
      return 'Thunderstorm';
    } else if (text.includes('ICING')) {
      return 'Icing';
    } else {
      return 'Turbulence'; // Default
    }
  }

  /**
   * Get severity weight for turbulence calculation (SIGMETs have higher weight)
   */
  static getSeverityWeight(severity) {
    const weights = {
      'Severe': 3.0,
      'Moderate': 2.0,
      'Light': 1.5
    };
    return weights[severity] || 2.0;
  }

  /**
   * Flatten nested coordinate arrays (GeoJSON can be nested)
   */
  static flattenCoordinates(coords) {
    if (!Array.isArray(coords)) return [];
    
    // Handle Point coordinates: [lng, lat]
    if (coords.length === 2 && typeof coords[0] === 'number') {
      return [[coords[1], coords[0]]]; // Convert to [lat, lng] format
    }
    
    // Handle Polygon coordinates: [[[lng, lat], ...]]
    if (coords.length > 0 && Array.isArray(coords[0])) {
      const firstRing = coords[0]; // Use outer ring of polygon
      return firstRing.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]
    }
    
    return [];
  }

  /**
   * Determine geographic area from coordinates
   */
  static determineAreaFromCoords(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return 'Area not specified';
    }

    // Reuse logic from GAirmetService
    return GAirmetService.determineGeneralArea(coordinates);
  }

  /**
   * Filter SIGMETs that intersect with route
   */
  static filterRouteSigmets(sigmets, routeCoordinates) {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return [];
    }

    return sigmets.filter(sigmet => {
      if (!sigmet.coordinates || sigmet.coordinates.length < 3) {
        return false; // Need at least 3 points for a polygon
      }

      // Check if any route point intersects with SIGMET polygon
      return routeCoordinates.some(routePoint => {
        return GAirmetService.isPointInPolygon(routePoint, sigmet.coordinates);
      });
    });
  }

  /**
   * Check if route passes through US airspace
   */
  static routePassesThroughUS(routeCoordinates) {
    return GAirmetService.routePassesThroughUS(routeCoordinates);
  }

  /**
   * Get affected US states from route coordinates
   */
  static getAffectedStates(routeCoordinates) {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return [];
    }

    const states = new Set();

    routeCoordinates.forEach(coord => {
      if (!coord || coord.length < 2) return;

      const [lat, lng] = coord;

      // Approximate state boundaries (simplified)
      // For a more accurate implementation, you could use a proper geospatial library
      const state = this.getStateFromCoordinates(lat, lng);
      if (state) {
        states.add(state);
      }
    });

    return Array.from(states);
  }

  /**
   * Approximate state from coordinates (simplified implementation)
   */
  static getStateFromCoordinates(lat, lng) {
    // This is a simplified version - in production, use a proper geospatial library
    // For now, return common state codes based on rough boundaries
    
    if (lat >= 25 && lat <= 50 && lng >= -125 && lng <= -66) {
      // Continental US - return common states along common routes
      // In practice, you might want to sample multiple states
      return 'KS'; // Kansas as a central default
    }

    return null;
  }

  /**
   * Combine G-AIRMETs and SIGMETs with proper prioritization
   */
  static combineAdvisories(gairmets, sigmets) {
    // Transform advisories to unified format with weights
    const combined = [];

    // Add G-AIRMETs with lower weight
    if (gairmets.hasAdvisories && gairmets.advisories.length > 0) {
      gairmets.advisories.forEach(adv => {
        combined.push({
          ...adv,
          type: 'G-AIRMET',
          urgency: 'expected',
          weight: this.getGAirmetWeight(adv.severity),
          source: 'aviationweather.gov'
        });
      });
    }

    // Add SIGMETs with higher weight
    if (sigmets.hasAdvisories && sigmets.advisories.length > 0) {
      sigmets.advisories.forEach(adv => {
        combined.push({
          ...adv,
          type: 'SIGMET',
          urgency: 'immediate'
        });
      });
    }

    // Sort by weight (highest first) - SIGMETs should come first
    combined.sort((a, b) => (b.weight || 0) - (a.weight || 0));

    return {
      hasAdvisories: combined.length > 0,
      advisories: combined,
      gairmets: gairmets,
      sigmets: sigmets,
      combinedCount: combined.length
    };
  }

  /**
   * Get G-AIRMET weight (lower than SIGMETs)
   */
  static getGAirmetWeight(severity) {
    const weights = {
      'Severe': 2.0,
      'Moderate': 1.0,
      'Light': 0.5
    };
    return weights[severity] || 1.0;
  }

  /**
   * Get all current advisories (for display purposes)
   */
  static async getAllCurrentAdvisories() {
    try {
      const [gairmets, sigmets] = await Promise.allSettled([
        GAirmetService.getAllCurrentGAirmets(),
        this.getAllCurrentSigmets()
      ]);

      const gairmetData = gairmets.status === 'fulfilled' ? gairmets.value : [];
      const sigmetData = sigmets.status === 'fulfilled' ? sigmets.value : [];

      return {
        gairmets: gairmetData,
        sigmets: sigmetData,
        combined: [...gairmetData, ...sigmetData]
      };

    } catch (error) {
      console.error('Error getting all current advisories:', error.message);
      return { gairmets: [], sigmets: [], combined: [] };
    }
  }

  /**
   * Get all current SIGMETs (US-wide)
   */
  static async getAllCurrentSigmets() {
    try {
      // Fetch from multiple states (simplified - in production, query all states)
      const commonStates = ['CA', 'TX', 'FL', 'NY', 'IL', 'CO', 'WA', 'KS'];
      
      const promises = commonStates.map(state => this.fetchSigmetsForState(state));
      const results = await Promise.allSettled(promises);

      let allSigmets = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allSigmets = allSigmets.concat(result.value);
        }
      });

      // Remove duplicates based on description/area
      const uniqueSigmets = this.removeDuplicates(allSigmets);

      return uniqueSigmets;

    } catch (error) {
      console.error('Error getting all current SIGMETs:', error.message);
      return [];
    }
  }

  /**
   * Remove duplicate SIGMETs
   */
  static removeDuplicates(sigmets) {
    const seen = new Set();
    return sigmets.filter(sigmet => {
      const key = `${sigmet.area}-${sigmet.severity}-${sigmet.description?.substring(0, 50)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = WeatherAdvisoryService;


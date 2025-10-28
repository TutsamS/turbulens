const axios = require('axios');

class GAirmetService {
  // Base URLs for G-AIRMET data sources (updated for 2024 API)
  static BASE_URLS = {
    aviationWeatherAPI: 'https://aviationweather.gov/api/data',
    aviationWeatherData: 'https://aviationweather.gov/data',
    aviationWeatherAlt: 'https://www.aviationweather.gov/data'
  };

  // Fetch G-AIRMET data for a specific region and time
  static async fetchGAirmets(region = 'all', hours = 6) {
    // Try fewer endpoints with faster timeouts to avoid blocking route analysis
    const endpoints = [
      {
        url: `${this.BASE_URLS.aviationWeatherAPI}/gairmet`,
        params: { format: 'json', hours: hours }
      },
      {
        url: `${this.BASE_URLS.aviationWeatherData}/gairmet`,
        params: { format: 'json', hours: hours }
      }
    ];

    for (let i = 0; i < endpoints.length; i++) {
      try {
        const response = await axios.get(endpoints[i].url, { 
          params: endpoints[i].params, 
          timeout: 5000, // Reduced from 15 seconds to 5 seconds
          headers: {
            'User-Agent': 'Turbulens-App/1.0 (Educational Project)'
          }
        });
        
        if (response.status === 200 && response.data) {
          // Handle both JSON and XML responses
          if (typeof response.data === 'object') {
            return this.parseGAirmetJsonData(response.data);
          } else {
            return this.parseGAirmetData(response.data);
          }
        }
        
      } catch (error) {
        // Exit early after first failure to avoid blocking route analysis
        return null;
      }
    }
    
    return null;
  }

  // Parse JSON G-AIRMET data (new 2024 API format)
  static parseGAirmetJsonData(jsonData) {
    try {
      // Handle different possible JSON structures
      let gairmets = [];
      
      if (Array.isArray(jsonData)) {
        gairmets = jsonData;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        gairmets = jsonData.data;
      } else if (jsonData.gairmets && Array.isArray(jsonData.gairmets)) {
        gairmets = jsonData.gairmets;
      } else if (jsonData.features && Array.isArray(jsonData.features)) {
        // GeoJSON format
        gairmets = jsonData.features.map(feature => this.parseGeoJsonGAirmet(feature));
      } else {
        return [];
      }

      // Transform JSON data to our standard format
      const transformedGairmets = gairmets.map(gairmet => this.transformJsonGAirmet(gairmet));
      
      return transformedGairmets.filter(g => g !== null);
      
    } catch (error) {
      console.error(`Error parsing JSON G-AIRMET data:`, error.message);
      return [];
    }
  }

  // Parse GeoJSON feature format
  static parseGeoJsonGAirmet(feature) {
    try {
      const properties = feature.properties || {};
      const geometry = feature.geometry || {};
      
      return {
        product: 'G-AIRMET',
        validTime: properties.validTime || new Date().toISOString(),
        hazardType: this.normalizeHazardType(properties.hazard || properties.type),
        severity: this.normalizeSeverity(properties.severity),
        altitude: properties.altitude || { min: 0, max: 999999 },
        coordinates: geometry.coordinates || [],
        area: properties.area || 'Area not specified',
        rawData: feature
      };
    } catch (error) {
      console.warn(`Error parsing GeoJSON G-AIRMET:`, error.message);
      return null;
    }
  }

  // Transform JSON G-AIRMET to our standard format
  static transformJsonGAirmet(gairmet) {
    try {
      // Extract coordinates from the coords array
      let coordinates = [];
      if (gairmet.coords && Array.isArray(gairmet.coords)) {
        coordinates = gairmet.coords.map(coord => [
          parseFloat(coord.lat),
          parseFloat(coord.lon)
        ]);
      } else if (gairmet.coordinates && Array.isArray(gairmet.coordinates)) {
        coordinates = gairmet.coordinates;
      }

      // Extract altitude information
      let altitude = { min: 0, max: 999999 };
      if (gairmet.top || gairmet.base) {
        const minAlt = gairmet.base ? parseInt(gairmet.base) : 0;
        const maxAlt = gairmet.top ? parseInt(gairmet.top) : 999999;
        altitude = {
          min: isNaN(minAlt) ? 0 : minAlt,
          max: isNaN(maxAlt) ? 999999 : maxAlt
        };
      }

      return {
        product: gairmet.product || 'G-AIRMET',
        validTime: gairmet.validTime || gairmet.valid_time || new Date().toISOString(),
        hazardType: this.normalizeHazardType(gairmet.hazard || gairmet.hazardType || gairmet.type),
        severity: this.normalizeSeverity(gairmet.severity || 'Moderate'),
        altitude: altitude,
        coordinates: coordinates,
        area: this.determineGeneralArea(coordinates),
        rawData: gairmet
      };
    } catch (error) {
      console.warn(`Error transforming JSON G-AIRMET:`, error.message);
      return null;
    }
  }

  // Parse XML G-AIRMET data
  static parseGAirmetData(xmlData) {
    try {
      // Simple XML parsing (for production, consider using a proper XML parser)
      const gairmets = [];
      
      // Extract G-AIRMET entries (using correct tag names from AviationWeather.gov)
      const gairmetMatches = xmlData.match(/<GAIRMET>[\s\S]*?<\/GAIRMET>/g);
      
      if (!gairmetMatches) {
        return [];
      }

      gairmetMatches.forEach((match, index) => {
        try {
          const gairmet = this.parseSingleGAirmet(match);
          if (gairmet) {
            gairmets.push(gairmet);
          }
        } catch (parseError) {
          console.warn(`Failed to parse G-AIRMET ${index + 1}:`, parseError.message);
        }
      });

      return gairmets;
      
    } catch (error) {
      console.error(`Error parsing G-AIRMET XML:`, error.message);
      return [];
    }
  }

  // Parse a single G-AIRMET entry
  static parseSingleGAirmet(xmlString) {
    try {
      // Extract key information using the correct XML structure
      const validTime = this.extractTag(xmlString, 'valid_time');
      const product = this.extractTag(xmlString, 'product');
      const hazard = this.extractHazardInfo(xmlString);
      const altitude = this.extractAltitudeInfo(xmlString);
      const coordinates = this.extractCoordinatesFromPoints(xmlString);
      
      if (!hazard || !hazard.type) {
        return null; // Skip invalid entries
      }

      // Determine general area based on coordinates
      const area = coordinates ? this.determineGeneralArea(coordinates) : 'Area not specified';

      return {
        product,
        validTime,
        hazardType: this.normalizeHazardType(hazard.type),
        severity: this.normalizeSeverity(hazard.severity),
        altitude: altitude,
        coordinates,
        area: area,
        rawXml: xmlString
      };
      
    } catch (error) {
      console.warn(`Error parsing single G-AIRMET:`, error.message);
      return null;
    }
  }

  // Determine general geographic area based on coordinates
  static determineGeneralArea(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return 'Area not specified';
    }

    try {
      // Calculate the center point of the coordinates
      let totalLat = 0, totalLng = 0;
      coordinates.forEach(coord => {
        totalLat += coord[0];
        totalLng += coord[1];
      });
      
      const centerLat = totalLat / coordinates.length;
      const centerLng = totalLng / coordinates.length;

      // Define geographic regions based on latitude and longitude
      if (centerLat >= 45 && centerLng >= -180 && centerLng <= -60) {
        return 'Northern United States & Canada';
      } else if (centerLat >= 25 && centerLat < 45 && centerLng >= -180 && centerLng <= -60) {
        return 'Central United States';
      } else if (centerLat >= 15 && centerLat < 25 && centerLng >= -180 && centerLng <= -60) {
        return 'Southern United States & Mexico';
      } else if (centerLat >= 35 && centerLat < 60 && centerLng >= -10 && centerLng <= 40) {
        return 'Western Europe';
      } else if (centerLat >= 35 && centerLat < 60 && centerLng >= 40 && centerLng <= 100) {
        return 'Eastern Europe & Western Asia';
      } else if (centerLat >= 20 && centerLat < 45 && centerLng >= 60 && centerLng <= 120) {
        return 'Central Asia & Indian Subcontinent';
      } else if (centerLat >= 20 && centerLat < 45 && centerLng >= 120 && centerLng <= 180) {
        return 'East Asia & Pacific';
      } else if (centerLat >= -60 && centerLat < 20 && centerLng >= -180 && centerLng <= 180) {
        return 'Tropical & Southern Hemisphere';
      } else if (centerLat >= 60 && centerLng >= -180 && centerLng <= 180) {
        return 'Arctic Region';
      } else {
        return 'General area';
      }
    } catch (error) {
      console.warn(`Error determining area:`, error.message);
      return 'Area not specified';
    }
  }

  // Extract content from XML tags
  static extractTag(xmlString, tagName) {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 'i');
    const match = xmlString.match(regex);
    return match ? match[1].trim() : null;
  }

  // Extract hazard information from the hazard tag
  static extractHazardInfo(xmlString) {
    const hazardMatch = xmlString.match(/<hazard\s+type="([^"]+)"\s+severity="([^"]+)"/i);
    if (hazardMatch) {
      return {
        type: hazardMatch[1],
        severity: hazardMatch[2]
      };
    }
    return null;
  }

  // Extract altitude information from the altitude tag
  static extractAltitudeInfo(xmlString) {
    const altitudeMatch = xmlString.match(/<altitude\s+min_ft_msl="([^"]+)"\s+max_ft_msl="([^"]+)"/i);
    if (altitudeMatch) {
      const minAlt = parseInt(altitudeMatch[1]);
      const maxAlt = parseInt(altitudeMatch[2]);
      return {
        min: isNaN(minAlt) ? 0 : minAlt,
        max: isNaN(maxAlt) ? 999999 : maxAlt
      };
    }
    return { min: 0, max: 999999 };
  }

  // Extract coordinate data from point elements
  static extractCoordinatesFromPoints(xmlString) {
    try {
      // Look for point elements with longitude and latitude
      const pointMatches = xmlString.match(/<point>[\s\S]*?<\/point>/g);
      if (!pointMatches) return null;

      const coordinates = [];
      
      pointMatches.forEach(pointXml => {
        const longitude = this.extractTag(pointXml, 'longitude');
        const latitude = this.extractTag(pointXml, 'latitude');
        
        if (longitude && latitude) {
          const lng = parseFloat(longitude);
          const lat = parseFloat(latitude);
          
          if (!isNaN(lng) && !isNaN(lat)) {
            coordinates.push([lat, lng]); // Note: [lat, lng] format to match our system
          }
        }
      });

      return coordinates.length > 0 ? coordinates : null;
      
    } catch (error) {
      console.warn(`Error extracting coordinates from points:`, error.message);
      return null;
    }
  }

  // Normalize hazard types to match our turbulence levels
  static normalizeHazardType(hazardType) {
    if (!hazardType) return 'Unknown';
    
    const normalized = hazardType.toUpperCase();
    
    // AviationWeather.gov uses codes like TURB-HI, TURB-LO, ICG, etc.
    if (normalized.startsWith('TURB')) {
      return 'Turbulence';
    } else if (normalized.startsWith('ICG')) {
      return 'Icing';
    } else if (normalized.includes('MTW')) {
      return 'Mountain Wave';
    } else if (normalized.includes('LLWS')) {
      return 'Low Level Wind Shear';
    } else {
      return hazardType;
    }
  }

  // Normalize severity levels
  static normalizeSeverity(severity) {
    if (!severity) return 'Moderate';
    
    const normalized = severity.toUpperCase();
    
    // AviationWeather.gov uses codes like MOD, SEV, LGT
    if (normalized === 'SEV' || normalized.includes('SEV')) {
      return 'Severe';
    } else if (normalized === 'MOD' || normalized.includes('MOD')) {
      return 'Moderate';
    } else if (normalized === 'LGT' || normalized.includes('LGT')) {
      return 'Light';
    } else {
      return 'Moderate'; // Default
    }
  }

  // Parse altitude information
  static parseAltitude(altitudeText) {
    if (!altitudeText) return { min: 0, max: 999999 };
    
    try {
      // Extract altitude ranges (e.g., "FL180-FL450", "SFC-10000")
      const match = altitudeText.match(/(?:FL)?(\d+)(?:-(?:FL)?(\d+))?/i);
      
      if (match) {
        const minRaw = match[1] ? parseInt(match[1]) * 100 : 0; // FL180 = 18000 feet
        const maxRaw = match[2] ? parseInt(match[2]) * 100 : 999999;
        return { 
          min: isNaN(minRaw) ? 0 : minRaw, 
          max: isNaN(maxRaw) ? 999999 : maxRaw 
        };
      }
      
      return { min: 0, max: 999999 };
      
    } catch (error) {
      console.warn(`Error parsing altitude:`, error.message);
      return { min: 0, max: 999999 };
    }
  }

  // Check if a route intersects with any G-AIRMET areas
  static checkRouteIntersection(routeCoordinates, gairmets) {
    if (!routeCoordinates || !gairmets || gairmets.length === 0) {
      return { hasIntersection: false, advisories: [] };
    }

    const advisories = [];
    
    gairmets.forEach((gairmet, index) => {
      if (gairmet.hazardType === 'Turbulence' && gairmet.coordinates) {
        const intersection = this.checkPolygonIntersection(routeCoordinates, gairmet.coordinates);
        
        if (intersection) {
          advisories.push({
            type: 'G-AIRMET',
            hazard: gairmet.hazardType,
            severity: gairmet.severity,
            altitude: gairmet.altitude,
            area: gairmet.area || 'General area along route',
            validTime: gairmet.validTime,
            confidence: 'High',
            source: 'AviationWeather.gov'
          });
        }
      }
    });

    return {
      hasIntersection: advisories.length > 0,
      advisories
    };
  }

  // Enhanced polygon intersection check with better logging
  static checkPolygonIntersection(routeCoords, gairmetCoords) {
    if (!routeCoords || !gairmetCoords || gairmetCoords.length < 3) {
      return false;
    }

    // Check if any route point falls within the G-AIRMET polygon
    const intersectingPoints = [];
    
    const hasIntersection = routeCoords.some((routePoint, index) => {
      if (!routePoint || routePoint[0] == null || routePoint[1] == null) {
        return false;
      }
      
      const isInside = this.isPointInPolygon(routePoint, gairmetCoords);
      if (isInside) {
        intersectingPoints.push({ index, coordinates: routePoint });
      }
      
      return isInside;
    });

    if (hasIntersection) {
      // Found intersecting points
    }

    return hasIntersection;
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

  // Get turbulence level based on G-AIRMET severity
  static getTurbulenceLevelFromGAirmet(severity) {
    switch (severity?.toLowerCase()) {
      case 'severe':
        return 'Severe';
      case 'moderate':
        return 'Moderate';
      case 'light':
        return 'Light';
      default:
        return 'Moderate';
    }
  }

  // Check if route passes through US airspace
  static routePassesThroughUS(routeCoordinates) {
    if (!routeCoordinates || routeCoordinates.length === 0) {
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
    
    // Check if any route coordinate falls within US airspace
    return routeCoordinates.some(coord => {
      if (!coord || coord.length < 2) return false;
      
      const [lat, lng] = coord;
      
      return usBounds.some(bound => {
        return lat >= bound.minLat && lat <= bound.maxLat && 
               lng >= bound.minLng && lng <= bound.maxLng;
      });
    });
  }

  // Main method to get turbulence advisories for a route
  static async getTurbulenceAdvisories(departure, arrival, routeCoordinates) {
    try {
      // First check if route passes through US airspace
      // G-AIRMETs are only valid for US airspace
      const passesThroughUS = this.routePassesThroughUS(routeCoordinates);
      
      if (!passesThroughUS) {
        console.log(`Route ${departure}-${arrival} does not pass through US airspace, skipping G-AIRMET analysis`);
        return { hasAdvisories: false, advisories: [] };
      }
      
      // Fetch G-AIRMET data for the last 6 hours
      const gairmets = await this.fetchGAirmets('all', 6);
      
      if (!gairmets || gairmets.length === 0) {
        return { hasAdvisories: false, advisories: [] };
      }

      // Check for route intersections
      const intersection = this.checkRouteIntersection(routeCoordinates, gairmets);
      
      if (intersection.hasIntersection) {
        return {
          hasAdvisories: true,
          advisories: intersection.advisories,
          source: 'G-AIRMET'
        };
      } else {
        return {
          hasAdvisories: false,
          advisories: [],
          source: 'G-AIRMET'
        };
      }
      
    } catch (error) {
      console.error(`Error getting G-AIRMET advisories:`, error.message);
      return { hasAdvisories: false, advisories: [], error: error.message };
    }
  }

  // Get all current G-AIRMETs worldwide
  static async getAllCurrentGAirmets() {
    try {
      // Fetch G-AIRMET data for the last 6 hours, all regions
      const gairmets = await this.fetchGAirmets('all', 6);
      
      if (!gairmets || gairmets.length === 0) {
        return [];
      }

      // Transform the data to match the frontend expectations
      const transformedGairmets = gairmets.map(gairmet => ({
        type: gairmet.hazardType || 'Unknown',
        severity: gairmet.severity || 'Moderate',
        hazard: gairmet.hazardType || 'Not specified',
        altitude: gairmet.altitude || { min: 0, max: 999999 },
        coordinates: gairmet.coordinates || [], // Include polygon coordinates
        area: gairmet.area || 'Geographic area not specified',
        validTime: gairmet.validTime || new Date().toISOString(),
        source: 'AviationWeather.gov',
        rawData: gairmet.rawXml || null
      }));

      return transformedGairmets;
      
    } catch (error) {
      console.error(`Error getting all G-AIRMETs:`, error.message);
      return [];
    }
  }
}

module.exports = GAirmetService;

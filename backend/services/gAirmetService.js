const axios = require('axios');

class GAirmetService {
  // Base URL for AviationWeather.gov API
  static BASE_URL = 'https://aviationweather.gov/cgi-bin/data';

  // Fetch G-AIRMET data for a specific region and time
  static async fetchGAirmets(region = 'all', hours = 6) {
    try {
      console.log(`🌪️ Fetching G-AIRMET data for region: ${region}, hours: ${hours}`);
      
      // AviationWeather.gov provides G-AIRMET data in various formats
      // We'll use the XML format as it's most comprehensive
      const url = `${this.BASE_URL}/gairmet.php`;
      const params = {
        format: 'xml',
        hours: hours,
        region: region
      };

      const response = await axios.get(url, { params, timeout: 10000 });
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ G-AIRMET data fetched successfully (${response.data.length} bytes)`);
      
      return this.parseGAirmetData(response.data);
      
    } catch (error) {
      console.error(`❌ Error fetching G-AIRMET data:`, error.message);
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
        console.log('⚠️ No G-AIRMET entries found in XML data');
        return [];
      }

      gairmetMatches.forEach((match, index) => {
        try {
          const gairmet = this.parseSingleGAirmet(match);
          if (gairmet) {
            gairmets.push(gairmet);
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse G-AIRMET ${index + 1}:`, parseError.message);
        }
      });

      console.log(`📊 Parsed ${gairmets.length} G-AIRMET entries`);
      
      return gairmets;
      
    } catch (error) {
      console.error(`❌ Error parsing G-AIRMET XML:`, error.message);
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
      console.warn(`⚠️ Error parsing single G-AIRMET:`, error.message);
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
      console.warn(`⚠️ Error determining area:`, error.message);
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
      return {
        min: parseInt(altitudeMatch[1]),
        max: parseInt(altitudeMatch[2])
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
      console.warn(`⚠️ Error extracting coordinates from points:`, error.message);
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
        const min = match[1] ? parseInt(match[1]) * 100 : 0; // FL180 = 18000 feet
        const max = match[2] ? parseInt(match[2]) * 100 : 999999;
        return { min, max };
      }
      
      return { min: 0, max: 999999 };
      
    } catch (error) {
      console.warn(`⚠️ Error parsing altitude:`, error.message);
      return { min: 0, max: 999999 };
    }
  }

  // Check if a route intersects with any G-AIRMET areas
  static checkRouteIntersection(routeCoordinates, gairmets) {
    if (!routeCoordinates || !gairmets || gairmets.length === 0) {
      return { hasIntersection: false, advisories: [] };
    }

    const advisories = [];
    
    gairmets.forEach(gairmet => {
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

  // Simple polygon intersection check (point-in-polygon)
  static checkPolygonIntersection(routeCoords, gairmetCoords) {
    if (!routeCoords || !gairmetCoords || gairmetCoords.length < 3) {
      return false;
    }

    // Check if any route point falls within the G-AIRMET polygon
    return routeCoords.some(routePoint => {
      if (!routePoint || routePoint[0] == null || routePoint[1] == null) {
        return false;
      }
      return this.isPointInPolygon(routePoint, gairmetCoords);
    });
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

  // Main method to get turbulence advisories for a route
  static async getTurbulenceAdvisories(departure, arrival, routeCoordinates) {
    try {
      console.log(`🌪️ Getting G-AIRMET turbulence advisories for ${departure}-${arrival}`);
      
      // Fetch G-AIRMET data for the last 6 hours
      const gairmets = await this.fetchGAirmets('all', 6);
      
      if (!gairmets || gairmets.length === 0) {
        console.log('⚠️ No G-AIRMET data available');
        return { hasAdvisories: false, advisories: [] };
      }

      // Check for route intersections
      const intersection = this.checkRouteIntersection(routeCoordinates, gairmets);
      
      if (intersection.hasIntersection) {
        console.log(`✅ Found ${intersection.advisories.length} G-AIRMET advisories affecting route`);
        return {
          hasAdvisories: true,
          advisories: intersection.advisories,
          source: 'G-AIRMET'
        };
      } else {
        console.log('ℹ️ No G-AIRMET advisories affecting this route');
        return {
          hasAdvisories: false,
          advisories: [],
          source: 'G-AIRMET'
        };
      }
      
    } catch (error) {
      console.error(`❌ Error getting G-AIRMET advisories:`, error.message);
      return { hasAdvisories: false, advisories: [], error: error.message };
    }
  }

  // Get all current G-AIRMETs worldwide
  static async getAllCurrentGAirmets() {
    try {
      console.log(`🌍 Fetching all current G-AIRMETs worldwide`);
      
      // Fetch G-AIRMET data for the last 6 hours, all regions
      const gairmets = await this.fetchGAirmets('all', 6);
      
      if (!gairmets || gairmets.length === 0) {
        console.log('⚠️ No G-AIRMET data available');
        return [];
      }

      // Transform the data to match the frontend expectations
      const transformedGairmets = gairmets.map(gairmet => ({
        type: gairmet.hazardType || 'Unknown',
        severity: gairmet.severity || 'Moderate',
        hazard: gairmet.hazardType || 'Not specified',
        altitude: gairmet.altitude || { min: 0, max: 999999 },
        area: gairmet.area || 'Geographic area not specified',
        validTime: gairmet.validTime || new Date().toISOString(),
        source: 'AviationWeather.gov',
        rawData: gairmet.rawXml || null
      }));

      console.log(`✅ Retrieved ${transformedGairmets.length} current G-AIRMETs`);
      return transformedGairmets;
      
    } catch (error) {
      console.error(`❌ Error getting all G-AIRMETs:`, error.message);
      return [];
    }
  }
}

module.exports = GAirmetService;

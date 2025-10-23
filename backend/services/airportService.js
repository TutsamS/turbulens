const axios = require('axios');

class AirportService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.airportsData = null;
    this.lastFetch = 0;
    this.dataFetchTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  // Get airport information from multiple sources
  async getAirportInfo(airportCode) {
    const cacheKey = `airport_${airportCode.toUpperCase()}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Try multiple sources
    let airportInfo = null;

    // 1. Try OurAirports data (primary source - free and comprehensive)
    try {
      airportInfo = await this.getFromOurAirports(airportCode);
      if (airportInfo) {
        this.cache.set(cacheKey, { data: airportInfo, timestamp: Date.now() });
        return airportInfo;
      }
    } catch (error) {
      // OurAirports failed, continue to fallback
    }

    // 2. Fallback to hardcoded common airports
    airportInfo = this.getFromHardcoded(airportCode);
    if (airportInfo) {
      this.cache.set(cacheKey, { data: airportInfo, timestamp: Date.now() });
      return airportInfo;
    }

    return null;
  }

  // Get from OurAirports data (free CSV - primary source)
  async getFromOurAirports(airportCode) {
    try {
      // Fetch and cache the airports data if not already loaded
      if (!this.airportsData || Date.now() - this.lastFetch > this.dataFetchTimeout) {
        const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
        const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
        this.airportsData = response.data.split('\n').map(line => {
          const fields = line.split(',').map(field => field.replace(/"/g, ''));
          return {
            id: fields[0],
            name: fields[1],
            city: fields[2],
            country: fields[3],
            iata: fields[4],
            icao: fields[5],
            latitude: parseFloat(fields[6]),
            longitude: parseFloat(fields[7]),
            altitude: parseFloat(fields[8]),
            timezone: fields[11],
            dst: fields[12],
            tz: fields[13],
            type: fields[14],
            source: fields[15]
          };
        });
        this.lastFetch = Date.now();
      }

      // Find the airport by IATA code
      const airport = this.airportsData.find(a => a.iata === airportCode.toUpperCase());
      if (airport && airport.latitude && airport.longitude) {
        return {
          code: airport.iata,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          latitude: airport.latitude,
          longitude: airport.longitude,
          timezone: airport.timezone,
          altitude: airport.altitude,
          source: 'OurAirports'
        };
      }
    } catch (error) {
      console.error('OurAirports API error:', error.message);
    }
    return null;
  }

  // Enhanced airport database with comprehensive global coverage (fallback)
  getFromHardcoded(airportCode) {
    const airportDatabase = {
      // Major US Airports
      'JFK': { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781, timezone: 'America/New_York' },
      'LAX': { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', latitude: 33.9416, longitude: -118.4085, timezone: 'America/Los_Angeles' },
      'ORD': { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States', latitude: 41.9786, longitude: -87.9048, timezone: 'America/Chicago' },
      'ATL': { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', latitude: 33.6407, longitude: -84.4277, timezone: 'America/New_York' },
      'DFW': { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States', latitude: 32.8968, longitude: -97.0380, timezone: 'America/Chicago' },
      'DEN': { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', latitude: 39.8561, longitude: -104.6737, timezone: 'America/Denver' },
      'SFO': { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', latitude: 37.6189, longitude: -122.3750, timezone: 'America/Los_Angeles' },
      'MIA': { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', latitude: 25.7932, longitude: -80.2906, timezone: 'America/New_York' },
      'SEA': { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', latitude: 47.4502, longitude: -122.3088, timezone: 'America/Los_Angeles' },
      'LAS': { code: 'LAS', name: 'McCarran International Airport', city: 'Las Vegas', country: 'United States', latitude: 36.0840, longitude: -115.1537, timezone: 'America/Los_Angeles' },
      'MCO': { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'United States', latitude: 28.4312, longitude: -81.3081, timezone: 'America/New_York' },
      'BOS': { code: 'BOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'United States', latitude: 42.3656, longitude: -71.0096, timezone: 'America/New_York' },
      'IAH': { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'United States', latitude: 29.9902, longitude: -95.3368, timezone: 'America/Chicago' },
      'EWR': { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States', latitude: 40.6895, longitude: -74.1745, timezone: 'America/New_York' },
      'MSP': { code: 'MSP', name: 'Minneapolis-Saint Paul International Airport', city: 'Minneapolis', country: 'United States', latitude: 44.8848, longitude: -93.2223, timezone: 'America/Chicago' },
      'DTW': { code: 'DTW', name: 'Detroit Metropolitan Airport', city: 'Detroit', country: 'United States', latitude: 42.2162, longitude: -83.3554, timezone: 'America/New_York' },
      'PHX': { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States', latitude: 33.4342, longitude: -112.0116, timezone: 'America/Phoenix' },
      'CLT': { code: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'United States', latitude: 35.2144, longitude: -80.9473, timezone: 'America/New_York' },
      'FLL': { code: 'FLL', name: 'Fort Lauderdale-Hollywood International Airport', city: 'Fort Lauderdale', country: 'United States', latitude: 26.0715, longitude: -80.1492, timezone: 'America/New_York' },
      'IAD': { code: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington', country: 'United States', latitude: 38.9531, longitude: -77.4565, timezone: 'America/New_York' },
      'DCA': { code: 'DCA', name: 'Ronald Reagan Washington National Airport', city: 'Washington', country: 'United States', latitude: 38.8512, longitude: -77.0402, timezone: 'America/New_York' },
      'BWI': { code: 'BWI', name: 'Baltimore/Washington International Airport', city: 'Baltimore', country: 'United States', latitude: 39.1754, longitude: -76.6682, timezone: 'America/New_York' },
      'AUS': { code: 'AUS', name: 'Austin-Bergstrom International Airport', city: 'Austin', country: 'United States', latitude: 30.1975, longitude: -97.6664, timezone: 'America/Chicago' },
      'SLC': { code: 'SLC', name: 'Salt Lake City International Airport', city: 'Salt Lake City', country: 'United States', latitude: 40.7899, longitude: -111.9791, timezone: 'America/Denver' },
      'PDX': { code: 'PDX', name: 'Portland International Airport', city: 'Portland', country: 'United States', latitude: 45.5898, longitude: -122.5951, timezone: 'America/Los_Angeles' },
      'SAN': { code: 'SAN', name: 'San Diego International Airport', city: 'San Diego', country: 'United States', latitude: 32.7338, longitude: -117.1933, timezone: 'America/Los_Angeles' },
      'HNL': { code: 'HNL', name: 'Daniel K. Inouye International Airport', city: 'Honolulu', country: 'United States', latitude: 21.3245, longitude: -157.9251, timezone: 'Pacific/Honolulu' },
      'ANC': { code: 'ANC', name: 'Ted Stevens Anchorage International Airport', city: 'Anchorage', country: 'United States', latitude: 61.1744, longitude: -149.9964, timezone: 'America/Anchorage' },
      
      // Major International Airports
      'LHR': { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543, timezone: 'Europe/London' },
      'CDG': { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479, timezone: 'Europe/Paris' },
      'AMS': { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', latitude: 52.3105, longitude: 4.7683, timezone: 'Europe/Amsterdam' },
      'FRA': { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', latitude: 50.0379, longitude: 8.5622, timezone: 'Europe/Berlin' },
      'MAD': { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', latitude: 40.4983, longitude: -3.5676, timezone: 'Europe/Madrid' },
      'BCN': { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', latitude: 41.2974, longitude: 2.0833, timezone: 'Europe/Madrid' },
      'FCO': { code: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy', latitude: 41.8045, longitude: 12.2508, timezone: 'Europe/Rome' },
      'MXP': { code: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', latitude: 45.6306, longitude: 8.7281, timezone: 'Europe/Rome' },
      'ZRH': { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', latitude: 47.4588, longitude: 8.5559, timezone: 'Europe/Zurich' },
      'VIE': { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', latitude: 48.1102, longitude: 16.5697, timezone: 'Europe/Vienna' },
      'ARN': { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', latitude: 59.6498, longitude: 17.9238, timezone: 'Europe/Stockholm' },
      'CPH': { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', latitude: 55.6180, longitude: 12.6508, timezone: 'Europe/Copenhagen' },
      'OSL': { code: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway', latitude: 60.1975, longitude: 11.1004, timezone: 'Europe/Oslo' },
      'HEL': { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland', latitude: 60.3172, longitude: 24.9633, timezone: 'Europe/Helsinki' },
      'WAW': { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', latitude: 52.1657, longitude: 20.9671, timezone: 'Europe/Warsaw' },
      'PRG': { code: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic', latitude: 50.1008, longitude: 14.2600, timezone: 'Europe/Prague' },
      'BUD': { code: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary', latitude: 47.4369, longitude: 19.2556, timezone: 'Europe/Budapest' },
      'IST': { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', latitude: 41.2751, longitude: 28.7519, timezone: 'Europe/Istanbul' },
      'DXB': { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2532, longitude: 55.3657, timezone: 'Asia/Dubai' },
      'DOH': { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', latitude: 25.2730, longitude: 51.6081, timezone: 'Asia/Qatar' },
      'AUH': { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'United Arab Emirates', latitude: 24.4330, longitude: 54.6511, timezone: 'Asia/Dubai' },
      'BOM': { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', latitude: 19.0896, longitude: 72.8656, timezone: 'Asia/Kolkata' },
      'DEL': { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India', latitude: 28.5562, longitude: 77.1000, timezone: 'Asia/Kolkata' },
      'BKK': { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', latitude: 13.6900, longitude: 100.7501, timezone: 'Asia/Bangkok' },
      'SIN': { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', latitude: 1.3644, longitude: 103.9915, timezone: 'Asia/Singapore' },
      'KUL': { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', latitude: 2.7456, longitude: 101.7072, timezone: 'Asia/Kuala_Lumpur' },
      'CGK': { code: 'CGK', name: 'Soekarno–Hatta International Airport', city: 'Jakarta', country: 'Indonesia', latitude: -6.1256, longitude: 106.6558, timezone: 'Asia/Jakarta' },
      'MNL': { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines', latitude: 14.5086, longitude: 121.0198, timezone: 'Asia/Manila' },
      'HKG': { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', latitude: 22.3080, longitude: 113.9185, timezone: 'Asia/Hong_Kong' },
      'PEK': { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', latitude: 40.0799, longitude: 116.6031, timezone: 'Asia/Shanghai' },
      'PVG': { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', latitude: 31.1443, longitude: 121.8083, timezone: 'Asia/Shanghai' },
      'CAN': { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', latitude: 23.3924, longitude: 113.2988, timezone: 'Asia/Shanghai' },
      'ICN': { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', latitude: 37.4602, longitude: 126.4407, timezone: 'Asia/Seoul' },
      'NRT': { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', latitude: 35.7720, longitude: 140.3929, timezone: 'Asia/Tokyo' },
      'HND': { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', latitude: 35.5494, longitude: 139.7798, timezone: 'Asia/Tokyo' },
      'KIX': { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan', latitude: 34.4342, longitude: 135.2441, timezone: 'Asia/Tokyo' },
      'SYD': { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia', latitude: -33.9399, longitude: 151.1753, timezone: 'Australia/Sydney' },
      'MEL': { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
      'BNE': { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', latitude: -27.3842, longitude: 153.1175, timezone: 'Australia/Brisbane' },
      'AKL': { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', latitude: -37.0082, longitude: 174.7850, timezone: 'Pacific/Auckland' },
      'YVR': { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', latitude: 49.1967, longitude: -123.1815, timezone: 'America/Vancouver' },
      'YYZ': { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', latitude: 43.6777, longitude: -79.6248, timezone: 'America/Toronto' },
      'YUL': { code: 'YUL', name: 'Montréal–Trudeau International Airport', city: 'Montreal', country: 'Canada', latitude: 45.4706, longitude: -73.7408, timezone: 'America/Montreal' },
      'YYC': { code: 'YYC', name: 'Calgary International Airport', city: 'Calgary', country: 'Canada', latitude: 51.1314, longitude: -114.0103, timezone: 'America/Edmonton' },
      'YOW': { code: 'YOW', name: 'Ottawa Macdonald–Cartier International Airport', city: 'Ottawa', country: 'Canada', latitude: 45.3225, longitude: -75.6692, timezone: 'America/Toronto' },
      'MEX': { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', latitude: 19.4363, longitude: -99.0721, timezone: 'America/Mexico_City' },
      'GDL': { code: 'GDL', name: 'Guadalajara International Airport', city: 'Guadalajara', country: 'Mexico', latitude: 20.5218, longitude: -103.3112, timezone: 'America/Mexico_City' },
      'MTY': { code: 'MTY', name: 'Monterrey International Airport', city: 'Monterrey', country: 'Mexico', latitude: 25.7785, longitude: -100.1069, timezone: 'America/Mexico_City' },
      'GRU': { code: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', latitude: -23.4356, longitude: -46.4731, timezone: 'America/Sao_Paulo' },
      'BSB': { code: 'BSB', name: 'Brasília International Airport', city: 'Brasília', country: 'Brazil', latitude: -15.8690, longitude: -47.9208, timezone: 'America/Sao_Paulo' },
      'GIG': { code: 'GIG', name: 'Rio de Janeiro/Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil', latitude: -22.8089, longitude: -43.2496, timezone: 'America/Sao_Paulo' },
      'EZE': { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', latitude: -34.8222, longitude: -58.5358, timezone: 'America/Argentina/Buenos_Aires' },
      'SCL': { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile', latitude: -33.3928, longitude: -70.7858, timezone: 'America/Santiago' },
      'LIM': { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', latitude: -12.0219, longitude: -77.1143, timezone: 'America/Lima' },
      'BOG': { code: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia', latitude: 4.7016, longitude: -74.1469, timezone: 'America/Bogota' },
      'JNB': { code: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', latitude: -26.1392, longitude: 28.2460, timezone: 'Africa/Johannesburg' },
      'CPT': { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', latitude: -33.9715, longitude: 18.6021, timezone: 'Africa/Johannesburg' },
      'CAI': { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', latitude: 30.1219, longitude: 31.4056, timezone: 'Africa/Cairo' },
      'NBO': { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', latitude: -1.3192, longitude: 36.9278, timezone: 'Africa/Nairobi' },
      'LOS': { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', latitude: 6.5774, longitude: 3.3210, timezone: 'Africa/Lagos' }
    };

    const airport = airportDatabase[airportCode.toUpperCase()];
    if (airport) {
      return { ...airport, source: 'Enhanced Database' };
    }
    return null;
  }

  // Get coordinates for an airport
  async getAirportCoordinates(airportCode) {
    const cacheKey = airportCode.toUpperCase();
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      const cachedData = cached.data;
      // Convert to expected format
      return {
        lat: cachedData.latitude || cachedData.lat,
        lng: cachedData.longitude || cachedData.lng,
        name: cachedData.name,
        city: cachedData.city,
        country: cachedData.country,
        timezone: cachedData.timezone,
        altitude: cachedData.altitude,
        source: cachedData.source
      };
    }

    // 1. Try OurAirports data (free CSV - primary source)
    let airportInfo;
    try {
      airportInfo = await this.getFromOurAirports(airportCode);
      if (airportInfo) {
        const formattedInfo = {
          lat: airportInfo.latitude,
          lng: airportInfo.longitude,
          name: airportInfo.name,
          city: airportInfo.city,
          country: airportInfo.country,
          timezone: airportInfo.timezone,
          altitude: airportInfo.altitude,
          source: airportInfo.source
        };
        this.cache.set(cacheKey, { data: formattedInfo, timestamp: Date.now() });
        return formattedInfo;
      }
    } catch (error) {
      // OurAirports failed, continue to fallback
    }

    // 2. Fallback to hardcoded common airports
    airportInfo = this.getFromHardcoded(airportCode);
    if (airportInfo) {
      const formattedInfo = {
        lat: airportInfo.latitude,
        lng: airportInfo.longitude,
        name: airportInfo.name,
        city: airportInfo.city,
        country: airportInfo.country,
        timezone: airportInfo.timezone,
        source: airportInfo.source
      };
      this.cache.set(cacheKey, { data: formattedInfo, timestamp: Date.now() });
      return formattedInfo;
    }

    return null;
  }

  // Search airports by name or city
  async searchAirports(query) {
    try {
      // Use OurAirports data for search if available
      if (this.airportsData) {
        const results = this.airportsData
          .filter(airport => 
            airport.iata && 
            (airport.name.toLowerCase().includes(query.toLowerCase()) ||
             airport.city.toLowerCase().includes(query.toLowerCase()) ||
             airport.iata.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 10) // Limit to 10 results
          .map(airport => ({
            code: airport.iata,
            name: airport.name,
            city: airport.city,
            country: airport.country
          }));
        
        return results;
      }
    } catch (error) {
      console.error('Search error:', error.message);
    }

    // Fallback to basic search
    const commonAirports = [
      'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'SFO', 'MIA', 'DEN', 'SEA', 'LHR', 'CDG'
    ];
    
    return commonAirports.filter(code => 
      code.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.airportsData = null;
    this.lastFetch = 0;
  }
}

module.exports = AirportService; 
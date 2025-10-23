const SimpleRouteService = require('./simpleRouteService');

class FlightPathService {
  // Get route between two airports using SimpleRouteService
  static async getRouteByAirports(departure, arrival) {
    try {
      // Use SimpleRouteService to generate the route
      const route = await SimpleRouteService.generateRoute(departure, arrival);
      
      // Transform the route to match the expected format
      const transformedRoute = {
        id: `${departure.toLowerCase()}-${arrival.toLowerCase()}`,
        departure: route.route.departure,
        arrival: route.route.arrival,
        name: `${departure} to ${arrival}`,
        frequency: 'On-demand',
        avgDuration: route.estimatedDuration,
        distance: route.distance,
        coordinates: route.route.coordinates,
        currentTurbulence: {
          level: route.turbulenceLevel,
          confidence: route.confidence,
          factors: route.factors
        },
        weatherData: route.weatherData || [], // Get weather data from SimpleRouteService
        generatedAt: route.generatedAt
      };
      
      return transformedRoute;
      
    } catch (error) {
      console.error(`Error generating route from ${departure} to ${arrival}:`, error.message);
      throw new Error(`Failed to generate route: ${error.message}`);
    }
  }

  // Get popular routes (using SimpleRouteService for common pairs)
  static async getPopularRoutes(limit = 10) {
    const popularPairs = [
      ['JFK', 'LAX'],
      ['LHR', 'JFK'],
      ['CDG', 'LAX'],
      ['DEN', 'SEA'],
      ['ATL', 'LAX'],
      ['MIA', 'LAX'],
      ['SFO', 'JFK'],
      ['ORD', 'LAX'],
      ['DFW', 'LAX'],
      ['LAS', 'LAX']
    ];
    
    const routes = [];
    
    for (const [dep, arr] of popularPairs.slice(0, limit)) {
      try {
        const route = await this.getRouteByAirports(dep, arr);
        routes.push(route);
      } catch (error) {
        // Skip failed routes
      }
    }
    
    return routes;
  }

  // Get route by ID (departure-arrival format)
  static async getRouteById(routeId) {
    const [departure, arrival] = routeId.split('-');
    if (!departure || !arrival) {
      throw new Error('Invalid route ID format. Expected: departure-arrival');
    }
    
    return await this.getRouteByAirports(departure.toUpperCase(), arrival.toUpperCase());
  }

  // Search routes by departure or arrival airport
  static async searchRoutes(query, limit = 10) {
    const queryUpper = query.toUpperCase();
    const popularPairs = [
      ['JFK', 'LAX'], ['LHR', 'JFK'], ['CDG', 'LAX'], ['DEN', 'SEA'],
      ['ATL', 'LAX'], ['MIA', 'LAX'], ['SFO', 'JFK'], ['ORD', 'LAX'],
      ['DFW', 'LAX'], ['LAS', 'LAX'], ['SFO', 'DEL'], ['JFK', 'LHR'],
      ['LAX', 'NRT'], ['CDG', 'NRT'], ['LHR', 'HKG'], ['JFK', 'CDG']
    ];
    
    const matchingRoutes = [];
    
    for (const [dep, arr] of popularPairs) {
      if (dep.includes(queryUpper) || arr.includes(queryUpper)) {
        try {
          const route = await this.getRouteByAirports(dep, arr);
          matchingRoutes.push(route);
          
          if (matchingRoutes.length >= limit) break;
        } catch (error) {
          // Skip failed routes
        }
      }
    }
    
    return matchingRoutes;
  }

  // Get weather data for a route (already included in route generation)
  static async getWeatherForRoute(routeId) {
    const route = await this.getRouteById(routeId);
    return route.weatherData || [];
  }

  // Calculate current turbulence level for route (already calculated)
  static async calculateRouteTurbulence(routeId) {
    const route = await this.getRouteById(routeId);
    return route.currentTurbulence || { level: 'Unknown', confidence: 'Low', factors: [] };
  }

  // Get real-time flight data
  static async getRealTimeFlights(routeId) {
    throw new Error('Real-time flight data not implemented');
  }

  // Get airport information
  static async getAirportInfo(iataCode) {
    return await SimpleRouteService.getAirportCoordinates(iataCode);
  }

  // Get all available airports
  static async getAllAirports() {
    // This could be expanded to include more airports
    const airports = [
      'JFK', 'LAX', 'LHR', 'CDG', 'DEN', 'SEA', 'ATL', 'MIA', 'SFO', 'DEL',
      'ORD', 'DFW', 'LAS', 'PHX', 'IAH', 'CLT', 'MCO', 'EWR', 'BOS', 'DTW'
    ];
    
    const airportInfo = [];
    for (const code of airports) {
      const info = await SimpleRouteService.getAirportCoordinates(code);
      if (info) {
        airportInfo.push({
          code: code,
          name: info.name,
          coordinates: [info.lat, info.lng]
        });
      }
    }
    
    return airportInfo;
  }
}

module.exports = FlightPathService; 
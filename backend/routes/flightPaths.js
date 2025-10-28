const express = require('express');
const router = express.Router();
const FlightPathService = require('../services/flightPathService');

// Get all popular flight routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await FlightPathService.getPopularRoutes();
    res.json({
      success: true,
      data: routes,
      count: routes.length
    });
  } catch (error) {
    console.error('Error fetching flight routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flight routes'
    });
  }
});

// Get routes with current weather data
router.get('/routes/weather', async (req, res) => {
  try {
    const routes = await FlightPathService.getPopularRoutes();
    // Weather data is already included in each route
    res.json({
      success: true,
      data: routes,
      count: routes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching routes with weather:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes with weather data'
    });
  }
});

// Get specific route by ID
router.get('/routes/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await FlightPathService.getRouteById(routeId);
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route'
    });
  }
});

// Get routes by airport code
router.get('/airports/:airportCode/routes', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const routes = await FlightPathService.searchRoutes(airportCode);
    
    res.json({
      success: true,
      data: routes,
      count: routes.length,
      airportCode: airportCode.toUpperCase()
    });
  } catch (error) {
    console.error('Error fetching routes by airport:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes by airport'
    });
  }
});

// Get route between two airports
router.get('/route/:departure/:arrival', async (req, res) => {
  try {
    const { departure, arrival } = req.params;
    
    if (!departure || !arrival) {
      return res.status(400).json({
        success: false,
        error: 'Both departure and arrival airports are required'
      });
    }

    console.log(`API Request: ${departure} to ${arrival}`);
    
    try {
      const route = await FlightPathService.getRouteByAirports(departure.toUpperCase(), arrival.toUpperCase());
      
      if (!route) {
        console.log(`Route not found for ${departure} to ${arrival}`);
        return res.status(404).json({
          success: false,
          error: 'Route not found'
        });
      }
      
      console.log(`Route generated successfully for ${departure} to ${arrival}`);
      
      res.json({
        success: true,
        data: route,
        message: `Route generated from ${departure} to ${arrival}`
      });
    } catch (routeError) {
      console.error(`Error generating route ${departure} to ${arrival}:`, routeError.message);
      return res.status(500).json({
        success: false,
        error: `Failed to generate route: ${routeError.message}`
      });
    }
  } catch (error) {
    const { departure, arrival } = req.params;
    console.error(`Error generating route ${departure} to ${arrival}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to generate route: ${error.message}`
    });
  }
});

// Search routes
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const routes = await FlightPathService.searchRoutes(query, parseInt(limit));
    
    res.json({
      success: true,
      data: routes,
      count: routes.length,
      query: query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search routes'
    });
  }
});

// Get airport information
router.get('/airports', async (req, res) => {
  try {
    const airports = await FlightPathService.getAllAirports();
    res.json({
      success: true,
      data: airports,
      count: airports.length
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch airports'
    });
  }
});

// Search airports by name, city, or IATA code
router.get('/airports/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const AirportService = require('../services/airportService');
    const airportService = new AirportService();
    const results = await airportService.searchAirports(q.trim());
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: q.trim()
    });
  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search airports'
    });
  }
});

// Get specific airport information
router.get('/airports/:iataCode/info', async (req, res) => {
  try {
    const { iataCode } = req.params;
    const airport = await FlightPathService.getAirportInfo(iataCode.toUpperCase());
    
    if (!airport) {
      return res.status(404).json({
        success: false,
        error: 'Airport not found'
      });
    }
    
    res.json({
      success: true,
      data: airport
    });
  } catch (error) {
    console.error('Error fetching airport info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch airport information'
    });
  }
});

module.exports = router; 
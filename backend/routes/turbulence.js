const express = require('express');
const router = express.Router();
const SimpleRouteService = require('../services/simpleRouteService');
const AirportService = require('../services/airportService');
const { validateFlightData } = require('../utils/validation');

// Initialize services
const airportService = new AirportService();

// POST /api/turbulence/predict
router.post('/predict', async (req, res) => {
  try {
    const { departure, arrival, date } = req.body;
    
    console.log('📥 Received prediction request:', { departure, arrival, date });
    
    // Validate input data
    const validation = validateFlightData({ departure, arrival, date });
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validation.errors 
      });
    }

    console.log('✅ Validation passed, calling SimpleRouteService.generateRoute...');

    // Get turbulence prediction with G-AIRMET data
    const prediction = await SimpleRouteService.generateRoute(departure, arrival);
    
    console.log(`🚀 Turbulence route response keys:`, Object.keys(prediction));

    res.json(prediction);
  } catch (error) {
    console.error('❌ Turbulence prediction error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to predict turbulence',
      message: error.message 
    });
  }
});

// GET /api/turbulence/history/:route
router.get('/history/:route', async (req, res) => {
  try {
    const { route } = req.params;
    const { days = 7 } = req.query;
    
    // For now, return mock historical data since TurbulenceService is not implemented
    const mockHistory = {
      success: true,
      data: {
        route: route,
        days: parseInt(days),
        predictions: [
          {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            turbulenceLevel: 'Low',
            confidence: 0.85
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            turbulenceLevel: 'Moderate',
            confidence: 0.72
          }
        ]
      },
      message: 'Mock historical data retrieved successfully'
    };
    
    res.json(mockHistory);
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch historical data',
      message: error.message 
    });
  }
});

// GET /api/turbulence/airports
router.get('/airports', async (req, res) => {
  try {
    // For now, return a list of common airports since we don't have a getAllAirports method
    const commonAirports = [
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
      { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA' },
      { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA' },
      { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA' },
      { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK' },
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
      { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia' }
    ];
    
    res.json({ 
      success: true, 
      data: commonAirports,
      message: 'Common airports list retrieved successfully'
    });
  } catch (error) {
    console.error('Airports fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch airports',
      message: error.message 
    });
  }
});

module.exports = router; 
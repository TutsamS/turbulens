const express = require('express');
const router = express.Router();
const SimpleRouteService = require('../services/simpleRouteService');
const { validateFlightData } = require('../utils/validation');

// POST /api/turbulence/predict
router.post('/predict', async (req, res) => {
  try {
    const { departure, arrival, date } = req.body;
    
    // Validate input data
    const validation = validateFlightData({ departure, arrival, date });
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validation.errors 
      });
    }

    // Get turbulence prediction with G-AIRMET data
    const prediction = await SimpleRouteService.generateRoute(departure, arrival);
    
    console.log(`🚀 Turbulence route response keys:`, Object.keys(prediction));

    res.json(prediction);
  } catch (error) {
    console.error('Turbulence prediction error:', error);
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
    
    const history = await TurbulenceService.getHistoricalData(route, parseInt(days));
    res.json(history);
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
    const airports = await TurbulenceService.getAirports();
    res.json(airports);
  } catch (error) {
    console.error('Airports fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch airports',
      message: error.message 
    });
  }
});

module.exports = router; 
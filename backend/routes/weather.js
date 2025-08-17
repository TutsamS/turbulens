const express = require('express');
const router = express.Router();

// Proxy endpoint for OpenWeatherMap tile layers
router.get('/tile/:layer/:z/:x/:y', async (req, res) => {
  try {
    const { layer, z, x, y } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenWeatherMap API key not configured' });
    }

    const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
    
    // Fetch the tile from OpenWeatherMap
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch weather tile' });
    }

    // Get the image buffer
    const buffer = await response.arrayBuffer();
    
    // Set appropriate headers for image
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.set('Access-Control-Allow-Origin', '*');
    
    // Send the image
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Error fetching weather tile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available weather layers
router.get('/layers', (req, res) => {
  const layers = [
    { id: 'precipitation_new', name: '🌧️ Precipitation', description: 'Rain, snow, and precipitation intensity' },
    { id: 'clouds_new', name: '☁️ Clouds', description: 'Cloud coverage and types' },
    { id: 'temp_new', name: '🌡️ Temperature', description: 'Air temperature at 2m above ground' },
    { id: 'wind_new', name: '💨 Wind', description: 'Wind speed and direction' },
    { id: 'pressure_new', name: '📊 Pressure', description: 'Atmospheric pressure' },
    { id: 'humidity_new', name: '💧 Humidity', description: 'Relative humidity' }
  ];
  
  res.json({ layers });
});

module.exports = router; 
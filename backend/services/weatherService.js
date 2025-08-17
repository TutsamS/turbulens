// Enhanced weatherService.js with real API integrations
const axios = require('axios');

class WeatherService {
  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.aviationWeatherUrl = 'https://aviationweather.gov/api/';
    this.noaaWeatherUrl = 'https://api.weather.gov/';
    
    if (!this.openWeatherApiKey) {
      console.warn('⚠️  OpenWeather API key not found in environment variables');
    }
  }

  // Get current weather by location name or coordinates
  async getCurrentWeather(location) {
    try {
      let url;
      
      // Check if location is coordinates or city name
      if (typeof location === 'object' && typeof location.lat === 'number' && typeof location.lng === 'number') {
        // Use coordinates
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${this.openWeatherApiKey}&units=metric`;
      } else {
        // Use city name
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${this.openWeatherApiKey}&units=metric`;
      }

      console.log(`🌤️  Fetching weather from: ${url.replace(this.openWeatherApiKey, 'API_KEY_HIDDEN')}`);
      console.log(`🔑 API Key available: ${this.openWeatherApiKey ? 'Yes' : 'No'}`);
      console.log(`📍 Location type: ${typeof location}, Location value:`, location);
      const response = await axios.get(url);
      
      // Transform the data to our standard format
      return {
        location: response.data.name,
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        windDirection: response.data.wind.deg,
        pressure: response.data.main.pressure,
        conditions: response.data.weather[0].main,
        description: response.data.weather[0].description,
        visibility: response.data.visibility / 1000, // Convert to km
        timestamp: new Date().toISOString(),
        raw: response.data // Keep raw data for advanced analysis
      };
    } catch (error) {
      console.error('Error fetching current weather:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Return mock data as fallback
      return {
        location: typeof location === 'string' ? location : 'Unknown',
        temperature: 15 + Math.random() * 20,
        humidity: 40 + Math.random() * 40,
        windSpeed: 5 + Math.random() * 25,
        windDirection: Math.floor(Math.random() * 360),
        pressure: 1000 + Math.random() * 50,
        conditions: ['Clear', 'Cloudy', 'Rain', 'Storm'][Math.floor(Math.random() * 4)],
        description: 'Mock data - API unavailable',
        visibility: 5 + Math.random() * 10,
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }
  }

  // Get weather forecast for a location
  async getWeatherForecast(location, days = 5) {
    try {
      let url;
      
      if (typeof location === 'object' && location.lat && location.lon) {
        url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${this.openWeatherApiKey}&units=metric&cnt=${days * 8}`; // 8 readings per day
      } else {
        url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${this.openWeatherApiKey}&units=metric&cnt=${days * 8}`;
      }

      const response = await axios.get(url);
      
      return {
        location: response.data.city.name,
        forecast: response.data.list.map(item => ({
          timestamp: item.dt_txt,
          temperature: item.main.temp,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
          windDirection: item.wind.deg,
          pressure: item.main.pressure,
          conditions: item.weather[0].main,
          description: item.weather[0].description
        })),
        raw: response.data
      };
    } catch (error) {
      console.error('Error fetching weather forecast:', error.message);
      return {
        location: typeof location === 'string' ? location : 'Unknown',
        forecast: [],
        error: 'Forecast data unavailable'
      };
    }
  }

  // Get flight conditions for a specific location
  async getFlightConditions(lat, lng, altitude = 30000) {
    try {
      // Get current weather
      const currentWeather = await this.getCurrentWeather({ lat, lng });
      
      // Calculate flight-level conditions (simplified)
      const flightLevelTemp = currentWeather.temperature - (altitude / 1000 * 6.5); // Standard lapse rate
      const flightLevelPressure = currentWeather.pressure * Math.exp(-altitude / 7400); // Barometric formula
      
      return {
        groundLevel: currentWeather,
        flightLevel: {
          altitude: altitude,
          temperature: flightLevelTemp,
          pressure: flightLevelPressure,
          windSpeed: currentWeather.windSpeed * 1.5, // Wind typically stronger at altitude
          windDirection: currentWeather.windDirection,
          conditions: currentWeather.conditions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating flight conditions:', error.message);
      return {
        groundLevel: null,
        flightLevel: null,
        error: 'Flight conditions calculation failed'
      };
    }
  }

  // Get wind data for turbulence analysis
  async getWindData(lat, lng) {
    try {
      const weather = await this.getCurrentWeather({ lat, lng });
      
      return {
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        windGust: weather.raw?.wind?.gust || weather.windSpeed * 1.2,
        turbulenceIndex: this.calculateTurbulenceIndex(weather),
        timestamp: weather.timestamp
      };
    } catch (error) {
      console.error('Error fetching wind data:', error.message);
      return {
        windSpeed: 10 + Math.random() * 15,
        windDirection: Math.floor(Math.random() * 360),
        windGust: 15 + Math.random() * 20,
        turbulenceIndex: 0.3 + Math.random() * 0.4,
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }
  }

  // Calculate turbulence index based on weather conditions
  calculateTurbulenceIndex(weather) {
    let index = 0;
    
    // Wind speed factor
    if (weather.windSpeed > 20) index += 0.4;
    else if (weather.windSpeed > 15) index += 0.3;
    else if (weather.windSpeed > 10) index += 0.2;
    else index += 0.1;
    
    // Weather conditions factor
    if (weather.conditions === 'Storm') index += 0.4;
    else if (weather.conditions === 'Rain') index += 0.2;
    else if (weather.conditions === 'Cloudy') index += 0.1;
    
    // Pressure gradient factor (simplified)
    if (weather.pressure < 1000) index += 0.2;
    else if (weather.pressure > 1020) index += 0.1;
    
    return Math.min(index, 1.0); // Cap at 1.0
  }

  // Get jet stream data (simplified - using NOAA when available)
  async getJetStreamData() {
    try {
      // Try NOAA jet stream data first
      const response = await axios.get(`${this.noaaWeatherUrl}products/types/JET`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.log('NOAA jet stream data unavailable, using mock data');
      
      // Return mock jet stream data
      return {
        jetStreams: [
          {
            name: 'Polar Jet Stream',
            altitude: 30000,
            speed: 150 + Math.random() * 100,
            latitude: 40 + Math.random() * 20,
            longitude: -100 + Math.random() * 60
          }
        ],
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }
  }

  // Get aviation weather data (TAF/METAR)
  async getAviationWeather(lat, lng) {
    try {
      const response = await axios.get(
        `${this.aviationWeatherUrl}data/taf?lat=${lat}&lon=${lng}&format=json`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.log('Aviation weather data unavailable, using mock data');
      return {
        taf: 'Mock TAF data - API unavailable',
        metar: 'Mock METAR data - API unavailable',
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }
  }
}

module.exports = WeatherService;
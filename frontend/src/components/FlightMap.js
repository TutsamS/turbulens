import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// Import Leaflet marker icons for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to automatically fit map bounds to route
const FitBounds = ({ coordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const validCoordinates = coordinates.filter(coord => coord && coord[0] != null && coord[1] != null);
      
      if (validCoordinates.length > 0) {
        // Create bounds from all coordinates
        const bounds = L.latLngBounds(validCoordinates);
        
        // Fit bounds with padding
        map.fitBounds(bounds, {
          padding: [20, 20], // Add 20px padding on all sides
          maxZoom: 10 // Prevent zooming too close
        });
      }
    }
  }, [coordinates, map]);
  
  return null;
};

const FlightMap = ({ selectedRoute, predictionData }) => {
  const [selectedRouteData, setSelectedRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherLayer, setWeatherLayer] = useState('precipitation_new'); // Default to precipitation
  const [showWeatherLayers, setShowWeatherLayers] = useState(false);
  const [weatherLayerAvailable, setWeatherLayerAvailable] = useState(false);

  // Weather layer options
  const weatherLayers = [
    { id: 'precipitation_new', name: '🌧️ Precipitation', description: 'Rain, snow, and precipitation intensity' },
    { id: 'clouds_new', name: '☁️ Clouds', description: 'Cloud coverage and types' },
    { id: 'temp_new', name: '🌡️ Temperature', description: 'Air temperature at 2m above ground' },
    { id: 'wind_new', name: '💨 Wind', description: 'Wind speed and direction' },
    { id: 'pressure_new', name: '📊 Pressure', description: 'Atmospheric pressure' }
  ];

  // Check if weather layer API key is available
  useEffect(() => {
    const apiKey = '38c84f3958c16d4c64ac0936426d9230';
    const isValid = apiKey && apiKey !== 'your_openweather_api_key_here' && apiKey !== 'demo';
    setWeatherLayerAvailable(isValid);
  }, []);

  // Use predictionData if available, otherwise fall back to fetching route data
  useEffect(() => {
    if (predictionData && predictionData.route) {
      // Use predictionData directly - it contains weather data and route info
      setSelectedRouteData({
        name: `${predictionData.route.departure} to ${predictionData.route.arrival}`,
        departure: predictionData.route.departure,
        arrival: predictionData.route.arrival,
        coordinates: predictionData.route.coordinates,
        weatherData: predictionData.multiAltitudeWeather || predictionData.weatherData || [],
        distance: predictionData.distance,
        avgDuration: predictionData.estimatedDuration,
        frequency: 'On-demand'
      });
      setLoading(false);
      setError(null);
    } else if (selectedRoute && selectedRoute.departure && selectedRoute.arrival) {
      // Fallback to fetching route data if no predictionData
      const fetchSpecificRoute = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/flight-paths/route/${selectedRoute.departure}/${selectedRoute.arrival}`);
          const data = await response.json();
          
          if (data.success) {
            setSelectedRouteData(data.data);
          } else {
            setError('Failed to fetch route');
          }
        } catch (err) {
          setError('Error fetching route');
          console.error('Error fetching specific route:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchSpecificRoute();
    } else {
      setSelectedRouteData(null);
    }
  }, [selectedRoute, predictionData]);

  const getWeatherIcon = (weather) => {
    if (!weather) return '❓';
    
    const description = weather.description?.toLowerCase() || '';
    
    // Thunderstorms and severe weather
    if (description.includes('thunderstorm') || description.includes('storm')) return '⛈️';
    if (description.includes('lightning')) return '⚡';
    
    // Rain conditions
    if (description.includes('heavy rain') || description.includes('shower')) return '🌧️';
    if (description.includes('rain') || description.includes('drizzle')) return '🌦️';
    if (description.includes('mist') || description.includes('fog')) return '🌫️';
    
    // Snow conditions
    if (description.includes('snow') || description.includes('blizzard')) return '❄️';
    if (description.includes('sleet') || description.includes('freezing')) return '🧊';
    
    // Cloud conditions
    if (description.includes('overcast') || description.includes('broken clouds')) return '☁️';
    if (description.includes('scattered clouds') || description.includes('few clouds')) return '⛅';
    if (description.includes('cloud')) return '☁️';
    
    // Clear conditions
    if (description.includes('clear') || description.includes('sunny')) return '☀️';
    if (description.includes('partly cloudy')) return '🌤️';
    
    // Wind conditions
    if (description.includes('wind') || description.includes('breezy')) return '💨';
    
    return '🌤️'; // Default
  };


  // Function to handle antimeridian crossing routes
  const splitRouteForAntimeridian = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return [coordinates];
    
    const segments = [];
    let currentSegment = [];
    
    for (let i = 0; i < coordinates.length; i++) {
      const current = coordinates[i];
      const next = coordinates[i + 1];
      
      if (!current || current[0] == null || current[1] == null) continue;
      
      currentSegment.push(current);
      
      if (next && next[0] != null && next[1] != null) {
        // Check if this segment crosses the antimeridian
        const lngDiff = Math.abs(next[1] - current[1]);
        if (lngDiff > 180) {
          // Route crosses antimeridian, split here
          segments.push([...currentSegment]);
          currentSegment = [];
        }
      }
    }
    
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    
    return segments.length > 0 ? segments : [coordinates];
  };



  const handleWeatherLayerChange = (layerId) => {
    setWeatherLayer(layerId);
    setShowWeatherLayers(false);
  };

  const getCurrentLayerInfo = () => {
    return weatherLayers.find(layer => layer.id === weatherLayer);
  };

  if (loading) {
    return (
      <div className="flight-map-container">
        <div className="loading">Analyzing flight conditions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flight-map-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const currentLayer = getCurrentLayerInfo();
  
  return (
    <div className="flight-map-container">
      <div className="map-header">
        <h3>Flight Path & Weather</h3>
        <div className="map-controls">
          <div className="weather-layer-control">
            <button 
              className={`layer-toggle-btn ${!weatherLayerAvailable ? 'disabled' : ''}`}
              onClick={() => weatherLayerAvailable && setShowWeatherLayers(!showWeatherLayers)}
              disabled={!weatherLayerAvailable}
            >
              {weatherLayerAvailable ? (
                <>
                  {currentLayer?.name} ▼
                </>
              ) : (
                <>
                  🔑 API Key Required
                </>
              )}
            </button>
            {showWeatherLayers && weatherLayerAvailable && (
              <div className="layer-dropdown">
                {weatherLayers.map((layer) => (
                  <button
                    key={layer.id}
                    className={`layer-option ${weatherLayer === layer.id ? 'active' : ''}`}
                    onClick={() => handleWeatherLayerChange(layer.id)}
                  >
                    <span className="layer-name">{layer.name}</span>
                    <span className="layer-description">{layer.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MapContainer
        key={`${selectedRouteData?.departure}-${selectedRouteData?.arrival}`}
        center={[30, 0]}
        zoom={3}
        style={{ height: '500px', width: '100%' }}
        className="flight-map"
      >
        {/* Auto-fit bounds to route */}
        {selectedRouteData?.coordinates && (
          <FitBounds coordinates={selectedRouteData.coordinates} />
        )}
        
        {/* Base map layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Weather layer overlay - only show if API key is available */}
        {weatherLayerAvailable && (
          <TileLayer
            url={`https://tile.openweathermap.org/map/${weatherLayer}/{z}/{x}/{y}.png?appid=38c84f3958c16d4c64ac0936426d9230`}
            attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
            opacity={0.8}
            zIndex={1000}
          />
        )}

        {/* Render selected route only */}
        {selectedRouteData && selectedRouteData.coordinates && selectedRouteData.coordinates.length > 0 && (
          <React.Fragment>
                         {/* Render route with manual antimeridian handling */}
             {(() => {
               // Filter out null coordinates
               const validCoordinates = selectedRouteData.coordinates.filter(coord => 
                 coord && coord[0] != null && coord[1] != null
               );
               
               if (validCoordinates.length === 0) {
                 console.warn('No valid coordinates found for route rendering');
                 return null;
               }
               
               // Split route into segments if it crosses antimeridian
               const routeSegments = splitRouteForAntimeridian(validCoordinates);
               const crossesDateLine = routeSegments.length > 1;
               
               // Render each segment as a separate polyline
               return routeSegments.map((segment, index) => (
                 <Polyline
                   key={`route-segment-${index}`}
                   positions={segment}
                   color="#000000"
                   weight={3}
                   opacity={0.8}
                   smoothFactor={1}
                 >
                   <Popup>
                     <div className="route-popup">
                       <h4>{selectedRouteData.name}</h4>
                       <p><strong>Route:</strong> {selectedRouteData.departure} → {selectedRouteData.arrival}</p>
                       <p><strong>Distance:</strong> {selectedRouteData.distance || 'Unknown'} miles</p>
                       <p><strong>Duration:</strong> {selectedRouteData.avgDuration || 'Unknown'}</p>
                       <p><strong>Frequency:</strong> {selectedRouteData.frequency}</p>
                       {crossesDateLine && (
                         <p><strong>Note:</strong> Antimeridian crossing route (segment {index + 1} of {routeSegments.length})</p>
                       )}
                     </div>
                   </Popup>
                 </Polyline>
               ));
             })()}

            {/* Weather markers along the route - showing current weather conditions for each waypoint */}
            {selectedRouteData.weatherData && selectedRouteData.weatherData.map((weatherPoint, index) => {
              const departureCoord = selectedRouteData.coordinates[0];
              const arrivalCoord = selectedRouteData.coordinates[selectedRouteData.coordinates.length - 1];
              const weatherCoord = weatherPoint.coordinates;
              
              // Check for null coordinates
              if (!weatherCoord || weatherCoord[0] == null || weatherCoord[1] == null) {
                return null;
              }
              
              // Use original coordinates without offset
              let displayCoord = weatherCoord;

              // Handle both old and new weather data structures
              let weatherData;
              if (weatherPoint.weather) {
                // Old structure (single altitude)
                weatherData = weatherPoint.weather;
              } else if (weatherPoint.baseWeather) {
                // New structure (multi-altitude)
                weatherData = weatherPoint.baseWeather;
              } else {
                return null; // Skip if no weather data
              }

              // Use weather emoji for each waypoint based on current conditions
              const weatherEmoji = getWeatherIcon(weatherData);

              return (
                <Marker
                  key={`weather-${index}`}
                  position={displayCoord}
                  icon={L.divIcon({
                    className: 'weather-marker',
                    html: weatherEmoji,
                    iconSize: [24, 24]
                  })}
                >
                  <Popup>
                    <div className="weather-popup">
                      <h4>Weather Data</h4>
                      <p><strong>Location:</strong> {weatherPoint.coordinates[0] ? weatherPoint.coordinates[0].toFixed(2) : 'N/A'}, {weatherPoint.coordinates[1] ? weatherPoint.coordinates[1].toFixed(2) : 'N/A'}</p>
                      <p><strong>Temperature:</strong> {weatherData.temperature}°F</p>
                      <p><strong>Wind Speed:</strong> {weatherData.windSpeed} mph</p>
                      <p><strong>Conditions:</strong> {weatherData.description}</p>
                      <p><strong>Pressure:</strong> {weatherData.pressure} hPa</p>
                      <p><strong>Weather:</strong> {weatherEmoji} {weatherData.description}</p>
                      <div className="weather-icon">
                        {weatherEmoji}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }).filter(Boolean)}

            {/* Only show departure and arrival airport markers - no flight numbers */}
            {selectedRouteData.coordinates.length > 0 && (
              <>
                {/* Departure airport marker */}
                {selectedRouteData.coordinates[0] && selectedRouteData.coordinates[0][0] != null && selectedRouteData.coordinates[0][1] != null && (
                  <Marker
                    key="departure"
                    position={[selectedRouteData.coordinates[0][0] + 0.3, selectedRouteData.coordinates[0][1] + 0.3]}
                    icon={L.divIcon({
                      className: 'airport-icon departure',
                      html: selectedRouteData.departure,
                      iconSize: [40, 20]
                    })}
                  >
                    <Popup>
                      <div className="airport-popup">
                        <h4>Departure Airport</h4>
                        <p><strong>Coordinates:</strong> {selectedRouteData.coordinates[0][0] ? selectedRouteData.coordinates[0][0].toFixed(4) : 'N/A'}, {selectedRouteData.coordinates[0][1] ? selectedRouteData.coordinates[0][1].toFixed(4) : 'N/A'}</p>
                        <p><strong>Route:</strong> {selectedRouteData.departure} → {selectedRouteData.arrival}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Arrival airport marker */}
                {(() => {
                  const lastCoord = selectedRouteData.coordinates[selectedRouteData.coordinates.length - 1];
                  if (!lastCoord || lastCoord[0] == null || lastCoord[1] == null) {
                    return null;
                  }
                  
                  return (
                    <Marker
                      key="arrival"
                      position={[lastCoord[0] - 0.3, lastCoord[1] - 0.3]}
                      icon={L.divIcon({
                        className: 'airport-icon arrival',
                        html: selectedRouteData.arrival,
                        iconSize: [40, 20]
                      })}
                    >
                      <Popup>
                        <div className="airport-popup">
                          <h4>Arrival Airport</h4>
                          <p><strong>Coordinates:</strong> {lastCoord[0] ? lastCoord[0].toFixed(4) : 'N/A'}, {lastCoord[1] ? lastCoord[1].toFixed(4) : 'N/A'}</p>
                          <p><strong>Route:</strong> {selectedRouteData.departure} → {selectedRouteData.arrival}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}
              </>
            )}
          </React.Fragment>
        )}
      </MapContainer>

      <div className="map-info">
        {selectedRouteData ? (
          <>
            <div className="route-summary">
              <h4>Flight Route Summary</h4>
              <div className="route-details">
                <div className="route-item">
                  <span className="route-label">Route:</span>
                  <span className="route-value">{selectedRouteData.departure} → {selectedRouteData.arrival}</span>
                </div>
                <div className="route-item">
                  <span className="route-label">Distance:</span>
                  <span className="route-value">{selectedRouteData.distance || 'Unknown'} miles</span>
                </div>
                <div className="route-item">
                  <span className="route-label">Duration:</span>
                  <span className="route-value">{selectedRouteData.avgDuration || 'Unknown'}</span>
                </div>
                {selectedRouteData.gairmetAdvisories && selectedRouteData.gairmetAdvisories.hasAdvisories && (
                  <div className="route-item gairmet-item">
                    <span className="route-label">🚨 G-AIRMET:</span>
                    <span className="route-value gairmet-badge">
                      {selectedRouteData.gairmetAdvisories.advisories.length} Advisory{selectedRouteData.gairmetAdvisories.advisories.length !== 1 ? 'ies' : ''}
                    </span>
                  </div>
                )}
                <div className="route-item">
                  <span className="route-label">Weather Layer:</span>
                  <span className="route-value weather-layer-badge">
                    {weatherLayerAvailable ? currentLayer?.name : 'API Key Required'}
                  </span>
                </div>
              </div>
              <div className="map-tips">
                <p><strong>Tip:</strong> Click on the weather waypoints to see detailed conditions along your flight path. {weatherLayerAvailable ? 'Use the weather layer selector to view different weather data.' : 'Add your OpenWeatherMap API key to the frontend .env file to enable weather layers.'}</p>
                {weatherLayerAvailable && (
                  <p><strong>Weather Layer Active:</strong> {currentLayer?.name} - You should see weather data overlaid on the map!</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="no-route-message">
              <h4>🗺️ Interactive Flight Map</h4>
              <p>Enter departure and arrival airports above to visualize your flight path with real-time weather data and turbulence predictions.</p>
              <div className="map-features">
                <div className="feature-item">
                  <span className="feature-icon">✈️</span>
                  <span>Airport markers show departure and arrival points</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🌤️🌧️☁️❄️</span>
                  <span>Weather waypoints show current conditions along the route</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>Click any waypoint for detailed weather information</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🌧️☁️🌡️💨</span>
                  <span>Weather layers show precipitation, clouds, temperature, wind, and pressure data</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FlightMap; 
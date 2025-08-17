import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import FlightSearch from './components/FlightSearch';
import TurbulencePrediction from './components/TurbulencePrediction';
import FlightMap from './components/FlightMap';
import About from './components/About';

function App() {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handlePrediction = async (flightData) => {
    setLoading(true);
    setError(null);
    
    try {
      // This will be replaced with actual API call
      const response = await fetch('/api/turbulence/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData),
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const data = await response.json();
      setPredictionData(data);
    } catch (err) {
      console.log('API call failed, using mock data:', err.message);
      // For demo purposes, create mock data with proper structure
      const mockData = {
        turbulenceLevel: 'Moderate',
        confidence: 0.75,
        factors: [
          'Wind shear detected at 30,000ft',
          'Jet stream activity in route',
          'Convective weather patterns'
        ],
        route: {
          departure: flightData.departure,
          arrival: flightData.arrival,
          coordinates: [
            [40.7128, -74.0060], // NYC
            [34.0522, -118.2437]  // LAX
          ]
        },
        recommendations: [
          {
            icon: '🛡️',
            type: 'Safety',
            text: 'Keep seatbelt fastened throughout the flight'
          },
          {
            icon: '📅',
            type: 'Updates',
            text: 'Check for real-time weather updates'
          },
          {
            icon: '⏰',
            type: 'Timing',
            text: 'Consider alternative departure times if possible'
          }
        ]
      };

      setPredictionData(mockData);
      // Don't set error for demo purposes - just log it
      console.log('Using mock prediction data for:', flightData.departure, '→', flightData.arrival);
    } finally {
      // Add a delay to let users enjoy the airplane animation
      // The airplane animation cycle is 3 seconds, so we'll add 2.5 seconds to ensure at least 2 full cycles
      await new Promise(resolve => setTimeout(resolve, 2500));
      setLoading(false);
    }
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const handleHomeClick = () => {
    // Reset to home screen
    setPredictionData(null);
    setError(null);
    setIsSearchOpen(false);
    setIsAboutOpen(false);
  };

  const handleAboutClick = () => {
    setIsAboutOpen(true);
  };

  const closeAbout = () => {
    setIsAboutOpen(false);
  };

  return (
    <div className="App">
      <Header 
        onHomeClick={handleHomeClick} 
        onAboutClick={handleAboutClick}
      />
      <div className="container">
        <div className="main-content">
          {/* Welcome section with button to open search */}
          {!predictionData && !loading && (
            <div className="welcome-section">
              <div className="welcome-card">
                <div className="logo-container">
                  <div className="logo">
                    <img 
                      src="/images/turbulens-nobg.png" 
                      alt="TurbuLens Logo" 
                      className="welcome-logo"
                    />
                  </div>
                </div>
                <p>
                  Get AI-powered turbulence predictions for any flight route. 
                  Our advanced system analyzes weather patterns, wind conditions, 
                  and atmospheric data to provide accurate turbulence forecasts.
                </p>
                <div className="tip-box">
                  <p className="tip-text">
                    💡 <strong>Tip:</strong> For the most accurate predictions, use this system on the day of your flight, 
                    ideally a few hours before departure when weather data is most current.
                  </p>
                </div>
                <button className="btn btn-large" onClick={openSearch}>
                ☁️ Start Flight Analysis
                </button>
                
                <div className="mission-statement">
                  <p>
                    <em>"Empowering nervous flyers with free, reliable information to make every flight a smoother experience."</em>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* FlightSearch Popup */}
          <FlightSearch 
            onSearch={handlePrediction} 
            isOpen={isSearchOpen}
            onClose={closeSearch}
          />
          
          {/* About Modal */}
          <About isOpen={isAboutOpen} onClose={closeAbout} />
          
          {/* Loading screen during prediction */}
          {loading && (
            <div className="loading-screen">
              <div className="loading-content">
                <div className="airplane-container">
                  <img 
                    src="https://static.vecteezy.com/system/resources/thumbnails/051/958/256/small/front-view-of-an-airplane-in-flight-against-a-dark-background-emphasizing-aviation-and-travel-concepts-png.png"
                    alt="Airplane in flight"
                    className="loading-airplane"
                  />
                </div>
                <div className="clouds-container">
                  <div className="cloud cloud-1">☁️</div>
                  <div className="cloud cloud-2">☁️</div>
                  <div className="cloud cloud-3">☁️</div>
                  <div className="cloud cloud-4">☁️</div>
                  <div className="cloud cloud-5">☁️</div>
                  <div className="cloud cloud-6">☁️</div>
                  <div className="cloud cloud-7">☁️</div>
                  <div className="cloud cloud-8">☁️</div>
                </div>
                <h2>Analyzing flight conditions...</h2>
                <p>Please wait while we process your route and gather weather data.</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="card error">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}
          
          {predictionData && !loading && (
            <>
              <TurbulencePrediction 
                data={predictionData} 
              />
              <FlightMap 
                selectedRoute={{
                  departure: predictionData.route.departure,
                  arrival: predictionData.route.arrival
                }}
                predictionData={predictionData} 
              />
              {/* Add button to analyze another route */}
              <div className="analyze-another">
                <button className="btn" onClick={openSearch}>
                  🔄 Analyze Another Route
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2025 TurbuLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App; 
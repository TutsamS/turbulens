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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch('/api/turbulence/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setPredictionData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
        scrollToSection={scrollToSection}
        predictionData={predictionData}
        onAnalyzeAnother={openSearch}
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
                Start Flight Analysis
                </button>
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
              <div id="flightmap">
                <FlightMap 
                  selectedRoute={{
                    departure: predictionData.route.departure,
                    arrival: predictionData.route.arrival
                  }}
                  predictionData={predictionData} 
                />
              </div>
              {/* Add button to analyze another route */}
              <div className="analyze-another">
                <button className="btn" onClick={openSearch}>
                  Analyze Another Route
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
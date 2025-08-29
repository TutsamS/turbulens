import React from 'react';
import './Header.css';

function Header({ onHomeClick, onAboutClick, scrollToSection, predictionData }) {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <img 
              src="/images/turbulens-noplane.png" 
              alt="TurbuLens Logo" 
              className="logo-image"
            />
          </div>
          <nav className="nav">
            <button onClick={onHomeClick} className="nav-link">Home</button>
            <button onClick={onAboutClick} className="nav-link">About</button>
            {predictionData && scrollToSection && (
              <>
                <button onClick={() => scrollToSection('prediction')} className="nav-link">Prediction</button>
                <button onClick={() => scrollToSection('gairmet')} className="nav-link">G-AIRMET Info</button>
                <button onClick={() => scrollToSection('recommendations')} className="nav-link">Recommendations</button>
                <button onClick={() => scrollToSection('flightmap')} className="nav-link">Flight Map</button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header; 
import React from 'react';
import './Header.css';

function Header({ onHomeClick, onAboutClick }) {
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
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header; 
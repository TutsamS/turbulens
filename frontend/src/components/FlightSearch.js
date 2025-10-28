import React, { useState, useEffect } from 'react';
import './FlightSearch.css';
import AirportSearchDropdown from './AirportSearchDropdown';

function FlightSearch({ onSearch, isOpen, onClose }) {
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Calculate date constraints - lock to today for most accurate predictions
  const today = new Date();
  
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayFormatted = formatDateForInput(today);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Set date to today for most accurate predictions
      setDate(todayFormatted);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, todayFormatted]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!departure || !arrival) {
      alert('Please enter both departure and arrival airports');
      return;
    }
    
    onSearch({
      departure: departure.toUpperCase(),
      arrival: arrival.toUpperCase(),
      date: date || todayFormatted
    });
    
    // Close the popup after search
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay background (not on modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const openIATALookup = () => {
    window.open('https://www.iata.org/en/publications/directories/code-search', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className={`popup-modal ${isVisible ? 'popup-visible' : ''}`}>
        <div className="popup-header">
          <h2>Flight Route Analysis</h2>
          <button 
            className="popup-close" 
            onClick={handleClose}
            title="Close"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="popup-content">
          
          <form onSubmit={handleSubmit} className="search-form" 
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departure">Departure Airport</label>
                <AirportSearchDropdown
                  value={departure}
                  onChange={setDeparture}
                  placeholder="Airport name or code"
                  onSelect={(airport) => {
                    setDeparture(airport.code);
                    console.log('Selected departure:', airport);
                  }}
                  className="airport-search-field"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="arrival">Arrival Airport</label>
                <AirportSearchDropdown
                  value={arrival}
                  onChange={setArrival}
                  placeholder="Airport name or code"
                  onSelect={(airport) => {
                    setArrival(airport.code);
                    console.log('Selected arrival:', airport);
                  }}
                  className="airport-search-field"
                />
              </div>
            </div>
            
            <div className="iata-help">
              <p className="iata-note">
                ✨ <strong>Search Tips:</strong>
              </p>
              <ul className="search-tips">
                <li>Type airport names like "London Heathrow" or "John F Kennedy"</li>
                <li>Use IATA codes like "LHR" or "JFK"</li>
                <li>Search by city names like "New York" or "Los Angeles"</li>
                <li>Results appear as you type (minimum 2 characters)</li>
              </ul>
              <p className="iata-explanation">
                Still need help? <button 
                  type="button" 
                  className="iata-link-btn"
                  onClick={openIATALookup}
                >
                  📋 Look up IATA Airport Codes
                </button>
              </p>
            </div>
            
            <button type="submit" className="btn">
              Predict Turbulence
            </button>
            
            <div className="popular-routes-section">
              <h4 className="popular-routes-title">Popular Routes</h4>
              <div className="popular-routes-grid">
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('LHR');
                    setArrival('JFK');
                  }}
                >
                  <span className="route-codes">LHR → JFK</span>
                  <span className="route-description">London → New York</span>
                </button>
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('CDG');
                    setArrival('LAX');
                  }}
                >
                  <span className="route-codes">CDG → LAX</span>
                  <span className="route-description">Paris → Los Angeles</span>
                </button>
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('NRT');
                    setArrival('SFO');
                  }}
                >
                  <span className="route-codes">NRT → SFO</span>
                  <span className="route-description">Tokyo → San Francisco</span>
                </button>
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('DXB');
                    setArrival('LHR');
                  }}
                >
                  <span className="route-codes">DXB → LHR</span>
                  <span className="route-description">Dubai → London</span>
                </button>
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('SYD');
                    setArrival('LAX');
                  }}
                >
                  <span className="route-codes">SYD → LAX</span>
                  <span className="route-description">Sydney → Los Angeles</span>
                </button>
                <button 
                  className="popular-route-btn"
                  onClick={() => {
                    setDeparture('FRA');
                    setArrival('JFK');
                  }}
                >
                  <span className="route-codes">FRA → JFK</span>
                  <span className="route-description">Frankfurt → New York</span>
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="date">Flight Date</label>
              <input
                type="date"
                id="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                min={todayFormatted}
                max={todayFormatted}
                required
              />
              <div className="date-help">
                <p className="date-note">
                  <strong>Why is the date locked?</strong>
                </p>
                <p className="date-explanation">
                  We lock the date assuming the application is used on the same day of your flight, 
                  as weather data is current and therefore more reliable for turbulence predictions.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FlightSearch; 
import React, { useState, useEffect } from 'react';
import './FlightSearch.css';

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
          <p className="subtitle">
            Enter the IATA codes for your departure and arrival airports to get your AI turbulence prediction!
          </p>
          
          <form onSubmit={handleSubmit} className="search-form" 
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departure">Departure Airport</label>
                <input
                  type="text"
                  id="departure"
                  className="input"
                  placeholder="e.g., JFK, LAX, LHR"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="arrival">Arrival Airport</label>
                <input
                  type="text"
                  id="arrival"
                  className="input"
                  placeholder="e.g., LAX, JFK, CDG"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  required
                />
              </div>
            </div>
            
            <div className="iata-help">
              <p className="iata-note">
                🔍 <strong>Don't know your airport code?</strong>
              </p>
              <button 
                type="button" 
                className="iata-link-btn"
                onClick={openIATALookup}
              >
                📋 Look up IATA Airport Codes
              </button>
              <p className="iata-explanation">
                Use the official IATA code search to find the 3-letter airport codes for any airport worldwide.
              </p>
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
            
            <button type="submit" className="btn">
            Predict Turbulence
            </button>
          </form>
          
          <div className="examples">
            <h4>Popular Routes:</h4>
            <div className="example-routes">
              <button 
                className="example-btn"
                onClick={() => {
                  setDeparture('LHR');
                  setArrival('JFK');
                }}
              >
                LHR → JFK
              </button>
              <button 
                className="example-btn"
                onClick={() => {
                  setDeparture('SFO');
                  setArrival('EWR');
                }}
              >
                SFO → EWR
              </button>
              <button 
                className="example-btn"
                onClick={() => {
                  setDeparture('LAX');
                  setArrival('HND');
                }}
              >
                LAX → HND
              </button>
              <button 
                className="example-btn"
                onClick={() => {
                  setDeparture('SAN');
                  setArrival('MEX');
                }}
              >
                SAN → MEX
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightSearch; 
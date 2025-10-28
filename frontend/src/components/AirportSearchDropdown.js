import React, { useState, useEffect, useRef } from 'react';
import './AirportSearchDropdown.css';

function AirportSearchDropdown({ 
  value, 
  onChange, 
  placeholder, 
  onSelect, 
  disabled = false,
  className = '' 
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Debounced search function
  const debouncedSearch = (searchQuery) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://localhost:5001/api/flight-paths/airports/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (data.success) {
          setResults(data.data || []);
          setIsOpen(data.data && data.data.length > 0);
        } else {
          setError(data.error || 'Search failed');
          setResults([]);
          setIsOpen(false);
        }
      } catch (err) {
        console.error('Airport search error:', err);
        setError('Failed to search airports');
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    
    // Clear selected airport when typing
    if (selectedAirport && newValue !== selectedAirport.code) {
      setSelectedAirport(null);
    }
    
    if (newValue.length >= 2) {
      debouncedSearch(newValue);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  // Handle airport selection
  const handleSelect = (airport) => {
    setSelectedAirport(airport);
    setQuery(airport.code);
    onChange(airport.code);
    onSelect(airport);
    setIsOpen(false);
    setResults([]);
    setHoveredIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input blur
  const handleBlur = (e) => {
    // Delay closing to allow for click events on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = hoveredIndex < results.length - 1 ? hoveredIndex + 1 : 0;
        setHoveredIndex(nextIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = hoveredIndex > 0 ? hoveredIndex - 1 : results.length - 1;
        setHoveredIndex(prevIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (hoveredIndex >= 0 && hoveredIndex < results.length) {
          handleSelect(results[hoveredIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHoveredIndex(-1);
        break;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update query when value prop changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  return (
    <div className={`airport-search-container ${className}`} ref={dropdownRef}>
      <div className="airport-search-input-wrapper">
        {selectedAirport && (
          <div className="selected-airport-chip">
            <span className="selected-airport-code">{selectedAirport.code}</span>
            <span className="selected-airport-name">{selectedAirport.name}</span>
            <button 
              className="remove-airport-btn"
              onClick={() => {
                setSelectedAirport(null);
                setQuery('');
                onChange('');
              }}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className={`airport-search-input ${selectedAirport ? 'with-selection' : ''}`}
          placeholder={selectedAirport ? '' : placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <div className="airport-search-loading">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="airport-search-dropdown">
          {error ? (
            <div className="airport-search-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          ) : results.length > 0 ? (
            <ul className="airport-search-results">
              {results.map((airport, index) => (
                <li
                  key={`${airport.code}-${index}`}
                  className={`airport-search-item ${
                    index === hoveredIndex ? 'highlighted' : ''
                  }`}
                  onClick={() => handleSelect(airport)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(-1)}
                >
                  <div className="airport-item-main">
                    <span className="airport-code">{airport.code}</span>
                    <span className="airport-name">{airport.name}</span>
                  </div>
                  <div className="airport-item-details">
                    <span className="airport-location">
                      {airport.city}, {airport.country}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="airport-search-no-results">
              <span className="no-results-icon">🔍</span>
              No airports found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default AirportSearchDropdown;

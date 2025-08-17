const validateFlightData = (data) => {
  const errors = [];

  // Validate departure airport
  if (!data.departure || typeof data.departure !== 'string') {
    errors.push('Departure airport is required and must be a string');
  } else if (data.departure.length !== 3) {
    errors.push('Departure airport code must be 3 characters');
  }

  // Validate arrival airport
  if (!data.arrival || typeof data.arrival !== 'string') {
    errors.push('Arrival airport is required and must be a string');
  } else if (data.arrival.length !== 3) {
    errors.push('Arrival airport code must be 3 characters');
  }

  // Validate that departure and arrival are different
  if (data.departure && data.arrival && data.departure === data.arrival) {
    errors.push('Departure and arrival airports must be different');
  }

  // Validate date (optional)
  if (data.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    } else {
      const inputDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (inputDate < today) {
        errors.push('Date cannot be in the past');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateCoordinates = (lat, lng) => {
  const errors = [];

  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push('Latitude must be a valid number');
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push('Longitude must be a valid number');
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateAltitude = (altitude) => {
  if (typeof altitude !== 'number' || isNaN(altitude)) {
    return { isValid: false, errors: ['Altitude must be a valid number'] };
  }

  if (altitude < 0 || altitude > 50000) {
    return { isValid: false, errors: ['Altitude must be between 0 and 50,000 feet'] };
  }

  return { isValid: true, errors: [] };
};

module.exports = {
  validateFlightData,
  validateCoordinates,
  validateAltitude
}; 
// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
};

// Convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Get route coordinates with waypoints
const getRouteCoordinates = (depLat, depLng, arrLat, arrLng, numPoints = 10) => {
  const coordinates = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = depLat + (arrLat - depLat) * fraction;
    const lng = depLng + (arrLng - depLng) * fraction;
    
    coordinates.push([lat, lng]);
  }
  
  return coordinates;
};

// Calculate bearing between two points
const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x);
  return (bearing * 180 / Math.PI + 360) % 360;
};

// Check if a point is within a polygon (for airspace restrictions)
const isPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Calculate flight time based on distance and aircraft type
const calculateFlightTime = (distance, aircraftType = 'commercial') => {
  const speeds = {
    commercial: 550, // mph
    private: 400,
    cargo: 500
  };
  
  const speed = speeds[aircraftType] || speeds.commercial;
  const timeHours = distance / speed;
  
  return {
    hours: Math.floor(timeHours),
    minutes: Math.round((timeHours - Math.floor(timeHours)) * 60),
    totalMinutes: Math.round(timeHours * 60)
  };
};

// Get timezone offset for a location
const getTimezoneOffset = (lat, lng) => {
  // This is a simplified version - in production you'd use a timezone database
  const date = new Date();
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const targetTime = new Date(utc + (0 * 60000)); // Assume UTC for now
  
  return targetTime.getTimezoneOffset();
};

module.exports = {
  calculateDistance,
  toRadians,
  getRouteCoordinates,
  calculateBearing,
  isPointInPolygon,
  calculateFlightTime,
  getTimezoneOffset
}; 
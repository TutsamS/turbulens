import React from 'react';
import './TurbulencePrediction.css';

function TurbulencePrediction({ data }) {

  const getTurbulenceColor = (level) => {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('light to moderate')) {
      return '#f6ad55';
    } else if (levelLower.includes('moderate to severe')) {
      return '#f56565';
    } else if (levelLower.includes('light')) {
      return '#48bb78';
    } else if (levelLower.includes('moderate')) {
      return '#ed8936';
    } else if (levelLower.includes('severe')) {
      return '#e53e3e';
    } else if (levelLower.includes('extreme')) {
      return '#9f7aea';
    } else {
      return '#48bb78';
    }
  };

  const getTurbulenceIcon = (level) => {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('light to moderate')) {
      return '🌤️';
    } else if (levelLower.includes('moderate to severe')) {
      return '⛈️';
    } else if (levelLower.includes('light')) {
      return '🌤️';
    } else if (levelLower.includes('moderate')) {
      return '⛈️';
    } else if (levelLower.includes('severe')) {
      return '⚡';
    } else {
      return '✈️';
    }
  };

  return (
    <div className="card">
      <div className="prediction-header">
        <div className="header-top">
          <h2>Turbulence Prediction</h2>
        </div>
        <div className="route-info">
          <div className="route-display">
            <span className="airport departure">
              {data.airportWeather?.departure?.coordinates?.name || data.route.departure}
            </span>
            <img src="/images/arrowplane.png" alt="Flight route" className="route-arrow" />
            <span className="airport arrival">
              {data.airportWeather?.arrival?.coordinates?.name || data.route.arrival}
            </span>
          </div>
        </div>
      </div>

      <div className="prediction-content">


        <div id="prediction" className="turbulence-level">
          <div className="turbulence-spectrum">
            <h3>Turbulence Levels</h3>
            <div className="spectrum-container">
                          {[
              { level: 'None', color: '#10b981', icon: '☀️', description: 'Smooth flying' },
              { level: 'Light', color: '#34d399', icon: '🌤️', description: 'Minor bumps' },
              { level: 'Light to Moderate', color: '#fbbf24', icon: '🌤️', description: 'Noticeable movement' },
              { level: 'Moderate', color: '#f59e0b', icon: '⛈️', description: 'Frequent bumps' },
              { level: 'Moderate to Severe', color: '#ef4444', icon: '⛈️', description: 'Strong turbulence' },
              { level: 'Severe', color: '#dc2626', icon: '⚡', description: 'Intense shaking' }
            ].map((turbulenceType, index) => (
                <div 
                  key={turbulenceType.level}
                  className={`spectrum-item ${
                    data.turbulenceLevel.toLowerCase() === turbulenceType.level.toLowerCase()
                      ? 'predicted' 
                      : ''
                  }`}
                  style={{
                    '--turbulence-color': turbulenceType.color,
                    '--turbulence-gradient': `linear-gradient(135deg, ${turbulenceType.color}20, ${turbulenceType.color}40)`
                  }}
                >
                  <div className="spectrum-icon">{turbulenceType.icon}</div>
                  <div className="spectrum-level">{turbulenceType.level}</div>
                  <div className="spectrum-description">{turbulenceType.description}</div>
                  {data.turbulenceLevel.toLowerCase() === turbulenceType.level.toLowerCase() && (
                    <div className="predicted-indicator">
                      <span className="predicted-badge">PREDICTED</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Flight Phase Analysis - Integrated into turbulence levels */}
            {data.phaseAnalysis && data.phaseAnalysis.length > 0 && (
              <div className="flight-phases-integrated">
                <h4>Flight Phase Analysis</h4>
                {/* Debug logging */}
                {console.log('Frontend phaseAnalysis:', data.phaseAnalysis)}
                {console.log('Frontend turbulenceLevel:', data.turbulenceLevel)}
                {console.log('Frontend data received at:', new Date().toISOString())}
                {data.phaseAnalysis && data.phaseAnalysis.forEach((phase, idx) => {
                  console.log(`Frontend Phase ${idx}: ${phase.name} = ${phase.turbulenceLevel}`);
                })}
                <div className="phase-cards-container">
                  {data.phaseAnalysis.map((phase, index) => (
                    <div key={index} className="phase-card">
                      <div className="phase-header">
                        <h5>{phase.name}</h5>
                        <span className={`turbulence-badge ${phase.turbulenceLevel.toLowerCase().replace(/\s+/g, '-')}`}>
                          {phase.turbulenceLevel}
                        </span>
                      </div>
                      <div className="phase-details">
                        <div className="phase-info">
                          <span className="info-label">Altitude:</span>
                          <span className="info-value">
                            {phase.phaseType === 'cruise' && phase.altitudeRange.min === phase.altitudeRange.max
                              ? `± ${phase.altitudeRange.min.toLocaleString()} ft`
                              : phase.phaseType === 'descent' 
                                ? `${phase.altitudeRange.max.toLocaleString()} - ${phase.altitudeRange.min.toLocaleString()} ft`
                                : `${phase.altitudeRange.min.toLocaleString()} - ${phase.altitudeRange.max.toLocaleString()} ft`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="prediction-summary">
            <div className="summary-header">
              <h4>Your Flight Prediction</h4>
                          <div className="confidence-meter">
              <span className="confidence-label">Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill"
                  style={{ 
                    width: `${Math.round(data.confidence * 100)}%`,
                    background: `linear-gradient(90deg, #10b981, #3b82f6)`
                  }}
                ></div>
              </div>
              <span className="confidence-value">
                {Math.round(data.confidence * 100)}%
              </span>
            </div>
            
            <div className="confidence-breakdown">
              <details className="confidence-details">
                <summary className="confidence-summary">
                  <span className="summary-text">What affects confidence?</span>
                  <span className="summary-icon">ℹ️</span>
                </summary>
                <div className="breakdown-content">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Weather Data Coverage:</span>
                    <span className="breakdown-value">
                      {data.weatherData && data.weatherData.length > 0 ? 'Good' : 'Limited'}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Weather Advisories:</span>
                    <span className="breakdown-value">
                      {(() => {
                        const gairmetCount = data.gairmetAdvisories?.hasAdvisories ? data.gairmetAdvisories.advisories.length : 0;
                        const sigmetCount = data.sigmetAdvisories?.hasAdvisories ? data.sigmetAdvisories.advisories.length : 0;
                        const totalCount = gairmetCount + sigmetCount;
                        
                        if (totalCount === 0) return 'None detected';
                        
                        const parts = [];
                        if (gairmetCount > 0) parts.push(`${gairmetCount} G-AIRMET${gairmetCount > 1 ? 's' : ''}`);
                        if (sigmetCount > 0) parts.push(`${sigmetCount} SIGMET${sigmetCount > 1 ? 's' : ''}`);
                        
                        return parts.join(', ');
                      })()}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Route Complexity:</span>
                    <span className="breakdown-value">
                      {data.distance < 500 ? 'Low' : data.distance < 1500 ? 'Medium' : 'High'}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Data Quality:</span>
                    <span className="breakdown-value">
                      {data.weatherData && data.weatherData.length > 0 ? 'High' : 'Standard'}
                    </span>
                  </div>
                </div>
              </details>
            </div>
            </div>
            
            <div 
              className="current-prediction"
              style={{
                background: `linear-gradient(135deg, ${getTurbulenceColor(data.turbulenceLevel)}15, ${getTurbulenceColor(data.turbulenceLevel)}35)`,
                border: `3px solid ${getTurbulenceColor(data.turbulenceLevel)}`,
                boxShadow: `0 4px 12px -2px ${getTurbulenceColor(data.turbulenceLevel)}60`
              }}
            >
              <div className="prediction-icon" style={{ fontSize: '48px' }}>
                {getTurbulenceIcon(data.turbulenceLevel)}
              </div>
              <div className="prediction-details">
                <div className="prediction-level" style={{ color: '#1e293b', fontWeight: '700', fontSize: '20px' }}>
                  {data.turbulenceLevel.charAt(0).toUpperCase() + data.turbulenceLevel.slice(1)}
                </div>
                <div className="prediction-subtitle" style={{ color: '#64748b', fontSize: '13px' }}>
                  Based on weather data and aviation advisories (G-AIRMETs/SIGMETs)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="disclaimer" className="high-altitude-disclaimer">
          <div className="disclaimer-icon">⚠️</div>
          <div className="disclaimer-content">
            <h4>Prediction Accuracy & Limitations</h4>
            <p>
              <strong>Important:</strong> These predictions analyze weather data across multiple altitude bands (surface to 40,000 feet) and incorporate official aviation weather advisories (G-AIRMETs and SIGMETs) when available. However, turbulence predictions may be less accurate due to: <strong>(1)</strong> limited weather data coverage in remote areas, <strong>(2)</strong> rapidly changing atmospheric conditions, <strong>(3)</strong> clear-air turbulence which is difficult to detect and predict, and <strong>(4)</strong> local weather phenomena not captured by global weather models. G-AIRMETs are only available in the United States. Predictions are most reliable for routes with active weather advisories and comprehensive weather data coverage.
            </p>
          </div>
        </div>

         {/* Airport Weather Analysis Section */}
         {data.airportWeather && data.airportWeather.departure && data.airportWeather.arrival && (
           <div id="airport-weather" className="airport-weather-section">
             <div className="section-header">
               <h3>Departure & Arrival Weather</h3>
               <span className="weather-badge">Ground Conditions</span>
             </div>
             <div className="airport-cards">
               <div className="airport-card departure">
                 <div className="airport-header">
                   <h4>Departure: {data.airportWeather.departure.airport}</h4>
                   <span className={`turbulence-badge ${data.airportWeather.departure.turbulence.toLowerCase().replace(/\s+/g, '-')}`}>
                     {data.airportWeather.departure.turbulence}
                   </span>
                 </div>
                 <div className="weather-details">
                   <div className="weather-info">
                     <span className="info-label">Wind:</span>
                     <span className="info-value">{Math.round(data.airportWeather.departure.weather.windSpeed)} mph</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Temperature:</span>
                     <span className="info-value">{Math.round(data.airportWeather.departure.weather.temperature)}°F</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Visibility:</span>
                     <span className="info-value">{Math.round(data.airportWeather.departure.weather.visibility * 0.621371)} miles</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Conditions:</span>
                     <span className="info-value">{data.airportWeather.departure.weather.description.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                   </div>
                 </div>
               </div>
               
               <div className="airport-card arrival">
                 <div className="airport-header">
                   <h4>Arrival: {data.airportWeather.arrival.airport}</h4>
                   <span className={`turbulence-badge ${data.airportWeather.arrival.turbulence.toLowerCase().replace(/\s+/g, '-')}`}>
                     {data.airportWeather.arrival.turbulence}
                   </span>
                 </div>
                 <div className="weather-details">
                   <div className="weather-info">
                     <span className="info-label">Wind:</span>
                     <span className="info-value">{Math.round(data.airportWeather.arrival.weather.windSpeed)} mph</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Temperature:</span>
                     <span className="info-value">{Math.round(data.airportWeather.arrival.weather.temperature)}°F</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Visibility:</span>
                     <span className="info-value">{Math.round(data.airportWeather.arrival.weather.visibility * 0.621371)} miles</span>
                   </div>
                   <div className="weather-info">
                     <span className="info-label">Conditions:</span>
                     <span className="info-value">{data.airportWeather.arrival.weather.description.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* AI Analysis Summary Section */}
         {data.aiSummary ? (
           <div id="ai-analysis" className="ai-analysis-section">
             <div className="section-header">
               <h3>AI Analysis</h3>
               <span className="ai-badge">Enhanced Prediction</span>
             </div>
             <div className="ai-summary-card">
               <div className="ai-summary-content">
                 <p>{data.aiSummary}</p>
               </div>
             </div>
           </div>
         ) : (
           <div id="expectations" className="factors">
             <h3>What to Expect</h3>
             <ul className="factors-list">
               {data.factors.map((factor, index) => (
                 <li key={index} className="factor-item">
                   <span className="factor-icon">•</span>
                   {factor}
                 </li>
               ))}
             </ul>
           </div>
         )}

         {/* G-AIRMET & SIGMET Information Section - Consolidated and Organized */}
         <div id="gairmet" className="gairmet-section">
           <div className="section-header">
             <img 
               src="/images/NWS-Logo.svg" 
               alt="NWS Logo" 
               className="nws-logo-small"
             />
             <h3>G-AIRMET & SIGMET Weather Information</h3>
           </div>
           
           {/* Combined G-AIRMET & SIGMET Advisories - Compact Cards */}
           {((data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories) || (data.sigmetAdvisories && data.sigmetAdvisories.hasAdvisories)) && (
             <div className="advisories-section">
               <h4>Active Weather Advisories on Your Route</h4>
               <div className="advisory-cards">
                 {/* G-AIRMET Advisories */}
                 {data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories && 
                   data.gairmetAdvisories.advisories.map((advisory, index) => (
                     <div key={`gairmet-${index}`} className="advisory-card">
                       <div className="advisory-header">
                         <span className="advisory-type">{advisory.type}</span>
                         <span className={`advisory-severity ${advisory.severity.toLowerCase()}`}>
                           {advisory.severity}
                         </span>
                       </div>
                       <div className="advisory-details">
                         <div className="detail-row">
                           <span className="detail-label">Hazard:</span>
                           <span className="detail-value">{advisory.hazard}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Area:</span>
                           <span className="detail-value">{advisory.area || 'General area along route'}</span>
                         </div>
                        <div className="detail-row">
                          <span className="detail-label">Altitude:</span>
                          <span className="detail-value">{advisory.altitude.min.toLocaleString()}-{advisory.altitude.max.toLocaleString()} feet</span>
                        </div>
                         <div className="detail-row">
                           <span className="detail-label">Valid:</span>
                           <span className="detail-value">{new Date(advisory.validTime).toLocaleString()}</span>
                         </div>
                         <a href="https://aviationweather.gov/gfa/#gairmet" target="_blank" rel="noopener noreferrer" className="map-link">
                           View on Map
                         </a>
                       </div>
                     </div>
                   ))
                 }
                 
                 {/* SIGMET Advisories */}
                 {data.sigmetAdvisories && data.sigmetAdvisories.hasAdvisories && 
                   data.sigmetAdvisories.advisories.map((advisory, index) => (
                     <div key={`sigmet-${index}`} className="advisory-card sigmet-card">
                       <div className="advisory-header">
                         <span className="advisory-type sigmet-type">{advisory.type}</span>
                         <span className={`advisory-severity ${advisory.severity.toLowerCase()}`}>
                           {advisory.severity}
                         </span>
                       </div>
                       <div className="advisory-details">
                         <div className="detail-row">
                           <span className="detail-label">Hazard:</span>
                           <span className="detail-value">{advisory.hazardType || advisory.hazard}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Area:</span>
                           <span className="detail-value">{advisory.area || 'General area along route'}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Altitude:</span>
                           <span className="detail-value">{advisory.altitude.min.toLocaleString()}-{advisory.altitude.max.toLocaleString()} feet</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Valid:</span>
                           <span className="detail-value">{new Date(advisory.validTime).toLocaleString()}</span>
                         </div>
                         <a href="https://aviationweather.gov/gfa/#sigmet" target="_blank" rel="noopener noreferrer" className="map-link">
                           View on Map
                         </a>
                       </div>
                     </div>
                   ))
                 }
               </div>
             </div>
           )}

           {/* Flight Planning Impact - Organized Cards */}
           {((data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories) || (data.sigmetAdvisories && data.sigmetAdvisories.hasAdvisories)) && (
             <div className="impact-section">
               <h4>How This Affects Your Flight</h4>
               <div className="impact-cards">
                 <div className="impact-card">
                   <h5>Pilot Planning</h5>
                   <p>Your pilots will actively avoid these areas by:</p>
                   <ul>
                     <li>Rerouting around turbulence zones</li>
                     <li>Adjusting altitude for smoother air</li>
                     <li>Modifying timing to avoid weather systems</li>
                   </ul>
                 </div>
                 
                 <div className="impact-card">
                   <h5>Your Experience</h5>
                   <p>Your flight may be smoother than predicted because:</p>
                   <ul>
                     <li>Pilots steer clear of known rough areas</li>
                     <li>Real-time route optimization occurs</li>
                     <li>Professional crews minimize discomfort</li>
                   </ul>
                 </div>
                 
                 <div className="impact-card">
                   <h5>Bottom Line</h5>
                   <p>The prediction shows potential conditions if flying directly through weather systems. Your pilots will likely navigate around these areas for a smoother experience.</p>
                 </div>
               </div>
             </div>
           )}
           
           {/* G-AIRMET & SIGMET Explanation - Collapsible */}
           <div className="explanation-section">
             <details className="explanation-dropdown">
               <summary className="explanation-summary">
                 <span>What Are G-AIRMETs & SIGMETs?</span>
                 <span className="summary-icon">▼</span>
               </summary>
               <div className="explanation-content">
                 <p>
                   <strong>G-AIRMETs (Graphical AIRMETs)</strong> are official aviation weather advisories that identify potentially hazardous weather conditions for aircraft. These advisories are updated every 6 hours and give pilots advanced warning to plan safe, comfortable routes. They are only available in the United States.
                 </p>
                 <p>
                   <strong>SIGMETs (Significant Meteorological Information)</strong> are more severe weather advisories that warn of conditions potentially hazardous to all aircraft. SIGMETs are issued for weather phenomena that may affect the safety of flight operations, including severe turbulence, severe icing, and volcanic ash. They are issued as needed and are available worldwide.
                 </p>
                 
                 <h4 style={{ color: '#1e293b', fontSize: '16px', fontWeight: '600', marginTop: '20px', marginBottom: '12px' }}>Advisory Types:</h4>
                 <div className="gairmet-types">
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Turbulence</strong> - Areas of rough air</span>
                   </div>
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Icing</strong> - Ice formation conditions</span>
                   </div>
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Mountain Obscuration</strong> - Reduced visibility</span>
                   </div>
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Wind Shear</strong> - Sudden wind changes</span>
                   </div>
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Convective Activity</strong> - Thunderstorms and severe weather</span>
                   </div>
                   <div className="type-item">
                     <span className="type-icon"></span>
                     <span><strong>Volcanic Ash</strong> - Airborne volcanic debris</span>
                   </div>
                 </div>
                 
                 <div className="official-link">
                   <p>
                     <strong>Official Maps:</strong> View current advisories on the official NWS Aviation Weather Center:
                     <a href="https://aviationweather.gov/gfa/#gairmet" target="_blank" rel="noopener noreferrer">
                        G-AIRMET Map
                     </a>
                     and
                     <a href="https://aviationweather.gov/gfa/#sigmet" target="_blank" rel="noopener noreferrer">
                        SIGMET Map
                     </a>
                     .
                   </p>
                 </div>
               </div>
             </details>
           </div>
        </div>
      </div>
    </div>
  );
}

export default TurbulencePrediction; 
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
      return '🌪️';
    } else if (levelLower.includes('light')) {
      return '🌤️';
    } else if (levelLower.includes('moderate')) {
      return '🌪️';
    } else if (levelLower.includes('severe')) {
      return '⚡';
    } else if (levelLower.includes('extreme')) {
      return '🌀';
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
          <span className="route">
            {data.route.departure} → {data.route.arrival}
          </span>
        </div>
      </div>

      <div className="prediction-content">
        <div className="turbulence-level">
          <div 
            className="level-indicator"
            style={{ backgroundColor: getTurbulenceColor(data.turbulenceLevel) }}
          >
            <span className="level-icon">{getTurbulenceIcon(data.turbulenceLevel)}</span>
            <span className="level-text">{data.turbulenceLevel}</span>
          </div>
          
          <div className="confidence">
            <span className="confidence-label">Confidence:</span>
            <span className="confidence-value">
              {Math.round(data.confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="high-altitude-disclaimer">
          <div className="disclaimer-icon">⚠️</div>
          <div className="disclaimer-content">
            <h4>High-Altitude Flight Disclaimer</h4>
            <p>
              <strong>Important:</strong> These predictions are based on weather data at cruising altitude (30,000+ feet) 
              where wind speeds are significantly higher than ground level. Pilots can reroute around reported turbulence 
              but <strong>cannot avoid clear-air turbulence</strong>, which occurs in cloudless conditions and is often 
              undetectable by radar.
            </p>
          </div>
        </div>

                 <div className="factors">
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

         {/* G-AIRMET Advisories Section */}
         {data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories && (
           <div className="gairmet-advisories">
             <h3>
               <img 
                 src="https://aviationweather.gov/assets/NWS_logo-BZtavOX9.svg" 
                 alt="NWS Logo" 
                 className="nws-logo-small"
               />
               Official G-AIRMET Advisories On Your Route
             </h3>
             <div className="advisory-cards">
               {data.gairmetAdvisories.advisories.map((advisory, index) => (
                 <div key={index} className="advisory-card">
                   <div className="advisory-header">
                     <span className="advisory-type">{advisory.type}</span>
                     <span className={`advisory-severity ${advisory.severity.toLowerCase()}`}>
                       {advisory.severity}
                     </span>
                   </div>
                   <div className="advisory-details">
                     <p><strong>Hazard:</strong> {advisory.hazard}</p>
                     <p className="area-info"><strong>📍 Area:</strong> {advisory.area || 'General area along route'}</p>
                     <p><strong>Altitude:</strong> FL{advisory.altitude.min/100}-FL{advisory.altitude.max/100}</p>
                     <p><strong>Valid:</strong> {new Date(advisory.validTime).toLocaleString()}</p>
                     <p><strong>Source:</strong> {advisory.source}</p>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* G-AIRMET Impact on Flight Planning */}
         {data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories && (
           <div className="gairmet-impact">
             <h3>
               <img 
                 src="https://aviationweather.gov/assets/NWS_logo-BZtavOX9.svg" 
                 alt="NWS Logo" 
                 className="nws-logo-small"
               />
               How G-AIRMETs Affect Your Flight
             </h3>
             <div className="impact-content">
               <div className="impact-explanation">
                 <p>
                   <strong>Good News:</strong> Your flight route intersects with active G-AIRMET advisories, but this doesn't necessarily mean 
                   you'll experience the predicted turbulence levels.
                 </p>
                 
                 <div className="pilot-planning">
                   <h4>✈️ Pilot Flight Planning</h4>
                   <p>
                     Pilots actively monitor G-AIRMET advisories and typically plan flight routes to avoid these hazardous weather areas 
                     when possible. Your flight crew will:
                   </p>
                   <ul>
                     <li><strong>Reroute around advisories</strong> - Adjust flight path to minimize exposure to turbulence zones</li>
                     <li><strong>Modify altitude</strong> - Change cruising altitude to find smoother air</li>
                     <li><strong>Adjust timing</strong> - Delay departure or adjust speed to avoid weather systems</li>
                     <li><strong>Use real-time updates</strong> - Monitor current conditions and adjust plans accordingly</li>
                   </ul>
                 </div>
                 
                 <div className="turbulence-reality">
                   <h4>🌤️ What This Means for You</h4>
                   <p>
                     While our system shows the <strong>potential</strong> turbulence based on current weather patterns, your actual 
                     flight experience may be much smoother due to:
                   </p>
                   <ul>
                     <li><strong>Active avoidance</strong> - Pilots steering clear of known turbulence areas</li>
                     <li><strong>Real-time adjustments</strong> - Continuous monitoring and route optimization</li>
                     <li><strong>Professional expertise</strong> - Flight crews trained to minimize passenger discomfort</li>
                     <li><strong>Weather forecasting</strong> - Advanced systems that predict and avoid rough air</li>
                   </ul>
                 </div>
                 
                 <div className="confidence-note">
                   <p>
                     <strong>Bottom Line:</strong> The turbulence prediction above represents conditions if your flight flew directly through 
                     the weather system. However, your pilots will likely navigate around these areas, potentially resulting in a much 
                     smoother flight than predicted.
                   </p>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* G-AIRMET Explanation Section */}
         <div className="gairmet-explanation">
           <details className="explanation-dropdown">
             <summary className="explanation-summary">
               <h3>
                 <img 
                   src="https://aviationweather.gov/assets/NWS_logo-BZtavOX9.svg" 
                   alt="NWS Logo" 
                   className="nws-logo-small"
                 />
                 What are G-AIRMETs?
               </h3>
               <span className="dropdown-arrow">▼</span>
             </summary>
             <div className="explanation-content">
               <p>
                 <strong>G-AIRMETs (Graphical Area Forecasts)</strong> are official aviation weather advisories issued by the National Weather Service 
                 that provide critical information about hazardous weather conditions that could affect flight safety.
               </p>
               
               <div className="explanation-grid">
                 <div className="explanation-item">
                   <span className="explanation-icon">🎯</span>
                   <div>
                     <h4>Purpose</h4>
                     <p>G-AIRMETs alert pilots to potentially dangerous weather conditions including turbulence, icing, mountain obscuration, and low-level wind shear.</p>
                   </div>
                 </div>
                 
                 <div className="explanation-item">
                   <span className="explanation-icon">⏰</span>
                   <div>
                     <h4>Timing</h4>
                     <p>These advisories are updated every 6 hours and provide forecasts for the next 6-12 hour period, helping pilots plan safer routes.</p>
                   </div>
                 </div>
                 
                 <div className="explanation-item">
                   <span className="explanation-icon">🌍</span>
                   <div>
                     <h4>Coverage</h4>
                     <p>G-AIRMETs cover the entire United States and surrounding areas, providing comprehensive weather information for all flight levels.</p>
                   </div>
                 </div>
                 
                 <div className="explanation-item">
                   <span className="explanation-icon">⚠️</span>
                   <div>
                     <h4>Severity Levels</h4>
                     <p>Advisories are categorized by severity: <strong>Light</strong> (minor discomfort), <strong>Moderate</strong> (significant turbulence), and <strong>Severe</strong> (dangerous conditions).</p>
                   </div>
                 </div>
               </div>
               
               <div className="explanation-note">
                 <p>
                   <strong>Why This Matters:</strong> Even if your flight route doesn't currently intersect with G-AIRMET advisories, 
                   these forecasts help our system provide more accurate turbulence predictions by incorporating official aviation weather data 
                   alongside real-time weather conditions.
                 </p>
                 
                 <div className="official-link">
                   <p>
                     <strong>Official G-AIRMET Map:</strong> View the current G-AIRMET advisories on the official 
                     <a href="https://aviationweather.gov/gfa/#gairmet" target="_blank" rel="noopener noreferrer">
                        NWS Aviation Weather Center map
                     </a>
                     .
                   </p>
                 </div>
               </div>
             </div>
           </details>
         </div>





        <div className="recommendations">
          <h3>Recommendations</h3>
          <div className="recommendation-cards">
            {data.recommendations && data.recommendations.length > 0 ? (
              data.recommendations.map((rec, index) => (
                <div key={index} className="rec-card">
                  <h4>{rec.icon} {rec.type}</h4>
                  <p>{rec.text}</p>
                </div>
              ))
            ) : (
              // Fallback recommendations if none provided
              <>
                <div className="rec-card">
                  <h4>🛡️ Safety</h4>
                  <p>Keep seatbelt fastened throughout the flight</p>
                </div>
                <div className="rec-card">
                  <h4>📅 Updates</h4>
                  <p>Check for real-time weather updates</p>
                </div>
                <div className="rec-card">
                  <h4>⏰ Timing</h4>
                  <p>Consider alternative departure times if possible</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TurbulencePrediction; 
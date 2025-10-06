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
          <span className="route">
            {data.route.departure} → {data.route.arrival} 
          </span>
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
                    data.turbulenceLevel.toLowerCase().includes(turbulenceType.level.toLowerCase()) 
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
                  {data.turbulenceLevel.toLowerCase().includes(turbulenceType.level.toLowerCase()) && (
                    <div className="predicted-indicator">
                      <span className="predicted-badge">PREDICTED</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                    <span className="breakdown-label">G-AIRMET Advisories:</span>
                    <span className="breakdown-value">
                      {data.gairmetAdvisories?.hasAdvisories ? `${data.gairmetAdvisories.advisories.length} active` : 'None detected'}
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
            
            <div className="current-prediction">
              <div className="prediction-icon">
                {getTurbulenceIcon(data.turbulenceLevel)}
              </div>
              <div className="prediction-details">
                <div className="prediction-level">{data.turbulenceLevel.charAt(0).toUpperCase() + data.turbulenceLevel.slice(1)}</div>
                <div className="prediction-subtitle">
                  Based on current weather patterns and G-AIRMET data
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="disclaimer" className="high-altitude-disclaimer">
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

         {/* G-AIRMET Information Section - Consolidated and Organized */}
         <div id="gairmet" className="gairmet-section">
           <div className="section-header">
             <img 
               src="/images/NWS-Logo.svg" 
               alt="NWS Logo" 
               className="nws-logo-small"
             />
             <h3>G-AIRMET Weather Information</h3>
           </div>
           
           {/* G-AIRMET Advisories - Compact Cards */}
           {data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories && (
             <div className="advisories-section">
               <h4>Active Advisories on Your Route</h4>
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
                         <span className="detail-value">{advisory.altitude.min*100}-{advisory.altitude.max*100} feet</span>
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
                 ))}
               </div>
             </div>
           )}

           {/* Flight Planning Impact - Organized Cards */}
           {data.gairmetAdvisories && data.gairmetAdvisories.hasAdvisories && (
             <div className="impact-section">
               <h4>How This Affects Your Flight</h4>
               <div className="impact-cards">
                 <div className="impact-card">
                   <div className="card-icon">✈️</div>
                   <h5>Pilot Planning</h5>
                   <p>Your pilots will actively avoid these areas by:</p>
                   <ul>
                     <li>Rerouting around turbulence zones</li>
                     <li>Adjusting altitude for smoother air</li>
                     <li>Modifying timing to avoid weather systems</li>
                   </ul>
                 </div>
                 
                 <div className="impact-card">
                   <div className="card-icon">🌤️</div>
                   <h5>Your Experience</h5>
                   <p>Your flight may be smoother than predicted because:</p>
                   <ul>
                     <li>Pilots steer clear of known rough areas</li>
                     <li>Real-time route optimization occurs</li>
                     <li>Professional crews minimize discomfort</li>
                   </ul>
                 </div>
                 
                 <div className="impact-card">
                   <div className="card-icon">🎯</div>
                   <h5>Bottom Line</h5>
                   <p>The prediction shows potential conditions if flying directly through weather systems. Your pilots will likely navigate around these areas for a smoother experience.</p>
                 </div>
               </div>
             </div>
           )}
           
           {/* G-AIRMET Explanation - Collapsible */}
           <div className="explanation-section">
             <details className="explanation-dropdown">
               <summary className="explanation-summary">
                 <span>What Are G-AIRMETs?</span>
                 <span className="summary-icon">▼</span>
               </summary>
               <div className="explanation-content">
                 <p>
                   <strong>G-AIRMETs (Graphical AIRMETs)</strong> are official aviation weather advisories that identify potentially hazardous weather conditions for aircraft. These advisories are updated every 6 hours and give pilots advanced warning to plan safe, comfortable routes. They are only available in the United States. 
                 </p>
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
                 </div>
                 <p>
                   These advisories are updated every 6 hours and give pilots advanced warning to plan safe, comfortable routes.
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
             </details>
           </div>
        </div>

        <div id="recommendations" className="recommendations">
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
import React from 'react';
import './About.css';

function About({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <div className="about-logo">
            <img 
              src="/images/turbulens-noplane.png" 
              alt="TurbuLens Logo" 
              className="about-logo-img"
            />
          </div>
          <h2>About TurbuLens</h2>
          <button className="about-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="about-content">
          <div className="about-section">
            <h3>Free Service</h3>
            <p>
              TurbuLens is a <strong>100% free service</strong> designed specifically 
              for nervous flyers. We believe that everyone deserves access to reliable flight information 
              without any cost barriers.
            </p>
          </div>
          
          <div className="about-section">
            <div className="section-content">
              <div className="section-text">
                <h3>For Nervous Flyers</h3>
                <p>
                  We understand that flying can be anxiety-inducing, especially when it comes to turbulence. 
                  Our AI-powered system is designed to help reduce your flying anxiety by providing:
                </p>
                <ul>
                  <li>Accurate turbulence predictions</li>
                  <li>Real-time weather analysis</li>
                  <li>Detailed flight path visualization</li>
                  <li>Safety recommendations</li>
                  <li>Confidence scores for predictions</li>
                </ul>
              </div>
              <div className="section-image">
                <img 
                  src="/images/seat.png" 
                  alt="Airplane Seat" 
                  className="content-image"
                />
              </div>
            </div>
          </div>
          
          <div className="about-section">
            <div className="section-content">
              <div className="section-text">
                <h3>AI-Powered Technology</h3>
                <p>
                  Our system uses advanced artificial intelligence powered by OpenAI to analyze multiple data sources:
                </p>
                <ul>
                  <li>Real-time weather data from global weather stations</li>
                  <li>Wind patterns and jet stream information</li>
                  <li>Atmospheric pressure and temperature gradients</li>
                  <li>Convective activity and storm patterns</li>
                  <li>Historical flight data and patterns</li>
                </ul>
              </div>
              <div className="section-image">
                <img 
                  src="/images/chatgpt.png" 
                  alt="OpenAI ChatGPT" 
                  className="content-image"
                />
              </div>
            </div>
          </div>
          
          <div className="about-section">
            <div className="section-content">
              <div className="section-text">
                <h3>Global Coverage</h3>
                <p>
                  We provide predictions for over <strong>7,000 airports worldwide</strong>, covering:
                </p>
                <ul>
                  <li>Major international airports</li>
                  <li>Regional and domestic airports</li>
                  <li>Both short-haul and long-haul flights</li>
                  <li>All weather conditions and seasons</li>
                </ul>
              </div>
              <div className="section-image">
                <img 
                  src="/images/globe-icon.jpg" 
                  alt="Global Coverage" 
                  className="content-image"
                />
              </div>
            </div>
          </div>
          
          <div className="about-section">
            <h3>Our Mission</h3>
            <p>
              We're committed to making air travel less stressful for everyone. By providing 
              free, accurate turbulence predictions, we hope to help nervous flyers feel more 
              confident and prepared for their journeys.
            </p>
            <p className="mission-statement">
              <em>"Empowering nervous flyers with free, reliable information to make every flight a smoother experience."</em>
            </p>
          </div>
          
          <div className="about-footer">
            <p>
              <strong>No registration required • No personal data collected • No hidden fees</strong>
            </p>
            <p className="disclaimer">
              This service is for informational purposes only. Always follow airline safety instructions and consult with your airline for official flight information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About; 
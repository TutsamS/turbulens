# TurbuLens - Flight Turbulence Predictor

**Predict. Plan. Fly.**

TurbuLens is an AI-powered flight turbulence prediction system that analyzes real-time weather data and official aviation advisories to provide accurate, personalized turbulence forecasts for nervous flyers.

## Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=KGikvv2WLRI">
    <img src="https://img.youtube.com/vi/KGikvv2WLRI/maxresdefault.jpg" width="1000" alt="TurbuLens Demo">
  </a>
  <br>
  <em>Click to watch demo video</em>
</p>

## Features

- **AI-Powered Turbulence Predictions**: GPT-4o-mini analyzes weather data and aviation advisories
- **Phase-Specific Forecasts**: Separate predictions for Climb, Cruise, and Descent
- **Official Aviation Advisories**: Real-time G-AIRMET and SIGMET integration
- **Personalized Explanations**: Route-specific weather analysis for your flight
- **Interactive Route Maps**: Visual flight paths with weather data
- **7,000+ Airports**: Global coverage with free access (no registration)

## How It Works

1. **Enter your flight route** (departure and arrival airports)
2. **AI analyzes** real-time weather data and official aviation advisories (G-AIRMETs and SIGMETs)
3. **Get predictions** for Climb, Cruise, Descent, and Overall turbulence
4. **Read personalized explanation** of weather conditions affecting your specific route

### Turbulence Levels

- **Light**: Minor bumps, easy to walk around, drinks safe
- **Light to Moderate**: Noticeable bumps, walking difficult, secure loose items
- **Moderate**: Strong bumps, walking very difficult, seatbelt sign on
- **Moderate to Severe**: Very rough, impossible to walk, items may fall
- **Severe**: Violent turbulence, aircraft out of control momentarily (extremely rare)

## Quick Start

### Prerequisites
- Docker Desktop (recommended) or Node.js v16+
- OpenWeatherMap API key (free tier available)
- OpenAI API key

### Installation

1. **Clone and configure**
   ```bash
   git clone https://github.com/TutsamS/turbulens
   cd turbulens
   cp .env.example .env
   ```

2. **Add your API keys to `.env` file**
   ```
   OPENWEATHER_API_KEY=your_key_here
   AI_API_KEY=your_openai_key_here
   ```

3. **Start with Docker (recommended)**
   ```bash
   docker-compose up --build
   ```
   
   **Or run locally**
   ```bash
   cd backend && npm install && npm start &
   cd frontend && npm install && npm start
   ```

4. **Open http://localhost:3000**

## API Keys

Get your free API keys:
- **OpenWeatherMap**: [openweathermap.org/api](https://openweathermap.org/api) (1000 calls/day free)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (~$0.0001 per prediction)

Add them to `.env`:
```bash
OPENWEATHER_API_KEY=your_key_here
AI_API_KEY=your_openai_key_here
```

**Note**: Also add your OpenWeatherMap key to `FlightMap.js` (lines 32 and 283) for weather map layers.

## Troubleshooting

**Docker issues:**
```bash
docker-compose down && docker-compose up --build
docker-compose logs backend
```

**Port conflicts:** Stop services on ports 3000 and 5001

**API errors:** Check that `.env` has valid API keys (use `AI_API_KEY`, not `OPENAI_API_KEY`)

**Predictions:** G-AIRMETs are forecasts (~65% accuracy), not certainties. System errs on the side of caution.

## Technical Stack

**Backend:** Node.js + Express  
**Frontend:** React + Leaflet maps  
**AI:** OpenAI GPT-4o-mini  
**Data:** OpenWeatherMap + AviationWeather.gov (G-AIRMETs/SIGMETs)

## Mission

We're committed to making air travel less stressful for everyone. By providing free, accurate turbulence predictions with transparent methodology, we hope to help nervous flyers feel more confident and prepared for their journeys.

**"Empowering nervous flyers with free, reliable information to make every flight a smoother experience."**

---

**TurbuLens** - Predict. Plan. Fly.

![TurbuLens Logo](frontend/public/images/turbulensappstore.png)

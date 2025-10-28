# TurbuLens - Flight Turbulence Predictor

**Predict. Plan. Fly.**

TurbuLens is an AI-powered flight turbulence prediction system that provides real-time weather analysis and turbulence forecasts for nervous flyers.

## Features

- **AI-Powered Predictions**: Advanced machine learning algorithms for accurate turbulence forecasting
- **Real-Time Weather Data**: Live weather information from global weather stations
- **G-AIRMET Integration**: Official aviation weather advisories from AviationWeather.gov
- **Global Coverage**: 7,000+ airports worldwide
- **Interactive Maps**: Visual flight route mapping with weather waypoints
- **Professional UI**: Modern glass-morphism design with responsive layout
- **Free Service**: 100% free with no registration required

## Quick Start

### Prerequisites

**Option 1: Local Development**
- Node.js (v16 or higher)
- npm package manager
- OpenWeatherMap API key
- OpenAI API key
- Git

**Option 2: Docker (Recommended)**
- Docker Desktop (or Docker Engine + Docker Compose)
- OpenWeatherMap API key
- OpenAI API key
- Git

**Note**: This project uses npm exclusively. Please use `npm install` and `npm start` commands.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TutsamS/turbulens
   cd turbulens
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../backend
   cp env.example .env
   ```

5. **Configure API keys** (see API Keys section below)

6. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

7. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```

8. **Open your browser and paste this link**
   - http://localhost:3000

### Docker Installation (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/TutsamS/turbulens
   cd turbulens
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Configure API keys in `.env` file** (see API Keys section below)
   - Edit the `.env` file in the `turbulens` directory
   - Add your `OPENWEATHER_API_KEY` and `AI_API_KEY`

4. **Start all services with Docker Compose**
   ```bash
   docker-compose up --build
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Health check: http://localhost:5001/api/health

**Note**: The Docker setup automatically handles:
- Networking between frontend and backend containers
- Environment variable injection
- CORS configuration
- Hot-reload for development

**To stop the containers:**
```bash
docker-compose down
```

**To view logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Important**: When using Docker, you don't need to run the backend/frontend locally. Running both Docker and local services simultaneously will cause port conflicts.

## Required API Keys

### OpenWeatherMap API
- **Purpose**: Real-time weather data for flight routes
- **Get Key**: [OpenWeatherMap API](https://openweathermap.org/api)
- **Cost**: Free tier available (1000 calls/day)
- **Setup**: 
  1. Sign up at OpenWeatherMap
  2. Get your API key
  3. Add to `.env` file: `OPENWEATHER_API_KEY=your_key_here`
  4. Also add your key to line 32 and line 283 in FlightMap.js for frontend weather map capabilities.

### OpenAI API
- **Purpose**: AI-powered turbulence analysis and predictions
- **Get Key**: [OpenAI API](https://platform.openai.com/api-keys)
- **Cost**: Pay-per-use
- **Setup**: 
  1. Sign up at OpenAI
  2. Get your API key
  3. Add to `.env` file: `AI_API_KEY=your_key_here`

### Environment Variables (.env)

**For Local Development:**
```bash
# backend/.env file
PORT=5000
OPENWEATHER_API_KEY=your_openweather_api_key_here
AI_API_KEY=your_openai_api_key_here
```

**For Docker:**
```bash
# turbulens/.env file (used by docker-compose.yml)
OPENWEATHER_API_KEY=your_openweather_api_key_here
AI_API_KEY=your_openai_api_key_here
```

**Note**: The backend uses `AI_API_KEY` (not `OPENAI_API_KEY`). This must be set in your `.env` file.

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 5000 (local) or 5001 (Docker) is available
- Verify `.env` file exists and has correct API keys
- Ensure all dependencies are installed
- For Docker: Check `docker-compose logs backend` for errors

**Frontend won't start:**
- Check if port 3000 is available
- Verify all dependencies are installed
- For Docker: Check `docker-compose logs frontend` for errors

**API calls failing:**
- Verify API keys are correct (use `AI_API_KEY`, not `OPENAI_API_KEY`)
- Check API rate limits
- Ensure backend server is running
- For Docker: Verify containers are running with `docker-compose ps`

**Docker-specific issues:**
- **Port already in use**: Stop any local services running on ports 3000 or 5001
- **Environment variables not loading**: Ensure `.env` file is in the `turbulens` directory (where `docker-compose.yml` is located)
- **405 Method Not Allowed errors**: Rebuild containers with `docker-compose up --build`
- **CORS errors**: Backend is configured to allow requests from the frontend container automatically

## Mission

We're committed to making air travel less stressful for everyone. By providing free, accurate turbulence predictions, we hope to help nervous flyers feel more confident and prepared for their journeys.

**"Empowering nervous flyers with free, reliable information to make every flight a smoother experience."**

---

**TurbuLens** - Predict. Plan. Fly.

![TurbuLens Logo](frontend/public/images/turbulensappstore.png)

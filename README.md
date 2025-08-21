# TurbuLens - Flight Turbulence Predictor

**Predict. Plan. Fly.**

TurbuLens is an AI-powered flight turbulence prediction system that provides real-time weather analysis and turbulence forecasts for nervous flyers.

## 🌟 Features

- **AI-Powered Predictions**: Advanced machine learning algorithms for accurate turbulence forecasting
- **Real-Time Weather Data**: Live weather information from global weather stations
- **G-AIRMET Integration**: Official aviation weather advisories from AviationWeather.gov
- **Global Coverage**: 7,000+ airports worldwide
- **Interactive Maps**: Visual flight route mapping with weather waypoints
- **Professional UI**: Modern glass-morphism design with responsive layout
- **Free Service**: 100% free with no registration required

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm package manager
- OpenWeatherMap API key
- OpenAI API key
- Git

**Note**: This project uses npm exclusively. Please use `npm install` and `npm start` commands.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TutsamS/turbulens
   cd flight-turbulence-predictor
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

8. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔑 Required API Keys

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
- **Cost**: Pay-per-use (very affordable for small projects)
- **Setup**: 
  1. Sign up at OpenAI
  2. Get your API key
  3. Add to `.env` file: `OPENAI_API_KEY=your_key_here`

### Environment Variables (.env)
```bash
# Backend .env file
PORT=5000
OPENWEATHER_API_KEY=your_openweather_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize server settings
NODE_ENV=development
```

## 📁 Project Structure

```
flight-turbulence-predictor/
├── backend/                 # Node.js/Express server
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # React application
│   ├── public/             # Static assets
│   │   └── images/         # Logo and icons
│   ├── src/                # React source code
│   │   ├── components/     # React components
│   │   ├── App.js          # Main application
│   │   └── index.js        # Entry point
│   └── package.json        # Frontend dependencies
└── README.md               # This file
```

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

**Frontend:**
```bash
npm start          # Start development server
npm run build      # Build for production
```

## 🌐 Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in your environment
2. Ensure all API keys are configured
3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "turbulens-backend"
   ```

### Frontend Deployment
1. Build the production version:
   ```bash
   npm run build
   ```
2. Deploy the `build/` folder to your hosting service

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 5000 is available
- Verify `.env` file exists and has correct API keys
- Ensure all dependencies are installed

**Frontend won't start:**
- Check if port 3000 is available
- Verify all dependencies are installed

**API calls failing:**
- Verify API keys are correct
- Check API rate limits
- Ensure backend server is running

## 🎯 Mission

We're committed to making air travel less stressful for everyone. By providing free, accurate turbulence predictions, we hope to help nervous flyers feel more confident and prepared for their journeys.

**"Empowering nervous flyers with free, reliable information to make every flight a smoother experience."**

---

**TurbuLens** - Predict. Plan. Fly.

![TurbuLens Logo](frontend/public/images/turbulensappstore.png)

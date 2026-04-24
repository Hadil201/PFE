# Soccer Analytics Platform

A comprehensive soccer video analysis platform that leverages AI to automatically detect and analyze soccer events from video footage. The platform supports multiple video sources including YouTube, direct uploads, and live streams, providing real-time analysis with action detection and timeline visualization.

## 🏗️ Architecture Overview

This is a **full-stack TypeScript application** with a clear separation between client and server:

```
soccer_analytics/
├── client/          # React frontend application
├── server/          # Express.js backend API
├── package.json     # Root package for development scripts
└── README.md        # This file
```

## 🚀 Technology Stack

### Frontend (Client)
- **Framework**: React 19.2.4 with TypeScript
- **Build Tool**: Vite 8.0.4
- **UI Library**: Material-UI (MUI) 9.0.0 with Emotion styling
- **Routing**: React Router DOM 7.14.2
- **HTTP Client**: Axios 1.15.2
- **Real-time**: Socket.IO Client 4.8.3
- **Authentication**: Google OAuth with @react-oauth/google
- **Icons**: Lucide React & MUI Icons
- **Development**: ESLint, TypeScript

### Backend (Server)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.2.1
- **Real-time**: Socket.IO 4.8.3
- **Authentication**: JWT with Passport.js & Google OAuth 2.0
- **CORS**: Enabled for cross-origin requests
- **File Upload**: Multer 2.1.1
- **Environment**: dotenv for configuration
- **Development**: ts-node-dev for hot reloading

## 📁 Project Structure

### Client Architecture
```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── layout/         # Layout components (header, sidebar, etc.)
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Main dashboard with statistics
│   │   ├── Library.tsx     # Video library management
│   │   ├── VideoAnalysis.tsx # Video analysis interface
│   │   ├── Login.tsx       # Authentication page
│   │   └── Admin.tsx       # Admin panel
│   ├── services/           # API service layer
│   │   ├── api.ts          # HTTP client configuration
│   │   └── authStorage.ts  # Authentication token management
│   ├── types/              # TypeScript type definitions
│   │   ├── auth.ts         # Authentication types
│   │   └── video.ts        # Video entity types
│   ├── hooks/              # Custom React hooks
│   ├── assets/             # Static assets
│   ├── App.tsx             # Main application component with routing
│   └── main.tsx            # Application entry point
├── public/                 # Public static files
├── package.json            # Client dependencies
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

### Server Architecture
```
server/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── video.controller.ts  # Video management & analysis
│   │   ├── auth.controller.ts   # Authentication endpoints
│   │   └── inference.controller.ts # AI inference logic
│   ├── models/             # Data models (currently empty, using in-memory storage)
│   ├── routes/             # API route definitions
│   │   ├── video.routes.ts # Video-related endpoints
│   │   └── auth.routes.ts  # Authentication endpoints
│   ├── middlewares/        # Express middleware
│   │   └── auth.ts         # Authentication & authorization
│   ├── auth/               # Authentication system
│   │   ├── auth.controller.ts  # Auth endpoint handlers
│   │   ├── auth.store.ts       # User data storage
│   │   └── google.strategy.ts  # Google OAuth strategy
│   ├── ai/                 # AI/ML components
│   │   ├── inference.ts    # AI inference engine
│   │   └── parser.ts       # Video parsing utilities
│   ├── sockets/            # Socket.IO handlers
│   ├── analysis/           # Video analysis algorithms
│   ├── video/              # Video processing utilities
│   ├── config/             # Configuration files
│   ├── database/           # Database connections (MongoDB setup)
│   ├── errors/             # Error handling
│   ├── jobs/               # Background job processing
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── app.ts              # Express application setup
│   └── server.ts           # Server startup & Socket.IO configuration
├── models/                 # Mongoose models (alternative location)
├── package.json            # Server dependencies
└── tsconfig.json           # TypeScript configuration
```

## 🔧 Core Features

### Video Management
- **Multiple Sources**: Support for YouTube URLs, direct uploads, and live streams
- **Status Tracking**: Video processing status (ready → processing → done)
- **Library Management**: Organize and manage video collections

### AI-Powered Analysis
- **Action Detection**: Automatically detects 18+ soccer actions including:
  - Goals, penalties, corners, offsides
  - Cards (yellow/red), fouls, free kicks
  - Shots, saves, substitutions
  - Kick-off, half-time, full-time events
- **Real-time Processing**: Live analysis during streaming
- **Timeline Visualization**: Interactive timeline with detected events
- **Confidence Scoring**: AI confidence levels for each detection

### User Management
- **Google OAuth**: Secure authentication via Google accounts
- **Role-based Access**: User and admin roles
- **Quota System**: Usage limits (daily/weekly/monthly)
- **User Blocking**: Admin can block/unblock users

### Real-time Features
- **WebSocket Communication**: Live updates via Socket.IO
- **Processing Status**: Real-time video analysis progress
- **Live Streaming**: Support for real-time stream analysis

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google OAuth credentials (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd soccer_analytics
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Environment Configuration**
   
   Create environment files:
   
   **Root `.env`:**
   ```env
   CLIENT_ORIGIN=http://localhost:5173
   DAILY_QUOTA=10
   WEEKLY_QUOTA=40
   MONTHLY_QUOTA=120
   ```
   
   **Server `.env`:**
   ```env
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   JWT_SECRET=your-jwt-secret
   ```

4. **Start Development Servers**
   
   **Option 1: Using root script (recommended)**
   ```bash
   npm run dev
   ```
   This starts both client and server concurrently.
   
   **Option 2: Manual startup**
   ```bash
   # Terminal 1 - Start server
   cd server
   npm run dev
   
   # Terminal 2 - Start client
   cd client
   npm run dev
   ```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📡 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/users` - List all users (admin only)

### Video Management
- `GET /api/videos` - List user videos
- `POST /api/videos/upload` - Upload video
- `POST /api/videos/youtube` - Add YouTube video
- `POST /api/videos/stream` - Add live stream
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/actions/classes` - Get available action classes
- `POST /api/videos/inference/start` - Start AI analysis
- `GET /api/videos/quota` - Get usage quota
- `GET /api/videos/admin/overview` - Admin overview

## 🔐 Authentication & Authorization

### Google OAuth Flow
1. User authenticates via Google OAuth
2. Server validates email against approved list
3. JWT token issued for authenticated sessions
4. Token stored in client for API requests

### Role-based Access Control
- **Users**: Can upload/analyze videos within quota limits
- **Admins**: Full access to user management and system overview

### Quota System
- **Daily Limit**: Configurable daily inference requests
- **Weekly Limit**: Configurable weekly inference requests  
- **Monthly Limit**: Configurable monthly inference requests
- **Usage Tracking**: Real-time quota monitoring

## 🎯 Video Analysis Pipeline

### Processing Flow
1. **Input**: Video from YouTube, upload, or live stream
2. **Queue**: Video added to processing queue
3. **Analysis**: AI model processes video chunks
4. **Detection**: Soccer actions identified with timestamps
5. **Timeline**: Interactive timeline generated with events
6. **Results**: Analysis results delivered via WebSocket

### Supported Actions
The AI model detects 18+ soccer actions including goals, penalties, cards, fouls, and game events with confidence scoring.

## 🔄 Real-time Communication

### Socket.IO Events
- **Connection**: Client connects to analysis session
- **Progress**: Real-time processing updates
- **Results**: Live analysis results
- **Status**: Video processing status changes

## 🚀 Deployment

### Production Build
```bash
# Build client
cd client
npm run build

# Start server in production mode
cd ../server
npm start
```

### Environment Variables
Ensure all required environment variables are set in production:
- `PORT`: Server port
- `CLIENT_ORIGIN`: Frontend URL
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `JWT_SECRET`: JWT signing secret
- `DAILY_QUOTA`, `WEEKLY_QUOTA`, `MONTHLY_QUOTA`: Usage limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔍 Future Enhancements

- **Database Integration**: MongoDB for persistent storage
- **Advanced AI Models**: Enhanced action detection accuracy
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Deeper statistical analysis
- **Team Management**: Collaborative features
- **Export Features**: Analysis result exports
- **Mobile App**: React Native mobile application


# KaraokePal

A full-stack karaoke application built with React, NestJS, and real-time WebSocket communication.

## 🎤 Features

- **Frontend**: React + Vite + TypeScript + Material-UI
- **State Management**: MobX with persistence
- **Routing**: React Router with protected routes
- **Backend**: NestJS with WebSocket support
- **Authentication**: JWT + OAuth (Google, GitHub)
- **Real-time**: Socket.IO for live karaoke sessions
- **Deployment**: Docker + Google Cloud Run with CI/CD

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker (for development database)

### Setup

#### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd KaraokePal

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

#### 2. Database Setup (Choose one option)

**Option A - Windows:**

```bash
./setup-db.bat
```

**Option B - Linux/macOS:**

```bash
chmod +x setup-db.sh
./setup-db.sh
```

**Option C - Manual Docker:**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (Database settings are pre-configured for local development)
```

#### 4. Start Development

```bash
# Start both frontend and backend
npm run dev
```

### 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **WebSocket**: ws://localhost:8000
- **phpMyAdmin**: http://localhost:8080 (admin/password)
- **MySQL**: localhost:3306 (admin/password)

### 🏗️ Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Google Cloud Run
npm run deploy
```

## 🏗️ Project Structure

```
KaraokePal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── stores/        # MobX stores
│   │   ├── theme/         # MUI theme configuration
│   │   └── utils/         # Utilities
│   └── package.json
├── src/                   # NestJS backend
│   ├── auth/             # Authentication module
│   ├── websocket/        # WebSocket gateway
│   └── main.ts           # Application entry point
├── Dockerfile            # Multi-stage Docker build
└── package.json
```

## 🎨 Frontend Features

- **Dark Theme**: Custom Material-UI dark theme with colorful highlights
- **Component Library**: Reusable components (Header, Cards, Buttons)
- **State Management**: MobX with automatic persistence
- **Responsive Design**: Mobile-first responsive layout
- **Protected Routes**: Authentication-based routing

### Key Components

- `HeaderComponent`: Navigation with user menu
- `CustomCard`: Enhanced Material-UI card with hover effects
- `LoadingButton`: Button with loading states

## 🔧 Backend Features

- **RESTful API**: Standard HTTP endpoints
- **WebSocket Gateway**: Real-time communication
- **JWT Authentication**: Secure token-based auth
- **OAuth Integration**: Google and GitHub login
- **Rate Limiting**: API protection
- **Security Headers**: Helmet.js integration

### API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth
- `GET /api/auth/profile` - Get user profile

### WebSocket Events

- `join-room` - Join karaoke room
- `start-song` - Start singing a song
- `chat-message` - Send chat message
- `get-rooms` - List available rooms

## 🚀 Deployment

### Docker Build

```bash
docker build -t karaokepal .
docker run -p 3001:3001 karaokepal
```

### Google Cloud Run

The application is configured for automatic deployment to Google Cloud Run via GitHub Actions.

#### Required Secrets

Set these in your GitHub repository secrets:

- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_SERVICE_ACCOUNT_KEY` - Service account JSON key
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret

#### Deployment Process

1. Push to `main` branch
2. GitHub Actions runs tests
3. Builds Docker image
4. Deploys to Cloud Run
5. Updates service with zero downtime

## 🔧 Configuration

### Environment Variables

| Variable               | Description         | Default                 |
| ---------------------- | ------------------- | ----------------------- |
| `NODE_ENV`             | Environment         | `development`           |
| `PORT`                 | Server port         | `3001`                  |
| `JWT_SECRET`           | JWT signing key     | Required                |
| `JWT_EXPIRES_IN`       | Token expiry        | `7d`                    |
| `GOOGLE_CLIENT_ID`     | Google OAuth ID     | Optional                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Optional                |
| `GITHUB_CLIENT_ID`     | GitHub OAuth ID     | Optional                |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | Optional                |
| `ALLOWED_ORIGINS`      | CORS origins        | `http://localhost:3000` |

### OAuth Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

#### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set callback URL: `http://localhost:3001/api/auth/github/callback`

## 🛠️ Development

### Code Style

- **ESLint**: Configured for TypeScript
- **Prettier**: Code formatting
- **Husky**: Git hooks (optional)

### Testing

```bash
# Backend tests
npm test

# Frontend tests
cd client && npm test

# E2E tests
npm run test:e2e
```

### Building

```bash
# Build frontend
cd client && npm run build

# Build backend
npm run build

# Build everything
npm run build:all
```

## 📚 Tech Stack

### Frontend

- React 18
- Vite
- TypeScript
- Material-UI (MUI)
- MobX + MobX-persist
- React Router
- Socket.IO Client

### Backend

- NestJS
- Socket.IO
- JWT + Passport
- bcrypt
- Helmet.js
- class-validator

### DevOps

- Docker (multi-stage builds)
- GitHub Actions
- Google Cloud Run
- Container Registry

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎯 Roadmap

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Song library management
- [ ] Voice recording and playback
- [ ] Room creation and management UI
- [ ] User profiles and avatars
- [ ] Scoring system
- [ ] Mobile app (React Native)
- [ ] Real-time voice effects

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 3001 are available
2. **OAuth errors**: Check redirect URIs match exactly
3. **WebSocket issues**: Verify CORS settings
4. **Build failures**: Clear node_modules and reinstall

### Support

Create an issue on GitHub for bug reports and feature requests.

# KaraokeHub

A full-stack karaoke application built with React, NestJS, and real-time WebSocket communication.

## 🎤 Features

- **Frontend**: React + Vite + TypeScript + Material-UI
- **State Management**: MobX with persistence
- **Routing**: React Router with protected routes
- **Backend**: NestJS with WebSocket support
- **Authentication**: JWT + OAuth (Google, GitHub)
- **Real-time**: Socket.IO for live karaoke sessions
- **AI Parsing**: Gemini AI for website & image content extraction
- **Image Recognition**: Parse event details from social media images
- **Admin Dashboard**: Complete CRUD operations with feedback system
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
cd KaraokeHub

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
KaraokeHub/
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

### 🖼️ Image Parsing & AI Features

KaraokeHub includes advanced AI-powered parsing capabilities for extracting karaoke event details from images, social media posts, and Facebook events with intelligent DJ name recognition.

#### **Capabilities**

- **Image OCR**: Extract text from event flyers and promotional images
- **Social Media Parsing**: Parse Facebook/Instagram posts with event images
- **Facebook Event Parsing**: Extract details from Facebook event pages with cover image analysis
- **DJ Nickname Intelligence**: Smart matching of DJ names, aliases, and social media handles
- **AI Analysis**: Gemini AI extracts structured venue, DJ, and event data
- **Admin Review**: All parsed content requires admin approval before going live

#### **Parser Endpoints**

```http
# Image parsing
POST /api/parser/parse-image
POST /api/parser/parse-and-save-image
Body: { "imageUrl": "https://example.com/event-flyer.jpg" }

# Social media posts
POST /api/parser/parse-social-media-post
POST /api/parser/parse-and-save-social-media-post
Body: { "url": "https://facebook.com/post/123" }

# Facebook events (NEW!)
POST /api/parser/parse-facebook-event
POST /api/parser/parse-and-save-facebook-event
Body: { "eventUrl": "https://facebook.com/events/123456789" }

# Smart parsing (auto-detects event vs post)
POST /api/parser/parse-smart-social-media
Body: { "url": "https://facebook.com/events/or/posts/123" }
```

#### **DJ Nickname Intelligence (NEW!)**

The AI now understands that these all refer to the same DJ:

- `Max` = `Max Denney` = `@djmax614` = `DJ Max` = `KJ Max`
- Automatically learns and stores new DJ aliases
- Matches across social media handles and stage names
- Provides confidence scoring for matches

#### **Example Usage**

```bash
# Test Facebook event parsing
node test-facebook-events.js

# Test image parsing with DJ nickname matching
node test-image-parsing.js

# Expected from Crescent Lounge example:
# - Venue: "The Crescent Lounge"
# - DJ: "DJ Max" (matched from @djmax614)
# - Time: "8PM-12AM" -> 20:00-00:00
# - Day: "thursday" (recurring pattern)
```

#### **Configuration**

```bash
# Required environment variable
GEMINI_API_KEY=your-gemini-api-key

# Optional Puppeteer config for production
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

See [docs/IMAGE-PARSING-SETUP.md](docs/IMAGE-PARSING-SETUP.md) and [docs/FACEBOOK-EVENT-PARSING.md](docs/FACEBOOK-EVENT-PARSING.md) for detailed documentation.

### WebSocket Events

- `join-room` - Join karaoke room
- `start-song` - Start singing a song
- `chat-message` - Send chat message
- `get-rooms` - List available rooms

## 🚀 Deployment

### Docker Build

```bash
docker build -t karaokehub .
docker run -p 3001:3001 karaokehub
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

### Music API Configuration

The application uses iTunes API for music search across all environments:

- **All environments**: iTunes API provides excellent music search and preview capabilities
- **No credentials required**: iTunes API is free and doesn't require authentication
- **High preview availability**: iTunes offers ~90% preview availability for songs

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

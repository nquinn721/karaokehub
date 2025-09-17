# 🎤 KaraokeHub - Complete Setup Guide

Welcome to KaraokeHub! This guide will walk you through setting up your full-stack karaoke application from scratch.

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)

### Verify Prerequisites

```bash
node --version    # Should be v18+
npm --version     # Should be 9+
docker --version  # Should be 20+
git --version     # Any recent version
```

## 🚀 Quick Setup (Recommended)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd KaraokeHub

# Install all dependencies (frontend + backend)
npm run setup
```

### Step 2: Database Setup

**Windows Users:**

```bash
./setup-db.bat
```

**Linux/macOS Users:**

```bash
chmod +x setup-db.sh
./setup-db.sh
```

**Manual Docker (Alternative):**

```bash
npm run setup:db
```

### Step 3: Start Development

```bash
# This starts both backend and frontend
npm run dev
```

## 🌐 Application Access

After setup, you can access:

| Service         | URL                   | Credentials      |
| --------------- | --------------------- | ---------------- |
| **Frontend**    | http://localhost:5173 | -                |
| **Backend API** | http://localhost:8000 | -                |
| **WebSocket**   | ws://localhost:8000   | -                |
| **phpMyAdmin**  | http://localhost:8080 | admin / password |
| **MySQL**       | localhost:3306        | admin / password |

## 🔧 Manual Setup (Alternative)

If you prefer to set up each component manually:

### 1. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional for local dev)
```

### 3. Database Setup

```bash
# Start MySQL and phpMyAdmin containers
docker-compose -f docker-compose.dev.yml up -d

# Wait for MySQL to be ready (about 15-30 seconds)
# Check logs if needed
npm run db:logs
```

### 4. Start Services

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd client && npm run dev
```

## 🗄️ Database Information

### Connection Details

- **Host**: localhost
- **Port**: 3306
- **Database**: karaoke-pal
- **Username**: admin
- **Password**: password

### Database Schema

The application includes these tables:

- **users** - User accounts and authentication
- **vendors** - Karaoke companies/businesses
- **kjs** - Karaoke jockeys
- **shows** - Karaoke events/shows
- **favorites** - User's favorite shows

### Sample Data

The database initializes with:

- Admin user (admin@example.com / password)
- Test user (user@example.com / password)
- Sample venues and shows
- Demo favorites

## 🛠️ Available Commands

### Development

```bash
npm run dev          # Start both frontend and backend
npm run start:dev    # Start only backend
npm run client:dev   # Start only frontend
npm run setup        # Install all dependencies
```

### Database

```bash
npm run setup:db     # Start database containers
npm run stop:db      # Stop database containers
npm run reset:db     # Reset database (deletes all data!)
npm run db:logs      # View database logs
```

### Building & Deployment

```bash
npm run build        # Build backend
npm run build:all    # Build both frontend and backend
npm run deploy       # Deploy to Google Cloud Run
```

### Testing & Quality

```bash
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run linter
npm run format       # Format code
```

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**

```bash
# Kill processes using ports 3001 or 5173
lsof -ti:3001 | xargs kill -9  # macOS/Linux
lsof -ti:5173 | xargs kill -9  # macOS/Linux
```

**2. Docker Issues**

```bash
# Restart Docker Desktop
# Then run:
npm run reset:db
```

**3. Database Connection Failed**

```bash
# Check if MySQL is running
docker-compose -f docker-compose.dev.yml ps

# View database logs
npm run db:logs

# Reset database
npm run reset:db
```

**4. Module Not Found Errors**

```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules
rm package-lock.json client/package-lock.json
npm run setup
```

### Getting Help

1. Check the [DATABASE.md](docs/DATABASE.md) for database-specific issues
2. Review error logs in the terminal
3. Ensure all prerequisites are installed correctly
4. Try the reset commands for fresh start

## 🎉 Success!

If everything is working correctly, you should see:

1. ✅ Backend server running on port 3001
2. ✅ Frontend development server on port 5173
3. ✅ MySQL database accessible via phpMyAdmin
4. ✅ WebSocket connection established
5. ✅ Authentication system working

Navigate to http://localhost:5173 and start exploring your karaoke application!

## 🚀 Next Steps

- Register a new user account
- Browse available karaoke shows
- Add shows to your favorites
- Test the real-time WebSocket features
- Explore the admin interface (admin@example.com)

Happy coding! 🎤✨

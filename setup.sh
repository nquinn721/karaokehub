#!/bin/bash

echo "🎤 Setting up KaraokeHub development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client && npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

# Setup environment file
if [ ! -f ".env" ]; then
    echo "⚙️ Setting up environment file..."
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "📝 Please update .env with your configuration"
else
    echo "✅ Environment file already exists"
fi

# Create dist directory for client build
mkdir -p dist/client

echo ""
echo "🎉 Setup complete! Here's what you can do next:"
echo ""
echo "1. Update your .env file with proper configuration"
echo "2. Start the backend: npm run start:dev"
echo "3. In another terminal, start the frontend: cd client && npm run dev"
echo ""
echo "📱 Frontend will be available at: http://localhost:3000"
echo "🔧 Backend API will be available at: http://localhost:3001/api"
echo ""
echo "🚀 Happy coding!"

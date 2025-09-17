@echo off

echo 🎤 Setting up KaraokeHub development environment...

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is required. Please install Node.js 18+ and try again.
    exit /b 1
)

echo ✅ Node.js version:
node -v

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd client
call npm install

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
)

cd ..

REM Setup environment file
if not exist ".env" (
    echo ⚙️ Setting up environment file...
    copy .env.example .env
    echo ✅ Created .env file from .env.example
    echo 📝 Please update .env with your configuration
) else (
    echo ✅ Environment file already exists
)

REM Create dist directory for client build
if not exist "dist\client" mkdir dist\client

echo.
echo 🎉 Setup complete! Here's what you can do next:
echo.
echo 1. Update your .env file with proper configuration
echo 2. Start the backend: npm run start:dev
echo 3. In another terminal, start the frontend: cd client ^&^& npm run dev
echo.
echo 📱 Frontend will be available at: http://localhost:3000
echo 🔧 Backend API will be available at: http://localhost:3001/api
echo.
echo 🚀 Happy coding!

pause

@echo off
echo 🔥 Setting up Hot Module Replacement (HMR) for KaraokeHub mobile app...

REM Check if we're in the app directory
if not exist package.json (
    echo ❌ Please run this script from the app directory
    exit /b 1
)

REM Clear Metro cache
echo 🧹 Clearing Metro cache...
npx expo start --clear
timeout /t 3 /nobreak >nul
taskkill /f /im node.exe 2>nul

REM Clear npm cache
echo 🧹 Clearing npm cache...
npm cache clean --force

REM Clear Expo cache
echo 🧹 Clearing Expo cache...
npx expo install --fix

echo ✅ Cache cleared!

REM Start development server with HMR
echo 🚀 Starting development server with HMR enabled...
echo.
echo 📱 For best HMR experience:
echo    1. Use a development build (not Expo Go)
echo    2. Connect to the same WiFi network
echo    3. Enable 'Fast Refresh' in the development menu
echo.
echo 🔥 Hot reloading will work for:
echo    - Component changes
echo    - Style updates  
echo    - State changes
echo    - New imports (may require manual reload)
echo.

npx expo start --dev-client --clear

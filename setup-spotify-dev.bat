@echo off
echo ==============================================
echo          Spotify Development Setup
echo ==============================================
echo.
echo This script helps you set up Spotify API credentials for local development.
echo.
echo To get Spotify credentials:
echo 1. Go to https://developer.spotify.com/dashboard
echo 2. Log in with your Spotify account
echo 3. Click "Create App"
echo 4. Fill in the app details:
echo    - App Name: KaraokeHub Local Dev
echo    - App Description: Local development for KaraokeHub music search
echo    - Website: http://localhost:3000
echo    - Redirect URI: http://localhost:3000/callback
echo 5. Copy your Client ID and Client Secret
echo.
echo Current environment status:
echo SPOTIFY_CLIENT_ID: %SPOTIFY_CLIENT_ID%
echo SPOTIFY_CLIENT_SECRET: %SPOTIFY_CLIENT_SECRET%
echo.
if "%SPOTIFY_CLIENT_ID%"=="" (
    echo ❌ SPOTIFY_CLIENT_ID is not set
) else (
    echo ✅ SPOTIFY_CLIENT_ID is set
)
if "%SPOTIFY_CLIENT_SECRET%"=="" (
    echo ❌ SPOTIFY_CLIENT_SECRET is not set
) else (
    echo ✅ SPOTIFY_CLIENT_SECRET is set
)
echo.
echo To set your credentials, edit set-dev-env.bat and replace:
echo   set SPOTIFY_CLIENT_ID=your_spotify_client_id_here
echo   set SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
echo.
echo Then run set-dev-env.bat to apply the environment variables.
echo.
pause

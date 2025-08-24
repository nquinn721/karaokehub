@echo off
echo Setting environment to PRODUCTION (Spotify primary, iTunes fallback)
set NODE_ENV=production
set PRODUCTION_UPLOAD_TOKEN=your_secure_production_token_here_change_me
rem Note: Spotify credentials should be set via Google Secret Manager in production
rem SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are loaded from secrets in Cloud Run
echo NODE_ENV set to: %NODE_ENV%
echo.
echo Now Spotify will be used as the primary music source (requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)
echo iTunes will be used as fallback if Spotify fails.
echo Production Spotify credentials are loaded from Google Secret Manager.
echo Run your server with: npm run start:prod
pause

@echo off
echo Setting environment to DEVELOPMENT (Local parsing enabled)
set NODE_ENV=development
set ALLOW_LOCAL_PRODUCTION_UPLOAD=true
set PRODUCTION_UPLOAD_TOKEN=your_secure_token_here_change_me
rem Spotify API credentials - replace with your actual credentials
set SPOTIFY_CLIENT_ID=your_spotify_client_id_here
set SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
echo NODE_ENV set to: %NODE_ENV%
echo ALLOW_LOCAL_PRODUCTION_UPLOAD set to: %ALLOW_LOCAL_PRODUCTION_UPLOAD%
echo SPOTIFY_CLIENT_ID set to: %SPOTIFY_CLIENT_ID%
echo SPOTIFY_CLIENT_SECRET set to: [HIDDEN]
echo.
echo Development environment configured for:
echo - Local karaoke data parsing (CPU intensive operations)
echo - Production data upload capability (bypasses CORS)
echo - Music source fallback handling
echo - Spotify API integration (requires valid credentials)
echo.
echo Run your server with: npm run start:dev
pause

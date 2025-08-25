@echo off
echo Setting environment to DEVELOPMENT (Local parsing enabled)
set NODE_ENV=development
set ALLOW_LOCAL_PRODUCTION_UPLOAD=true
set PRODUCTION_UPLOAD_TOKEN=your_secure_token_here_change_me
rem iTunes API is used for music search (no credentials required)
echo NODE_ENV set to: %NODE_ENV%
echo ALLOW_LOCAL_PRODUCTION_UPLOAD set to: %ALLOW_LOCAL_PRODUCTION_UPLOAD%
echo.
echo Development environment configured for:
echo - Local karaoke data parsing (CPU intensive operations)
echo - Production data upload capability (bypasses CORS)
echo - iTunes API for music search (no credentials required)
echo.
echo Run your server with: npm run start:dev
pause

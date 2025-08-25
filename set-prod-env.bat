@echo off
echo Setting environment to PRODUCTION (iTunes API for music search)
set NODE_ENV=production
set PRODUCTION_UPLOAD_TOKEN=your_secure_production_token_here_change_me
rem Note: iTunes API doesn't require credentials, making it ideal for production
rem Music search is now handled exclusively by iTunes API
echo NODE_ENV set to: %NODE_ENV%
echo.
echo Now iTunes will be used as the music source
echo iTunes provides excellent preview availability and doesn't require API credentials.
echo Run your server with: npm run start:prod
pause

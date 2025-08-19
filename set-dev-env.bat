@echo off
echo Setting environment to DEVELOPMENT (iTunes primary)
set NODE_ENV=development
echo NODE_ENV set to: %NODE_ENV%
echo.
echo Now iTunes will be used as the primary music source for local testing.
echo Run your server with: npm run start:dev
pause

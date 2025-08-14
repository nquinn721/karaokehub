@echo off
REM Stripe Local Testing Helper Script for Windows
REM Usage: stripe-test-local.bat [command]

setlocal EnableDelayedExpansion

echo 🎵 KaraokeHub Stripe Local Testing Helper
echo ==================================================

REM Check if Stripe CLI is installed
where stripe >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Stripe CLI is not installed
    echo Please install it first: https://stripe.com/docs/stripe-cli
    pause
    exit /b 1
)

set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

if "%COMMAND%"=="setup" (
    echo 🔧 Setting up local webhook forwarding...
    echo.
    echo ⚠️  Copy the webhook secret (whsec_...) to your .env file
    echo.
    stripe listen --forward-to localhost:8000/api/subscription/webhook
    goto :eof
)

if "%COMMAND%"=="test-subscription" (
    echo 🧪 Testing subscription events...
    echo.
    echo 1. Creating subscription...
    stripe trigger customer.subscription.created
    
    echo 2. Processing payment...
    stripe trigger invoice.payment_succeeded
    
    echo 3. Updating subscription...
    stripe trigger customer.subscription.updated
    goto :eof
)

if "%COMMAND%"=="test-payment" (
    echo 💳 Testing payment events...
    echo.
    echo 1. Successful payment...
    stripe trigger invoice.payment_succeeded
    
    echo 2. Failed payment...
    stripe trigger invoice.payment_failed
    goto :eof
)

if "%COMMAND%"=="test-customer" (
    echo 👤 Creating test customer...
    stripe customers create --email="test@karaokehub.com" --name="Test User" --description="Local testing customer"
    goto :eof
)

if "%COMMAND%"=="webhook-status" (
    echo 🔍 Checking webhook endpoints...
    stripe webhook-endpoints list
    goto :eof
)

if "%COMMAND%"=="events" (
    echo 📋 Recent webhook events...
    stripe events list --limit=10
    goto :eof
)

if "%COMMAND%"=="logs" (
    echo 📜 Webhook forwarding logs...
    echo This will show real-time webhook events...
    stripe listen --forward-to localhost:8000/api/subscription/webhook --print-json
    goto :eof
)

REM Default help
echo Available commands:
echo.
echo   setup              Start webhook forwarding to localhost
echo   test-subscription  Trigger subscription lifecycle events
echo   test-payment       Trigger payment success/failure events
echo   test-customer      Create a test customer
echo   webhook-status     List webhook endpoints
echo   events             Show recent webhook events
echo   logs               Show real-time webhook logs
echo.
echo Example usage:
echo   stripe-test-local.bat setup
echo   stripe-test-local.bat test-subscription
echo.
echo For more help, see: docs/STRIPE-LOCAL-TESTING.md

pause

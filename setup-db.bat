@echo off
echo 🗄️ Setting up KaraokePal database...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is required. Please install Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is required. Please install Docker Compose and try again.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are available

REM Start MySQL container for development
echo 🚀 Starting MySQL database container...
docker-compose -f docker-compose.dev.yml up -d mysql

REM Wait for MySQL to be ready
echo ⏳ Waiting for MySQL to be ready...
timeout /t 15 /nobreak >nul

:check_mysql
docker-compose -f docker-compose.dev.yml exec mysql mysql -u admin -ppassword -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⏳ Still waiting for MySQL...
    timeout /t 5 /nobreak >nul
    goto check_mysql
)

echo ✅ MySQL is ready!

REM Start phpMyAdmin (optional)
echo 🚀 Starting phpMyAdmin...
docker-compose -f docker-compose.dev.yml up -d phpmyadmin

echo.
echo 🎉 Database setup complete!
echo.
echo 📊 MySQL Database:
echo    Host: localhost
echo    Port: 3306
echo    Database: karaoke-hub
echo    Username: admin
echo    Password: password
echo.
echo 🌐 phpMyAdmin (Database Admin):
echo    URL: http://localhost:8080
echo    Username: admin
echo    Password: password
echo.
echo 🛑 To stop the database:
echo    docker-compose -f docker-compose.dev.yml down
echo.
echo 🧹 To reset the database (WARNING: This will delete all data):
echo    docker-compose -f docker-compose.dev.yml down -v
echo    docker-compose -f docker-compose.dev.yml up -d
echo.
pause

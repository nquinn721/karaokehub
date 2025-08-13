#!/bin/bash

echo "🗄️ Setting up KaraokePal database..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required. Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Start MySQL container for development
echo "🚀 Starting MySQL database container..."
docker-compose -f docker-compose.dev.yml up -d mysql

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 15

# Check if MySQL is ready
until docker-compose -f docker-compose.dev.yml exec mysql mysql -u admin -ppassword -e "SELECT 1" &>/dev/null; do
    echo "⏳ Still waiting for MySQL..."
    sleep 5
done

echo "✅ MySQL is ready!"

# Start phpMyAdmin (optional)
echo "🚀 Starting phpMyAdmin..."
docker-compose -f docker-compose.dev.yml up -d phpmyadmin

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 MySQL Database:"
echo "   Host: localhost"
echo "   Port: 3306"
echo "   Database: karaoke-hub"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "🌐 phpMyAdmin (Database Admin):"
echo "   URL: http://localhost:8080"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "🛑 To stop the database:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""
echo "🧹 To reset the database (WARNING: This will delete all data):"
echo "   docker-compose -f docker-compose.dev.yml down -v"
echo "   docker-compose -f docker-compose.dev.yml up -d"

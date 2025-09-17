# 🎤 KaraokeHub Database Documentation

## Quick Start

1. **Setup Database (Windows):**

   ```bash
   ./setup-db.bat
   ```

2. **Setup Database (Linux/macOS):**
   ```bash
   chmod +x setup-db.sh
   ./setup-db.sh
   ```

## Database Schema

### 👤 Users Table

- **id**: Primary key
- **email**: Unique email address
- **password**: Hashed password
- **firstName**: User's first name
- **lastName**: User's last name
- **role**: USER, ADMIN, VENDOR, KJ
- **status**: ACTIVE, INACTIVE, SUSPENDED
- **createdAt**: Registration date
- **updatedAt**: Last modification date

### 🏢 Vendors Table

- **id**: Primary key
- **name**: Company/business name
- **owner**: Owner name
- **website**: Company website URL
- **instagram**: Instagram handle
- **facebook**: Facebook page URL
- **createdAt**: Creation date
- **updatedAt**: Last modification date

### 🎙️ KJs (Karaoke Jockeys) Table

- **id**: Primary key
- **name**: KJ's name
- **vendorId**: Foreign key to Vendors table
- **createdAt**: Creation date
- **updatedAt**: Last modification date

### 🎭 Shows Table

- **id**: Primary key
- **vendorId**: Foreign key to Vendors table
- **kjId**: Foreign key to KJs table
- **address**: Show location
- **dayOfWeek**: Day of the week (MONDAY, TUESDAY, etc.)
- **startTime**: Show start time
- **endTime**: Show end time
- **createdAt**: Creation date
- **updatedAt**: Last modification date

### ⭐ Favorites Table

- **id**: Primary key
- **userId**: Foreign key to Users table
- **showId**: Foreign key to Shows table
- **dayOfWeek**: Day of the week for the favorite
- **createdAt**: Creation date
- **updatedAt**: Last modification date

## Environment Configuration

### Local Development

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=karaoke-pal
DATABASE_USERNAME=admin
DATABASE_PASSWORD=password
```

### Production (Cloud Run)

```env
DATABASE_HOST=your-cloud-sql-ip
DATABASE_PORT=3306
DATABASE_NAME=karaoke-pal
DATABASE_USERNAME=your-production-user
DATABASE_PASSWORD=your-production-password
```

## Docker Commands

### Start Development Database

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Stop Database

```bash
docker-compose -f docker-compose.dev.yml down
```

### Reset Database (Delete All Data)

```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### View Database Logs

```bash
docker-compose -f docker-compose.dev.yml logs mysql
```

## Database Access

### phpMyAdmin (Web Interface)

- **URL**: http://localhost:8080
- **Username**: admin
- **Password**: password

### MySQL CLI

```bash
docker-compose -f docker-compose.dev.yml exec mysql mysql -u admin -p karaoke-pal
```

## Sample Data

The database will be initialized with sample data including:

- Test users (admin and regular user)
- Sample vendors and KJs
- Example karaoke shows
- Demo favorites

## TypeORM Features

- **Auto Sync**: Database schema automatically syncs with entity definitions
- **Migrations**: Production migrations for schema changes
- **Relations**: Proper foreign key relationships between entities
- **Validation**: Built-in validation for data integrity
- **Query Builder**: Advanced querying capabilities

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/profile` - Get user profile

### Users

- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin only)

### Vendors

- `GET /vendors` - Get all vendors
- `GET /vendors/:id` - Get vendor by ID
- `POST /vendors` - Create vendor (admin/vendor only)
- `PUT /vendors/:id` - Update vendor
- `DELETE /vendors/:id` - Delete vendor (admin only)

### KJs

- `GET /kjs` - Get all KJs
- `GET /kjs/:id` - Get KJ by ID
- `POST /kjs` - Create KJ (admin/vendor only)
- `PUT /kjs/:id` - Update KJ
- `DELETE /kjs/:id` - Delete KJ (admin/vendor only)

### Shows

- `GET /shows` - Get all shows
- `GET /shows/:id` - Get show by ID
- `GET /shows/day/:day` - Get shows by day of week
- `POST /shows` - Create show (admin/vendor/kj only)
- `PUT /shows/:id` - Update show
- `DELETE /shows/:id` - Delete show (admin/vendor/kj only)

### Favorites

- `GET /favorites` - Get user's favorites
- `POST /favorites` - Add favorite
- `DELETE /favorites/:id` - Remove favorite

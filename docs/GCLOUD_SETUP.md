# Google Cloud Setup Guide

## Environment Variables for Google Cloud

### Required OAuth Configuration

```bash
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret

# GitHub OAuth (from GitHub Developer Settings)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Database Configuration for Production

```bash
# Production Database (Cloud SQL)
DATABASE_HOST=your-cloud-sql-instance-ip
DATABASE_PORT=3306
DATABASE_USERNAME=your-db-username
DATABASE_PASSWORD=your-secure-db-password
DATABASE_NAME=karaoke-hub-prod

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key
JWT_EXPIRES_IN=24h
```

### Production URLs

```bash
# Production URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## Google Cloud Console Setup Steps

### 1. OAuth 2.0 Client Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google OAuth API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8000/api/auth/google/callback` (development)
     - `https://your-domain.com/api/auth/google/callback` (production)

### 2. Cloud SQL Setup

1. Create Cloud SQL MySQL instance
2. Configure database and user
3. Note connection details for environment variables

### 3. App Engine / Cloud Run Deployment

1. Configure `app.yaml` or `cloudbuild.yaml`
2. Set environment variables in Google Cloud Console
3. Deploy application

## Security Notes

- Never commit real credentials to version control
- Use Google Secret Manager for production secrets
- Rotate keys regularly
- Enable 2FA on Google Cloud account

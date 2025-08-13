# Security Guidelines

## API Keys and Secrets Management

### Environment Variables

All sensitive data must be stored in environment variables, never hardcoded in source code.

#### Required Environment Variables:

- `GEMINI_API_KEY` - Google Gemini AI API key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `JWT_SECRET` - JWT signing secret
- `DATABASE_PASSWORD` - Database password

### Local Development

1. Copy `.env.example` to `.env`
2. Fill in your actual API keys and secrets
3. Never commit the `.env` file (it's already in `.gitignore`)

### Production Deployment

1. Use Google Secret Manager for Cloud Run
2. Update `create-secrets.sh` with your actual keys
3. Run the script to create secrets in Google Cloud
4. Verify Cloud Run service account has access to secrets

### Security Checklist

- [ ] No API keys hardcoded in source code
- [ ] All sensitive data in environment variables
- [ ] `.env` file in `.gitignore`
- [ ] Production secrets in Google Secret Manager
- [ ] API keys have proper restrictions and quotas
- [ ] Regular rotation of sensitive credentials

### API Key Restrictions

#### Google Maps API Key:

- Restrict to your domains only
- Enable only necessary APIs (Maps JavaScript API)
- Set usage quotas to prevent abuse

#### Gemini API Key:

- Monitor usage and set quotas
- Consider upgrading from free tier for production

## Reporting Security Issues

If you discover a security vulnerability, please report it privately to the maintainers.

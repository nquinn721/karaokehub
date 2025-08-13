# 🌐 Port Configuration

## Development Environment

- **Frontend (Vite)**: Port `5173`
- **Backend (NestJS)**: Port `8000`
- **WebSocket**: Port `8000` (same as backend)
- **MySQL Database**: Port `3306`
- **phpMyAdmin**: Port `8080`

## Production Environment (Cloud Run)

- **Application**: Port `8080` (automatically set by Cloud Run)
- **Environment Variable**: `PORT=8080`

## Configuration Files Updated

### Backend Configuration

- `src/main.ts` - Default port changed from 3001 to 8000
- `src/websocket/websocket.gateway.ts` - CORS origins updated
- `.env` - PORT=8000 for development
- `.env.example` - PORT=8000 with Cloud Run comment
- `Dockerfile` - EXPOSE 8080 and PORT=8080 for production

### Frontend Configuration

- `client/vite.config.ts` - Proxy targets updated to port 8000
- Frontend dev server port set to 5173

### Documentation

- `README.md` - Access points updated
- `docs/SETUP.md` - Access points table updated

## Port Mapping Summary

| Environment     | Frontend | Backend | WebSocket | Database  | phpMyAdmin |
| --------------- | -------- | ------- | --------- | --------- | ---------- |
| **Development** | 5173     | 8000    | 8000      | 3306      | 8080       |
| **Production**  | -        | 8080    | 8080      | Cloud SQL | -          |

## CORS Configuration

The following origins are now allowed:

- `http://localhost:5173` (Frontend Vite dev server)
- `http://localhost:8000` (Backend dev server)
- `http://localhost:8080` (Cloud Run port)

This configuration ensures:
✅ No port conflicts during development
✅ Proper Cloud Run compatibility (port 8080)
✅ WebSocket connections work correctly
✅ Frontend can proxy API and WebSocket requests
✅ Database remains on standard MySQL port 3306

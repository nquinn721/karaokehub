# ⚠️ DO NOT START SERVERS ⚠️

## CRITICAL REMINDER FOR AI ASSISTANT

**NEVER USE THE FOLLOWING COMMANDS:**

- `npm run start`
- `npm run start:dev`
- `npm run dev`
- `npm start`
- Any command that starts the backend server
- Any command that starts the frontend client

## WHY?

The project uses **HOT MODULE RELOAD (HMR)** which means:

- The servers are ALREADY RUNNING automatically
- Starting new instances will cause PORT CONFLICTS
- The user manages the server/client lifecycle manually
- HMR automatically recompiles and restarts when files change

## WHAT TO DO INSTEAD

✅ **ALLOWED ACTIONS:**

- `npm run build` - Test compilation
- `curl` requests to test existing running servers
- File modifications and edits
- Reading files and checking code
- Creating new files
- Running database migrations if needed

❌ **FORBIDDEN ACTIONS:**

- Starting any development servers
- Starting the client application
- Any `npm run` commands that launch servers

## CURRENT SETUP

- Backend: Running with HMR on port 8000
- Frontend: Running with HMR (likely on port 5173)
- Database: Already configured and running

## REMEMBER

The user explicitly stated: **"we are using hot module reload"**

When testing APIs, use curl against the already-running servers at:

- Backend: `http://localhost:8000/api/`
- Frontend: Usually `http://localhost:5173/`

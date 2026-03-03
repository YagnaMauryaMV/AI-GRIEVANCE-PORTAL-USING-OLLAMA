# AI Grievance Portal - Full Project (Dev)

This archive contains a simple, ready-to-run development version of the portal:
- backend/ - Node.js + Express + Mongoose
- frontend/ - Vite + React (minimal)
- docker-compose.yml - to run MongoDB locally in Docker

## Quick start (recommended)
1. Ensure Docker is installed and running.
2. Start MongoDB:
   ```
   docker-compose up -d
   ```
3. Backend:
   ```
   cd backend
   cp .env.example .env
   npm install
   npm run seed
   npm start
   ```
4. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
5. Open frontend at http://localhost:5173 and backend API at http://localhost:5000

## Notes
- OTPs and captcha are returned on API responses for development convenience.
- Default admin username/password (dev): admin@gok / Admin@1234
- In production, replace dev flows with SMS provider, real captcha, HTTPS, and strong JWT/session handling.


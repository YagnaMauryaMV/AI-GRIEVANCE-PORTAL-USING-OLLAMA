# AI Grievance Portal - Backend

## Setup
1. Copy `.env.example` to `.env` and edit values if needed.
2. Start MongoDB (see repo docker-compose or run MongoDB locally).
3. Install dependencies:
   ```
   cd backend
   npm install
   ```
4. Seed admin user:
   ```
   npm run seed
   ```
5. Start server:
   ```
   npm start
   ```
Server runs on port 5000 by default.

## Notes
- This is a development-ready backend. OTPs and captchas are returned in responses for dev convenience.
- In production, integrate an SMS provider and proper captcha images.

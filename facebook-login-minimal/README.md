# Facebook Login Minimal (JS + Express)

## What it includes
- Button: "Login con Facebook"
- Dynamic authorization URL: `GET /auth/facebook/url`
- Callback endpoint: `GET /auth/facebook/callback` (receives `code`)
- Token exchange endpoint: `POST /auth/facebook/token`
- Graph profile endpoint: `POST /auth/facebook/profile`
- Error handling in backend and frontend

## Setup
1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example` and set real values.
3. Start server:
   - `npm run dev`
4. Open:
   - `http://localhost:3002`

## Environment variables
- `PORT`
- `APP_BASE_URL`
- `FB_APP_ID`
- `FB_APP_SECRET`
- `FB_SCOPES`
- `STATE_COOKIE_NAME`
- `STATE_COOKIE_MAX_AGE_MS`
- `COOKIE_SECURE` (optional, default `false`)
- `COOKIE_SAME_SITE` (optional, default `lax`)

## Notes
- In your Meta app, whitelist callback URI exactly:
  - `http://localhost:3002/auth/facebook/callback`
- `redirect_uri` must match exactly in authorize + token exchange.

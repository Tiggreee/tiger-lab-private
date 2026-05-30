# Facebook OAuth 2.0 Full Example (Frontend JS + Backend Express)

This folder contains a complete OAuth 2.0 flow with Facebook Login.

## Structure
- `backend/` Express API for OAuth start and token exchange.
- `frontend/` Plain JavaScript frontend that triggers login and handles callback.

## Backend setup
1. Go to backend:
   - `cd facebook-oauth/backend`
2. Install dependencies:
   - `npm install`
3. Copy env file and set real values:
   - Copy `.env.example` to `.env`
   - Set `FB_APP_ID` and `FB_APP_SECRET`
   - Keep `FRONTEND_REDIRECT_URI=https://localhost` if that is your configured redirect URI.
4. Run backend:
   - `npm run dev`

## Frontend setup
- Serve `facebook-oauth/frontend` with any static server over HTTPS on `https://localhost`.
- Open `https://localhost` and click `Login with Facebook`.

## OAuth endpoints implemented
- `GET /auth/facebook/start`
  - Builds Facebook authorization URL.
  - Stores CSRF state in secure httpOnly cookie.
- `POST /auth/facebook/exchange`
  - Validates `code` and `state`.
  - Exchanges code for token via:
    - `https://graph.facebook.com/v23.0/oauth/access_token`
  - Fetches user profile via:
    - `https://graph.facebook.com/me?fields=id,name,email,picture`

## Security included
- `state` validation against cookie.
- `client_secret` stays only in backend.
- `appsecret_proof` for Graph API calls.
- Cookie security flags (secure, sameSite, httpOnly).

## Notes
- If `COOKIE_SECURE=true`, backend cookies require HTTPS frontend/backend setup.
- `redirect_uri` must match exactly between:
  - authorization request
  - token exchange request
  - Meta app settings

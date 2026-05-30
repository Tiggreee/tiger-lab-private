import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const {
  PORT = '3001',
  FRONTEND_ORIGIN = 'https://localhost',
  FRONTEND_REDIRECT_URI = 'https://localhost',
  FB_APP_ID,
  FB_APP_SECRET,
  FB_SCOPES = 'public_profile,email',
  STATE_COOKIE_NAME = 'fb_oauth_state',
  STATE_COOKIE_MAX_AGE_MS = '600000',
  COOKIE_SECURE = 'true',
  COOKIE_SAME_SITE = 'lax'
} = process.env;

if (!FB_APP_ID || !FB_APP_SECRET) {
  throw new Error('Missing FB_APP_ID or FB_APP_SECRET in environment variables.');
}

const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

function isSecureCookieEnabled() {
  return COOKIE_SECURE.toLowerCase() === 'true';
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureCookieEnabled(),
    sameSite: COOKIE_SAME_SITE,
    maxAge: Number(STATE_COOKIE_MAX_AGE_MS),
    path: '/'
  };
}

function generateState() {
  return crypto.randomBytes(24).toString('hex');
}

function buildAppSecretProof(accessToken) {
  return crypto.createHmac('sha256', FB_APP_SECRET).update(accessToken).digest('hex');
}

function buildFacebookAuthUrl(state) {
  const authUrl = new URL('https://www.facebook.com/v23.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FB_APP_ID);
  authUrl.searchParams.set('redirect_uri', FRONTEND_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', FB_SCOPES);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

async function exchangeCodeForToken(code) {
  const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FB_APP_ID);
  tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
  tokenUrl.searchParams.set('redirect_uri', FRONTEND_REDIRECT_URI);
  tokenUrl.searchParams.set('code', code);

  const response = await fetch(tokenUrl);
  const payload = await response.json();

  if (!response.ok || payload.error) {
    const err = new Error('Facebook token exchange failed');
    err.details = payload;
    err.status = 400;
    throw err;
  }

  return payload;
}

async function fetchFacebookProfile(accessToken) {
  const graphUrl = new URL('https://graph.facebook.com/me');
  graphUrl.searchParams.set('fields', 'id,name,email,picture');
  graphUrl.searchParams.set('access_token', accessToken);
  graphUrl.searchParams.set('appsecret_proof', buildAppSecretProof(accessToken));

  const response = await fetch(graphUrl);
  const payload = await response.json();

  if (!response.ok || payload.error) {
    const err = new Error('Fetching Facebook profile failed');
    err.details = payload;
    err.status = 400;
    throw err;
  }

  return payload;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'facebook-oauth-backend' });
});

app.get('/auth/facebook/start', (_req, res) => {
  const state = generateState();
  res.cookie(STATE_COOKIE_NAME, state, getCookieOptions());

  res.json({
    authUrl: buildFacebookAuthUrl(state)
  });
});

app.post('/auth/facebook/exchange', async (req, res) => {
  try {
    const { code, state } = req.body || {};
    const stateFromCookie = req.cookies[STATE_COOKIE_NAME];

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'missing_code' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'missing_state' });
    }

    if (!stateFromCookie || state !== stateFromCookie) {
      return res.status(400).json({ error: 'invalid_state' });
    }

    res.clearCookie(STATE_COOKIE_NAME, {
      ...getCookieOptions(),
      maxAge: undefined
    });

    const tokenPayload = await exchangeCodeForToken(code);
    const profilePayload = await fetchFacebookProfile(tokenPayload.access_token);

    return res.json({
      user: profilePayload,
      token: {
        token_type: tokenPayload.token_type,
        expires_in: tokenPayload.expires_in
      }
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: status === 500 ? 'internal_error' : 'oauth_error',
      message: error.message,
      details: error.details || null
    });
  }
});

app.use((err, _req, res, _next) => {
  return res.status(500).json({
    error: 'unhandled_error',
    message: err.message
  });
});

app.listen(Number(PORT), () => {
  console.log(`Facebook OAuth backend running on http://localhost:${PORT}`);
});

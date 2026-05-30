import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const {
  PORT = '3002',
  APP_BASE_URL = 'http://localhost:3002',
  FB_APP_ID,
  FB_APP_SECRET,
  FB_SCOPES = 'public_profile,email',
  STATE_COOKIE_NAME = 'fb_oauth_state',
  STATE_COOKIE_MAX_AGE_MS = '600000',
  COOKIE_SECURE = 'false',
  COOKIE_SAME_SITE = 'lax'
} = process.env;

if (!FB_APP_ID || !FB_APP_SECRET) {
  throw new Error('Missing FB_APP_ID or FB_APP_SECRET.');
}

const REDIRECT_URI = `${APP_BASE_URL}/auth/facebook/callback`;
const app = express();

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(express.static('public'));

class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isSecureCookieEnabled() {
  return String(COOKIE_SECURE).toLowerCase() === 'true';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: isSecureCookieEnabled(),
    maxAge: Number(STATE_COOKIE_MAX_AGE_MS),
    path: '/'
  };
}

function errorResponse(res, status, code, message, details = null) {
  return res.status(status).json({
    error: code,
    message,
    details
  });
}

function sanitizeString(value, { maxLength = 2048 } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function createState() {
  return crypto.randomBytes(24).toString('hex');
}

function isValidHexState(value) {
  return /^[a-f0-9]{48}$/i.test(value);
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateStatePair(stateFromQuery, stateFromCookie) {
  const queryValue = sanitizeString(stateFromQuery, { maxLength: 128 });
  const cookieValue = sanitizeString(stateFromCookie, { maxLength: 128 });

  if (!queryValue || !cookieValue) {
    return false;
  }

  if (!isValidHexState(queryValue) || !isValidHexState(cookieValue)) {
    return false;
  }

  return timingSafeEqualString(queryValue, cookieValue);
}

function buildFacebookAuthUrl(state) {
  const authUrl = new URL('https://www.facebook.com/v23.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FB_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', FB_SCOPES);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

function buildAppSecretProof(accessToken) {
  return crypto.createHmac('sha256', FB_APP_SECRET).update(accessToken).digest('hex');
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  const bodyText = await response.text();
  const payload = parseJsonSafe(bodyText);
  return { response, payload };
}

function ensureCodeInput(code) {
  const safeCode = sanitizeString(code, { maxLength: 2048 });

  if (!safeCode) {
    throw new AppError(400, 'missing_code', 'The code is required.');
  }

  return safeCode;
}

function ensureAccessTokenInput(accessToken) {
  const safeToken = sanitizeString(accessToken, { maxLength: 4096 });

  if (!safeToken) {
    throw new AppError(400, 'missing_access_token', 'The accessToken is required.');
  }

  return safeToken;
}

async function exchangeCodeForAccessToken(code) {
  const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FB_APP_ID);
  tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
  tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  tokenUrl.searchParams.set('code', code);

  const { response, payload } = await fetchJson(tokenUrl);

  if (!response.ok || payload.error || typeof payload.access_token !== 'string') {
    throw new AppError(
      400,
      'token_exchange_failed',
      'Could not exchange code for access token.',
      payload
    );
  }

  return payload;
}

async function fetchFacebookProfile(accessToken) {
  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email,picture');
  profileUrl.searchParams.set('access_token', accessToken);
  profileUrl.searchParams.set('appsecret_proof', buildAppSecretProof(accessToken));

  const { response, payload } = await fetchJson(profileUrl);

  if (!response.ok || payload.error) {
    throw new AppError(
      400,
      'profile_fetch_failed',
      'Could not fetch profile from Graph API.',
      payload
    );
  }

  return payload;
}

function redirectWithError(res, code, description = '') {
  const safeCode = encodeURIComponent(sanitizeString(code, { maxLength: 128 }) || 'oauth_error');
  const safeDescription = encodeURIComponent(sanitizeString(description, { maxLength: 256 }) || 'OAuth error');
  return res.redirect(`/?oauth_error=${safeCode}&oauth_error_description=${safeDescription}`);
}

// 1) URL de autorizacion construida dinamicamente
app.get('/auth/facebook/url', (_req, res) => {
  const state = createState();
  res.cookie(STATE_COOKIE_NAME, state, cookieOptions());
  return res.json({ authUrl: buildFacebookAuthUrl(state) });
});

// 2) Callback que recibe code
app.get('/auth/facebook/callback', (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  const stateCookie = sanitizeString(req.cookies[STATE_COOKIE_NAME], { maxLength: 128 });

  if (error) {
    return redirectWithError(res, String(error), String(errorDescription || 'OAuth error'));
  }

  const safeCode = sanitizeString(code, { maxLength: 2048 });
  const safeState = sanitizeString(state, { maxLength: 128 });

  if (!safeCode || !safeState) {
    return redirectWithError(res, 'missing_code_or_state', 'Missing code or state in callback');
  }

  if (!validateStatePair(safeState, stateCookie)) {
    return redirectWithError(res, 'invalid_state', 'State validation failed');
  }

  res.clearCookie(STATE_COOKIE_NAME, cookieOptions());
  const encodedCode = encodeURIComponent(safeCode);
  const encodedState = encodeURIComponent(safeState);
  return res.redirect(`/?code=${encodedCode}&state=${encodedState}`);
});

// 3) Endpoint que intercambia code por access_token
app.post('/auth/facebook/token', async (req, res) => {
  try {
    const code = ensureCodeInput(req.body?.code);
    const tokenData = await exchangeCodeForAccessToken(code);

    return res.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    });
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(res, err.status, err.code, err.message, err.details);
    }
    return errorResponse(res, 500, 'internal_error', 'Unexpected server error.');
  }
});

// 4) Endpoint que obtiene datos de usuario desde Graph API
app.post('/auth/facebook/profile', async (req, res) => {
  try {
    const accessToken = ensureAccessTokenInput(req.body?.accessToken);
    const profileData = await fetchFacebookProfile(accessToken);

    return res.json({ user: profileData });
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(res, err.status, err.code, err.message, err.details);
    }
    return errorResponse(res, 500, 'internal_error', 'Unexpected server error.');
  }
});

app.use((err, _req, res, _next) => {
  return errorResponse(res, 500, 'unhandled_error', 'Unhandled server error.', {
    message: err?.message || 'Unknown error'
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'facebook-login-minimal' });
});

app.listen(Number(PORT), () => {
  console.log(`Server running at ${APP_BASE_URL}`);
  console.log(`Facebook callback URI: ${REDIRECT_URI}`);
});

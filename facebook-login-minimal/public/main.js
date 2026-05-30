const loginButton = document.getElementById('facebookLoginButton');
const statusBox = document.getElementById('statusBox');
const userBox = document.getElementById('userBox');

function setStatus(message, payload) {
  statusBox.textContent = payload ? `${message}\n${JSON.stringify(payload, null, 2)}` : message;
}

function setUser(payload) {
  userBox.textContent = JSON.stringify(payload, null, 2);
}

async function startFacebookLogin() {
  setStatus('Building authorization URL...');

  const response = await fetch('/auth/facebook/url', {
    credentials: 'include'
  });
  const payload = await response.json();

  if (!response.ok || !payload.authUrl) {
    throw new Error(`Cannot create auth URL: ${JSON.stringify(payload)}`);
  }

  window.location.href = payload.authUrl;
}

async function exchangeCodeForToken(code) {
  const response = await fetch('/auth/facebook/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function loadFacebookUser(accessToken) {
  const response = await fetch('/auth/facebook/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accessToken })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${JSON.stringify(payload)}`);
  }

  return payload.user;
}

async function handleCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('oauth_error');
  const oauthErrorDescription = url.searchParams.get('oauth_error_description');

  if (oauthError) {
    setStatus('OAuth error returned from callback.', {
      oauthError,
      oauthErrorDescription
    });
    return;
  }

  if (!code) {
    return;
  }

  try {
    setStatus('Exchanging code for token...');
    const token = await exchangeCodeForToken(code);

    setStatus('Fetching user profile from Graph API...');
    const user = await loadFacebookUser(token.access_token);

    setStatus('Login completed successfully.', {
      token_type: token.token_type,
      expires_in: token.expires_in
    });
    setUser(user);

    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.pathname);
  } catch (err) {
    setStatus('Flow failed.', { message: err.message });
  }
}

loginButton.addEventListener('click', () => {
  startFacebookLogin().catch((err) => {
    setStatus('Cannot start login.', { message: err.message });
  });
});

handleCallback();

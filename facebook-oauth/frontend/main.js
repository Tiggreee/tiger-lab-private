const statusBox = document.getElementById('statusBox');
const userBox = document.getElementById('userBox');
const apiBaseInput = document.getElementById('apiBase');
const fbLoginButton = document.getElementById('fbLoginButton');

function setStatus(message, payload) {
  statusBox.textContent = payload
    ? `${message}\n${JSON.stringify(payload, null, 2)}`
    : message;
}

function setUser(payload) {
  userBox.textContent = JSON.stringify(payload, null, 2);
}

function getApiBase() {
  return apiBaseInput.value.trim().replace(/\/+$/, '');
}

async function startFacebookLogin() {
  setStatus('Requesting authorization URL...');

  const response = await fetch(`${getApiBase()}/auth/facebook/start`, {
    method: 'GET',
    credentials: 'include'
  });

  const payload = await response.json();

  if (!response.ok || !payload.authUrl) {
    throw new Error(`Cannot start OAuth flow: ${JSON.stringify(payload)}`);
  }

  setStatus('Redirecting to Facebook...');
  window.location.href = payload.authUrl;
}

async function handleOAuthCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    setStatus('Facebook returned an error.', { error, errorDescription });
    return;
  }

  if (!code) {
    return;
  }

  setStatus('Exchanging authorization code for access token...');

  const response = await fetch(`${getApiBase()}/auth/facebook/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ code, state })
  });

  const payload = await response.json();

  if (!response.ok) {
    setStatus('Token exchange failed.', payload);
    return;
  }

  setStatus('OAuth flow completed successfully.');
  setUser(payload.user);

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

fbLoginButton.addEventListener('click', async () => {
  try {
    await startFacebookLogin();
  } catch (error) {
    setStatus('Error starting OAuth flow.', {
      message: error.message
    });
  }
});

handleOAuthCallback().catch((error) => {
  setStatus('Unexpected callback handling error.', {
    message: error.message
  });
});

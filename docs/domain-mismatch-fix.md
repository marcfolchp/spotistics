# Fix: Domain Mismatch Issue

## Problem

Cookies are being set for one domain (`127.0.0.1:8080` or `localhost:8080`) but you're accessing the site via a different domain. Browsers treat these as **different domains**, so cookies set on one won't be available on the other.

**Note**: Spotify prefers `127.0.0.1` for local development (it shows a security warning for `localhost`).

## Solution: Use `127.0.0.1` Consistently (Recommended)

### Step 1: Update `.env.local` File

Use `127.0.0.1` (Spotify's preferred option):

```env
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/auth/spotify/callback
```

### Step 2: Update Spotify Developer Dashboard

1. Go to https://developer.spotify.com/dashboard
2. Click on your app
3. Click "Edit Settings"
4. In "Redirect URIs" section:
   - Remove: `http://localhost:8080/api/auth/spotify/callback` (if present)
   - Add: `http://127.0.0.1:8080/api/auth/spotify/callback`
5. Click "Save"

**Note**: Spotify will accept `127.0.0.1` without security warnings.

### Step 3: Always Access via `127.0.0.1`

**Important**: Always access your app using:
- ✅ `http://127.0.0.1:8080` (correct - matches redirect URI, no Spotify warning)
- ❌ `http://localhost:8080` (wrong - cookies won't work, Spotify shows warning)

### Step 4: Clear Cookies and Restart

1. Clear all cookies for both `localhost:8080` and `127.0.0.1:8080`
2. Restart your dev server
3. Access the app via `http://localhost:8080`
4. Try logging in again

## Why This Happens

- `localhost` and `127.0.0.1` are technically the same IP address
- But browsers treat them as **different domains** for security
- Cookies set for `127.0.0.1` won't be sent to `localhost` and vice versa

## Best Practice

Always use `localhost` for local development:
- More consistent across different systems
- Better compatibility with cookie settings
- Matches common development practices


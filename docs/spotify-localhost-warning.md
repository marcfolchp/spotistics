# Spotify Localhost Warning - Solution

## Issue

Spotify shows a warning: "This redirect URI is not secure" for `http://localhost:8080/api/auth/spotify/callback`

## Solution: Use `127.0.0.1` Instead

Spotify prefers `127.0.0.1` for local development because it's considered more secure. Use `127.0.0.1` consistently everywhere.

### Step 1: Update `.env.local` File

Change your redirect URI to use `127.0.0.1`:

```env
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/auth/spotify/callback
```

### Step 2: Update Spotify Developer Dashboard

1. Go to https://developer.spotify.com/dashboard
2. Click on your app → "Edit Settings"
3. In "Redirect URIs" section:
   - Remove: `http://localhost:8080/api/auth/spotify/callback` (if present)
   - Add: `http://127.0.0.1:8080/api/auth/spotify/callback`
4. Click "Save"

**Note**: Spotify will accept `127.0.0.1` without the security warning.

### Step 3: Always Access via `127.0.0.1`

**CRITICAL**: Always access your app using:
- ✅ `http://127.0.0.1:8080` (correct - matches redirect URI)
- ❌ `http://localhost:8080` (wrong - cookies won't work)

### Step 4: Clear Cookies and Restart

1. Clear all cookies for both `localhost:8080` and `127.0.0.1:8080`
2. Restart your dev server
3. Access the app via `http://127.0.0.1:8080`
4. Try logging in again

## Why This Matters

- Cookies are domain-specific
- `localhost` and `127.0.0.1` are treated as different domains
- Cookies set for `127.0.0.1` won't be sent to `localhost` and vice versa
- Spotify prefers `127.0.0.1` for security reasons

## Summary

- Use `127.0.0.1:8080` everywhere (`.env.local`, Spotify Dashboard, browser URL)
- Never mix `localhost` and `127.0.0.1`
- This will fix both the Spotify warning and the cookie issue


# Debugging OAuth Flow

## Issue: Login redirects back to login page

If after logging in with Spotify OAuth, you're redirected back to the login page, check the following:

### 1. Check Server Logs

Look for these log messages in your terminal:

**When OAuth starts:**
```
Using redirect URI: http://127.0.0.1:8080/api/auth/spotify/callback
GET /api/auth/spotify 200
```

**When callback is hit (should appear):**
```
Token exchange successful
Cookies set, redirecting to dashboard
GET /api/auth/spotify/callback 302
```

**When session check runs:**
```
Access token found, user is authenticated
OR
No access token found in cookies
```

### 2. Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Look for:
   - `/api/auth/spotify/callback` - Should return 302 redirect
   - `/api/auth/session` - Check the response
   - Check cookies in Application/Storage tab

### 3. Verify Cookies Are Set

1. Open browser DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Click on Cookies
4. Look for `spotify_access_token` cookie
5. Check:
   - Domain: Should be `127.0.0.1` or `localhost`
   - Path: Should be `/`
   - HttpOnly: Should be checked
   - Secure: Should be unchecked (for localhost)

### 4. Common Issues

**Issue: Callback route not being hit**
- Check if redirect URI in Spotify Dashboard matches exactly
- Check if redirect URI in `.env.local` matches exactly
- Make sure your dev server is running on the correct port

**Issue: Cookies not being set**
- Check if cookies are being blocked by browser
- Try in incognito mode
- Check browser console for errors
- Verify `sameSite: 'lax'` is set (not 'strict')

**Issue: Session check fails immediately**
- Cookies might not be available yet after redirect
- The code now includes a delay to wait for cookies
- Check server logs to see if cookies are actually set

### 5. Test Steps

1. Clear all cookies for `127.0.0.1:8080`
2. Restart your dev server
3. Try logging in again
4. Watch the server logs for the messages above
5. Check browser DevTools Network tab
6. Check browser cookies

### 6. If Still Not Working

Check your `.env.local` file:
```env
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/auth/spotify/callback
```

And verify in Spotify Dashboard:
- Redirect URI: `http://127.0.0.1:8080/api/auth/spotify/callback`
- Must match EXACTLY (including http, port, and path)


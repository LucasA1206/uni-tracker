# Gmail OAuth "invalid_client" Error - Troubleshooting Guide

## Error: "Error 401: invalid_client - The OAuth client was not found"

This error means Google can't find your OAuth client. Here's how to fix it:

## Step 1: Verify Environment Variables

Make sure you have a `.env` file in your project root with:

```env
GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

**Important:**
- The `GMAIL_CLIENT_ID` should end with `.apps.googleusercontent.com`
- The `GMAIL_REDIRECT_URI` must **exactly match** what's in Google Cloud Console
- No trailing slashes in the redirect URI

## Step 2: Check Google Cloud Console Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Verify:
   - **Authorized redirect URIs** must include:
     - `http://localhost:3000/api/integrations/gmail/callback` (for local dev)
     - `https://yourdomain.com/api/integrations/gmail/callback` (for production)
   - The URI must match **exactly** (including http vs https, port numbers, trailing slashes)

## Step 3: Restart Your Server

After updating `.env`:
1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. Environment variables are only loaded when the server starts

## Step 4: Verify Your Client ID Format

Your Client ID should look like:
```
123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

If it doesn't end with `.apps.googleusercontent.com`, it's incorrect.

## Step 5: Check for Common Mistakes

- ❌ **Wrong**: `GMAIL_REDIRECT_URI=/api/integrations/gmail/callback` (missing domain)
- ✅ **Correct**: `GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback`

- ❌ **Wrong**: `GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback/` (trailing slash)
- ✅ **Correct**: `GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback` (no trailing slash)

- ❌ **Wrong**: Using `https://` for localhost
- ✅ **Correct**: Use `http://` for localhost, `https://` for production

## Step 6: Test Your Configuration

1. Check if environment variables are loaded:
   - Add a temporary console.log in your login route (or check server logs)
   - The client ID should be visible (not empty)

2. Verify the redirect URI:
   - Copy the exact redirect URI from your `.env`
   - Paste it into Google Cloud Console's "Authorized redirect URIs"
   - Make sure there are no extra spaces or characters

## Step 7: Recreate OAuth Credentials (If Still Not Working)

If nothing works, create new OAuth credentials:

1. In Google Cloud Console, go to **Credentials**
2. Delete your existing OAuth client (or create a new one)
3. Create new OAuth 2.0 Client ID:
   - Type: Web application
   - Name: "Uni Tracker Gmail"
   - Authorized redirect URIs: `http://localhost:3000/api/integrations/gmail/callback`
4. Copy the new Client ID and Client Secret
5. Update your `.env` file
6. Restart your server

## Quick Checklist

- [ ] `.env` file exists in project root
- [ ] `GMAIL_CLIENT_ID` is set and ends with `.apps.googleusercontent.com`
- [ ] `GMAIL_CLIENT_SECRET` is set
- [ ] `GMAIL_REDIRECT_URI` matches exactly in Google Cloud Console
- [ ] No trailing slashes in redirect URI
- [ ] Using `http://` for localhost (not `https://`)
- [ ] Server restarted after updating `.env`
- [ ] Gmail API is enabled in Google Cloud Console

## Still Having Issues?

If you're still getting the error after checking everything:

1. **Check server logs** - Look for any error messages when clicking "Connect Gmail"
2. **Verify the OAuth consent screen** - Make sure it's configured (even in testing mode)
3. **Check browser console** - Look for any JavaScript errors
4. **Try incognito mode** - Rule out browser cache issues


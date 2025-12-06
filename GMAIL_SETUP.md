# Gmail Integration Setup Guide

This guide will walk you through setting up Gmail OAuth integration so you can connect any Gmail account to your application.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Uni Tracker")
5. Click "Create"

## Step 2: Enable Gmail API

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required fields:
     - App name: "Uni Tracker" (or your app name)
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - On "Scopes", click "Add or Remove Scopes"
   - Search for and add: `https://www.googleapis.com/auth/gmail.readonly`
   - Click "Update" then "Save and Continue"
   - Add test users (your Gmail account) if in testing mode
   - Click "Save and Continue" then "Back to Dashboard"

4. Now create the OAuth client:
   - Application type: "Web application"
   - Name: "Uni Tracker Web Client"
   - Authorized JavaScript origins:
     - Add: `http://localhost:3000` (for local development)
     - Add: `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - Add: `http://localhost:3000/api/integrations/gmail/callback` (for local)
     - Add: `https://yourdomain.com/api/integrations/gmail/callback` (for production)
   - Click "Create"

5. Copy the **Client ID** and **Client Secret** - you'll need these for your environment variables

## Step 4: Set Environment Variables

Add these to your `.env` file (or your hosting platform's environment variables):

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

For production, update `GMAIL_REDIRECT_URI` to your production URL:
```env
GMAIL_REDIRECT_URI=https://yourdomain.com/api/integrations/gmail/callback
```

## Step 5: Run Database Migration

After setting up the environment variables, run the database migration to add the Gmail token table:

```bash
npx prisma migrate dev --name add_gmail_integration
```

Or if you prefer to push the schema:

```bash
npx prisma db push
```

Then generate the Prisma client:

```bash
npx prisma generate
```

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in to your application
3. Go to the Calendar tab
4. Click "Connect Gmail"
5. You'll be redirected to Google to authorize the app
6. Select your Gmail account and grant permissions
7. You'll be redirected back to your dashboard

## How It Works

- **User-Specific**: Each user connects their own Gmail account. Emails are stored with the `userId`, so each user only sees their own emails.
- **No Domain Restrictions**: Any Gmail account can be connected - there are no domain restrictions.
- **Automatic Sync**: When you click "Sync emails" in the Work tab, it will fetch emails from your connected Gmail account.
- **Task Detection**: Emails with keywords like "due", "assignment", "task", etc. are automatically converted to tasks.

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in your Google Cloud Console exactly matches `GMAIL_REDIRECT_URI` in your environment variables
- Check for trailing slashes and http vs https

### "Access blocked" error
- If your app is in testing mode, make sure your Gmail account is added as a test user in the OAuth consent screen
- For production, you'll need to publish your app (requires verification for sensitive scopes)

### Emails not syncing
- Check that the Gmail API is enabled in your Google Cloud project
- Verify your access token hasn't expired (tokens auto-refresh)
- Check the browser console and server logs for errors

## Security Notes

- Never commit your `GMAIL_CLIENT_SECRET` to version control
- Use environment variables for all sensitive credentials
- The refresh token allows long-term access - keep it secure
- Consider implementing token revocation if a user disconnects their account


# Fix: "App is currently being tested" Error

## Error: "Uni Tracker has not completed the Google verification process"

This happens because your OAuth consent screen is in **Testing** mode. You need to add your email as a test user.

## Quick Fix (2 minutes)

### Step 1: Go to OAuth Consent Screen

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **OAuth consent screen**

### Step 2: Add Test Users

1. Scroll down to the **Test users** section
2. Click **+ ADD USERS**
3. Enter your Gmail address: `lucas7.ableson@gmail.com`
4. Click **ADD**
5. You can add multiple test users if needed

### Step 3: Try Again

1. Go back to your app
2. Click "Connect Gmail" again
3. You should now be able to authorize the app

## Important Notes

### Testing Mode Limitations
- Only test users you add can use the app
- You can add up to 100 test users
- This is fine for personal use or small teams

### Publishing Your App (Optional)
If you want anyone to be able to use it (not just test users):

1. Go to **OAuth consent screen**
2. Click **PUBLISH APP** button
3. Note: Google may require verification for sensitive scopes
4. For personal use, staying in testing mode is usually fine

## Verification Requirements

If you publish the app, Google may require:
- Privacy policy URL
- Terms of service URL
- App verification (for sensitive scopes)
- This can take several days

**Recommendation**: For personal use, just add yourself as a test user and keep it in testing mode.


# Fixes Applied

## 1. Database Migration Issue (EmailMessage.hidden field)

### Problem
The `hidden` field was added to the schema but the migration wasn't run in production, causing errors.

### Solution Applied
- Updated `app/api/emails/route.ts` to gracefully handle missing `hidden` field
- Updated `package.json` build script to automatically run migrations: `prisma migrate deploy`

### Action Required
**You need to run the migration in production:**

#### Option A: Automatic (Recommended)
The build script now includes `prisma migrate deploy`, so migrations will run automatically on your next Vercel deployment.

#### Option B: Manual via Vercel CLI
```bash
vercel link
vercel env pull .env.production
npx prisma migrate deploy
```

## 2. Google Calendar Integration

### Changes Made
1. **Updated OAuth Scope**: Added `https://www.googleapis.com/auth/calendar.readonly` to Gmail login
2. **Added Calendar API Function**: Created `getGoogleCalendarEventsForUser()` in `lib/gmail.ts`
3. **Auto-sync on Connect**: Calendar events are automatically synced when you connect Gmail
4. **Calendar Events API**: Google Calendar events are now included in `/api/calendar/events`

### Action Required
**Update Google Cloud Console OAuth Consent Screen:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Click **Edit App**
4. Go to **Scopes** section
5. Click **Add or Remove Scopes**
6. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (should already be there)
   - `https://www.googleapis.com/auth/calendar.readonly` (NEW - add this)
7. Click **Update** then **Save and Continue**

### How It Works
- When you connect Gmail, it automatically fetches and stores your Google Calendar events
- Events appear in the Calendar tab alongside assignments, tasks, and Outlook events
- Events are stored in the database for offline access
- Calendar syncs automatically when you connect Gmail

## Next Steps

1. **Update Google Cloud Console** (add calendar scope)
2. **Redeploy to Vercel** (migrations will run automatically)
3. **Reconnect Gmail** (to get calendar access)
4. **Check Calendar tab** (your Google Calendar events should appear)

## Testing

After deploying:
1. Go to Calendar tab
2. Click "Connect Gmail" 
3. Authorize with the new calendar scope
4. Your Google Calendar events should appear in the calendar view


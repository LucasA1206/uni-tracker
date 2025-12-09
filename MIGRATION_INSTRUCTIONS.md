# Database Migration Instructions for Vercel

## Issue: Missing `hidden` field in EmailMessage table

The `hidden` field was added to the `EmailMessage` model but the migration hasn't been run in production.

## Solution: Run Migration on Vercel

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI if you haven't:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Run the migration:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

### Option 2: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Go to **Settings** > **Deploy Hooks**
3. Create a new deploy hook or use the build command
4. Add this to your `package.json` scripts:
   ```json
   "postbuild": "prisma migrate deploy"
   ```

### Option 3: Manual Migration via Vercel CLI

1. Connect to your Vercel project:
   ```bash
   vercel link
   ```

2. Pull environment variables:
   ```bash
   vercel env pull .env.production
   ```

3. Run migration:
   ```bash
   npx prisma migrate deploy
   ```

### Option 4: Add Migration to Build Process

Update your `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

This will automatically run migrations on each deployment.

## Verify Migration

After running the migration, verify it worked:

```bash
npx prisma studio
```

Or check your database directly - the `EmailMessage` table should now have a `hidden` column (Boolean, default false).

## Temporary Workaround

The code has been updated to handle the missing field gracefully, but you should still run the migration for proper functionality.


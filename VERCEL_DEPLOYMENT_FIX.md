# Vercel Deployment Fix - Database Migration Issue

## Problem
Error P3005: The database schema is not empty, but there's no migration history.

## Solution Applied
Changed the build script to use `prisma db push` instead of `prisma migrate deploy`.

### What Changed
- **Before**: `prisma migrate deploy` (requires migration history)
- **After**: `prisma db push` (works with existing databases, syncs schema)

### Why This Works
- `prisma db push` syncs your Prisma schema to the database without requiring migration history
- It's safe for production when you're only adding new fields (like the `hidden` field)
- It won't delete data - it only adds missing columns/tables

## What Happens Now
1. On each Vercel deployment:
   - Prisma Client is generated
   - Database schema is synced (adds missing `hidden` field to EmailMessage)
   - Next.js build proceeds

## Future: Proper Migrations (Optional)
If you want to use proper migrations in the future:

1. **Baseline your database:**
   ```bash
   npx prisma migrate dev --name init --create-only
   npx prisma migrate resolve --applied init
   ```

2. **Then use migrations:**
   ```bash
   npx prisma migrate dev --name add_hidden_field
   ```

3. **Update build script back to:**
   ```json
   "build": "prisma generate && prisma migrate deploy && next build"
   ```

For now, `prisma db push` is the simplest solution and will work perfectly for your use case.


#!/bin/bash
# Prisma build script that handles both migration and push scenarios

set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Attempting to deploy migrations..."
if npx prisma migrate deploy; then
  echo "Migrations deployed successfully"
else
  echo "Migration deploy failed (likely no migration history). Using db push instead..."
  npx prisma db push --accept-data-loss --skip-generate || {
    echo "Database push also failed. Continuing with build..."
  }
fi

echo "Build script completed"


#!/bin/sh
set -e

echo "Waiting for postgres..."
until npx prisma db push --schema packages/prisma/schema.prisma --skip-generate --accept-data-loss 2>&1; do
  sleep 2
done

echo "Seeding database..."
npx tsx packages/prisma/seed.ts

echo "Starting application..."
exec node apps/api/dist/main.js

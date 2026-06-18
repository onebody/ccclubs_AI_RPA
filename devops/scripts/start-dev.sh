#!/bin/bash

set -e

echo "Starting AI Browser Development Environment..."

echo "1. Starting PostgreSQL..."
docker run -d \
  --name ai-browser-postgres \
  -e POSTGRES_DB=ai_browser \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine

echo "2. Starting Redis..."
docker run -d \
  --name ai-browser-redis \
  -p 6379:6379 \
  redis:7-alpine

echo "3. Waiting for database to be ready..."
sleep 10

echo "4. Running database migrations..."
cd ../backend
npx prisma migrate dev

echo "5. Seeding database..."
npx ts-node scripts/seed.ts

echo "6. Starting backend server..."
npm run dev
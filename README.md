# Allo Inventory - Take-Home Exercise

## Live Demo
https://allo-inventory-appss.vercel.app

## GitHub
https://github.com/mukeshkannan17/allo-inventory

## Local Setup

### 1. Install dependencies
npm install

### 2. Create .env file
DATABASE_URL="your-neon-connection-string"
UPSTASH_REDIS_REST_URL="your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
CRON_SECRET="hello123"

### 3. Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

### 4. Run locally
npm run dev
Open http://localhost:3000

## How Expiry Works
A Vercel Cron job runs every hour and releases expired reservations automatically.

## Trade-offs
- Used SELECT FOR UPDATE in Postgres for concurrency safety instead of Redis locks
- Cron runs hourly on free tier instead of every minute
- Quantity fixed to 1 per reservation in UI

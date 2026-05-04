# Allo Inventory — Engineering Take-Home Exercise

A race-condition-free inventory reservation system for multi-warehouse retail brands. Built with Next.js, Prisma, PostgreSQL, and Redis.

## Live Demo

🌐 **https://allo-inventory-appss.vercel.app/login

**

## GitHub Repository

📦 **https://github.com/mukeshkannan17/allo-inventory**

---

## The Problem

When a customer proceeds to checkout, there is a race condition:
- Payment can take several minutes (3DS flows, UPI confirmations)
- During that window, thousands of other shoppers may be looking at the same product
- If we decrement stock only at payment time → two customers can pay for the same unit
- If we decrement stock at add-to-cart time → inventory looks depleted even though 80% of carts are abandoned

**The solution:** A reservation system that temporarily holds units for 10 minutes while payment is processed.

---

## Features

- ✅ Product listing with available stock per warehouse
- ✅ Race-condition-free reservation using `SELECT FOR UPDATE`
- ✅ 10-minute countdown timer on checkout page
- ✅ Confirm purchase (permanently decrements stock)
- ✅ Cancel reservation (returns stock immediately)
- ✅ Auto-expiry via Vercel Cron job
- ✅ 409 error when stock is insufficient
- ✅ 410 error when reservation has expired
- ✅ Idempotency support via `Idempotency-Key` header
- ✅ Fully typed with TypeScript end-to-end
- ✅ Seeded database with 6 products and 3 warehouses

---

## Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, easy Vercel deployment |
| Language | TypeScript | End-to-end type safety |
| Database | Neon (PostgreSQL) | Free hosted Postgres |
| ORM | Prisma | Type-safe queries and migrations |
| Cache | Upstash Redis | Idempotency key storage |
| Validation | Zod | Shared schemas across API and frontend |
| Styling | Tailwind CSS | Fast, clean UI |
| Icons | Lucide React | Lightweight icon library |
| Hosting | Vercel | Free tier with cron job support |

---

## Project Structure

```
allo-inventory/
├── app/
│   ├── api/
│   │   ├── products/route.ts          # GET /api/products
│   │   ├── warehouses/route.ts        # GET /api/warehouses
│   │   ├── reservations/
│   │   │   ├── route.ts               # POST /api/reservations
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET /api/reservations/:id
│   │   │       ├── confirm/route.ts   # POST /api/reservations/:id/confirm
│   │   │       └── release/route.ts   # POST /api/reservations/:id/release
│   │   └── cron/
│   │       └── expire/route.ts        # GET /api/cron/expire (Vercel Cron)
│   ├── reservation/[id]/page.tsx      # Checkout page with countdown timer
│   ├── page.tsx                       # Product listing page
│   └── layout.tsx
├── lib/
│   ├── prisma.ts                      # Prisma client singleton
│   ├── redis.ts                       # Upstash Redis client
│   ├── schemas.ts                     # Zod validation schemas
│   └── utils.ts                       # Utility functions
├── prisma/
│   ├── schema.prisma                  # Database schema
│   └── seed.ts                        # Database seed file
└── vercel.json                        # Cron job configuration
```

---

## API Reference

| Method | Path | Description | Success | Error |
|---|---|---|---|---|
| GET | `/api/products` | List all products with stock per warehouse | 200 | 500 |
| GET | `/api/warehouses` | List all warehouses | 200 | 500 |
| POST | `/api/reservations` | Reserve units for a product/warehouse | 201 | 409 (no stock) |
| GET | `/api/reservations/:id` | Get reservation details | 200 | 404 |
| POST | `/api/reservations/:id/confirm` | Confirm reservation (payment succeeded) | 200 | 410 (expired) |
| POST | `/api/reservations/:id/release` | Release reservation (payment failed) | 200 | 409 (already confirmed) |

---

## Data Model

```prisma
model Product {
  id           String        @id @default(cuid())
  name         String
  sku          String        @unique
  description  String?
  price        Float
  inventory    Inventory[]
  reservations Reservation[]
}

model Warehouse {
  id        String      @id @default(cuid())
  name      String
  location  String
  inventory Inventory[]
}

model Inventory {
  id            String    @id @default(cuid())
  productId     String
  warehouseId   String
  totalUnits    Int
  reservedUnits Int       @default(0)
  @@unique([productId, warehouseId])
}

model Reservation {
  id             String   @id @default(cuid())
  productId      String
  warehouseId    String
  quantity       Int
  status         String   @default("pending") // pending | confirmed | released
  expiresAt      DateTime
  idempotencyKey String?  @unique
  createdAt      DateTime @default(now())
}
```

---

## How Concurrency Safety Works

The core of this exercise is preventing two customers from reserving the same last unit simultaneously.

The solution uses **`SELECT ... FOR UPDATE`** inside a PostgreSQL transaction:

```sql
SELECT id, "totalUnits", "reservedUnits"
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

**What happens when two requests arrive simultaneously for the last unit:**

1. Request A acquires the exclusive row lock
2. Request B tries to acquire the same lock — it waits
3. Request A checks available stock → sees 1 unit → increments reservedUnits → commits
4. Request B now gets the lock → re-reads the row → sees 0 available → throws INSUFFICIENT_STOCK
5. Request B returns **409 Conflict**

This guarantees exactly-once reservation under any level of concurrency — no Redis distributed locks needed for the core path.

---

## How Reservation Expiry Works

### In Production (Vercel Cron)
A Vercel Cron job runs **every hour** and hits `/api/cron/expire`.

It finds all `pending` reservations where `expiresAt < NOW()`, sets their status to `released`, and decrements `reservedUnits` in the Inventory table so the stock becomes available again.

The cron endpoint is protected by a `CRON_SECRET` bearer token so only Vercel can trigger it.

### In the Frontend
The checkout page runs a **client-side countdown timer** using `setInterval`. When it hits zero, the UI immediately shows the expired state — no waiting for the cron to run.

### Alternative Considered
Lazy cleanup on read — check expiry when fetching inventory. This avoids needing a cron job but means expired reservations show as reserved until someone reads that row. Cron-based cleanup is more reliable for keeping available stock accurate.

---

## Bonus: Idempotency

The `POST /api/reservations` endpoint supports the `Idempotency-Key` header.

- **First request:** Run the transaction, store the response in Redis with a 24-hour TTL keyed by the idempotency key
- **Retry with same key:** Return the cached response immediately without re-running the transaction

This prevents double-reservations if a client retries due to a network timeout.

```bash
curl -X POST https://allo-inventory-appss.vercel.app/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{"productId": "...", "warehouseId": "...", "quantity": 1}'
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) account (PostgreSQL)
- A free [Upstash](https://upstash.com) account (Redis)

### 1. Clone the repository

```bash
git clone https://github.com/mukeshkannan17/allo-inventory.git
cd allo-inventory
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://your-neon-connection-string?sslmode=require"
UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
CRON_SECRET="any-random-string"
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Deployment

This app is deployed on **Vercel** with:
- **Neon** for hosted PostgreSQL
- **Upstash** for hosted Redis

### Deploy your own

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

---

## Trade-offs & What I'd Do Differently

### Deliberate simplifications
- Quantity is hardcoded to 1 per reservation in the UI (the API supports any quantity)
- No user authentication — reservation ID is the only identifier
- Cron runs hourly on free tier instead of every minute

### Why Postgres row lock over Redis distributed lock
Redis distributed locks add complexity and a second point of failure. Since Postgres is already the source of truth for inventory, a `SELECT FOR UPDATE` gives the same guarantee with less infrastructure.

### With more time I would
- Add user authentication so reservations are tied to accounts
- Add a real payment webhook to trigger confirmation
- Add React Query for better data fetching and cache invalidation
- Write integration tests for the concurrent reservation scenario
- Use a job queue (BullMQ) for more reliable expiry than cron
- Add warehouse filtering and search on the product listing page

---

## Seeded Data

The database comes pre-seeded with:

**3 Warehouses:**
- Mumbai Central (Mumbai, MH)
- Delhi North (Delhi, DL)
- Bangalore Hub (Bangalore, KA)

**6 Products:**
- Testosterone Support Kit — ₹2,499
- Men's Vitality Bundle — ₹1,799
- Sleep & Recovery Formula — ₹999
- Performance Pre-Workout — ₹1,299
- Hair Growth Serum — ₹3,299
- Omega-3 Premium Fish Oil — ₹799


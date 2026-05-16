# Order Processing System — Microservices

Production-grade e-commerce backend built with Node.js, Express, MongoDB, and Redis.

## Services

| Service              | Port  | Responsibility                                          |
| -------------------- | ----- | ------------------------------------------------------- |
| API Gateway          | 3000  | JWT auth, rate limiting, Redis caching, request routing |
| Auth Service         | 3001  | User registration, login, JWT issuance                  |
| Product Service      | 3002  | Product CRUD with independent MongoDB                   |
| Order Service        | 3003  | Order creation, idempotency, inter-service calls        |
| Notification Service | 3004  | Async order event logging (fire-and-forget)             |
| MongoDB              | 27017 | Shared container, isolated databases per service        |
| Redis                | 6379  | Rate-limit store + product response cache               |

## Quick Start

### Prerequisites

- Docker Desktop installed and running

### Run with Docker Compose

```bash
git clone https://github.com/priypatel/practical-test
cd practical-test
docker-compose up --build
```

All services start automatically. The API Gateway is available at `http://localhost:3000`.

### Run locally (dev)

Each service can be started independently:

```bash
# Terminal 1 — MongoDB + Redis
docker-compose up mongodb redis

# Terminal 2 — Auth Service
cd auth-service && npm install && npm run dev

# Terminal 3 — Product Service
cd product-service && npm install && npm run dev

# Terminal 4 — Notification Service
cd notification-service && npm install && npm run dev

# Terminal 5 — Order Service
cd order-service && npm install && npm run dev

# Terminal 6 — API Gateway
cd api-gateway && npm install && npm run dev
```

## API Reference

All routes are prefixed with `/api`. All protected routes require `Authorization: Bearer <token>` header.

### Auth

```
POST /api/auth/register   { "email": "...", "password": "...", "role": "user|admin" }
POST /api/auth/login      { "email": "...", "password": "..." }
GET  /api/auth/health
```

### Products (GET endpoints public; POST/PUT/DELETE require auth)

```
GET    /api/products
GET    /api/products/:id
POST   /api/products      { "name": "...", "description": "...", "price": 9.99, "stock": 100 }
PUT    /api/products/:id  { "price": 12.99 }
DELETE /api/products/:id
GET    /api/products/health
```

### Orders (all require auth)

```
POST /api/orders          { "items": [{ "productId": "...", "quantity": 2 }] }
GET  /api/orders
GET  /api/orders/:id
GET  /api/orders/health
```

Headers for POST /api/orders:

- `Authorization: Bearer <token>` — required
- `X-Idempotency-Key: <unique-key>` — optional, prevents duplicate orders

### Gateway Health

```
GET /health
```

## Environment Variables

Each service has its own `.env` file. Key variables:

| Variable              | Service                    | Description                               |
| --------------------- | -------------------------- | ----------------------------------------- |
| `JWT_SECRET`          | auth-service, api-gateway  | Must match in both                        |
| `MONGO_URI`           | all services               | Set via docker-compose env                |
| `REDIS_URL`           | api-gateway                | Redis connection string                   |
| `PRODUCT_SERVICE_URL` | order-service, api-gateway | Internal service URL                      |
| `RATE_LIMIT_MAX`      | api-gateway                | Max requests per window (default 100)     |
| `CACHE_TTL_SECONDS`   | api-gateway                | Product cache TTL in seconds (default 60) |

## Testing the Key Flows

```bash
BASE=http://localhost:3000

# 1. Register
curl -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'

# 2. Login — copy the token
curl -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'

TOKEN=<paste token here>

# 3. Create product
curl -X POST $BASE/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","description":"A great widget","price":19.99,"stock":50}'

PRODUCT_ID=<paste product id here>

# 4. Create order (idempotent)
curl -X POST $BASE/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-test-001" \
  -d '{"items":[{"productId":"'$PRODUCT_ID'","quantity":2}]}'

# 5. Repeat same request — returns 409 with existing order
curl -X POST $BASE/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-test-001" \
  -d '{"items":[{"productId":"'$PRODUCT_ID'","quantity":2}]}'
```

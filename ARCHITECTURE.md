# Architecture — Order Processing System

## Service Diagram

```
                          ┌─────────────────────────────────────┐
                          │           API Gateway :3000          │
                          │  • JWT verify (sets X-User-Id)       │
                          │  • Rate limiting (100 req/15min)     │
                          │  • Redis cache (GET /products, 60s)  │
                          │  • X-Request-ID tracing              │
                          │  • Centralized logging (winston)     │
                          └──────────┬──────────────────────────┘
                                     │ routes via http-proxy-middleware
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                           │
   ┌──────▼──────┐          ┌────────▼────────┐        ┌────────▼────────┐
   │Auth :3001   │          │Product :3002     │        │Order :3003      │
   │             │          │                  │        │                 │
   │ /register   │          │ GET /products    │        │ POST /orders    │
   │ /login      │          │ GET /products/:id│        │ GET /orders     │
   │             │          │ POST /products   │        │ GET /orders/:id │
   │ mongo:      │          │ PUT/DELETE ...   │        │                 │
   │ auth-db     │          │                  │        │ mongo: order-db │
   └─────────────┘          │ mongo: product-db│        └────────┬────────┘
                             └─────────────────┘                 │
                                                        ┌────────┴──────────────┐
                                                        │                       │
                                               REST (axios+retry)    fire-and-forget HTTP
                                                        │                       │
                                               ┌────────▼────────┐    ┌─────────▼───────┐
                                               │Product :3002    │    │Notification:3004 │
                                               │(validate stock) │    │                  │
                                               └─────────────────┘    │ POST /           │
                                                                       │ mongo:notif-db   │
                                                                       └──────────────────┘

        ┌──────────────────────────────────────────┐
        │                  Redis                    │
        │  • Rate-limit counters (express-rate-limit│
        │  • Product GET cache (TTL: 60s)           │
        └──────────────────────────────────────────┘
```

---

## Layer Architecture (every service)

```
routes/     → Express router: URL + method → controller
controllers → thin HTTP layer: parse req, call service, send res
services/   → all business logic: DB queries, inter-service calls
models/     → Mongoose schema only
```

This separation makes each layer independently testable and keeps concerns isolated.

---

## Service Communication

| From | To | Method | Why |
|---|---|---|---|
| Client | API Gateway | HTTP REST | Single entry point |
| API Gateway | Auth/Product/Order/Notification | HTTP Proxy | Transparent routing |
| Order Service | Product Service | REST (axios + retry) | Synchronous: need product data to build order |
| Order Service | Notification Service | Fire-and-forget HTTP | Async: notification is non-critical path |

**Critical constraint:** Order Service never accesses the product database directly. It always calls the Product Service REST API and snapshots the product name/price into the order document at creation time. This decouples the two services completely.

---

## Key Design Decisions

### Independent Databases
Each service uses its own MongoDB database (`auth-db`, `product-db`, `order-db`, `notification-db`). In development they share one MongoDB container; in production each would have its own instance. This enforces service boundaries — no cross-service DB queries are possible.

### Idempotency (Duplicate Order Prevention)
Clients send `X-Idempotency-Key` header with each order request. The Order Service checks MongoDB for an existing order with that key before processing. If found, it returns the existing order with HTTP 409. This prevents double-charging if a client retries due to a network timeout.

### Redis Caching Strategy
- `GET /api/products` and `GET /api/products/:id` responses are cached with a 60-second TTL.
- The cache key is the full request URL (`cache:/api/products/...`).
- On any write (`POST`, `PUT`, `DELETE`) to `/api/products`, all keys matching `cache:/api/products*` are deleted from Redis.
- `X-Cache: HIT` or `MISS` header is returned so you can observe cache behavior.

### Distributed Request Tracing
Every request entering the API Gateway gets a `X-Request-ID` UUID header generated (or passed through if the client provided one). This header is forwarded to all downstream services. Each service logs it via winston's `defaultMeta`. In production, this ID would be sent to Jaeger or Zipkin for full distributed tracing visualization.

---

## Mandatory Architecture Questions

### 1. How would you prevent cascading failures in microservices?

- **Rate limiting at the gateway** prevents a single client from flooding the system.
- **Timeouts** on all inter-service HTTP calls (5s in `productClient.js`). A slow service doesn't block the caller forever.
- **Retry with exponential backoff** (`axios-retry`) handles transient failures without hammering a struggling service.
- **Fire-and-forget for non-critical paths** (Notification Service) — its failure never propagates back to the caller.
- **Production addition:** Circuit breaker pattern (e.g., `opossum` library) — after N consecutive failures to a service, the circuit opens and fast-fails for a cooldown period instead of queuing up slow requests.

### 2. How would you handle distributed transactions?

This system uses the **Saga pattern (choreography style)**:

- Each service performs its local transaction and then emits an event.
- If the Order Service successfully creates an order but the stock deduction fails later, a compensating transaction (re-stock event) is triggered.
- In this implementation, we demonstrate the concept through: (a) product validation before order creation, (b) atomic MongoDB `create`, (c) status field (`pending → confirmed`) to model state transitions.
- In production with RabbitMQ/Kafka: Order Service publishes `order.created` event; Product Service listens and deducts stock; if deduction fails, it publishes `order.failed`; Order Service listens and marks order cancelled.

### 3. What happens if Notification Service goes down?

- The Order Service uses fire-and-forget: it does **not** `await` the notification call.
- The call is wrapped in `.catch()` — if Notification Service is unreachable, the error is logged as a warning and swallowed.
- The order creation response is returned to the client **before** the notification attempt even completes.
- **Result:** Orders continue to be created successfully. Notifications are lost for that window.
- **Production solution:** Use a message queue (RabbitMQ dead-letter queue). Order Service publishes to a queue; Notification Service consumes. If it's down, messages wait in the queue and are processed when it recovers. No notifications are lost.

### 4. How would you scale this system for 10 million users?

| Layer | Strategy |
|---|---|
| API Gateway | Horizontal scaling behind an L7 load balancer (Nginx/ALB). Stateless — no shared memory. |
| Auth Service | Horizontal scaling. JWTs are stateless so any instance can verify any token. |
| Product Service | Horizontal scaling + read replicas in MongoDB for product catalog reads. |
| Order Service | Horizontal scaling. Idempotency keys prevent duplicate orders across instances. |
| Notification Service | Queue-backed (RabbitMQ). Scale consumers independently based on queue depth. |
| MongoDB | Replica sets for HA, sharding for write throughput at scale. |
| Redis | Redis Cluster for cache and rate-limit store. |
| Infrastructure | Kubernetes with HPA (Horizontal Pod Autoscaler) based on CPU/RPS metrics. |
| CDN | Static assets and public product data served from CDN edge nodes. |

### 5. Why async communication over synchronous communication?

| Sync (REST) | Async (Queue/Events) |
|---|---|
| Caller waits for response | Caller publishes and moves on |
| Tight coupling — if target is down, caller fails | Loose coupling — target can be down, message waits |
| Harder to scale independently | Each service scales at its own rate |
| Simpler to implement and debug | Higher throughput, better fault isolation |

**In this system:**
- Order → Product is **sync** because we need the product price/name immediately to build the order.
- Order → Notification is **async** (fire-and-forget) because a notification failure must never fail an order. The notification is a side effect, not a prerequisite.
- At scale, even Order → Product should become async via a saga to avoid tight coupling.

---

## Bonus Features Implemented

### Redis Caching
- Product listing cached at gateway level (60s TTL)
- Cache invalidated on write operations
- `X-Cache: HIT/MISS` response header for observability

### Distributed Request Tracing Concept
- `X-Request-ID` UUID generated at gateway
- Forwarded to all downstream services
- Logged via structured winston JSON logging
- Foundation for integrating Jaeger/Zipkin in production

### Rate Limiting
- 100 requests per 15 minutes per IP
- Stored in Redis (survives gateway restarts and works across multiple instances)
- Returns `429 Too Many Requests` with `Retry-After` header

---

## Security Decisions

- Passwords hashed with bcrypt (10 salt rounds) — never stored in plaintext.
- JWT signed with `HS256`. Secret must be rotated and stored in a secrets manager (Vault/AWS Secrets Manager) in production.
- Internal services (Product, Order, Notification) are not exposed publicly — only the API Gateway port (3000) is mapped to the host.
- JWT verification happens at the gateway; downstream services trust the `X-User-Id` header. In production, use mTLS between internal services for stronger guarantees.
- Rate limiting prevents brute-force attacks on auth endpoints.

---

## Production Additions (not in this implementation)

- **Kafka/RabbitMQ** for reliable async messaging between Order and Notification
- **Circuit breaker** (`opossum`) on all inter-service calls
- **Kubernetes** with HPA, resource limits, liveness/readiness probes
- **Centralized log aggregation** (ELK stack or Grafana Loki)
- **Full distributed tracing** (Jaeger + OpenTelemetry)
- **CI/CD pipeline** (GitHub Actions → Docker Hub → K8s rollout)
- **Secrets management** (Vault or AWS Secrets Manager instead of `.env` files)

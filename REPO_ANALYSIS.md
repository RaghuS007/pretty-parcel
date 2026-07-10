# Pretty Parcel - Full Repository Analysis

## Overview

An Indian jewellery/hair accessories e-commerce app ("The Pretty Parcel by Neems") built as a single deployable unit on Cloudflare - Expo web static assets + Workers API + D1 (SQLite) database.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Deployment (single wrangler deploy)         │
│                                                         │
│  ┌───────────────┐   ┌──────────────────────────────┐  │
│  │ Static Assets │   │  Worker (/api/*)              │  │
│  │ (Expo export) │   │  server/index.ts + lib.ts    │  │
│  │  dist/        │   │         │                     │  │
│  └───────────────┘   │    ┌────▼────┐               │  │
│                       │    │ D1 (SQL)│               │  │
│                       │    └─────────┘               │  │
│                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key design principle:** Repository pattern as the seam. Screens never call `fetch` directly - they use interfaces in `src/repository/types.ts`. At runtime, `EXPO_PUBLIC_API_URL` determines whether `ApiRepository` (live) or `MockRepository` (offline/demo) is used.

---

## Stack Breakdown

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Expo 57 / React Native 0.86, expo-router | File-based routing in `app/` |
| State | Zustand 5 + AsyncStorage persistence | Cart, wishlist, auth, orders |
| Backend | Cloudflare Worker (plain TS, zero deps) | `server/index.ts` is the entire API |
| Database | Cloudflare D1 (SQLite) | 3 migrations, integer paise for money |
| Deploy | `pnpm deploy` = expo export + wrangler deploy | Single command |

---

## Data Flow (Money)

- **DB/API**: integer paise (`price_paise`, `mrp_paise`, `total_paise`)
- **Frontend `Product.price`**: rupees (float)
- **Conversion**: `ApiRepository.mapProduct()` divides by 100
- **Server-authoritative checkout**: `POST /api/orders` recomputes totals from DB, ignores client values

---

## API Endpoints (13 routes)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /products` | Public | Catalog listing (sort: popular/new) |
| `GET /products/:id` | Public | Single product |
| `GET /coupons` | Public | All coupons |
| `POST /coupons/validate` | Public | Check coupon validity |
| `POST /auth/send-otp` | Public | OTP login initiation |
| `POST /auth/verify-otp` | Public | OTP verification + session creation |
| `POST /auth/logout` | Public | Session destruction |
| `GET /auth/me` | Session | Current user |
| `GET /orders` | Session | Customer's orders |
| `POST /orders` | Session | Place order (price-authoritative) |
| `GET /admin/orders` | Admin | All orders |
| `POST /admin/orders/status` | Admin | Update order status |
| `GET /admin/products` | Admin | All products (inc. inactive) |
| `PUT /admin/products` | Admin | Edit product |
| `POST /admin/coupons/active` | Admin | Toggle coupon active state |

---

## Auth System

- OTP-based login (no password)
- SHA-256 hashed session tokens stored in D1 `sessions` table
- HttpOnly `pp_session` cookie, 30-day TTL
- Admin = mobile in `ADMIN_MOBILES` env var (default `9999999999`)
- Dev mode: OTP returned in response (no SMS gateway integrated)
- Rate limiting: 30s cooldown between OTP sends, max 5 attempts, 10min expiry

---

## Database Schema (5 tables + 1 utility)

1. **users** - mobile (PK), name, role
2. **otp_codes** - mobile (PK), hashed code, expiry, attempts
3. **sessions** - token_hash (PK), mobile FK, expiry
4. **products** - 16 columns inc. stock_quantity, is_active
5. **orders** - order_number (customer-facing), all prices in paise, JSON shipping_address
6. **order_items** - composite PK (order_id, product_id), ON DELETE CASCADE

---

## Stock Management

The `createOrder` handler implements a race-condition-safe stock decrement:
1. Fast-path advisory check (non-blocking)
2. Guarded `UPDATE ... WHERE stock_quantity >= qty` in a batch
3. If any decrement reports 0 changes (lost race), compensates by deleting the order and restoring stock for successful decrements

**Known gap (marked as TODO):** Cancelling an order does NOT restock items.

---

## Frontend Screens

| Route | Screen |
|-------|--------|
| `(tabs)/index` | Home (hero, bestsellers, categories, reviews) |
| `(tabs)/shop` | Product grid with filters |
| `(tabs)/cart` | Cart with coupon, address, checkout |
| `(tabs)/account` | Profile, orders, wishlist |
| `(tabs)/product/[id]` | Product detail page |
| `auth/login` | Mobile number entry |
| `auth/otp` | OTP verification |
| `admin/` | Dashboard, products, orders, coupons management |
| `checkout/success` | Order confirmation |

---

## Strengths

1. **Clean separation of concerns** - Repository pattern makes it trivial to swap backends or run fully offline
2. **Server-authoritative pricing** - Client can't manipulate totals; server recomputes from DB
3. **Single deployment** - One `pnpm deploy` ships frontend + API + DB migrations
4. **Secure auth** - SHA-256 hashed tokens, HttpOnly cookies, OTP rate limiting, attempt caps
5. **Race-condition handling** - Stock decrement uses guarded updates + compensation for concurrent orders
6. **Zero backend dependencies** - Worker has no npm runtime deps, just TypeScript
7. **Well-structured D1 schema** - Proper constraints, CHECK clauses, cascading deletes, indexes
8. **Good money handling** - Integer paise eliminates floating-point rounding errors

---

## Weaknesses / Risks

1. **No test suite** - Zero automated tests
2. **No SMS gateway** - OTP is returned in response (dev mode only); production needs integration
3. **Cancel doesn't restock** - Explicit TODO in code; stock leaks on cancellations
4. **D1 placeholder** - `database_id` still says `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.toml`
5. **No pagination** - All product/order listing endpoints return full result sets; will degrade at scale
6. **No image upload** - Product images are URLs managed externally; no upload mechanism
7. **No payment integration** - Supports COD/UPI/card labels but no actual payment processing
8. **Session cleanup is opportunistic** - Expired sessions only get cleaned during `verifyOtp`, not proactively
9. **No CSRF protection** - Relies solely on SameSite=Lax cookie; fine for GET-immune routes but worth noting
10. **Single admin check** - `ADMIN_MOBILES` env var is the only RBAC mechanism; no granular permissions
11. **No rate limiting beyond OTP** - API endpoints (catalog, orders) have no request rate limiting
12. **`db:migrate` script only runs 0001** - Later migrations (0002, 0003) require separate commands

---

## Code Quality

- TypeScript throughout with strict typing (separate tsconfigs for Expo and Workers)
- Consistent code style, well-organized file structure
- Clear naming conventions (DB: snake_case, API: camelCase, with explicit serializers bridging them)
- Home screen is an 834-line component - could benefit from extraction but functionally fine
- Zustand store is properly partitioned (excludes ephemeral toast from persistence)

---

## Deployment Readiness

**To go production:**
1. Run `wrangler d1 create pretty-parcel-db` and update `database_id`
2. Apply all 3 migrations sequentially
3. Integrate an SMS provider in `sendOtp()`
4. Set `OTP_DEV_MODE=false`
5. Implement restock on cancel
6. Add pagination for listings
7. Wire real payment processing

The codebase is well-architected for a solo/small-team project. The repository pattern and server-authoritative design mean it can evolve without major refactors.

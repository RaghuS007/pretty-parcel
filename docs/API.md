# API Contract — `/api/*` (Cloudflare Worker + D1)

Source: `server/index.ts`. Client: `src/repository/ApiRepository.ts`. Money = integer paise unless noted. Errors: `{ "error": string }` with 4xx/5xx.

## Auth
Session = HttpOnly cookie `pp_session` (30 d, SHA-256 hashed in `sessions` table). 🔒 = signed-in, 👑 = admin role (403 otherwise).

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/send-otp` | `{mobile}` (`^[6-9]\d{9}$`) | `{ok, devOtp?}` — devOtp only when `OTP_DEV_MODE=true`; 429 on <30 s resend |
| POST | `/api/auth/verify-otp` | `{mobile, otp, name?}` | `{user:{mobile,name,role}}` + Set-Cookie; 10 min expiry, 5 attempts max |
| GET | `/api/auth/me` 🔒 | — | `{user}` |
| POST | `/api/auth/logout` | — | `{ok}` + clears cookie |

## Catalog
Only active products (`isActive: true`) are visible to customers: `GET /api/products` excludes inactive rows for every sort, and `GET /api/products/:id` 404s if the product is inactive. Ordering an inactive product returns 400 "Some items in your cart are no longer available".

| Method | Path | Notes |
|---|---|---|
| GET | `/api/products?sort=popular\|new` | Active products only, full catalog (legacy shape, no `limit`). `{products:[{id,name,cat,sub,pricePaise,mrpPaise,material,collection,tags[],rating,reviews,bestseller,isNew,icon,images[],isActive,stockQuantity}]}` |
| GET | `/api/products?sort=popular\|new&limit=N&offset=N` | Paged. `{products:[...], total, limit, offset, hasMore}` |
| GET | `/api/products/:id` | `{product}` or 404 (also 404 if inactive) |
| GET | `/api/admin/products` 👑 | All products, including inactive ones → `{products:[...]}` |
| PUT | `/api/admin/products` 👑 | Body `{id, ...partial fields, isActive?, stockQuantity?}` (paise prices) → `{product}` updated. `stockQuantity` must be a non-negative integer or 400 |

## Images (R2)
Backed by the `IMAGES` R2 bucket (`pretty-parcel-images`). Uploaded keys are UUID-based (`products/<uuid>.<ext>`) — the extension is derived server-side from the validated MIME type, never from the client's filename. Returned URLs (`/api/images/<key>`) are **same-origin relative paths**, not absolute — they work unmodified once deployed (web assets and the API share an origin), and the client (`ApiRepository.resolveImageUrl`) only resolves them against the API's own origin for local dev, where the Expo web server and `wrangler dev` run on different ports.

| Method | Path | Body → Response |
|---|---|---|
| POST | `/api/admin/upload` 👑 | `multipart/form-data` with a `file` field. Allowed types: `image/jpeg`, `image/png`, `image/webp`; max 5 MB. 400 otherwise. → 201 `{url, key}` |
| DELETE | `/api/admin/upload` 👑 | `{key}` → `{ok}`. Best-effort object cleanup (e.g. when an admin replaces an image); `key` must match `^products/[\w-]+\.(jpg\|jpeg\|png\|webp)$` or 400. No orphan GC job — this is the only cleanup path |
| GET | `/api/images/*` | Public, no auth. Streams the R2 object for the given key with its stored `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`. 404 if the key doesn't match the safe pattern above or the object doesn't exist |

**Pagination** (`GET /api/products`): presence of `limit` switches the response to the paged shape — absence gives the exact legacy shape (`{products:[...]}`, full catalog, no `total`/`hasMore`), so existing callers are unaffected. Both params must parse as integers or the request 400s ("limit must be an integer" / "offset must be an integer"); non-integer/non-numeric values (e.g. `limit=abc`) are rejected this way. In-range values are then clamped rather than rejected: `limit` to `[1, 100]` (so `limit=0` → `1`, `limit=500` → `100`), `offset` to `>= 0` (so `offset=-1` → `0`). `total` and `hasMore` are computed from a `SELECT COUNT(*)` using the same `WHERE`/filters as the page query (currently `is_active = 1`). The `popular` and `new` sorts append `, id` as a tiebreaker so repeated identical requests return pages in the same order (both sorts are non-unique on their primary keys alone).

## Coupons
Coupon values are **rupees** (`pct`: percent; `flat`: whole ₹; `min`: rupee threshold).

| Method | Path | Body → Response |
|---|---|---|
| GET | `/api/coupons` | `{coupons:{CODE:{type,value,min?,label,isActive}}}` |
| POST | `/api/coupons/validate` | `{code, subtotal(₹)}` → `{valid, discount(₹), msg}` |
| POST | `/api/admin/coupons/active` 👑 | `{code, isActive}` → `{ok}` |

## Orders
Server recomputes all prices from D1; client totals are ignored. Shipping: free ≥ ₹999, else ₹79.

Checkout is stock-authoritative: `POST /api/orders` recomputes availability against `products.stock_quantity` and decrements it atomically as part of the same order-insert batch. D1 has no interactive transactions, so a guarded `UPDATE ... WHERE stock_quantity >= ?` that loses a concurrent race is detected after the batch (via `meta.changes`) and compensated (order deleted, stock given back) rather than prevented up front — either way, the client only ever sees a clean success or a clean 409, never a partial order.
- 409 (fast-path, cart qty exceeds known stock): `{"error": "Only 2 left of Jhilmil Jhumkas"}` (semicolon-joined if multiple items)
- 409 (race lost to a concurrent checkout after the fast-path check passed): `{"error": "Jhilmil Jhumkas just sold out while you were checking out. Please update your cart and try again."}`

| Method | Path | Body → Response |
|---|---|---|
| POST | `/api/orders` 🔒 | `{items:[{id,qty}], couponCode?, shippingAddress, paymentMethod}` → 201 `{order}`, or 409 if stock is insufficient |
| GET | `/api/orders` 🔒 | `{orders:[…]}` (own orders, newest first) |
| GET | `/api/admin/orders` 👑 | `{orders:[…]}` (all, includes `mobile`) |
| POST | `/api/admin/orders/status` 👑 | `{orderId: orderNumber, status: processing\|shipped\|delivered\|cancelled}` → `{ok}` |

Order shape: `{id(uuid), orderNumber("PP-ORD-…"), mobile, items:[{id,qty,unitPricePaise}], subtotalPaise, discountPaise, shippingPaise, totalPaise, couponCode, paymentMethod, status, shippingAddress, createdAt(ISO)}`

## Local smoke test
```bash
pnpm db:migrate:local && pnpm db:seed:local && pnpm api:dev
curl -s localhost:8787/api/products | head -c 200
OTP=$(curl -s -X POST localhost:8787/api/auth/send-otp -H 'Content-Type: application/json' -d '{"mobile":"9999999999"}' | sed -n 's/.*"devOtp":"\([0-9]*\)".*/\1/p')
curl -s -c /tmp/jar -X POST localhost:8787/api/auth/verify-otp -H 'Content-Type: application/json' -d "{\"mobile\":\"9999999999\",\"otp\":\"$OTP\"}"
curl -s -b /tmp/jar localhost:8787/api/admin/orders
```

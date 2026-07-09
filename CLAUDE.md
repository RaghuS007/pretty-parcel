# Pretty Parcel — AI Agent Guide

E-commerce app ("The Pretty Parcel by Neems", Indian jewellery/hair accessories).
One repo, one Cloudflare deployment: Expo web build (static assets) + `/api/*` Worker + D1 database.

## Stack
- **Frontend**: Expo 57 / React Native 0.86, expo-router (file-based routes in `app/`), Zustand + AsyncStorage. Read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code — APIs changed.
- **Backend**: Cloudflare Worker, plain TS, zero runtime deps — `server/index.ts` (router/handlers), `server/lib.ts` (auth, serializers). D1 (SQLite): `server/migrations/`, `server/seed.sql`.

## Commands
```bash
pnpm install            # deps (pnpm only; workspace allowlists workerd/esbuild builds)
pnpm typecheck          # tsc for app AND server — run before every commit
pnpm start / pnpm web   # Expo dev
pnpm api:dev            # API-only on :8787 (local D1, skips expo export)
pnpm db:migrate:local && pnpm db:seed:local   # local D1 schema + seed
pnpm db:migrate && pnpm db:seed               # remote D1 (needs real database_id in wrangler.toml)
pnpm deploy             # expo export + wrangler deploy (assets + API together)
```
No test suite exists. Verify API changes with `pnpm api:dev` + curl.

## Architecture rules
- **Repository pattern is the seam**: screens call interfaces in `src/repository/types.ts` only. `src/repository/index.ts` picks `MockRepository` (AsyncStorage, offline demo) vs `ApiRepository` (live backend) based on `EXPO_PUBLIC_API_URL` env var (empty ⇒ mock). Never call `fetch` from screens.
- **Money**: DB + API use integer **paise** (`pricePaise`); frontend `Product.price` is **rupees**. `ApiRepository` converts (`/100`). Coupons: `pct` value = percent, `flat` value = whole rupees.
- **Auth**: OTP login → HttpOnly `pp_session` cookie (SHA-256 hashed in D1 `sessions`). Admin = mobile listed in `ADMIN_MOBILES` wrangler var (default `9999999999`). Admin routes are enforced **server-side** (`withAdmin`); client-side guards are cosmetic only.
- **Server is price-authoritative**: `POST /api/orders` recomputes subtotal/coupon/shipping from D1, ignores client totals. Shipping constants in `server/lib.ts` mirror `THEME.layout` in `src/constants/theme.ts` — change both together.
- **OTP delivery**: no SMS gateway; `OTP_DEV_MODE=true` returns the code in the send-otp response. Mock mode OTP is `123456`.

## Key paths
- `app/` — screens: `(tabs)/` shop/cart/account, `admin/` back-office, `auth/` OTP login
- `src/repository/` — data access seam (types, Mock, Api, selector)
- `src/data/types.ts` — canonical frontend types; `src/data/mockProducts.ts` — demo catalog (mirrored in `server/seed.sql`)
- `src/store/useStore.ts` — Zustand store (cart, wishlist, user, orders)
- `server/` — the entire backend; `docs/API.md` — full endpoint contract
- `wrangler.toml` — deploy config (D1 binding, vars); `server/wrangler.dev.toml` — API-only local dev

## Gotchas
- `wrangler.toml` `database_id` is a placeholder until `wrangler d1 create pretty-parcel-db` is run once.
- `server/` has its own tsconfig (workers-types); it is excluded from the root Expo tsconfig.
- Seeds use `INSERT OR IGNORE` — re-running never clobbers admin edits.
- Order ids: API `order.id` is an internal UUID; customers see `orderNumber` (`PP-ORD-…`); admin status updates key on `orderNumber`.

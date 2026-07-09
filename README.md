# Pretty Parcel — Frontend Mobile Application Configuration

This directory contains the Expo React Native application for "The Pretty Parcel by Neems".

## Environment Configuration

The application supports dynamic switching between **Live API Mode** and **Offline Demo/Mock Mode** using the environment variable `EXPO_PUBLIC_API_URL`.

### 1. Offline Demo/Mock Mode (Default)
If the environment variable `EXPO_PUBLIC_API_URL` is **unset or empty**, the application dynamically selects the mock repositories.
- Customer OTP code: `123456` (any 10-digit mobile phone starting with 6-9).
- **Admin credentials**: Use mobile number `9999999999` and verification OTP code `123456`.
- Data persistence is client-side only (via AsyncStorage).
- **Production web deployment**: Deployed static builds will automatically fall back to this mode to remain functional for public demos.

### 2. Live API Mode
The persistent backend lives in this repo: a Cloudflare Worker (`server/`) backed by a D1 (SQLite) database, deployed together with the static web assets by `wrangler deploy`. See `docs/API.md` for the endpoint contract and `CLAUDE.md` for setup commands.

**One-time backend setup**:
```bash
pnpm wrangler d1 create pretty-parcel-db   # paste the id into wrangler.toml database_id
pnpm db:migrate && pnpm db:seed            # schema + catalog/coupons/admin seed
pnpm deploy                                # expo export + wrangler deploy
```

To link the application to the live API, define the API base URL before starting the packager or building the static bundle:

**Local Development** (`pnpm api:dev` serves the API on :8787):
Set the variable in your shell or a `.env` file at the root of `pretty-parcel/`:
```env
EXPO_PUBLIC_API_URL=http://localhost:8787/api
```

**Production Web Build / Deploy**:
To wire up a live production server:
```bash
EXPO_PUBLIC_API_URL=https://your-production-domain.com/api npx expo export --platform web
```

---

## Security Architecture & Auth Reality

> [!WARNING]
> **Client-Side Authorization Limitation**:
> Because the production web deployment is built as static client-side assets (Expo Web) hosted on Cloudflare Workers/Pages, all admin page access controls and routing guards are enforced **in-browser only**. A determined malicious actor can bypass client-side checks by modifying JavaScript execution or local state.
>
> **Server-Side Enforcement (implemented)**:
> The live API backend (`server/`) enforces real authorization:
> 1. All `/api/admin/...` endpoints verify the session cookie server-side and return 403 for non-admin accounts (`withAdmin` in `server/index.ts`).
> 2. Sessions are stored as SHA-256 token hashes in D1 with 30-day expiry; the admin role is granted only to mobiles listed in the `ADMIN_MOBILES` wrangler var.
> 3. Order pricing is server-authoritative — subtotals, coupon discounts, and shipping are recomputed from the database on `POST /api/orders`, so tampered client totals are ignored.

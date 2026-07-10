# Pretty Parcel — The Pretty Parcel by Neems

An e-commerce application for Indian jewellery and hair accessories, built with **Expo 57 / React Native** (frontend) and a **Cloudflare Worker + D1** (backend API).

---

## Running Locally

### Prerequisites

| Tool | Version | Install |
| :--- | :--- | :--- |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | 9+ | `npm install -g pnpm` |

### Option A — Mock / Offline Mode (Quickest)

No backend needed. Uses client-side mock data via AsyncStorage.

```bash
# 1. Install dependencies
pnpm install

# 2. Start the Expo web dev server
pnpm web
```

Open **http://localhost:8081** in your browser. That's it!

### Option B — Live API Mode (Full Stack)

Runs the Cloudflare Worker API locally with a D1 SQLite database.

```bash
# 1. Install dependencies
pnpm install

# 2. Create a .env file at the project root
#    (tells the frontend to use the local API server)
echo EXPO_PUBLIC_API_URL=http://localhost:8787/api > .env

# 3. Initialize the local D1 database (schema + seed data)
pnpm db:migrate:local
pnpm db:seed:local

# 4. Start the API server (runs on http://localhost:8787)
pnpm api:dev

# 5. In a second terminal, start the Expo web dev server
pnpm web
```

Open **http://localhost:8081** in your browser. The frontend will talk to your local API at `localhost:8787`.

> [!TIP]
> You can verify the API is running by visiting **http://localhost:8787/api/products** in your browser — you should see a JSON list of products. The root URL (`localhost:8787/`) returns `{"error":"Not found"}` by design, since only `/api/*` routes are handled by the worker.

### Test Credentials

**Mock / Offline Mode** (no `.env` file):

| Role | Mobile Number | OTP Code |
| :--- | :--- | :--- |
| **Customer** | Any 10-digit number starting with 6–9 (e.g. `9876543210`) | `123456` |
| **Admin** | `9999999999` | `123456` |

**Live API Mode** (`.env` with `EXPO_PUBLIC_API_URL`):

| Role | Mobile Number | OTP Code |
| :--- | :--- | :--- |
| **Customer** | Any 10-digit number starting with 6–9 (e.g. `9876543210`) | **Read the code from the success message** after clicking "Send OTP" — the OTP is randomly generated each time (e.g. `Demo code: 482910`). |
| **Admin** | `9999999999` | Same — read the dynamic code from the success message. |

> [!IMPORTANT]
> In Live API mode the OTP is **not** `123456`. The backend generates a random 6-digit code and, because `OTP_DEV_MODE` is enabled, displays it in the response message (e.g. `"OTP sent successfully! Demo code: 482910"`). Copy that code into the verification field.

---

## Environment Configuration

The application dynamically switches between **Live API Mode** and **Offline Demo/Mock Mode** based on the `EXPO_PUBLIC_API_URL` environment variable (see `src/repository/index.ts`).

| `EXPO_PUBLIC_API_URL` | Mode | Data Layer |
| :--- | :--- | :--- |
| *unset or empty* | Mock / Offline | `MockRepository` — client-side AsyncStorage |
| `http://localhost:8787/api` | Live API (local) | `ApiRepository` → Cloudflare Worker + local D1 |
| `https://your-domain.com/api` | Live API (production) | `ApiRepository` → deployed Worker + remote D1 |

### Production Deployment

**One-time backend setup**:
```bash
pnpm wrangler d1 create pretty-parcel-db   # paste the id into wrangler.toml database_id
pnpm db:migrate && pnpm db:seed            # schema + catalog/coupons/admin seed
pnpm deploy                                # expo export + wrangler deploy
```

**Production web build** (with a live API):
```bash
EXPO_PUBLIC_API_URL=https://your-production-domain.com/api npx expo export --platform web
```

---

## Useful Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install all dependencies |
| `pnpm web` | Start Expo dev server (web) |
| `pnpm start` | Start Expo dev server (all platforms) |
| `pnpm api:dev` | Start local API server on `:8787` |
| `pnpm db:migrate:local` | Apply D1 schema to local SQLite |
| `pnpm db:seed:local` | Seed local DB with demo products, coupons, and admin user |
| `pnpm typecheck` | Run TypeScript checks for both app and server |
| `pnpm deploy` | Build Expo web + deploy Worker to Cloudflare |

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

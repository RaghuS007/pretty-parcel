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
To link the application to the persistent Next.js/Redis backend database, define the API base URL before starting the packager or building the static bundle:

**Local Development**:
Set the variable in your shell or a `.env` file at the root of `pretty-parcel/`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
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
> **Server-Side Enforcement Directive**:
> Once the live API backend is activated:
> 1. Real authorization MUST be enforced on all administrative API endpoints (e.g. `/api/admin/...`) on the server.
> 2. The server must verify user sessions and block non-admin accounts directly from accessing databases or executing mutations.
> 3. All administrative operations in the screens are structured to flow through the repository pattern interfaces (in `src/repository`), meaning that swapping authentication to a fully secure server model will require zero changes to UI code.

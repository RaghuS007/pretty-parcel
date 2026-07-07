# Pretty Parcel — Frontend Mobile Application Configuration

This directory contains the Expo React Native application for "The Pretty Parcel by Neems".

## Environment Configuration

The application supports dynamic switching between **Live API Mode** and **Offline Demo/Mock Mode** using the environment variable `EXPO_PUBLIC_API_URL`.

### 1. Offline Demo/Mock Mode (Default)
If the environment variable `EXPO_PUBLIC_API_URL` is **unset or empty**, the application dynamically selects the mock repositories.
- OTP code is hardcoded to `123456`.
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

### Local Development Startup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Expo development server:
   ```bash
   npm run web
   ```

### Production Security Guards
For security and robustness:
- If `EXPO_PUBLIC_API_URL` contains `localhost` or `127.0.0.1` but the build is exported for **production web deployment** (`__DEV__` is false), the app enforces **Mock Mode** automatically. This prevents production bundles from trying to access `localhost` on the client's local machine.

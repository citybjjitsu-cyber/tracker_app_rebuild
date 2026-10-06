# Capacitor Development

CKB Tracker now includes a thin Capacitor wrapper for the existing deployed web application. The wrapper does not duplicate the Next.js UI or enable offline authenticated data.

## Configuration

`capacitor.config.ts` loads `CAPACITOR_SERVER_URL` when provided. Without it, native builds load the current Vercel deployment:

```text
https://ckb-tracker.vercel.app
```

For local development, set a device-reachable URL before syncing:

```bash
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npm run cap:sync
```

Use the host machine's LAN address instead of `10.0.2.2` on a physical device. Cleartext HTTP is enabled only when the configured URL uses `http://`.

## Native Projects

- `android/` is opened and built with Android Studio and a supported JDK.
- `ios/` is opened and built with Xcode on macOS.
- `@aparajita/capacitor-secure-storage` is registered in both native projects.
- `src/lib/nativeSessionStorage.ts` provides the Keychain/Keystore-backed token storage boundary for the native authentication phase.

## Commands

```bash
npm install
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Native builds use the bearer-token session adapter: login returns access and refresh tokens, refresh rotates and securely replaces both tokens, and logout revokes bearer credentials before clearing secure storage. Browser authentication remains cookie-based and unchanged.

Native authentication and the responsive app experience have been tested successfully on a physical phone and desktop browser, including login, refresh rotation, logout, session expiry, role-aware routes, kiosk flows, and recovery behavior. Platform-specific signing, release builds, and broader device-matrix validation remain before store distribution.

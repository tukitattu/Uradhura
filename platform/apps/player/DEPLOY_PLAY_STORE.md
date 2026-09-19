# Publish Uradhura Player to the Google Play Store

This app builds with **EAS Build** (Expo's cloud build — no JDK/Android SDK needed
on the dev machine). The repo is already configured; the steps below are what a
human with an Expo + Play Console account has to run.

## 0. What's already in place

| File | Purpose |
| --- | --- |
| `app.json` | versionCode, adaptive icon, splash, `com.uradhura.player` package, `INTERNET`-only permissions |
| `assets/{icon,adaptive-icon,splash}.png` | placeholder artwork (regenerate with `scripts/gen-icons.mjs` — replace with real art before store review) |
| `eas.json` | `development` / `preview` (sideload APK) / `production` (Play AAB) profiles + `submit` |
| `.env.example` / `.env` | `EXPO_PUBLIC_API_URL` — REST + Socket.IO backend base for phone builds |
| `expo-build-properties` | `usesCleartextTraffic: true` (needed for HTTP dev servers; set `false` once you serve HTTPS) |
| `src/lib/socket.ts` | derives the Socket.IO origin from the same URL (namespaces are at the server root, not `/api/v1`) |

The dependency matrix was also fixed so the app actually compiles (Expo SDK 57 was
previously pinned against RN 0.73; now aligned to react-native 0.86.3 / React 19.2.3 —
full Android bundle builds successfully under Metro).

## 1. Backend must be reachable from phones

The phone talks to the API + Socket.IO at `EXPO_PUBLIC_API_URL`.

- **Dev / preview on your LAN:** the value in `eas.json → preview.env` and `.env`
  (`http://192.168.0.136:4002/api/v1`). Edit to your machine's IP. Needs
  `usesCleartextTraffic: true` (already set).
- **Production:** a public **HTTPS** domain (e.g. `https://api.uradhura.com/api/v1`)
  must serve the API and the four Socket.IO namespaces. Point nginx at it, then set
  it in `eas.json → production.env`. Set `usesCleartextTraffic: false` in `app.json`.

## 2. First-time setup (one machine, once)

```bash
npm i -g eas-cli              # already installed on this machine
cd platform/apps/player

eas login                     # Expo account credentials
eas init                      # links this project to your Expo account (creates app ID)
```

Android signing key: run `eas build --platform android --profile production` once —
EAS will generate the keystore and store it in your Expo account. For Play App
Signing you'll later upload that upload-certificate to Google.

## 3. Build & install on a real phone (preview APK)

```bash
npx eas build --platform android --profile preview
# → prints a QR / link; scan with the phone, or download the .apk and install it.
```

If the machine's IP changed, update `eas.json → preview.env` (or `.env`) and rebuild.

## 4. Production AAB for Play Store

```bash
# 1. set your HTTPS domain in eas.json → production.env → EXPO_PUBLIC_API_URL
# 2. replace placeholder icon/splash art
npx eas build --platform android --profile production
# → app.aab + versionCode auto-increments per build
```

## 5. Upload to Play Console

Option A — manual:
1. Play Console → create app → *Production* → create release.
2. Upload `app.aab`, fill store listing (description, screenshots, content rating,
   data safety), then roll out.

Option B — automated (`eas submit`):
1. Google Cloud → service account JSON with Play *Release management* permission,
   save to `platform/apps/player/secrets/play-service-account.json`.
2. `npx eas submit --platform android --profile production` (uploads the latest AAB
   to production track).

## 6. Release checklist

- [ ] Real app icon/splash (1024 px, no transparency in full-bleed icon)
- [ ] HTTPS API in `production.env`; `usesCleartextTraffic` set to `false`
- [ ] Test the preview APK on a physical phone against the staging HTTPS API
- [ ] Content rating + data safety forms in Play Console
- [ ] `android.permission.INTERNET` is the only permission requested

## Play policy note — coin-based (no real money)

The app is **virtual-currency only**, so it falls under Play's *simulated gambling*
category — allowed, but review this carefully before submitting:

- **No real-money cash-out in the app.** Google flags apps where wins can be
  converted to cash/prizes of monetary value. The platform's admin has a
  `/withdrawals` backend; make sure the *player app* exposes **no
  withdrawal-to-cash** UI. All screens must phrase balances as **coins**, never
  ₹/INR or "cash".
- **IAP is fine.** Selling coin packs via Play Billing is a normal purchase, not
  gambling — but the coins must not be redeemable for money, and there must be no
  way to stake real money directly.
- **Age rating + geo:** expect an 18+ / "Everyone" rating form and set your
  target countries. Simulated gambling is blocked entirely in some regions — set
  them as unavailable in Play Console if you intend to comply.
- **Hygiene for review:** screenshots + store copy should show chip/coin counts,
  not currency symbols; declare the "unrealistic violence / gambling" content form
  truthfully (tools where money is won are the trigger to be extra careful).

> The technical pipeline above is unaffected either way — this section is about
> the Play listing and classification, not the build.
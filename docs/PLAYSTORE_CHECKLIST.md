# Play Store Submission Checklist — Uradhura

Companion to `docs/apk-release-config.md` and `docs/apk-playstore-release-checklist.md`.

## Build pipeline

```bash
# One-time: install EAS + login
npm i -g eas-cli && eas login

# Configure profile in eas.json (platform/apps/player)
eas build --platform android --profile production
#  ▸ outputs .aab (Play Store) + .apk (universal)
```

Prerequisites already satisfied in source:
- Expo SDK 50 managed workflow (`platform/apps/player`)
- Android package `com.uradhura.player`, versionCode/name in `app.json`
- JWT auth + Socket.IO against the **same backend** as web

## Open items before submission

- [ ] Create `eas.json` (development / preview / production profiles)
- [ ] `expo prebuild` + `expo run:android` smoke test
- [ ] Add app icons assets/ (512×512 PNG, 1024×500 feature graphic) — currently missing
- [ ] Remove junk root `platform/apps/player/App.tsx` (Vercel placeholder, not RN)
- [ ] Generate release keystore; guard it (never in git)

## Console checklist

### Listing
- [ ] App name + short + full description
- [ ] App icon 512×512 PNG
- [ ] Feature graphic 1024×500 PNG
- [ ] ≥ 2 phone screenshots (recommend 6–8)
- [ ] Optional 7″/10″ tablet screenshots
- [ ] Privacy Policy URL (publicly hosted — see `docs/apk-release-config.md`)
- [ ] Terms of Service URL

### Build / SDK
- [ ] Target SDK: latest stable (Play requirement)
- [ ] Min SDK: Android 8.0 (API 26) or higher
- [ ] Signed release build (upload key + Play App Signing)
- [ ] ProGuard/R8 rules reviewed
- [ ] Version code + version name set

### Compliance
- [ ] Content rating questionnaire
- [ ] Data safety form
- [ ] Ads declaration (if any)
- [ ] In-app purchases configured (if monetized)
- [ ] Region restrictions (gambling compliance)
- [ ] Target audience declaration
- [ ] News app: No
- [ ] COVID-19 contact tracing: No
- [ ] Data collection disclosure matches Privacy Policy
- [ ] Account deletion option (required for accounts)
- [ ] Permission declarations (only what is used)
- [ ] Accessibility (TalkBack minimum)
- [ ] No broken links in listing/app
- [ ] No restricted-content violations

### Pre-launch
- [ ] `aab` passes pre-launch report (no crashes)
- [ ] Real device test: login, wallet balance, all 6 games, realtime sync with web

## Backend endpoints for staging/QA
Base `https://api.<domain>/api/v1` · Swagger `/api/docs`
- `/auth/login`, `/wallet`, `/games`, `/economy/tokens`, `/live/rooms`, `/chat`
# APK / Google Play Release Configuration

## Purpose
This branch is dedicated to Android APK packaging and Play Store release preparation.

## Required release assets
- production app icon
- splash screen assets
- AndroidManifest permission review
- keystore and signing config
- Firebase/Google services config
- release notes

## Build flow
```bash
flutter build apk --release
# or
./gradlew assembleRelease
```

## Release checklist
- app version upgraded
- API base URL points to production backend
- all debug logs removed
- app signed with release key
- privacy policy and terms linked
- app permissions reviewed for compliance
- staged rollout configured in Play Console

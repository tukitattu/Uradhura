# APK / Play Store Release Checklist

This branch is reserved for Android APK packaging and production release preparation.

## Required files

- Android signing keystore
- `.env.production` values for app config
- app version metadata
- icon assets and splash assets
- manifest permissions review
- Firebase config if used

## Production concerns

- secure API endpoint configuration
- Play Store compliance review
- age-rating and content classification
- privacy policy and terms
- app signing and upload key
- release notes and version bump

## Recommended release steps

1. update Flutter/Android app version in the manifest and pubspec
2. generate signed release APK/AAB
3. verify with a clean install test on device
4. upload to Play Console
5. run staged rollout
6. monitor crashes and store reviews

## Key checks

- no debug API endpoints in release build
- remote config is production-safe
- live-call permissions match final app behavior
- game and wallet APIs use correct production host
- all admin controls remain behind authorization

## Play Store notes

- Do not ship unrestricted debug logging
- Keep all super-admin features out of the public APK
- Ensure the APK is signed with the release key only
- Validate `AndroidManifest.xml` and app permissions before publishing

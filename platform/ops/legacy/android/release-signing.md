# Android signing and release notes

## Required values
- keystore path
- alias name
- key password
- store password
- version code
- version name

## Commands
```bash
keytool -genkey -v -keystore release-key.jks -alias uradhura -keyalg RSA -keysize 2048 -validity 10000
./gradlew bundleRelease
```

## Play Store publish flow
1. upload AAB/APK
2. review content rating
3. verify privacy policy
4. configure app access
5. publish to production

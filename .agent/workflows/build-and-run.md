---
description: Build and run the MEALORA Flutter application
---

## Prerequisites
1. Install Flutter SDK from https://docs.flutter.dev/get-started/install/windows
2. Add Flutter to PATH: `C:\flutter\bin`
3. Run `flutter doctor` to verify setup
4. Install Android Studio with Android SDK

## Build Steps

// turbo-all

1. Get dependencies
```
flutter pub get
```

2. Run on Android emulator/device
```
flutter run
```

3. Build APK for release
```
flutter build apk --release
```

4. Build App Bundle for Play Store
```
flutter build appbundle --release
```

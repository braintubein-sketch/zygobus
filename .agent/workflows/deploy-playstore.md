---
description: How to build and deploy Mealora to the Play Store
---

# Play Store Deployment — Mealora

## Prerequisites
- Flutter SDK installed
- Firebase configured and tested
- Google Play Developer Account ($25 one-time)

## Step 1: Generate Signing Key
```bash
keytool -genkey -v -keystore mealora-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mealora
```
Keep this file SAFE. You'll need it for every update.

## Step 2: Create key.properties
Create `android/key.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mealora
storeFile=../mealora-release-key.jks
```
**DO NOT commit this file to git.**

## Step 3: Update build.gradle for signing
In `android/app/build.gradle`, replace the `release` block:
```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 4: Generate App Icon
1. Place your app icon at `assets/icons/app_icon.png` (1024×1024, no transparency)
2. Place foreground icon at `assets/icons/app_icon_foreground.png`
// turbo
3. Run: `flutter pub run flutter_launcher_icons`

## Step 5: Build Release APK/AAB
// turbo
```bash
flutter build appbundle --release
```
The AAB will be at: `build/app/outputs/bundle/release/app-release.aab`

## Step 6: Upload to Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app → "Mealora"
3. Fill in store listing:
   - **Title**: Mealora — Smart Meal Delivery
   - **Short desc**: Subscription meals delivered daily from home chefs
   - **Full desc**: (see README.md)
   - **Category**: Food & Drink
4. Upload the `.aab` file to **Production** or **Internal Testing**
5. Set up **Content Rating** and **Target Audience**
6. Submit for review

## Step 7: Post-Launch
- Monitor **Firebase Crashlytics** for crashes
- Track **Analytics** for user behavior
- Set up **Cloud Functions** for subscription auto-renewal alerts

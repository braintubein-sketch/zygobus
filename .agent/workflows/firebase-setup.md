---
description: How to set up Firebase for the Mealora project
---

# Firebase Setup for Mealora

## Prerequisites
- Flutter SDK installed and in PATH
- A Google account
- Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" → Name it **mealora**
3. Enable Google Analytics (optional)
4. Wait for the project to create

## Step 2: Enable Firebase Services
In the Firebase console for your project:

### Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Phone** (add your test phone numbers)
3. Enable **Email/Password**

### Cloud Firestore
1. Go to **Firestore Database** → **Create database**
2. Start in **test mode** (we'll secure later)
3. Choose a region close to your users (e.g., `asia-south1` for India)

### Cloud Messaging
1. Go to **Cloud Messaging**
2. It should be enabled by default

### Storage (optional for now)
1. Go to **Storage** → **Get Started**
2. Start in **test mode**

## Step 3: Connect Flutter to Firebase

### Option A: FlutterFire CLI (Recommended)
// turbo
```bash
dart pub global activate flutterfire_cli
```
```bash
flutterfire configure --project=YOUR_PROJECT_ID
```
This will:
- Create `google-services.json` in `android/app/`
- Create `firebase_options.dart` in `lib/`
- Update `android/app/build.gradle`

### Option B: Manual Setup
1. In Firebase Console → **Project Settings** → **Add app** → **Android**
2. Android package name: `com.mealora.app`
3. Download `google-services.json`
4. Place it in: `android/app/google-services.json`

## Step 4: Set up Firestore Security Rules
Go to **Firestore → Rules** and paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /plans/{planId} {
      allow read: if true;
      allow write: if false;
    }
    match /subscriptions/{subId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    match /chefs/{chefId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /deliveries/{deliveryId} {
      allow read, write: if request.auth != null;
    }
    match /menus/{menuId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /payments/{paymentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 5: Seed Default Plans
Run the app once — the `FirestoreService.seedDefaultPlans()` method will create the 3 default subscription plans.

## Step 6: Test
// turbo
```bash
flutter run
```

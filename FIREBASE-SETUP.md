# Firebase Setup Guide

## Overview
This SurveyLens Dashboard integrates Firebase Realtime Database for cloud-based data persistence and real-time synchronization.

## Prerequisites
- Google/Firebase account (free tier available)
- Active internet connection
- Web browser with localStorage support

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a new project"**
3. Enter project name: `surveylens-app` (or your preferred name)
4. Accept terms and click **"Create project"**
5. Wait for project creation to complete (1-2 minutes)

## Step 2: Enable Realtime Database

1. In Firebase Console, click **"Realtime Database"** (left sidebar)
2. Click **"Create Database"**
3. Select location: `us-central1` (or closest to you)
4. Choose **"Start in test mode"** for development
5. Click **"Enable"**

### Security Rules (Test Mode)
For development, test mode allows all reads/writes. **Before production, update rules:**

```json
{
  "rules": {
    "surveys": {
      ".read": true,
      ".write": true,
      ".indexOn": ["date", "location"]
    },
    "volunteers": {
      ".read": true,
      ".write": true,
      ".indexOn": ["area", "registeredOn"]
    }
  }
}
```

## Step 3: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click **"Web"** (</> icon)
4. Register the app (any name, e.g., "SurveyLens Web")
5. Copy the Firebase config object that appears

Example config structure:
```javascript
{
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "surveylens-app.firebaseapp.com",
  databaseURL: "https://surveylens-app.firebasedatabase.app",
  projectId: "surveylens-app",
  storageBucket: "surveylens-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef1234567890"
}
```

## Step 4: Update Configuration File

1. Open `firebase-config.js` in your editor
2. Replace the placeholder values in the `firebaseConfig` object with your actual credentials from Step 3
3. Save the file

```javascript
// firebase-config.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // ← Paste your key
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Verify Configuration

1. Open the SurveyLens Dashboard in your browser
2. Open browser **Developer Tools** (F12 or right-click → "Inspect")
3. Go to **Console** tab
4. If Firebase is configured correctly, you should NOT see errors
5. Try adding a survey or volunteer record
6. In Firebase Console → **Realtime Database**, you should see data appearing under `surveys/` or `volunteers/` paths

## Step 6: Database Structure

Once data is synced, your Firebase database will look like:

```
surveylens/
├── surveys/
│   ├── -NxY4KzA1B2C3D4E5F6G
│   │   ├── name: "Rajesh Kumar"
│   │   ├── age: 34
│   │   ├── location: "DELHI"
│   │   ├── issue: "Health, Education"
│   │   └── date: "2024-04-26"
│   └── -NxY4KzA9H8I7J6K5L4M
│       ├── name: "Priya Sharma"
│       └── ...
└── volunteers/
    ├── -NxY5KzA1B2C3D4E5F6G
    │   ├── name: "Priya Sharma"
    │   ├── area: "DELHI"
    │   ├── phone: "9876543210"
    │   └── ...
    └── ...
```

## Data Sync Behavior

### Online Mode
- **Surveys**: Saved to localStorage AND Firebase simultaneously
- **Volunteers**: Saved to localStorage AND Firebase simultaneously
- **Reads**: Data automatically synced from Firebase via `onValue()` listeners
- **Real-time**: Changes in Firebase appear instantly in UI

### Offline Mode
- Data continues to work using localStorage
- Changes are queued and synced when online
- (Future feature: Implement IndexedDB for advanced offline support)

## Troubleshooting

### Issue: "Firebase not configured" warning
**Solution**: Verify `firebase-config.js` has all credentials filled in correctly

### Issue: Data not appearing in Firebase
**Solution**: 
1. Check browser console for errors (F12 → Console)
2. Verify database URL and API key in `firebase-config.js`
3. Ensure Realtime Database is enabled in Firebase Console
4. Check if browser has internet connection

### Issue: "Permission denied" errors
**Solution**: Your database rules might be too strict
1. Go to Firebase Console → Realtime Database → Rules
2. Use test mode rules (see Step 2 above)
3. Never use `{".read": false, ".write": false}` in development

### Issue: Slow data loading
**Solution**: 
1. Reduce filter size (filters fewer records)
2. Check internet connection speed
3. Move database to region closer to your location

## Next Steps

1. ✅ Add your Firebase credentials to `firebase-config.js`
2. ✅ Test by submitting a survey/volunteer record
3. ✅ Verify data appears in Firebase Console
4. (Optional) Read [Firebase Security Rules](https://firebase.google.com/docs/database/security) for production
5. (Optional) Set up [Firebase Hosting](#deployment) for live deployment

## Contact & Support

- **Firebase Documentation**: https://firebase.google.com/docs/database
- **Console Login**: https://console.firebase.google.com/

---

**Last Updated**: April 2024  
**Framework**: Vanilla JavaScript ES6 + Firebase Modular SDK v10.7.0

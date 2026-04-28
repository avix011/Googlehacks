# Deployment Guide

Deploy SurveyLens Dashboard to Firebase Hosting with production-grade security and performance.

---

## Prerequisites

- Google account with active Firebase project (from [FIREBASE-SETUP.md](./FIREBASE-SETUP.md))
- Node.js 14+ installed ([download](https://nodejs.org/))
- Git installed (optional, for CI/CD)
- Command line/terminal access

---

## Quick Deployment (5 minutes)

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This opens your browser to authenticate. Click "Allow" to proceed.

### 3. Initialize Firebase Project

```bash
cd /path/to/googlehacks
firebase init hosting
```

When prompted:
- **What do you want to use as your public directory?** → Enter: `.` (current directory)
- **Configure as single-page app?** → Type: `y` (yes)
- **File already exists. Overwrite?** → Type: `n` (no)
- **Set up automatic builds and deploys?** → Type: `n` (we'll keep it simple)

### 4. Update Security Rules

In Firebase Console:

1. Go to **Realtime Database** → **Rules** tab
2. Replace existing content with:

```json
{
  "rules": {
    "surveys": {
      ".read": true,
      ".write": true,
      ".indexOn": ["date", "location"],
      "$uid": {
        ".validate": "newData.hasChildren(['name', 'age', 'location'])"
      }
    },
    "volunteers": {
      ".read": true,
      ".write": true,
      ".indexOn": ["area", "registeredOn"],
      "$uid": {
        ".validate": "newData.hasChildren(['name', 'phone', 'area'])"
      }
    }
  }
}
```

3. Click **Publish**

### 5. Deploy

```bash
firebase deploy
```

Output will show:
```
✔ Deploy complete!
✔ Your site is live at: https://your-project-name.web.app
```

**Done!** Your app is now live at the provided URL.

---

## Step-by-Step Deployment

### Phase 1: Pre-Deployment Setup

#### 1A. Verify Firebase Project

```bash
firebase projects:list
```

Select the project or set default:
```bash
firebase use surveylens-app
```

#### 1B. Test Locally First

```bash
firebase emulators:start
```

This starts local Firebase emulator. Open http://localhost:5000 to test.

```bash
# To stop emulator
Ctrl+C
```

#### 1C. Create Firebase.json Configuration

Already created by `firebase init`. Verify `firebase.json` exists:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Phase 2: Security Configuration

#### 2A. Set Database Security Rules

In Firebase Console → Realtime Database → Rules:

**For Public/Test Projects** (use carefully):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**For Production** (with validation):
```json
{
  "rules": {
    "surveys": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["date", "location"],
      "$surveyId": {
        ".validate": "newData.hasChildren(['name', 'age', 'location', 'date']) && newData.child('age').isNumber()"
      }
    },
    "volunteers": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["area", "registeredOn"],
      "$volunteerId": {
        ".validate": "newData.hasChildren(['name', 'phone', 'area']) && newData.child('phone').isString()"
      }
    }
  }
}
```

#### 2B. Enable Firebase Authentication (Optional)

For user-specific data:

1. Go to **Authentication** → **Sign-in method**
2. Enable providers: Email/Password, Google, etc.
3. Update rules to require `auth != null`

### Phase 3: Deployment

#### 3A. Deploy to Staging

```bash
firebase deploy --only hosting
```

Visit the provided URL to verify everything works.

#### 3B. Deploy to Production

Same command deploys to production automatically:

```bash
firebase deploy --only hosting
```

To deploy specific targets:
```bash
firebase deploy --only database
firebase deploy --only hosting,database
firebase deploy --only functions
```

#### 3C. Rollback if Needed

```bash
firebase hosting:channels:list
```

To rollback to previous version:
```bash
firebase hosting:channels:deploy main --expires 12h
```

---

## Performance Optimization

### 1. Enable Caching

Update `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css|woff|woff2)",
        "headers": [{
          "key": "Cache-Control",
          "value": "public, max-age=31536000"
        }]
      },
      {
        "source": "/index.html",
        "headers": [{
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }]
      }
    ]
  }
}
```

### 2. Database Optimization

Add indexes for fast queries:
```json
{
  "rules": {
    "surveys": {
      ".indexOn": ["date", "location", "issue"]
    },
    "volunteers": {
      ".indexOn": ["area", "registeredOn", "experience"]
    }
  }
}
```

### 3. Compression

Firebase automatically gzips responses. Verify in DevTools → Network.

### 4. CDN Distribution

Firebase Hosting automatically uses Google Cloud CDN for fast delivery worldwide.

---

## Monitoring & Analytics

### View Deployment History

```bash
firebase hosting:releases:list
```

### Monitor Real-time Database

1. Firebase Console → Realtime Database → Data tab
2. See all stored records
3. Monitor reads/writes in **Usage** tab

### View Hosting Analytics

Firebase Console → Hosting:
- Traffic statistics
- Response times
- Error rates

---

## Custom Domain

### Setup Custom Domain

1. Firebase Console → Hosting → **Custom domain**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., surveylens.example.com)
4. Verify ownership (follow Firebase prompts)
5. Update DNS records (Firebase provides settings)

### SSL/TLS

Firebase automatically provisions free SSL certificate for all domains.

---

## Environment Configuration

### Different Environments

Create separate Firebase projects:
- `surveylens-dev` (Development)
- `surveylens-staging` (Staging)
- `surveylens-prod` (Production)

Switch environments:
```bash
firebase use surveylens-dev
firebase deploy

firebase use surveylens-prod
firebase deploy
```

### Environment Variables

Update `firebase-config.js` per environment:

```bash
# Development
export FIREBASE_API_KEY=dev_api_key
export FIREBASE_PROJECT_ID=surveylens-dev

# Production
export FIREBASE_API_KEY=prod_api_key
export FIREBASE_PROJECT_ID=surveylens-prod
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Get Firebase token:
```bash
firebase login:ci
# Copy the token to GitHub Secrets as FIREBASE_TOKEN
```

---

## Troubleshooting

### Issue: Deploy fails with "No hosting configuration found"

**Solution**: Run `firebase init hosting` in project root

### Issue: 404 errors on refresh

**Solution**: Ensure `firebase.json` has SPA rewrite rule:
```json
"rewrites": [{
  "source": "**",
  "destination": "/index.html"
}]
```

### Issue: Firebase credentials not working

**Solution**: 
1. Verify credentials in `firebase-config.js`
2. Check Firebase Console → Project Settings
3. Ensure database URL is correct
4. Verify IP whitelist isn't blocking (test mode: off)

### Issue: Real-time sync not working

**Solution**:
1. Check database security rules
2. Verify internet connection
3. Check browser console for Firebase errors
4. Ensure `firebaseReady` flag is true

### Issue: Slow performance

**Solution**:
1. Check Firebase database size (Realtime DB → Usage)
2. Add database indexes
3. Enable CDN caching
4. Optimize images and assets

---

## Security Checklist

- ✅ Database security rules configured
- ✅ HTTPS enabled (automatic with Firebase)
- ✅ API keys restricted (optional, advanced)
- ✅ Input validation in place
- ✅ No sensitive data in client code
- ✅ Test mode disabled for production
- ✅ Regular backups enabled
- ✅ Monitoring alerts configured

---

## Backup & Recovery

### Automatic Backups

Firebase creates automatic backups:
- Daily backups retained for 30 days
- Weekly backups retained for 1 year

### Manual Export

```bash
firebase database:get / > backup.json
```

### Restore from Backup

```bash
firebase database:set / backup.json
```

---

## Scaling Considerations

### When to Upgrade

- Exceed 100k records: Monitor read/write latency
- Need authentication: Switch to Realtime DB with auth
- Need offline sync: Implement Firestore with offline persistence
- Exceed storage: Archive old data to Cloud Storage

### Database Size Limits

- Test mode: Unlimited storage
- Spark plan: 1GB total storage
- Blaze plan: Unlimited with pay-as-you-go

Upgrade plan in Firebase Console → Upgrade to Blaze

---

## Advanced: Cloud Functions

Add serverless functions for complex logic:

```bash
firebase init functions
```

Example function to validate survey data:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.validateSurvey = functions.database
  .ref('surveys/{surveyId}')
  .onCreate((snapshot, context) => {
    const survey = snapshot.val();
    
    // Validation logic
    if (!survey.name || !survey.age) {
      return snapshot.ref.remove();
    }
    
    // Additional processing
    return snapshot.ref.update({
      validatedAt: admin.database.ServerValue.TIMESTAMP
    });
  });
```

Deploy functions:
```bash
firebase deploy --only functions
```

---

## Post-Deployment

### 1. Verify Live Site

- [ ] Visit https://your-project.web.app
- [ ] Test survey submission
- [ ] Check Firebase Console for new records
- [ ] Verify analytics dashboard loads

### 2. Share with Team

Share URL: `https://your-project.web.app`

### 3. Monitor Performance

- Check Firebase usage daily
- Monitor error rates
- Set up email alerts for issues

### 4. Plan Maintenance

- Schedule database cleanup (monthly)
- Update security rules (quarterly)
- Review analytics (weekly)

---

## Support

- **Firebase Docs**: https://firebase.google.com/docs/hosting
- **Deployment Issues**: https://firebase.google.com/support
- **Community Chat**: Firebase Slack community

---

**Version**: 2.0  
**Last Updated**: April 26, 2024  
**Status**: Production Ready

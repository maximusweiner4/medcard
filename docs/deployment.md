# KinRx Deployment & Operations Guide

## Server (Railway)

**URL:** `https://kinrx-server-production.up.railway.app`

### Required Environment Variables

| Variable | Where to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI) | Use "Transaction mode" pooler for Railway |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Keep secret |
| `JWT_SECRET` | Supabase → Settings → API → JWT Secret | |
| `SERVER_URL` | `https://kinrx-server-production.up.railway.app` | No trailing slash |
| `CORS_ORIGIN` | `*` (or restrict to app bundle ID once in production) | |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Any strong random string |
| `NODE_ENV` | `production` | |

### Schema Migration

The `startCommand` in `railway.json` now runs `prisma db push` before starting. This means every Railway deploy automatically syncs the schema. No manual migration needed.

---

## Push Notification Cron (Daily Refill Reminders)

The endpoint `POST /api/notifications/check-refills` triggers refill reminders for any medication with `nextRefillDate` within 3 days. Call it daily with the `x-cron-secret` header.

### Option A: Railway Cron Service (Recommended)

1. In Railway dashboard → **New Service** → **Empty Service**
2. Name it `kinrx-cron`
3. Go to Settings → **Cron** → enable
4. Set schedule: `0 13 * * *` (9 AM EST = 1 PM UTC)
5. Set command:
   ```
   curl -s -X POST https://kinrx-server-production.up.railway.app/api/notifications/check-refills \
     -H "x-cron-secret: YOUR_CRON_SECRET"
   ```
6. Make sure `CRON_SECRET` is set in the main service (matching the value you use above)

### Option B: cron-job.org (Free)

1. Go to https://cron-job.org (free tier)
2. Create job → URL: `https://kinrx-server-production.up.railway.app/api/notifications/check-refills`
3. Method: POST, schedule: daily at 9 AM
4. Add header: `x-cron-secret: YOUR_CRON_SECRET`

---

## Sentry Crash Reporting (Optional)

1. Create account at https://sentry.io
2. Create two projects: **React Native** and **Node.js**
3. Get DSN for each project
4. Add to Railway variables: `SENTRY_DSN=your-node-dsn`
5. Add to `eas.json` env section: `"EXPO_PUBLIC_SENTRY_DSN": "your-rn-dsn"`
6. Install packages:
   ```bash
   cd server && npm install @sentry/node
   cd mobile && npx expo install @sentry/react-native
   ```
7. Initialize in server `src/app.ts` (before routes):
   ```ts
   import * as Sentry from '@sentry/node';
   Sentry.init({ dsn: process.env.SENTRY_DSN, environment: 'production' });
   ```
8. Initialize in mobile `app/_layout.tsx`:
   ```ts
   import * as Sentry from '@sentry/react-native';
   Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
   ```

---

## EAS Build (Android APK / iOS)

```bash
cd mobile

# Android APK (internal testing)
npx eas build --platform android --profile preview

# iOS (requires Apple Developer account)
npx eas build --platform ios --profile preview

# Production builds (requires store accounts)
npx eas build --platform all --profile production
```

Builds are available at: https://expo.dev/accounts/max.weiner/projects/medcard

### Env vars in builds
Baked into builds via `eas.json` → `env` section. Update these before rebuilding if URLs change.

---

## App Store Submission Checklist

### Google Play
- [ ] Android developer account approved
- [ ] Upload APK from EAS build
- [ ] Fill in store listing from `docs/store/google-play-listing.md`
- [ ] Capture screenshots (see sizes in that doc)
- [ ] Complete data safety form
- [ ] Submit for review

### Apple App Store
- [ ] Apple Developer account ($99/yr) approved
- [ ] Build iOS IPA via EAS
- [ ] Upload via `npx eas submit --platform ios`
- [ ] Fill in store listing from `docs/store/app-store-listing.md`
- [ ] Complete App Privacy section
- [ ] Submit for review

---

## GitHub Pages (Privacy & ToS)

**Repo:** https://github.com/maximusweiner4/kinrx
**Live URLs:**
- Privacy: https://maximusweiner4.github.io/kinrx/privacy
- ToS: https://maximusweiner4.github.io/kinrx/tos

To update: edit `privacy/index.html` or `tos/index.html` in the kinrx repo and push to main.

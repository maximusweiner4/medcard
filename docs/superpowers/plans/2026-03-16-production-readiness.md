# KinRx Production Readiness Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Get KinRx fully production-ready with crash reporting, push notifications, deep linking, legal pages, and app store metadata.

**Architecture:** Mobile (Expo/React Native) + Express server on Railway + Supabase DB. All features already have auth/API infrastructure in place.

**Tech Stack:** Expo SDK 54, @sentry/react-native, expo-notifications, expo-server-sdk, TypeScript

**Already complete (do NOT rebuild):**
- Biometric lock — fully implemented in _layout.tsx + biometricStore.ts
- Caregiver management UI — fully implemented in patient/[id].tsx
- Medication history log UI — fully implemented in medication/[id].tsx
- Offline caching — implemented in patientStore.ts + medicationStore.ts

---

## Task 1: Cache Invalidation on Mutations

**Files:**
- Modify: `mobile/src/stores/medicationStore.ts`
- Modify: `mobile/src/stores/patientStore.ts`

After any create/update/delete mutation, the cached data is stale. Currently the cache is only written on fetch and read on network failure. Mutations need to bust their relevant cache keys.

- [ ] In `medicationStore.ts`, after `stopMedication`, `restartMedication`, `deleteMedication` — call `AsyncStorage.removeItem(`cache:medications:${patientId}`)` where patientId comes from the store's current state
- [ ] In `patientStore.ts`, after `createPatient`, `updatePatient`, `deletePatient` — call `AsyncStorage.removeItem('cache:patients')`
- [ ] Commit: `fix: bust AsyncStorage cache on mutations`

---

## Task 2: Terms of Service Page

**Files:**
- Create: `/tmp/kinrx/tos/index.html` (then push to maximusweiner4/kinrx repo on GitHub)
- Modify: `mobile/app/disclaimer.tsx`

- [ ] Create `tos/index.html` in the `maximusweiner4/kinrx` GitHub repo — mirror the style of `privacy/index.html`. Content:
  - App is for personal medication tracking only
  - Not a medical device / not FDA approved
  - User is responsible for accuracy of data entered
  - KinRx may change or discontinue the service
  - Governing law: Pennsylvania, USA
  - Contact: max.weiner4@gmail.com
- [ ] Clone the kinrx repo locally (`git clone https://github.com/maximusweiner4/kinrx /tmp/kinrx-repo`), add the file, push
- [ ] In `disclaimer.tsx`, add a "Terms of Service" link below the Privacy Policy link: `Linking.openURL('https://maximusweiner4.github.io/kinrx/tos')`
- [ ] Commit mobile change and push to medcard master

---

## Task 3: Sentry Crash Reporting

**Files:**
- Modify: `mobile/app/_layout.tsx`
- Modify: `mobile/package.json` (via npx expo install)
- Modify: `server/src/app.ts`
- Modify: `server/package.json` (via npm install)

Sentry captures unhandled errors in production. The mobile ErrorBoundary already exists — Sentry replaces the need for it, but keep ErrorBoundary as fallback.

### Mobile
- [ ] Install: `cd mobile && npx expo install @sentry/react-native`
- [ ] In `mobile/app/_layout.tsx`, add at the top:
  ```ts
  import * as Sentry from '@sentry/react-native';
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
  });
  ```
- [ ] Add `EXPO_PUBLIC_SENTRY_DSN` to `mobile/eas.json` preview and production `env` blocks (get DSN from sentry.io after creating project)
- [ ] Add `EXPO_PUBLIC_SENTRY_DSN` to `mobile/.env` for local dev (can be the same DSN)

### Server
- [ ] Install: `cd server && npm install @sentry/node`
- [ ] In `server/src/app.ts`, add after `import 'dotenv/config'`:
  ```ts
  import * as Sentry from '@sentry/node';
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
  }
  ```
- [ ] Add `SENTRY_DSN` to Railway environment variables (server)
- [ ] Commit: `feat: add Sentry crash reporting to mobile and server`

**Note:** Create a free Sentry account at sentry.io, create two projects (React Native + Node.js), copy DSNs.

---

## Task 4: Deep Linking (Share URLs Open in App)

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/app/_layout.tsx`
- Modify: `server/src/routes/share.ts`
- Modify: `server/views/share.ejs` (add app store badge / open in app button)

Deep linking makes `https://kinrx-server-production.up.railway.app/share/:token` open the KinRx app when installed, falling back to the web view.

### Configure URL scheme
- [ ] In `mobile/app.json`, verify `scheme: "kinrx"` is set (it already is)
- [ ] In `mobile/app/_layout.tsx`, add Linking listener:
  ```ts
  import { Linking } from 'react-native';
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      // share links: kinrx://share/:token
      const match = url.match(/share\/([^/?]+)/);
      if (match) router.push(`/share-view?token=${match[1]}`);
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);
  ```

### Add "Open in App" button to share web page
- [ ] In `server/views/share.ejs`, add at the top of the page body an "Open in KinRx App" button that links to `kinrx://share/<%= shareToken %>`. Show only on mobile user agents.
- [ ] Pass `shareToken` to the EJS template from `share.ts` route handler

- [ ] Commit: `feat: add deep linking for share URLs`

---

## Task 5: Push Notifications (Refill Reminders)

**Files:**
- Modify: `mobile/src/stores/patientStore.ts` (or new notificationStore.ts)
- Modify: `mobile/app/(tabs)/share.tsx` (settings — add notification toggle)
- Modify: `server/src/routes/patients.ts` (save push token)
- Modify: `server/prisma/schema.prisma` (add pushToken to User)
- New: `server/src/services/notifications.service.ts`
- New: `server/src/routes/notifications.ts`

Refill reminders: when a medication has `nextRefillDate` within 3 days, send a push notification.

### Schema
- [ ] Add to `User` model in `schema.prisma`: `pushToken String?`
- [ ] Run: `cd server && npx prisma db push`

### Server — notification service
- [ ] Install: `cd server && npm install expo-server-sdk`
- [ ] Create `server/src/services/notifications.service.ts`:
  ```ts
  import { Expo } from 'expo-server-sdk';
  const expo = new Expo();
  export async function sendRefillReminder(pushToken: string, drugName: string, daysUntil: number) {
    if (!Expo.isExpoPushToken(pushToken)) return;
    await expo.sendPushNotificationsAsync([{
      to: pushToken,
      title: 'Refill Reminder',
      body: `${drugName} needs a refill in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
      sound: 'default',
    }]);
  }
  ```
- [ ] Create `server/src/routes/notifications.ts`:
  - `POST /api/notifications/token` — save push token to User record
  - `POST /api/notifications/check-refills` — internal endpoint (no auth, secret key header) that queries all medications with nextRefillDate within 3 days and sends reminders

### Mobile
- [ ] Install: `cd mobile && npx expo install expo-notifications`
- [ ] In `mobile/app/_layout.tsx`, on login register for push notifications:
  ```ts
  import * as Notifications from 'expo-notifications';
  async function registerForPushNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '94fef775-74b6-4a54-abd4-e9e5abf3ba00',
    })).data;
    await api.post('/api/notifications/token', { token });
  }
  ```
- [ ] Call `registerForPushNotifications()` after successful auth
- [ ] Mount `server/src/routes/notifications.ts` in `server/src/app.ts`
- [ ] Commit: `feat: add push notifications and refill reminders`

### Railway Cron (optional — trigger daily refill check)
- [ ] Add a Railway cron job that hits `POST /api/notifications/check-refills` daily at 9 AM

---

## Task 6: App Store Metadata

**Files:**
- Create: `docs/store/app-store-listing.md`
- Create: `docs/store/google-play-listing.md`

### App Store Connect (iOS)
- [ ] Create `docs/store/app-store-listing.md` with:
  - **Name:** KinRx
  - **Subtitle:** Medication List Manager
  - **Category:** Medical
  - **Keywords:** medication tracker, pill reminder, caregiver, medication list, drug interactions, refill tracker, health, pharmacy
  - **Description:** (see below)
  - **Privacy Policy URL:** https://maximusweiner4.github.io/kinrx/privacy
  - **Support URL:** https://maximusweiner4.github.io/kinrx
  - **Age rating:** 4+
  - **App Description:**
    > KinRx helps you manage medications for yourself or someone you care for. Add medications from a database of thousands of drugs, track refills, check for interactions, and share a read-only medication list with doctors and family.
    >
    > FEATURES:
    > • Add and organize medications with dose, frequency, prescriber and pharmacy
    > • Refill reminders when you're running low
    > • Drug interaction checker powered by NIH RxNav
    > • Share a secure QR code or link with any healthcare provider
    > • Export a PDF medication list for appointments
    > • Manage multiple patients (family members, parents)
    > • Caregiver access — invite family to view or co-manage
    > • Change history — see every edit with who made it
    > • Biometric lock for privacy
    > • Works offline — data cached for when you lose signal

### Google Play
- [ ] Create `docs/store/google-play-listing.md` with same content adapted for Google Play format:
  - **Short description** (80 chars): Track medications, check interactions, share with doctors.
  - **Full description:** same as App Store description
  - **Category:** Medical
  - **Content rating:** Everyone

- [ ] Commit docs: `docs: add App Store and Google Play store listings`

---

## Execution Order

Run Tasks 1, 2, 6 first (no installs needed, safe, fast).
Then Task 3 (Sentry — requires sentry.io account setup).
Then Task 4 (deep linking — needs testing).
Then Task 5 (push notifications — most complex, requires schema change).

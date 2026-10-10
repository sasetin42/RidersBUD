# Orchestration Plan: Firebase Cloud Messaging (FCM) Integration

## Goal
Integrate Firebase Cloud Messaging (FCM) end-to-end into the RidersBUD mobile application (Android & iOS). Enable real-time push notifications for application status updates (booking approvals, mechanic arrival, order dispatch) and new messages/chats, automatically dispatching push notifications via a Cloud Function trigger when Firestore notifications are created.

---

## Architecture & Work Breakdown

### 1. Android Native Firebase Setup
- Restore `android/app/google-services.json` using the project's actual Firebase configuration (`project_number: 492813766406`, `project_id: ridersbud-10806`, `mobilesdk_app_id: 1:492813766406:android:b74621ea779c04ec8f9887`).
- Add `@capacitor/push-notifications` plugin to `package.json` and sync with Capacitor.
- Update `AndroidManifest.xml` to include `POST_NOTIFICATIONS` permission (Android 13+ / API 33+ requirement).
- Register notification channel (`ridersbud_notifications`) with high importance and default sound/vibration.

### 2. Client-Side FCM Service (`services/fcmService.ts`)
- Request user push notification permissions on mobile devices.
- Register with FCM and obtain device registration token.
- Save/sync token to Firestore user profile (`users/{userId}` or `mechanics/{mechanicId}`).
- Listen for incoming push notifications in the foreground/background, update app badge, and navigate to target screen on tap (e.g. `/customer-portal/booking/...` or `/support-chat`).

### 3. Backend Cloud Function Trigger (`functions/index.js`)
- Add an `onDocumentCreated('notifications/{notificationId}')` Firestore trigger.
- Read `recipientId` and `recipientRole` from the new notification.
- Look up the device's `fcmTokens` from `users/{recipientId}` or `mechanics/{recipientId}`.
- Send the multicast FCM push payload using `admin.messaging().sendEachForMulticast()`.
- Automatically prune stale or unregistered tokens (`messaging/registration-token-not-registered`).

### 4. Verification & Testing
- Run test suite `npm test` ensuring zero regressions across all existing test files.
- Compile web assets and sync Capacitor with Android (`npx cap sync android`).
- Bump version to `v1.1.15` (versionCode 26).
- Build and stage release APK `RidersBUD-v1.1.15.apk`.

---

## Tasks
- [ ] Task 1: Restore `android/app/google-services.json` and install `@capacitor/push-notifications`.
- [ ] Task 2: Update `AndroidManifest.xml` with `POST_NOTIFICATIONS` permission and metadata.
- [ ] Task 3: Create `services/fcmService.ts` to manage push token registration and deep-link routing.
- [ ] Task 4: Integrate `fcmService` into `App.tsx` and `NotificationContext.tsx` on authentication.
- [ ] Task 5: Add Cloud Function trigger in `functions/index.js` for automatic FCM dispatch on new Firestore notifications.
- [ ] Task 6: Run test suite (`npm test`).
- [ ] Task 7: Build web assets, sync Capacitor, compile release APK (`scripts/release-apk.mjs --skip-deploy`), and stage `RidersBUD-v1.1.15.apk`.

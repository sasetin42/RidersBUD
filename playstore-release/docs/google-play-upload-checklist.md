# Google Play Console Upload Checklist

This checklist outlines the steps and assets required to publish the RidersBUD app on the Google Play Store.

## 1. Setup & Credentials
- [ ] Google Play Developer Account created and active.
- [ ] Developer registration fee paid.
- [ ] Access permission granted to required team members (Release Manager, Developer, Admin).

## 2. Store Presence Details
- [ ] **App Name**: RidersBUD (Max 50 characters).
- [ ] **Short Description**: Quick tagline summarizing the service (Max 80 characters).
- [ ] **Full Description**: Detailed explanation of the app features, how it works, and user benefits (Max 4000 characters).
- [ ] **App Icon**: 512 x 512 px, 32-bit PNG, transparent background (Max 1MB).
- [ ] **Feature Graphic**: 1024 x 500 px, JPEG or 24-bit PNG, no transparency (Max 1MB).
- [ ] **Screenshots**:
  - [ ] Phone: At least 2, up to 8 screenshots. 16:9 or 9:16 aspect ratio (Min 320px, Max 3840px).
  - [ ] 7-inch tablet: At least 2 screenshots (optional but recommended).
  - [ ] 10-inch tablet: At least 2 screenshots (optional but recommended).

## 3. App Content & Policies
- [ ] **Privacy Policy URL**: Live URL pointing to the RidersBUD privacy policy page.
- [ ] **Ads Declaration**: Declare if the app contains ads (RidersBUD does not contain ads).
- [ ] **App Access**: Provide testing credentials (username/password) if the app requires login for Google reviewers to access all features.
- [ ] **Content Rating**: Complete the questionnaire to obtain an age rating.
- [ ] **Target Audience & Content**: Specify age groups (e.g., 18 and older) and ensure compliance with Google policies.
- [ ] **Data Safety**: Declare what user data is collected and shared (e.g., location, personal info, device IDs) and how it is encrypted.
- [ ] **Financial Features**: Complete financial declarations if applicable.
- [ ] **Government Apps**: Declare if it is a government-affiliated app (No).

## 4. Release Preparation
- [ ] Production Signed Android App Bundle (`app-release.aab`) ready in `playstore-release/aab/`.
- [ ] Release Notes translated into supported languages (stored in `playstore-release/docs/release-notes.md`).
- [ ] Version code incremented in `build.gradle` relative to any previous uploads.

## 5. Console Upload & Release
- [ ] Go to Google Play Console → Select RidersBUD.
- [ ] Navigate to **Production** under the Release section.
- [ ] Create a new release.
- [ ] Opt-in to **Play App Signing** (recommended).
- [ ] Drag and drop `app-release.aab`.
- [ ] Enter the Release Name and Release Notes.
- [ ] Click **Save** and then **Review release**.
- [ ] Start rollout to production (can set roll-out percentage, e.g., 100%).

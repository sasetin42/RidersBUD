# RidersBUD App

[![Version](https://img.shields.io/badge/version-1.1.9-blue.svg)](package.json)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-1192d4.svg)](https://capacitorjs.com)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev)

**RidersBUD** is a cross-platform mobile and web application designed for motorcycle and vehicle riders in the Philippines. It provides on-demand mechanic booking, vehicle rental with/without drivers, a motorcycle parts store, real-time map tracking, warranty and service management, and embedded native digital payments via HitPay (GCash, Maya, and credit/debit cards).

---

## 🚀 Key Features

* **On-Demand Mechanic Booking:** Request on-site or shop service for repairs, tune-ups, and maintenance with real-time location tracking.
* **Driver & Vehicle Rental:** Hire professional drivers or rent cars/motorcycles with flexible duration and rate breakdowns.
* **Parts & Accessories Store:** Browse and order genuine motorcycle parts, accessories, and gear with cart management and order tracking.
* **Embedded Native Payments:** Seamless in-app checkout powered by HitPay Drop-In SDK, supporting GCash, Maya, and card payments without leaving the native mobile shell.
* **Real-Time Live Map & Tracking:** Track assigned mechanics and active rental trips live with Leaflet maps and GPS integration.
* **My Garage & Reminders:** Store vehicle details, track maintenance history, and receive automated service and warranty reminders.
* **In-App Support & Chat:** Communicate directly with mechanics, admins, and support teams with real-time push notifications.
* **True Edge-to-Edge Experience:** Fully immersive native Android and iOS integration with transparent system bar styling and hardware back-button interception.

---

## 🛠 Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Recharts
* **Mobile Shell:** Capacitor 8 (Android & iOS native runtime)
* **Build System:** Vite 6
* **Backend Services:** Firebase (Firestore, Realtime Database, Authentication, Cloud Functions, Cloud Messaging/FCM, Cloud Storage)
* **Payment Gateway:** HitPay Embedded SDK & API (GCash, Maya, Cards, QR PH)
* **Testing:** Vitest

---

## 📁 Project Structure

```plaintext
RidersBUD App/
├── android/               # Capacitor Android native project & release scripts
├── ios/                   # Capacitor iOS native project
├── components/            # Reusable UI components (Modals, Maps, Navigation, Cards)
│   ├── admin/             # Admin portal components
│   ├── customer/          # Customer-facing UI components
│   ├── mechanic/          # Mechanic portal components
│   └── ui/                # Core UI widgets & design tokens
├── context/               # React Context providers (Auth, Database, Call, Cart, Notifications)
├── pages/                 # Top-level screen views and route handlers
│   ├── admin/             # Admin panel views
│   ├── customer/          # Customer flow views
│   └── mechanic/          # Mechanic flow views
├── services/              # External service integrations (HitPay, FCM, Email, Storage, AppUpdate)
├── styles/                # Global CSS styles, Tailwind configuration, design tokens
├── data/                  # Live & mock data sets, email templates, tour steps
├── docs/                  # Architectural plans, runbooks, and implementation specs
├── hooks/                 # Custom React hooks (presence, scroll, payment attention)
├── test/                  # Automated unit and regression test suites (Vitest)
├── utils/                 # Helper utilities (payment return, location, image optimization, file utils)
├── App.tsx                # Application root & main routing coordinator
├── index.tsx              # Application entry point
├── vite.config.ts         # Vite bundler configuration
└── package.json           # Project dependencies & scripts
```

---

## 🛠 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

* **Node.js**: v18.x or higher
* **npm**: v9.x or higher
* **Android Studio**: (For Android APK/AAB builds and emulator testing)
* **Java Development Kit (JDK)**: JDK 17 or JDK 21

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   cd "RidersBUD App"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the required Firebase and HitPay configuration keys.
   ```bash
   cp .env.example .env
   ```

---

## 📜 Available Scripts

In the project directory, you can run the following commands:

* `npm run dev`: Starts the Vite local development server on `http://localhost:3000`.
* `npm run build`: Compiles and bundles production web assets into the `dist/` directory.
* `npm run test`: Runs the Vitest test suite.
* `npm run typecheck`: Performs static typechecking via the TypeScript compiler (`tsc --noEmit`).
* `npm run sync:android`: Syncs compiled web assets with the Capacitor Android project.
* `npm run sync:ios`: Syncs compiled web assets and configures iOS native dependencies.
* `npm run release:apk`: Builds and packages the production release APK for Android.
* `npm run fetch-live-data`: Fetches fresh data snapshots from backend Firestore services.

---

## 📱 Mobile Native Setup (Capacitor)

### Running on Android

1. Build the web assets:
   ```bash
   npm run build
   ```

2. Sync assets to Capacitor Android:
   ```bash
   npm run sync:android
   ```

3. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```

4. Build release APK:
   ```bash
   npm run release:apk
   ```

---

## 🧪 Testing & Verification

Automated unit tests, state machine tests, and payment regression tests are implemented using Vitest.

To run all tests:
```bash
npm test
```

To run typecheck:
```bash
npm run typecheck
```

---

## 📄 License

This repository is proprietary software for **RidersBUD**. All rights reserved.

# Plan: Dynamic Visibility & Hiding of Disabled Special Services in Customer View

## 1. Goal
When Special Services (**Car Rental**, **Driver for Hire**, **Liaison Registration Assistance**, **Emergency Towing**) are disabled in the System Settings (either via Operational Modules `settings.modules` or `settings.serviceCustomizations`), the Customer View must **completely hide** all related elements:
- **Buttons & Quick Action CTAs** (e.g. "Rent a Car", "Hire a Driver", "LTO Liaison", "Towing")
- **Announcement banners & maintenance notes** for disabled services
- **Activity & Transaction Filter Tabs** (e.g., "Rent a Car", "Driver for Hire", "LTO Liaison", "Towing" tabs in HomeScreen)
- **Service Cards & Horizontal Sliders** (Featured Services in HomeScreen, Services List Screen)
- **Search Modal Suggestions & Results** (Popular Search tags like "Towing", special service suggestions)
- **Direct Route Access Protection** (ModuleGuard redirects customer back to `/customer-portal` if attempting direct URL access when disabled)

---

## 2. Architecture & Decision

### Single Source of Truth Utility: `utils/specialServicesHelper.ts`
To prevent inconsistencies across screens, create a centralized, reactive helper utility:
```ts
export function isSpecialServiceEnabled(
    serviceKey: 'carRental' | 'driverHire' | 'liaison' | 'towing',
    settings?: Settings | null
): boolean {
    if (!settings) return true;

    // 1. Check Operational Modules in settings.modules
    const moduleIdMap = {
        carRental: 'rent-a-car',
        driverHire: 'driver-for-hire',
        liaison: 'liaison-assistance',
        towing: 'towing'
    };
    const targetModuleId = moduleIdMap[serviceKey];
    const moduleConfig = settings.modules?.find(m => m.id === targetModuleId);
    if (moduleConfig && moduleConfig.enabled === false) {
        return false;
    }

    // 2. Check Service Customizations in settings.serviceCustomizations
    const customizations = settings.serviceCustomizations;
    if (customizations && customizations[serviceKey] && customizations[serviceKey]?.enabled === false) {
        return false;
    }

    return true;
}
```

This guarantees that whether an Admin disables the service via **Operations Tab** (`modules`) or **Services Customization Hub Tab** (`serviceCustomizations`), it is immediately and consistently recognized as **disabled** across the entire application in real time!

---

## 3. Areas to Update

### A. [`pages/HomeScreen.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/HomeScreen.tsx)
1. **Activity & Transactions Tabs**:
   - Only show `rental`, `driver`, `liaison`, `towing` tabs if their corresponding service is enabled.
2. **Empty State Quick Service Grid**:
   - If `rent-a-car` is disabled, hide the "Rent a Car" shortcut button; adjust the grid columns dynamically.
3. **Featured Services Slider**:
   - Check `isSpecialServiceEnabled` for each special service in `db.appServices` before rendering.
4. **Announcements / Maintenance Notes**:
   - Filter announcements to exclude disabled services.

### B. [`pages/services/ServicesListScreen.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/services/ServicesListScreen.tsx)
- Filter `db.appServices` to omit any special service whose `isSpecialServiceEnabled(...)` returns `false`.

### C. [`pages/services/AppServiceDetailScreen.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/services/AppServiceDetailScreen.tsx)
- If the service is disabled:
  - Hide the "Book Now" action buttons (both desktop and mobile fixed bottom bar).
  - Show a gentle "Service Temporarily Unavailable" notice banner instead of booking buttons.

### D. [`pages/ServicesScreen.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/ServicesScreen.tsx)
- Enhance filtering in `db.services` with `isSpecialServiceEnabled` so no towing, rent a car, or liaison cards show up in the main services list or category pills if disabled.

### E. [`components/CustomerSearchModal.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/CustomerSearchModal.tsx)
- Filter out "Towing" from Popular Searches pills if towing is disabled.
- In search results, filter out any special service whose module is disabled.

### F. [`App.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/App.tsx)
- Enhance `ModuleGuard` to also check `serviceCustomizations` as fallback sync so direct URL visits to `/customer-portal/rent-a-car`, `/customer-portal/hire-a-driver`, or `/customer-portal/app-services/liaison-book/...` gracefully display the offline notice and redirect to Home.

---

## 4. Verification Plan
1. **TypeScript & Bundler Verification:**
   - Run `npm run build` to confirm zero type errors.
2. **Behavior Verification:**
   - Verify all buttons, tabs, announcements, and cards disappear when disabled.

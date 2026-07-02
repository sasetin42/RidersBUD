# Implementation Plan: Rental & Driver Hire Settings

This plan outlines the design and implementation details to extend the service model and UI forms in both `AdminCatalogScreen.tsx` and `AdminServicesScreen.tsx` with support for Rental & Driver Hire configurations.

---

## 🤖 Applying knowledge of `@[project-planner]`...

## 1. Objectives

1. **State Extension**:
   Add the following properties to the `ServiceForm` `formData` state in both files:
   - `isCarRental` (boolean)
   - `carRentalClass` (string)
   - `carRentalTransmission` (string)
   - `carRentalFuel` (string)
   - `isDriverHire` (boolean)
   - `driverLicenseType` (string)
   - `driverExperience` (string)
   - `driverGeoLimits` (string)

2. **UI Implementation**:
   Render a dedicated **"Rental & Driver Hire Settings"** block at the bottom of the input forms.
   - Provide checkboxes/toggles for `isCarRental` and `isDriverHire`.
   - Conditionally render sub-panels for Rental Settings and Driver Hire Settings when enabled, using inline select/dropdown elements.
   - Maintain the design language and theme of each respective page (dark/glassmorphism in `AdminCatalogScreen.tsx` vs. light/clean styled inputs in `AdminServicesScreen.tsx`).

3. **Data Syncing**:
   Ensure correct data mapping, type normalization, and cleanup in the onSubmit/onSave handlers so that changes are correctly persisted to the database.

---

## 2. Proposed Changes

### A. Extending state initialization in `ServiceForm`

#### 1. [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx)
Update the `formData` state inside `ServiceForm` (around line 376):
```typescript
const [formData, setFormData] = useState({ 
    // ...existing fields...
    isCarRental: service?.isCarRental || false,
    carRentalClass: service?.carRentalClass || 'Sedan',
    carRentalTransmission: service?.carRentalTransmission || 'Automatic',
    carRentalFuel: service?.carRentalFuel || 'Full to Full',
    isDriverHire: service?.isDriverHire || false,
    driverLicenseType: service?.driverLicenseType || 'Professional',
    driverExperience: service?.driverExperience || '3-5 years',
    driverGeoLimits: service?.driverGeoLimits || 'Within City',
});
```

#### 2. [AdminServicesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminServicesScreen.tsx)
Update the `formData` state inside `ServiceForm` (around line 33):
```typescript
const [formData, setFormData] = useState({
    // ...existing fields...
    isCarRental: service?.isCarRental || false,
    carRentalClass: service?.carRentalClass || 'Sedan',
    carRentalTransmission: service?.carRentalTransmission || 'Automatic',
    carRentalFuel: service?.carRentalFuel || 'Full to Full',
    isDriverHire: service?.isDriverHire || false,
    driverLicenseType: service?.driverLicenseType || 'Professional',
    driverExperience: service?.driverExperience || '3-5 years',
    driverGeoLimits: service?.driverGeoLimits || 'Within City',
});
```

---

### B. Input Change Handlers

#### 1. [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx)
The handler `handleChange` already handles checkboxes using `e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : value`. No major changes needed except enabling it to accept the new names.

#### 2. [AdminServicesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminServicesScreen.tsx)
Update the parameters of `handleChange` (around line 56) to support `HTMLSelectElement` and checkbox handling:
```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    // ...errors logic...
};
```

---

### C. UI Component: Rental & Driver Hire Settings Panel

#### 1. UI for [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx)
Append a glassmorphic settings panel matching the dark UI theme of this screen at the bottom of the form before the action buttons.

- **Layout Structure**:
  - Panel header: `"Rental & Driver Hire Settings"` with a modern card outline.
  - Toggles/Checkboxes styled in row items.
  - **Rental Sub-panel** (visible if `isCarRental` is true):
    - Row containing three inputs:
      - **Vehicle Class**: Options: `Sedan`, `SUV`, `Hatchback`, `Coupe`, `Truck`, `Motorcycle`.
      - **Transmission**: Options: `Automatic`, `Manual`.
      - **Fuel Policy**: Options: `Full to Full`, `Full to Empty`, `Same to Same`.
  - **Driver Sub-panel** (visible if `isDriverHire` is true):
    - Row containing three inputs:
      - **License Class**: Options: `Non-Professional`, `Professional`, `Class A`, `Class B`.
      - **Experience**: Options: `1-2 years`, `3-5 years`, `5+ years`.
      - **Geo Limits**: Options: `Within City`, `Within Province`, `Nationwide`.

#### 2. UI for [AdminServicesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminServicesScreen.tsx)
Append a clean, light themed input section mirroring the layout of `AdminCatalogScreen.tsx` but styled with standard light gray borders and fields matching `AdminServicesScreen.tsx`.

---

### D. Data Syncing in Form Submission

#### 1. [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx)
Update the `onSave` invocation inside `handleSubmit` to include the rental and driver hire fields:
```typescript
onSave({ 
    ...formData, 
    price: formData.price === '' ? 0 : Number(formData.price),
    downpaymentPercentage: Number(formData.downpaymentPercentage),
    bookingNoticeHours: Number(formData.bookingNoticeHours),
    isCarRental: formData.isCarRental,
    carRentalClass: formData.isCarRental ? formData.carRentalClass : undefined,
    carRentalTransmission: formData.isCarRental ? formData.carRentalTransmission : undefined,
    carRentalFuel: formData.isCarRental ? formData.carRentalFuel : undefined,
    isDriverHire: formData.isDriverHire,
    driverLicenseType: formData.isDriverHire ? formData.driverLicenseType : undefined,
    driverExperience: formData.isDriverHire ? formData.driverExperience : undefined,
    driverGeoLimits: formData.isDriverHire ? formData.driverGeoLimits : undefined,
});
```

#### 2. [AdminServicesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminServicesScreen.tsx)
Update `handleSubmit` to map the state:
```typescript
onSave({
    ...formData,
    price: Number(formData.price),
    isCarRental: formData.isCarRental,
    carRentalClass: formData.isCarRental ? formData.carRentalClass : undefined,
    carRentalTransmission: formData.isCarRental ? formData.carRentalTransmission : undefined,
    carRentalFuel: formData.isCarRental ? formData.carRentalFuel : undefined,
    isDriverHire: formData.isDriverHire,
    driverLicenseType: formData.isDriverHire ? formData.driverLicenseType : undefined,
    driverExperience: formData.isDriverHire ? formData.driverExperience : undefined,
    driverGeoLimits: formData.isDriverHire ? formData.driverGeoLimits : undefined,
});
```

---

## 3. Verification & Testing Plan

1. **Lint Check**: Run `npm run lint` or `python .agent/scripts/lint_runner.py` to ensure TypeScript matches all definition files.
2. **Visual Verification**:
   - Launch local development server (`npm run dev`).
   - Open Admin Services/Catalog panel.
   - Verify the "Rental & Driver Hire Settings" block is visible.
   - Verify checking the toggles shows the sub-options.
   - Verify toggles correctly update form state.
3. **Database Integration**:
   - Save a service with "Car Rental" settings checked.
   - Re-open the same service to edit and ensure the fields are pre-populated from the stored state.
   - Verify saving deletes unused parameters when toggles are disabled (e.g. if `isCarRental` is unchecked, nested properties are cleared or set to `undefined`).

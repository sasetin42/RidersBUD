# Implementation Plan: Robust Map Pins for Customer and Mechanic

This plan outlines the changes required in [AdminBookingsScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminBookingsScreen.tsx) to ensure real-time coordinate parsing is robust against mixed type formats, name extraction is exception-free, and coordinates safely fall back for side-by-side rendering upon completion.

---

## 1. Robust Coordinate Parsing in `LiveMapCard`

### Objective
Ensure that coordinate inputs from Firebase Real-time Database (RTDB) and client updates are successfully parsed even when sent as strings.

### Actions
- Update RTDB tracking listener callbacks (`unsubCustomer` and `unsubMechanic` `onValue` hooks) to cast lat/lng with `Number()` and validate using `!isNaN()`.
- Update base checks inside `mapMarkers` useMemo and `centerPoint` useMemo hooks to robustly check, parse, and convert string-based or mixed-type coordinates from `booking.location`.

#### Proposed RTDB Listener logic:
```typescript
const unsubCustomer = onValue(customerRef, (snapshot) => {
    const val = snapshot.val();
    if (val) {
        const lat = Number(val.lat);
        const lng = Number(val.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            setCustomerLiveLocation({ lat, lng });
        }
    }
});
```

---

## 2. Bulletproof String Fallbacks

### Objective
Ensure the application does not crash with runtime JS exceptions if `booking.customerName` or other name values are undefined or null when attempting to extract initial characters for avatar fallbacks.

### Actions
- Safely resolve the first character fallback for the customer placeholder by using `(booking.customerName || 'C').charAt(0)`.
- Apply a similar defensive pattern where necessary to ensure robust UI fallback rendering.

---

## 3. Fallback Coordinate Logic & Completion Mapping

### Objective
Enable correct rendering of the customer and mechanic markers side-by-side when a booking status is `'Completed'` and coordinates are provided as strings or numbers.

### Actions
- Check and parse `booking.location.lat` and `booking.location.lng` with `Number()`.
- Check if coordinates are valid numbers (`!isNaN(lat) && !isNaN(lng)`).
- If valid, render the Customer marker at the service location and the Mechanic marker slightly offset side-by-side (`lat + 0.00015`, `lng + 0.00015`).
- Ensure center calculation defaults to Manila `[14.5995, 120.9842]` (or standard default region) if coordinates are missing or invalid.

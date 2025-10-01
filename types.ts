// FIX: Removed an incorrect import that was causing a circular dependency error.
// The types 'Mechanic' and 'Service' are defined and exported from this file.

export interface Vehicle {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicles: Vehicle[];
}

// Base interface for any sellable item
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
}

export interface Service extends Product {
    estimatedTime: string; // e.g., "45 mins"
}

export interface Part extends Product {
    sku: string; // Stock Keeping Unit
}

export interface Mechanic {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    certifications: string[];
    imageUrl: string;
    lat: number;
    lng: number;
    isAvailable?: boolean;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Reminder {
  id: string;
  serviceName: string;
  date: string; // ISO string format for date
  vehicle: string; // e.g., "Toyota Camry"
  notes?: string;
}

export type BookingStatus = 'Upcoming' | 'Completed' | 'Cancelled';

export interface Booking {
    id: string;
    customerName: string;
    service: Service;
    mechanic?: Mechanic;
    date: string; // YYYY-MM-DD
    time: string; // e.g., "09:00 AM"
    status: BookingStatus;
}

export interface Warranty {
  id: string;
  itemName: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string;   // YYYY-MM-DD
  associatedId?: string; // Link to a service or part ID
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
}

export interface Settings {
    appName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    bookingStartTime: string; // e.g., "08:00"
    bookingEndTime: string;   // e.g., "17:00"
    bookingSlotDuration: number; // in minutes
    maxBookingsPerSlot: number;
    emailOnNewBooking: boolean;
    emailOnCancellation: boolean;
    splashLogoUrl?: string;
    authLogoUrl?: string;
    sidebarLogoUrl?: string;
    loginTitle?: string;
    loginSubtitle?: string;
    signupTitle?: string;
    signupSubtitle?: string;
}
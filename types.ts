

export interface Vehicle {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    imageUrl?: string;
    isPrimary?: boolean;
    vin?: string;
    mileage?: number;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
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
    icon: string; // SVG path data
}

export interface Part extends Product {
    sku: string; // Stock Keeping Unit
    stock: number; // Number of items in stock
}

export interface Review {
    id: string;
    customerName: string;
    rating: number; // 1-5 stars
    comment: string;
    date: string; // ISO string
}

export interface Availability {
    isAvailable: boolean;
    startTime: string; // e.g., "09:00"
    endTime: string;   // e.g., "17:00"
}

export interface PayoutDetails {
    method: 'Bank Transfer' | 'E-Wallet';
    accountName: string;
    accountNumber: string;
    bankName?: string;
    walletName?: string;
}

export interface Mechanic {
    id: string;
    name: string;
    email: string;
    password: string;
    phone: string;
    bio: string;
    rating: number;
    reviews: number;
    specializations: string[];
    basePrice?: number;
    portfolioImages?: string[];
    status: 'Pending' | 'Active' | 'Inactive';
    imageUrl: string;
    lat: number;
    lng: number;
    isAvailable?: boolean;
    registrationDate?: string; // YYYY-MM-DD
    birthday?: string; // YYYY-MM-DD
    payoutDetails?: PayoutDetails;
    reviewsList?: Review[];
    availability?: {
        monday: Availability;
        tuesday: Availability;
        wednesday: Availability;
        thursday: Availability;
        friday: Availability;
        saturday: Availability;
        sunday: Availability;
    };
    unavailableDates?: Array<{ startDate: string; endDate: string; reason?: string }>; // YYYY-MM-DD format
    blockedSlots?: Array<{ date: string; time: string; }>;
    businessLicenseUrl?: string; // Base64 or URL
    certifications?: Array<{ name: string; fileUrl: string; }>; // fileUrl can be base64
    insurances?: Array<{ type: string; provider: string; policyNumber: string; }>;
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

export type BookingStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'En Route' | 'In Progress' | 'Booking Confirmed' | 'Mechanic Assigned';

export interface Booking {
    id: string;
    customerName: string;
    service: Service;
    mechanic?: Mechanic;
    date: string; // YYYY-MM-DD
    time: string; // e.g., "09:00 AM"
    status: BookingStatus;
    statusHistory?: Array<{ status: BookingStatus; timestamp: string }>;
    vehicle: Vehicle;
    cancellationReason?: string;
    isReviewed?: boolean;
    notes?: string;
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
    password: string;
    phone: string;
    vehicles: Vehicle[];
    picture?: string;
    lat?: number;
    lng?: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  date: string; // ISO string
}

export interface Banner {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    link: string;
    category: 'Services' | 'Booking' | 'Reminders' | 'Store';
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
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
    appLogoUrl?: string;
    appTagline?: string;
    virtualMechanicName?: string;
    virtualMechanicImageUrl?: string;
    mechanicMarkerUrl?: string;
    adminPanelTitle?: string;
    adminSidebarLogoUrl?: string;
    serviceCategories: string[];
    partCategories: string[];
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface FAQCategory {
    category: string;
    items: FAQItem[];
}

export interface MechanicNotificationSettings {
    newJobAlerts: boolean;
    jobStatusChanges: boolean;
    paymentConfirmations: boolean;
}
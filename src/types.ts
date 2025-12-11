

// This file contains all the type definitions for the application.

export interface Notification {
    id: string;
    type: 'booking' | 'order' | 'reminder' | 'chat' | 'general' | 'job' | 'success' | 'error';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
    recipientId: 'all' | `customer-${string}` | `mechanic-${string}`;
}

export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedTime: string;
    imageUrl: string;
    category: string;
    icon: string;
}

export interface Part {
    id: string;
    name: string;
    description: string;
    price: number;
    salesPrice?: number;
    imageUrls: string[];
    category: string;
    sku: string;
    stock: number;
    brand: string;
}

export type Product = Service | Part;

export interface CartItem extends Part {
    quantity: number;
}

export interface Availability {
    isAvailable: boolean;
    startTime: string;
    endTime: string;
}

export interface Review {
    id: string;
    customerName: string;
    rating: number;
    comment: string;
    date: string;
}

export interface PayoutDetails {
    method: 'Bank Transfer' | 'E-Wallet';
    accountName: string;
    accountNumber: string;
    bankName?: string;
    walletName?: 'GCash' | 'Paymaya';
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
    status: 'Active' | 'Inactive' | 'Pending';
    isOnline?: boolean;
    imageUrl: string;
    lat: number;
    lng: number;
    registrationDate: string;
    birthday: string;
    basePrice?: number;
    payoutDetails?: PayoutDetails;
    portfolioImages?: string[];
    availability?: {
        monday: Availability;
        tuesday: Availability;
        wednesday: Availability;
        thursday: Availability;
        friday: Availability;
        saturday: Availability;
        sunday: Availability;
    };
    unavailableDates?: Array<{ startDate: string; endDate: string; reason?: string; }>;
    reviewsList?: Review[];
    businessLicenseUrl?: string;
    certifications?: Array<{ name: string; fileUrl: string; }>;
    insurances?: Array<{ type: string; provider: string; policyNumber: string; }>;
}

export interface Vehicle {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    imageUrls: string[];
    isPrimary?: boolean;
    vin?: string;
    mileage?: number;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
}

export type BookingStatus = 'Upcoming' | 'Booking Confirmed' | 'Mechanic Assigned' | 'En Route' | 'In Progress' | 'Completed' | 'Cancelled' | 'Reschedule Requested';

export interface Booking {
    id: string;
    customerName: string;
    service: Service;
    mechanic?: Mechanic;
    date: string;
    time: string;
    status: BookingStatus;
    vehicle: Vehicle;
    location?: { lat: number, lng: number };
    statusHistory?: { status: string, timestamp: string }[];
    beforeImages?: string[];
    afterImages?: string[];
    notes?: string;
    cancellationReason?: string;
    rescheduleDetails?: { newDate: string; newTime: string; reason: string };
    isReviewed?: boolean;
    isPaid?: boolean;
    eta?: number; // Estimated time of arrival in minutes
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
    favoriteMechanicIds?: string[];
    subscribedMechanicIds?: string[];
}

export type OrderStatus = 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
    id: string;
    customerName: string;
    items: CartItem[];
    total: number;
    paymentMethod: string;
    date: string;
    status: OrderStatus;
    statusHistory?: { status: OrderStatus, timestamp: string }[];
}

export interface Banner {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    link: string;
    category: 'Services' | 'Store' | 'Reminders' | 'Booking';
    startDate: string;
    endDate: string;
}

export interface PayoutRequest {
    id: string;
    mechanicId: string;
    mechanicName: string;
    amount: number;
    requestDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    processDate?: string;
    rejectionReason?: string;
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface FAQCategory {
    category: string;
    items: FAQItem[];
}

export interface Settings {
    appName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    bookingStartTime: string;
    bookingEndTime: string;
    bookingSlotDuration: number;
    maxBookingsPerSlot: number;
    emailOnNewBooking: boolean;
    emailOnCancellation: boolean;
    appLogoUrl: string;
    appTagline: string;
    virtualMechanicName: string;
    virtualMechanicImageUrl: string;
    virtualMechanicSystemInstruction?: string;
    mechanicMarkerUrl: string;
    googleMapsApiKey?: string;
    adminPanelTitle: string;
    adminSidebarLogoUrl: string;
    serviceCategories: string[];
    partCategories: string[];
    minimumPayout: number;
    maximumPayout: number;
    payoutSchedule: 'Manual' | 'Weekly' | 'Bi-weekly';

    // Enhanced General Information
    supportEmail?: string;
    businessHoursDisplay?: string;
    timezone?: string;
    currency?: string;
    language?: string;

    // Social Links
    socialLinks: {
        facebook: string;
        twitter: string;
        instagram: string;
        website: string;
    };

    // Booking Configuration
    bookingBufferTime: number; // Minutes
    maxAdvanceBookingDays: number;
    cancellationPolicyWindow: number; // Hours
    autoAssignMechanic?: boolean;
    emergencyBookingEnabled?: boolean;
    weekendBookingEnabled?: boolean;
    holidayDates?: string[]; // Array of dates in YYYY-MM-DD format
    minimumBookingNotice?: number; // Hours

    // Branding
    brandingAssets: {
        splashLogoUrl: string;
        customerAuthLogoUrl: string;
        mechanicAuthLogoUrl: string;
    };
}

export type PermissionLevel = 'none' | 'view' | 'edit';
export type AdminModule = 'dashboard' | 'analytics' | 'bookings' | 'catalog' | 'mechanics' | 'customers' | 'marketing' | 'users' | 'settings' | 'orders';

export type RoleName = 'Super Admin' | 'Content Manager' | 'Viewer';

export interface Role {
    name: RoleName | string; // Allow string for custom roles
    isEditable: boolean;
    description: string;
    defaultPermissions: Partial<Record<AdminModule, PermissionLevel>>;
}

export interface AdminUser {
    id: string;
    email: string;
    password: string;
    role: RoleName | string;
    permissions: Partial<Record<AdminModule, PermissionLevel>>;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
    id: string;
    mechanicId: string;
    title: string;
    description?: string;
    dueDate: string;
    isComplete: boolean;
    priority: TaskPriority;
    completionDate?: string;
}

export interface Reminder {
    id: string;
    serviceName: string;
    date: string;
    vehicle: string;
    notes?: string;
}

export interface Warranty {
    id: string;
    itemName: string;
    purchaseDate: string;
    expiryDate: string;
}

export interface RentalCar {
    id: string;
    make: string;
    model: string;
    year: number;
    type: 'Sedan' | 'SUV' | 'Van' | 'Luxury';
    pricePerDay: number;
    seats: number;
    imageUrl: string;
    isAvailable: boolean;
}

export interface RentalBooking {
    id: string;
    carId: string;
    customerName: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    totalPrice: number;
}

export interface Database {
    services: Service[];
    parts: Part[];
    mechanics: Mechanic[];
    bookings: Booking[];
    customers: Customer[];
    orders: Order[];
    banners: Banner[];
    settings: Settings;
    faqs: FAQCategory[];
    adminUsers: AdminUser[];
    roles: Role[];
    tasks: Task[];
    payouts: PayoutRequest[];
    rentalCars: RentalCar[];
    rentalBookings: RentalBooking[];
}

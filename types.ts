

// FIX: Removed self-import which was causing a circular dependency and declaration conflicts.
// This file contains all the type definitions for the application.

export interface Notification {
    id: string;
    type: 'booking' | 'order' | 'reminder' | 'chat' | 'general' | 'job';
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
    imageUrl: string;
    category: string;
    sku: string;
    stock: number;
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
    imageUrl: string;
    isPrimary?: boolean;
    vin?: string;
    mileage?: number;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
}

export type BookingStatus = 'Upcoming' | 'Booking Confirmed' | 'Mechanic Assigned' | 'En Route' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Booking {
    id: string;
    customerName: string;
    service: Service;
    mechanic?: Mechanic;
    date: string;
    time: string;
    status: BookingStatus;
    vehicle: Vehicle;
    statusHistory?: { status: string, timestamp: string }[];
    beforeImages?: string[];
    afterImages?: string[];
    notes?: string;
    cancellationReason?: string;
    isReviewed?: boolean;
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
    adminPanelTitle: string;
    adminSidebarLogoUrl: string;
    serviceCategories: string[];
    partCategories: string[];
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
}
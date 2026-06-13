export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedTime: string;
    imageUrl: string;
    category: string;
    features?: string[];
    icon?: string;
    // Enhanced management fields
    isActive?: boolean;
    popularityScore?: number;
    totalBookings?: number;
    lastModified?: string;
    createdAt?: string;
    duration?: number;
}

export interface Vehicle {
    id?: string;
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    type?: string;
    color?: string;
    imageUrls?: string[];
    isPrimary?: boolean;
    vin?: string;
    mileage?: number;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    servicesCount?: number;
    totalSpent?: number;
    category?: string;
    subCategory?: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    picture?: string;
    password?: string;
    vehicles: Vehicle[];
    favoriteMechanicIds?: string[];
    subscribedMechanicIds?: string[];
    lat?: number;
    lng?: number;
    status?: string;
    isOnline?: boolean;
    hasSeenTour?: boolean;
    registrationDate?: string;
    notificationSettings?: {
        bookingUpdates: boolean;
        serviceReminders: boolean;
        promotions: boolean;
        reminderLeadTime: '1-hour' | '1-day' | '2-days';
        notificationChannels: {
            inApp: boolean;
            email: boolean;
            sms: boolean;
        };
        soundEnabled?: boolean;
        soundTheme?: 'hud' | 'chime' | 'beep';
        quietHoursEnabled?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
    };
}

export interface FAQItem {
    id?: string;
    question: string;
    answer: string;
    category?: string;
}

export interface FAQCategory {
    category: string;
    items: FAQItem[];
}

export interface Settings {
    // General
    appName?: string;
    appTagline?: string;
    appLogoUrl?: string;
    faviconUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    supportEmail?: string;
    supportPhone?: string;
    address?: string;
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
    };

    // Appearance
    splashLogoUrl?: string;
    authLogoUrl?: string;
    adminLoginLogoUrl?: string;
    adminPanelLogoUrl?: string;
    adminSidebarLogoUrl?: string;
    sidebarLogoUrl?: string;
    mapLogoUrl?: string;
    invoiceLogoUrl?: string;
    adminPanelTitle?: string;
    sidebarColor?: string;
    accentColor?: string;

    // Operations
    bookingStartTime?: string;
    bookingEndTime?: string;
    bookingSlotDuration?: number;
    maxBookingsPerSlot?: number;

    // Financials
    currency?: string;
    serviceFeePercentage?: number;
    minimumPayout?: number;
    maximumPayout?: number;
    payoutSchedule?: string;

    // HitPay Payment Gateway
    hitpayApiKey?: string;
    hitpaySalt?: string;
    hitpaySandboxApiKey?: string;
    hitpaySandboxSalt?: string;
    hitpaySandboxMode?: boolean;

    // Manual GCash
    gcashEnabled?: boolean;
    gcashNumber?: string;
    gcashAccountName?: string;
    gcashQrCodeUrl?: string;
    mechanicMarkerUrl?: string;

    // Notifications
    emailOnNewBooking?: boolean;
    emailOnCancellation?: boolean;

    // Verification
    verificationRequirements?: any[]; // Using any for simplicity as it's defined inside AdminSettings currently

    // System
    maintenanceMode?: boolean;

    // Support (New)
    virtualMechanicName?: string;
    virtualMechanicImageUrl?: string;
    chatEnabled?: boolean;
    supportChatTitle?: string;
    faqs?: FAQItem[];

    // Inventory & Catalog
    serviceCategories?: string[]; // Arrays of category names
    partCategories?: string[];
}

export interface HitPayConfig {
    apiKey: string;
    salt: string;
    isSandbox: boolean;
}

export interface PaymentRequest {
    amount: number;
    currency: string;
    reference_number: string;
    webhook: string;
    redirect_url: string;
    email: string;
    name: string;
    phone?: string;
    purpose?: string;
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
    };
}

export interface Database {
    services: Service[];
    customers: Customer[];
    settings: Settings;
    mechanics: Mechanic[];
    bookings: Booking[];
    notifications: Notification[];
    parts: Part[];
    orders: any[];
    banners: any[];
    faqs: any[];
    adminUsers: any[];
    roles: any[];
    tasks: any[];
    payouts: any[];
    rentalCars: any[];
    rentalBookings: any[];
    subscriptions: any[];
    promoCodes: any[];
}

export interface Reminder {
    id: string;
    userId?: string;
    vehicleId?: string;
    vehicle: string;
    serviceId?: string;
    serviceName: string;
    date: string; // ISO Date string
    dueDate?: string; // Legacy field
    status?: 'Pending' | 'Completed' | 'Overdue';
    notes?: string;
    createdAt?: string;
}


export type AdminModule = 'dashboard' | 'analytics' | 'bookings' | 'catalog' | 'mechanics' | 'customers' | 'marketing' | 'users' | 'settings' | 'orders' | 'monetization' | 'payouts' | 'chat' | 'gcash-payments' | 'notifications';
export type PermissionLevel = 'none' | 'read' | 'write';
export type RoleName = 'Super Admin' | 'Admin' | 'Editor' | 'Viewer';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: RoleName;
    isActive: boolean;
    isOnline?: boolean;
    avatarUrl?: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
    password?: string;
    permissions: Record<AdminModule, PermissionLevel>;
    department?: string;
    phoneNumber?: string;
    notes?: string;
}


// Part interface for inventory management
export interface Part {
    id: string;
    name: string;
    description?: string;
    price: number;
    salesPrice?: number;
    category: string;
    sku: string;
    imageUrls: string[];
    stock: number;
    brand?: string;
    // Enhanced management fields
    isActive?: boolean;
    lowStockThreshold?: number;
    reorderQuantity?: number;
    lastRestocked?: string;
    createdAt?: string;
    lastModified?: string;
    // Common fields
    id_alias?: string; // Sometimes id is aliased
}

export type Product = Part;

export interface CartItem extends Part {
    quantity: number;
}


export interface DayAvailability {
    isAvailable: boolean;
    startTime: string;
    endTime: string;
}

export interface Mechanic {
    id: string;
    name: string;
    email: string;
    phone: string;
    imageUrl?: string;
    isOnline: boolean;
    hasSeenTour?: boolean;
    rating: number;
    reviewsCount?: number;
    reviews: number; // Used in screens for job/review count
    specialties?: string[];
    specializations: string[]; // Used in screens
    address?: string;
    lat: number;
    lng: number;
    location?: {
        lat: number;
        lng: number;
        address?: string;
    };
    walletBalance?: number;
    lockedBalance?: number;
    totalEarnings?: number;
    payoutRequested?: boolean;
    verificationStatus?: 'unverified' | 'pending' | 'verified' | string;
    status: 'Active' | 'Pending' | 'Inactive' | string;
    joinedAt?: string;
    birthday?: string;
    bio: string;
    portfolioImages?: string[];
    availability: {
        monday: DayAvailability;
        tuesday: DayAvailability;
        wednesday: DayAvailability;
        thursday: DayAvailability;
        friday: DayAvailability;
        saturday: DayAvailability;
        sunday: DayAvailability;
        [key: string]: DayAvailability;
    };
    reviewsList?: Review[];
    certifications?: { name: string; fileUrl?: string }[];
    insurances?: { type: string; provider: string; policyNumber?: string }[];
    unavailableDates?: { startDate: string; endDate: string; reason?: string }[];
    payoutDetails?: PayoutDetails;
    documents?: string[];
    registrationDate?: string;
    verificationDocuments?: {
        verificationStatus: 'Pending' | 'Approved' | 'Rejected' | 'approved' | 'pending' | 'rejected' | string;
        [key: string]: any;
    };
    password?: string;
    businessLicenseUrl?: string;
    notificationSettings?: {
        newJobAlerts: boolean;
        jobStatusChanges: boolean;
        paymentConfirmations: boolean;
        soundEnabled?: boolean;
        soundTheme?: 'engine' | 'brake' | 'chime';
        quietHoursEnabled?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
        maxJobDistance?: '5km' | '15km' | '30km' | 'any';
    };
}

export interface Booking {
    id: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    services: Service[];
    service: Service;
    vehicle: Vehicle;
    date: string;
    time: string;
    status: BookingStatus;
    payoutRequested?: boolean;
    location?: {
        lat: number;
        lng: number;
        address?: string;
    };
    notes?: string;
    paymentMethod?: 'Cash' | 'GCash' | 'Card';
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
    totalAmount?: number;
    isPaid?: boolean;
    gcashReference?: string;
    gcashReceiptUrl?: string;
    gcashDeclineReason?: string;
    isVerified?: boolean;
    paymentIntentId?: string;
    checkoutUrl?: string;
    gcashPaymentStatus?: 'awaiting_payment' | 'receipt_uploaded' | 'balance_receipt_uploaded' | 'verified' | 'declined';
    mechanicId?: string;
    mechanicName?: string;
    mechanic?: any;
    statusHistory: { status: string; timestamp: string }[];
    createdAt?: string;
    review?: Review;
    isReviewed?: boolean;
    beforeImages?: string[];
    afterImages?: string[];
    cancellationReason?: string;
    rescheduleDetails?: {
        newDate: string;
        newTime: string;
        requestedBy: 'customer' | 'mechanic';
        reason: string;
    } | null;
}

export type BookingStatus = 'Upcoming' | 'Booking Confirmed' | 'Mechanic Assigned' | 'En Route' | 'In Progress' | 'Work Done' | 'Completed' | 'Cancelled' | 'Reschedule Requested';
export type Order = any;
export interface Review {
    id: string;
    bookingId?: string;
    customerId?: string;
    customerName: string;
    mechanicId?: string;
    mechanicName?: string;
    rating: number;
    comment: string;
    date: string; // ISO String
    updatedAt?: string; // For tracking edits
}
export interface Banner {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    link?: string;
    isActive: boolean;
    startDate: string;
    endDate?: string;
    targetAudience: string;
}
export type Role = any;
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task {
    id: string;
    mechanicId: string;
    title: string;
    description?: string;
    dueDate: string;
    priority: TaskPriority;
    isComplete: boolean;
    completionDate?: string;
}

export type OrderStatus = any;
export interface PayoutRequest {
    id: string;
    mechanicId: string;
    mechanicName: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
    date?: string;
    requestDate: string;
    processDate?: string;
    transactionId?: string;
    notes?: string;
    rejectionReason?: string;
    processedBy?: string;
    adminId?: string;
    adminName?: string;
    adminNotes?: string;
    paymentMethod: string;
    accountDetails: string;
}


export interface PayoutDetails {
    method: 'Bank Transfer' | 'E-Wallet';
    accountName: string;
    accountNumber: string;
    bankName?: string;
    walletName?: string;
}

export type RentalCar = any;
export type RentalBooking = any;
export type Subscription = any;
export type PromoCode = any;

export interface Notification {
    id: string;
    recipientId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'alert';
    date: string;
    read: boolean;
    link?: string;
    timestamp?: number;
}

export interface Warranty {
    id: string;
    itemName: string;
    purchaseDate: string;
    expiryDate: string;
}

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
    duration?: number;
    requiresDownpayment?: boolean;
    downpaymentPercentage?: number;
    requiresApproval?: boolean;
    bookingNoticeHours?: number;
    // Rental and Driver Hire fields
    isCarRental?: boolean;
    carRentalClass?: string;
    carRentalTransmission?: string;
    carRentalFuel?: string;
    isDriverHire?: boolean;
    driverLicenseType?: string;
    driverExperience?: string;
    driverGeoLimits?: string;
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
    loadingLogoUrl?: string;
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

    // SMTP Configuration
    smtpHost?: string;
    smtpPort?: string;
    smtpUsername?: string;
    smtpPassword?: string;
    smtpFromName?: string;
    smtpFromEmail?: string;

    // Verification
    verificationRequirements?: any[]; // Using any for simplicity as it's defined inside AdminSettings currently

    // System
    maintenanceMode?: boolean;

    // Default Profile Images
    defaultCustomerImageUrl?: string;
    defaultMechanicImageUrl?: string;

    // Support (New)
    virtualMechanicName?: string;
    virtualMechanicImageUrl?: string;
    chatEnabled?: boolean;
    supportChatTitle?: string;
    faqs?: FAQItem[];

    // Inventory & Catalog
    serviceCategories?: string[]; // Arrays of category names
    partCategories?: string[];

    // System Modules Configurations
    modules?: ModuleConfig[];

    // Google Maps & Navigation Integration
    googleMapsApiKey?: string;
    googleMapsEnabled?: boolean;
    defaultMapCenterLat?: number;
    defaultMapCenterLng?: number;
    defaultMapZoom?: number;
    enableTrafficLayer?: boolean;
}

export interface ModuleConfig {
    id: string; // 'rent-a-car' | 'driver-for-hire' | 'liaison-assistance' | 'towing'
    name: string;
    enabled: boolean;
    bannerMessage?: string;
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
    rentalCars: RentalCar[];
    rentalBookings: RentalBooking[];
    hireDrivers: HireDriver[];
    subscriptions: any[];
    promoCodes: any[];
    appServices: AppService[];
    serviceRequests: ServiceRequest[];
    serviceProviders: ServiceProvider[];
    servicePricing: ServicePricing[];
    serviceActivityLogs: ServiceActivityLog[];
    liaisonStaff: LiaisonStaff[];
    liaisonBranches: LiaisonBranch[];
    liaisonBookings: LiaisonBooking[];
}

export interface AppService {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    category?: string;
    isActive: boolean;
    features?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface ServiceProvider {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    servicesOffered?: string[];
    rating?: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ServicePricing {
    id: string;
    serviceId: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ServiceRequest {
    id: string;
    customerId: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    serviceId: string;
    serviceName?: string;
    pricingId?: string;
    providerId?: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | 'Pending Admin Review' | 'For Verification' | 'Awaiting Driver Availability' | 'Driver Assigned' | 'Confirmed' | string;
    details?: any;
    vehicleId?: string;
    vehicleDetails?: any;
    scheduledDate?: string;
    completedDate?: string;
    notes?: string;
    totalAmount?: number;
    createdAt: string;
    updatedAt: string;
    driverName?: string;
    driverPhone?: string;
    estimatedArrivalTime?: string;
    remarks?: string;
}

export interface ServiceActivityLog {
    id: string;
    requestId: string;
    customerId?: string;
    statusFrom?: string;
    statusTo: string;
    notes?: string;
    updatedBy?: string;
    updatedAt: string;
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
export type RoleName = 'Super Admin' | 'Admin' | 'Editor' | 'Viewer' | 'Customer' | 'Mechanic';

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
    loginLogs?: {
        timestamp: string;
        ipAddress: string;
        browser: string;
        location: string;
    }[];
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
    rentalCarDetails?: any;
    driverDetails?: any;
    startLocation?: string;
    endLocation?: string;
    endDate?: string;
    rentalDays?: number;
    paymentMethod?: 'Cash' | 'GCash' | 'Card';
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
    totalAmount?: number;
    isPaid?: boolean;
    isRental?: boolean;
    gcashReference?: string;
    gcashReceiptUrl?: string;
    gcashDeclineReason?: string;
    isVerified?: boolean;
    gcashDownpaymentReceiptUrl?: string;
    gcashBalanceReceiptUrl?: string;
    gcashBalanceReference?: string;
    gcashDownpaymentReference?: string;
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

export type BookingStatus = 'Upcoming' | 'Booking Confirmed' | 'Mechanic Assigned' | 'En Route' | 'In Progress' | 'Work Done' | 'Completed' | 'Cancelled' | 'Reschedule Requested' | 'On Hold';
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

export interface RentalCar {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    seats: number;
    pricePerDay: number;
    transmission?: string;
    fuelPolicy?: string;
    color?: string;
    plateNumber?: string;
    isAvailable: boolean;
    imageUrl: string;
    features?: string[];
    description?: string;
}

export interface HireDriver {
    id: string;
    name: string;
    phone: string;
    licenseType: string;
    licenseNumber?: string;
    experience: string;
    geoLimit: string;
    pricePerHour: number;
    pricePerDay: number;
    isAvailable: boolean;
    imageUrl: string;
    rating?: number;
    totalTrips?: number;
    languages?: string[];
    description?: string;
}

export interface RentalBooking {
    id: string;
    carId: string;
    customerId?: string;
    customerName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status?: string;
    createdAt?: string;
    paidAmount?: number;
    paymentStatus?: string;
    isPaid?: boolean;
    includeDriver?: boolean;
}
export type Subscription = any;
export type PromoCode = any;

export interface Notification {
    id: string;
    recipientId: string;
    recipientRole: 'customer' | 'mechanic' | 'admin';
    bookingId?: string;
    title: string;
    message: string;
    type: 'booking_status' | 'payment' | 'assignment' | 'system' | 'info' | 'success' | 'warning' | 'alert';
    status: 'unread' | 'read';
    createdAt: any;
    createdBy: string;
    metadata?: {
        customerId?: string;
        mechanicId?: string;
        paymentStatus?: string;
        bookingStatus?: string;
        [key: string]: any;
    };
    link?: string;
    // Legacy fields for backwards compatibility
    date?: string;
    read?: boolean;
    timestamp?: number;
}

export interface Warranty {
    id: string;
    itemName: string;
    purchaseDate: string;
    expiryDate: string;
}

export interface LiaisonStaff {
    id: string;
    name: string;
    phone: string;
    imageUrl: string;
    rating: number;
    assignedBranches: string[]; // Branch IDs
    assignedServices?: string[]; // Liaison Service Types (e.g. Registration Renewal, etc.)
    isAvailable: boolean;
    description?: string;
    totalJobs?: number;
}

export interface LiaisonBranch {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    isAvailable: boolean;
    lat?: number;
    lng?: number;
}

export interface LiaisonBooking {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    serviceType: string;
    vehicleDetails: {
        plateNumber: string;
        type: string;
        brand: string;
        model: string;
        year: number;
        color?: string;
        engineNumber?: string;
        chassisNumber?: string;
        currentOrNumber?: string;
        currentCrNumber?: string;
        province?: string;
    };
    branchId: string;
    branchName: string;
    liaisonId: string;
    liaisonName: string;
    appointmentDate: string;
    appointmentTime: string;
    pickupOption: 'Customer brings documents' | 'Home Pickup' | 'Office Pickup';
    pickupAddress?: string;
    documents: Array<{
        name: string;
        type: string;
        size: number;
        url: string; // Simulated base64 or file URL
    }>;
    status: 'Booking Received' | 'Documents Verified' | 'Payment Confirmed' | 'Liaison Assigned' | 'Processing at LTO' | 'Awaiting Approval' | 'Completed' | 'Ready for Pickup' | 'Delivered' | 'Pending Admin Review' | 'For Verification' | 'For Processing' | 'Assigned' | 'In Progress' | 'Cancelled';
    paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded' | 'partial';
    paymentMethod: 'GCash' | 'Maya' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Bank Transfer';
    totalAmount?: number;
    paidAmount?: number;
    fees: {
        serviceFee: number;
        governmentFee: number;
        pickupFee: number;
        discount: number;
        total: number;
    };
    statusHistory: Array<{
        status: string;
        timestamp: string;
        officerName?: string;
        notes?: string;
    }>;
    createdAt: string;
}

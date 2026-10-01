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
    profileCompleted?: boolean;
    profileCompletedAt?: string;
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
    customerHeaderLogoUrl?: string;
    mechanicHeaderLogoUrl?: string;
    adminSidebarLogoUrl?: string;
    sidebarLogoUrl?: string;
    mapLogoUrl?: string;
    invoiceLogoUrl?: string;
    emailLogoUrl?: string;
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
    hitpayEnabled?: boolean;
    hitpaySandboxMode?: boolean;
    hitpayApiKey?: string;
    hitpaySalt?: string;
    hitpaySandboxApiKey?: string;
    hitpaySandboxSalt?: string;

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
    smtpEncryption?: 'SSL/TLS' | 'STARTTLS' | 'None';
    smtpUsername?: string;
    smtpPassword?: string;
    smtpAuthRequired?: boolean;
    smtpFromName?: string;
    smtpFromEmail?: string;
    smtpReplyTo?: string;

    // Email Notification Templates
    emailTemplates?: Record<string, EmailTemplate>;

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

    // E-Commerce Parts & Tools Store Hub Location (Origin Pin for Live Tracking)
    storeName?: string;
    storeAddress?: string;
    storeLatitude?: number;
    storeLongitude?: number;
    storePhone?: string;
    autoDetectStoreLocation?: boolean; // When true, automatically detects and syncs live physical GPS coordinates

    // Leaflet Customization & Live Telemetry
    leafletTileProvider?: 'osm-dark' | 'osm' | 'esri-dark' | 'esri-satellite' | 'esri-streets' | 'cyclosm' | 'custom';
    leafletCustomTileUrl?: string;
    leafletCustomAttribution?: string;
    leafletEnableClustering?: boolean;
    leafletClusterMaxZoom?: number;
    leafletLiveUpdateInterval?: number; // In seconds
    leafletShowHeadingCompass?: boolean;
    leafletShowAccuracyCircle?: boolean;
    leafletShowLiveTrail?: boolean;
    leafletMapTheme?: 'dark' | 'light' | 'auto';

    // Mobile App & APK Live Updates
    appUpdateConfig?: AppUpdateSettings;
    appUpdateConfigApp?: AppUpdateSettings; // settings/app fallback copy (highest versionCode wins)

    // Specialized Services Customization (Car Rental, Driver for Hire, Liaison, Towing)
    serviceCustomizations?: ServiceCustomizationSettings;

    // General Extensions
    companyName?: string;
    defaultLanguage?: string;
    timeZone?: string;
    dateFormat?: string;
    timeFormat?: string;
    numberFormat?: string;

    // Appearance Extensions
    themeMode?: 'dark' | 'light' | 'system';
    primaryBrandColor?: string;
    secondaryBrandColor?: string;
    borderRadius?: string;
    fontFamily?: string;
    fontSize?: string;
    density?: 'compact' | 'comfortable' | 'spacious';
    customCss?: string;
    headerStyle?: 'solid' | 'glass' | 'minimal';
    loginBackgroundUrl?: string;

    // Operations Extensions
    driverDispatchRadiusKm?: number;
    cancellationFee?: number;
    cancellationWindowHours?: number;
    schedulingLeadTimeHours?: number;
    autoAssignMechanics?: boolean;
    mechanicAutoOfflineEnabled?: boolean;
    mechanicInactivityThresholdHours?: number;
    mechanicAutoOfflineWarningMinutes?: number;
    serviceAreas?: string[];
    operatingDays?: string[];
    holidayDates?: string[];

    // Financials Extensions
    taxRatePercentage?: number;
    taxIdentificationNumber?: string;
    invoicePrefix?: string;
    receiptPrefix?: string;
    paymentTermsDays?: number;
    financialApprovalThreshold?: number;

    // Notifications Extensions
    smsNotificationsEnabled?: boolean;
    pushNotificationsEnabled?: boolean;
    inAppNotificationsEnabled?: boolean;
    smsGatewayProvider?: 'twilio' | 'semaphore' | 'infobip' | 'custom';
    smsApiKey?: string;

    // Verification Extensions
    emailVerificationRequired?: boolean;
    phoneVerificationRequired?: boolean;
    otpVerificationRequired?: boolean;
    identityVerificationRequired?: boolean;
    mechanicAutoApproval?: boolean;
    driverAutoApproval?: boolean;
    verificationExpiryMonths?: number;

    // Support Extensions
    helpCenterUrl?: string;
    faqUrl?: string;
    slaResponseTimeHours?: number;
    slaResolutionTimeHours?: number;
    supportAutoReply?: boolean;
    supportAutoReplyMessage?: string;

    // System & Performance Extensions
    debugMode?: boolean;
    environment?: 'production' | 'staging' | 'development';
    apiRateLimitPerMinute?: number;
    maxUploadSizeMb?: number;
    enableImageCompression?: boolean;
    enableWebpConversion?: boolean;
    cdnBaseUrl?: string;

    // Security Extensions
    passwordMinLength?: number;
    passwordRequireSpecialChar?: boolean;
    passwordRequireUppercase?: boolean;
    passwordRequireNumber?: boolean;
    passwordExpiryDays?: number;
    accountLockoutAttempts?: number;
    accountLockoutMinutes?: number;
    sessionTimeoutMinutes?: number;
    twoFactorAuthRequired?: boolean;
    captchaEnabled?: boolean;

    // Backups & Retention
    autoBackupEnabled?: boolean;
    autoBackupSchedule?: 'daily' | 'weekly' | 'monthly';
    backupRetentionDays?: number;

    // Webhooks & Integrations
    webhooks?: WebhookConfig[];
    thirdPartyIntegrations?: Record<string, { enabled: boolean; apiKey?: string; endpoint?: string; status?: string }>;
}

export interface WebhookConfig {
    id: string;
    name: string;
    event: string;
    endpointUrl: string;
    secret?: string;
    httpMethod?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    isActive: boolean;
    retryCount?: number;
    timeoutSeconds?: number;
    lastTriggeredAt?: string;
    lastResponseStatus?: number;
    failureCount?: number;
}

export interface WebhookDeliveryLog {
    id: string;
    webhookId: string;
    webhookName: string;
    event: string;
    timestamp: string;
    status: 'success' | 'failed' | 'retrying';
    statusCode?: number;
    payloadPreview: string;
    responseBody?: string;
    errorMessage?: string;
    durationMs: number;
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    user: string;
    userEmail: string;
    userRole: string;
    action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Rejected' | 'Login' | 'Logout' | 'Exported' | 'Imported' | 'Configuration Changed';
    module: string;
    recordId?: string;
    previousValue?: string;
    newValue?: string;
    ipAddress?: string;
    device?: string;
    browser?: string;
    status: 'Success' | 'Failed' | 'Warning';
    details: string;
}

export interface BackupRecord {
    id: string;
    createdAt: string;
    fileName: string;
    sizeBytes: number;
    sizeFormatted: string;
    type: 'full' | 'database' | 'media' | 'configuration';
    status: 'completed' | 'failed' | 'restoring';
    collectionsIncluded: string[];
    versionTag: string;
    createdBy: string;
    downloadUrl?: string;
}

export interface ConfigVersionRecord {
    version: number;
    timestamp: string;
    changedBy: string;
    changedFields: string[];
    summary: string;
    snapshot: Partial<Settings>;
}

export interface AppUpdateSettings {
    versionCode: number;
    versionName: string;
    apkUrl: string;
    releaseNotes: string;
    mandatory: boolean;
    minSupportedVersionCode?: number;
    lastUpdated?: string;
    fileSizeMb?: string;
    // Customizable In-App Update Modal & Policy Controls
    showUpdateModal?: boolean; // When false, suppresses/hides the in-app update modal globally
    targetAudience?: 'all' | 'customers' | 'mechanics' | 'none'; // Controls who is prompted for the APK
    externalDownloadUrl?: string; // Alternative external / mirror download link
    allowRemindLater?: boolean; // Controls whether users can dismiss with Remind Me Later
}

export interface ModuleConfig {
    id: string; // 'rent-a-car' | 'driver-for-hire' | 'liaison-assistance' | 'towing' | 'parts-store'
    name: string;
    enabled: boolean;
    bannerMessage?: string;
}

export interface CarRentalServiceSettings {
    enabled: boolean;
    bannerMessage?: string;
    securityDepositAmount: number;
    driverAddonDailyRate: number;
    minRentalDays: number;
    fuelPolicy: 'full_to_full' | 'same_level';
    dailyMileageLimitKm: number;
    insuranceDailyFee: number;
    lateReturnPenaltyPerHour: number;
    requireValidLicense: boolean;
    requireValidId: boolean;
    cancellationWindowHours: number;
    termsAndConditions?: string;
}

export interface DriverHireServiceSettings {
    enabled: boolean;
    bannerMessage?: string;
    twoHoursRate: number;
    fourHoursRate: number;
    eightHoursRate: number;
    airportTransferRate: number;
    depositPercentage: number;
    overtimeRatePerHour: number;
    customerCarDiscount: number;
    nightDifferentialRatePerHour: number;
    advanceBookingNoticeHours: number;
    allowCustomerCarOnly: boolean;
    termsAndConditions?: string;
}

export interface LiaisonServiceSettings {
    enabled: boolean;
    bannerMessage?: string;
    renewalServiceFee: number;
    transferOwnershipFee: number;
    duplicateDocFee: number;
    documentPickupFee: number;
    rushProcessingFee: number;
    leadTimeDays: number;
    requireEmissionTestCopy: boolean;
    requireInsuranceCopy: boolean;
    termsAndConditions?: string;
}

export interface TowingServiceSettings {
    enabled: boolean;
    bannerMessage?: string;
    baseHookupFee: number;
    perKmRate: number;
    flatbedSurcharge: number;
    winchingRecoveryFee: number;
    nightDifferentialSurcharge: number;
    maxDispatchRadiusKm: number;
    priorityResponseTimeMinutes: number;
    emergencyHotline?: string;
    termsAndConditions?: string;
}

export interface ServiceCustomizationSettings {
    carRental?: CarRentalServiceSettings;
    driverHire?: DriverHireServiceSettings;
    liaison?: LiaisonServiceSettings;
    towing?: TowingServiceSettings;
}

export interface EmailTemplate {
    id: string;
    name: string;
    category: 'Bookings' | 'Drivers & Fleet' | 'E-Commerce' | 'Accounts' | 'Operations';
    subject: string;
    body: string;
    enabled: boolean;
    variables: string[];
    description: string;
    updatedAt?: string;
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
    payment_methods?: string[];
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
    purposeOfHire?: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | 'Pending Admin Review' | 'For Verification' | 'Awaiting Driver Availability' | 'Driver Assigned' | 'Confirmed' | string;
    details?: any;
    vehicleId?: string;
    vehicleDetails?: any;
    scheduledDate?: string;
    completedDate?: string;
    notes?: string;
    totalAmount?: number;
    price?: number;
    paidAmount?: number;
    downpaymentAmount?: number;
    isPaid?: boolean;
    paymentStatus?: 'pending' | 'partial' | 'paid' | 'unpaid' | 'downpayment_paid' | string;
    paymentMethod?: string;
    isVerified?: boolean;
    downpaymentRef?: string;
    downpaymentPaidAt?: string;
    balancePaymentRef?: string;
    balancePaidAt?: string;
    balancePaid?: boolean;
    hitpayReference?: string;
    hitpayPaymentRequestId?: string;
    hitpayStatus?: string;
    gcashReceiptUrl?: string;
    gcashDownpaymentReceiptUrl?: string;
    gcashBalanceReceiptUrl?: string;
    gcashReference?: string;
    gcashPaymentStatus?: 'pending' | 'verified' | 'declined' | string;
    gcashDeclineReason?: string;
    additionalCosts?: { description: string; price: number }[];
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

export interface SmtpLog {
    id: string;
    timestamp: string;
    recipient: string;
    sender: string;
    subject: string;
    status: 'Sending' | 'Submitted to SMTP Server' | 'Accepted by SMTP Server' | 'Delivered' | 'Failed';
    host: string;
    port: string | number;
    encryption: string;
    serverResponse?: string;
    errorMessage?: string;
    latencyMs?: number;
    messageId?: string;
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
export interface PartFitment {
    make: string;
    models: string;
}

export interface PartTechnicalSpec {
    label: string;
    value: string;
}

export interface PartWarrantyInfo {
    title?: string;
    coverage?: string;
    subtitle?: string;
}

export interface PartShippingInfo {
    title?: string;
    eta?: string;
    subtitle?: string;
}

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
    // Extended product customization details
    vehicleFitment?: PartFitment[];
    technicalSpecs?: PartTechnicalSpec[];
    rating?: number;
    reviewCount?: number;
    warrantyInfo?: PartWarrantyInfo;
    shippingInfo?: PartShippingInfo;
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
    lastActive?: string;
    lastActionTimestamp?: string;
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
    savedPayoutDestinations?: PayoutDetails[];
    earningsRecomputedAt?: string;
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
    customerEmail?: string;
    customerPhone?: string;
    services: Service[];
    service: Service;
    vehicle: Vehicle;
    date: string;
    time: string;
    price?: number;
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
    paymentMethod?: string;
    paymentStatus?: 'pending' | 'partial' | 'paid' | 'downpayment_paid' | string;
    paidAmount?: number;
    totalAmount?: number;
    isPaid?: boolean;
    isRental?: boolean;
    downpaymentAmount?: number;
    downpaymentRef?: string;
    downpaymentPaidAt?: string;
    downpaymentMethod?: string;
    balancePaymentRef?: string;
    balancePaidAt?: string;
    balanceAmount?: number;
    balancePaid?: boolean;
    remainingBalance?: number;
    hitpayPaymentRequestId?: string;
    hitpayReference?: string;
    hitpayStatus?: string;
    paymentTransactions?: Array<{
        id: string;
        type: 'downpayment' | 'balance' | 'full';
        amount: number;
        method: string;
        reference: string;
        paidAt: string;
        status: string;
        gatewayResponse?: any;
    }>;
    gcashReference?: string;
    gcashReceiptUrl?: string;
    gcashDeclineReason?: string;
    isVerified?: boolean;
    gcashDownpaymentReceiptUrl?: string;
    gcashBalanceReceiptUrl?: string;
    gcashBalanceReference?: string;
    gcashDownpaymentReference?: string;
    // Mechanic earnings release guard (prevents double-crediting on status re-entry)
    earningsReleased?: boolean;
    earningsReleasedAt?: string;
    earningsAmount?: number;
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
    submittedAt?: string;
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
    id?: string;
    method: 'Bank Transfer' | 'E-Wallet';
    accountName: string;
    accountNumber: string;
    bankName?: string;
    bankCode?: string;
    walletName?: string;
    qrCodeUrl?: string;
    isVerified?: boolean;
    isDefault?: boolean;
    updatedAt?: string;
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
    baggageCapacity?: number;
    mileageLimit?: string;
    insuranceIncluded?: string;
    depositAmount?: number;
    cancellationPolicy?: string;
    engineType?: string;
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
    specializations?: string[];
    vehicleTypes?: string[];
    availabilitySchedule?: string;
}

export interface RentalBooking {
    id: string;
    carId: string;
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status?: string;
    createdAt?: string;
    paidAmount?: number;
    paymentStatus?: string;
    isPaid?: boolean;
    includeDriver?: boolean;
    location?: { latitude: number; longitude: number; address?: string } | { lat: number; lng: number; address?: string };
    pickupLocation?: string;
    deliveryOption?: string;
    notes?: string;
    downpaymentAmount?: number;
    remainingBalance?: number;
    downpaymentRef?: string;
    downpaymentPaidAt?: string;
    balancePaymentRef?: string;
    balancePaidAt?: string;
    balancePaid?: boolean;
    isVerified?: boolean;
    paymentMethod?: string;
    isRental?: boolean;
    vehicleModel?: string;
    carName?: string;
    carImage?: string;
    totalAmount?: number;
    cancellationReason?: string;
    cancelReason?: string;
    statusHistory?: any[];
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

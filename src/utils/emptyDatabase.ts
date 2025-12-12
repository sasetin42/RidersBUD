import { Database } from '../types';

/**
 * Returns an empty database structure with default settings
 * Used when no data exists in Supabase or localStorage
 */
export const getEmptyDatabase = (): Database => ({
    services: [],
    parts: [],
    mechanics: [],
    bookings: [],
    customers: [],
    orders: [],
    banners: [],
    settings: {
        appName: 'RidersBUD',
        contactEmail: 'support@ridersbud.com',
        contactPhone: '1-800-RIDERSBUD',
        address: '',
        bookingStartTime: '08:00',
        bookingEndTime: '17:00',
        bookingSlotDuration: 60,
        maxBookingsPerSlot: 2,
        emailOnNewBooking: true,
        emailOnCancellation: true,
        appLogoUrl: '',
        appTagline: 'Your Trusted Motorcycle Service Partner',
        virtualMechanicName: 'RidersBUD AI',
        virtualMechanicImageUrl: '',
        mechanicMarkerUrl: '',
        adminPanelTitle: 'RidersBUD Admin',
        adminSidebarLogoUrl: '',
        serviceCategories: [],
        partCategories: [],
        minimumPayout: 1000,
        maximumPayout: 50000,
        payoutSchedule: 'Weekly',
        socialLinks: {
            facebook: '',
            twitter: '',
            instagram: '',
            website: ''
        },
        bookingBufferTime: 0,
        maxAdvanceBookingDays: 30,
        cancellationPolicyWindow: 24,
        brandingAssets: {
            splashLogoUrl: '',
            customerAuthLogoUrl: '',
            mechanicAuthLogoUrl: ''
        }
    },
    faqs: [],
    adminUsers: [],
    roles: [],
    tasks: [],
    payouts: [],
    rentalCars: [],
    rentalBookings: []
});

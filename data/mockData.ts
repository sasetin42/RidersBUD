import { Service, Mechanic, Booking, Part, Customer, Settings, Vehicle, Order, Banner, FAQCategory, AdminUser, Role, Task, PayoutRequest, RentalCar, HireDriver, Subscription, PromoCode } from '../types';

// This file now acts as a "seeder" for the database on the first run.
// It provides the initial state if no data is found in localStorage.

export const seedRoles: Role[] = [
    {
        name: 'Super Admin',
        isEditable: false,
        description: 'Has unrestricted access to all admin features and settings.',
        defaultPermissions: {
            dashboard: 'write', analytics: 'write', bookings: 'write', catalog: 'write', mechanics: 'write', customers: 'write', marketing: 'write', users: 'write', settings: 'write', orders: 'write', monetization: 'write', payouts: 'write', chat: 'write', 'gcash-payments': 'write',
        }
    },
    {
        name: 'Admin',
        isEditable: true,
        description: 'Can manage most features but has limited access to user management and settings.',
        defaultPermissions: {
            dashboard: 'write', analytics: 'write', bookings: 'write', catalog: 'write', mechanics: 'write', customers: 'write', marketing: 'write', users: 'read', settings: 'read', orders: 'write', monetization: 'read', payouts: 'write', chat: 'write', 'gcash-payments': 'write',
        }
    },
    {
        name: 'Editor',
        isEditable: true,
        description: 'Can manage content like the catalog and marketing, but cannot change core settings or users.',
        defaultPermissions: {
            dashboard: 'read', analytics: 'read', bookings: 'write', catalog: 'write', mechanics: 'read', customers: 'read', marketing: 'write', users: 'none', settings: 'none', orders: 'read', monetization: 'none', payouts: 'none', chat: 'none', 'gcash-payments': 'none',
        }
    },
    {
        name: 'Viewer',
        isEditable: true,
        description: 'Has read-only access to most parts of the admin panel. Cannot make changes.',
        defaultPermissions: {
            dashboard: 'read', analytics: 'read', bookings: 'read', catalog: 'read', mechanics: 'read', customers: 'read', marketing: 'read', users: 'none', settings: 'none', orders: 'read', monetization: 'none', payouts: 'none', chat: 'none', 'gcash-payments': 'none',
        }
    }
];


export const seedAdminUsers: AdminUser[] = [
    {
        id: 'yfOrQmMGnHNlLzUN98AabN8wPkn1',
        name: 'Super Admin',
        email: 'admin@ridersbud.com',
        password: '#RidersBUD-2026',
        role: 'Super Admin',
        permissions: {
            dashboard: 'write',
            analytics: 'write',
            bookings: 'write',
            catalog: 'write',
            mechanics: 'write',
            customers: 'write',
            marketing: 'write',
            users: 'write',
            settings: 'write',
            orders: 'write',
            monetization: 'write',
            payouts: 'write',
            chat: 'write',
            'gcash-payments': 'write',
            notifications: 'write',
        },
        isActive: true,
        createdAt: '2024-01-15T08:00:00.000Z',
        updatedAt: '2024-12-20T10:30:00.000Z',
        lastLogin: '2024-12-21T05:00:00.000Z',
        department: 'IT',
        phoneNumber: '+63 917 123 4567',
    },
    {
        id: 'admin2',
        name: 'John Editor',
        email: 'editor@ridersbud.com',
        password: 'password',
        role: 'Editor',
        permissions: {
            dashboard: 'read',
            analytics: 'read',
            bookings: 'write',
            catalog: 'write',
            mechanics: 'read',
            customers: 'read',
            marketing: 'write',
            users: 'none',
            settings: 'none',
            orders: 'read',
            monetization: 'none',
            payouts: 'none',
            chat: 'none',
            'gcash-payments': 'none',
            notifications: 'write',
        },
        isActive: true,
        createdAt: '2024-03-10T09:00:00.000Z',
        updatedAt: '2024-12-18T14:20:00.000Z',
        lastLogin: '2024-12-20T16:45:00.000Z',
        department: 'Marketing',
        phoneNumber: '+63 917 234 5678',
    },
    {
        id: 'admin3',
        name: 'Sarah Viewer',
        email: 'viewer@ridersbud.com',
        password: 'password',
        role: 'Viewer',
        permissions: {
            dashboard: 'read',
            analytics: 'read',
            bookings: 'read',
            catalog: 'read',
            mechanics: 'read',
            customers: 'read',
            marketing: 'read',
            users: 'none',
            settings: 'none',
            orders: 'read',
            monetization: 'none',
            payouts: 'none',
            chat: 'none',
            'gcash-payments': 'none',
            notifications: 'read',
        },
        isActive: true,
        createdAt: '2024-06-22T11:30:00.000Z',
        updatedAt: '2024-12-15T09:10:00.000Z',
        lastLogin: '2024-12-19T08:30:00.000Z',
        department: 'Support',
    },
    {
        id: 'admin4',
        name: 'Mike Admin',
        email: 'mike@ridersbud.com',
        password: 'password',
        role: 'Admin',
        permissions: {
            dashboard: 'write',
            analytics: 'write',
            bookings: 'write',
            catalog: 'write',
            mechanics: 'write',
            customers: 'write',
            marketing: 'write',
            users: 'read',
            settings: 'read',
            orders: 'write',
            monetization: 'write',
            payouts: 'write',
            chat: 'write',
            'gcash-payments': 'write',
            notifications: 'write',
        },
        isActive: false,
        createdAt: '2024-02-05T10:00:00.000Z',
        updatedAt: '2024-11-30T15:00:00.000Z',
        lastLogin: '2024-11-28T12:00:00.000Z',
        department: 'Operations',
        phoneNumber: '+63 917 345 6789',
        notes: 'On leave - Account temporarily deactivated',
    }
];

export const seedServices: Service[] = [
    {
        id: '14',
        name: 'Engine Diagnostics',
        description: 'Comprehensive OBD-II diagnostic scan to pinpoint engine warning lights, sensor faults, and electronic system errors.',
        price: 1200,
        estimatedTime: '1 hour',
        imageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
        category: 'Diagnostics',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>'
    },
    {
        id: 'pms',
        name: 'PMS',
        description: 'Periodic Maintenance Service covering multi-point vehicle inspection, fluid checks, filter cleaning, and preventive tuning.',
        price: 3500,
        estimatedTime: '2-3 hours',
        imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
    },
    {
        id: '13',
        name: 'Engine Tune-up',
        description: 'Comprehensive engine tune-up, spark plug inspection/replacement, throttle cleaning, and performance calibration.',
        price: 2800,
        estimatedTime: '2 hours',
        imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
    },
    {
        id: '4',
        name: 'Body Repair',
        description: 'Expert auto body repairs, dent restoration, panel alignment, scratch fixing, and paint touch-ups.',
        price: 2500,
        estimatedTime: 'Quote Required',
        imageUrl: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop',
        category: 'Repair',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H5zM14 21V5a2 2 0 00-2-2h-1m3 9v7m0-7h7v4a2 2 0 01-2 2h-5" /></svg>'
    },
    {
        id: '1',
        name: 'Change Oil',
        description: 'Full synthetic oil change with oil filter replacement, fluid top-ups, and inspection. Recommended every 5,000 km.',
        price: 2500,
        estimatedTime: '45 mins',
        imageUrl: 'https://images.unsplash.com/photo-1599540679758-00d86bd4fa9a?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-6-2m6 2l-3 1m-3-1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>'
    },
    {
        id: '5',
        name: 'Aircon',
        description: 'Air conditioning system inspection, freon recharge, cabin filter replacement, and leak detection.',
        price: 1800,
        estimatedTime: '1.5 hours',
        imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m8.364-8.364h-1M2.636 12h1m14.092-5.636l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m0 11.314l.707-.707m12.021-.707l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>'
    },
    {
        id: '2',
        name: 'Battery',
        description: 'Complete battery health check, terminal cleaning, and replacement if necessary. Ensures reliable starts.',
        price: 4000,
        estimatedTime: '30 mins',
        imageUrl: 'https://images.unsplash.com/photo-1635393166946-b25b6a71e06d?q=80&w=800&auto=format&fit=crop',
        category: 'Repair',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12V8a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0h-2.586a1 1 0 01-.707-.293l-3.414-3.414a1 1 0 00-.707-.293H10.5a1 1 0 00-.707.293L6.379 11.707A1 1 0 015.672 12H4m16 0h-2m-2 0h-2m-2 0h-2m2 0v4m-4-4v4m8-4v4" /></svg>'
    },
    {
        id: '6',
        name: 'Towing',
        description: 'Reliable and fast towing service to get your vehicle to a safe location or one of our partner shops.',
        price: 3500,
        estimatedTime: 'N/A',
        imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
        category: 'Emergency',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path stroke-linecap="round" stroke-linejoin="round" d="M18 11h3M15 11h1" /></svg>'
    },
    {
        id: '11',
        name: 'Brake Service',
        description: 'Includes inspection of pads, rotors, and brake fluid. Replacement of pads if necessary.',
        price: 3200,
        estimatedTime: '1.5 hours',
        imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>'
    },
    {
        id: '12',
        name: 'Tire Rotation & Balancing',
        description: 'Rotate tires to ensure even wear and balance them to prevent vibrations. Improves tire life and ride quality.',
        price: 1500,
        estimatedTime: '1 hour',
        imageUrl: 'https://images.unsplash.com/photo-1601002361667-0c1fc998d363?q=80&w=800&auto=format&fit=crop',
        category: 'Maintenance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5" /><path stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 018-8v0a8 8 0 018 8v0a8 8 0 01-8 8v0a8 8 0 01-8-8v0z" /></svg>'
    }
];

export const seedParts: Part[] = [
    {
        id: 'p1',
        name: 'Synthetic Engine Oil',
        description: '5 Quarts of 5W-30 Full Synthetic motor oil. Provides excellent engine protection and performance.',
        price: 1750.00,
        salesPrice: 1599.00,
        imageUrls: [
            '/placeholder.svg',
            '/placeholder.svg',
            '/placeholder.svg'
        ],
        category: 'Engine',
        sku: 'SYN-5W30-5QT',
        brand: 'RidersBUD Pro',
        stock: 50
    },
    {
        id: 'p2',
        name: 'Ceramic Brake Pads',
        description: 'Front set of premium ceramic brake pads for superior stopping power, low dust, and quiet operation.',
        price: 2999.00,
        imageUrls: [
            '/placeholder.svg',
            '/placeholder.svg'
        ],
        category: 'Brakes',
        sku: 'CER-PAD-F78',
        brand: 'Brembo',
        stock: 8
    },
    {
        id: 'p3',
        name: 'Engine Air Filter',
        description: 'High-performance pleated paper engine air filter. Improves airflow and engine efficiency.',
        price: 999.00,
        imageUrls: [
            '/placeholder.svg'
        ],
        category: 'Engine',
        sku: 'AIR-FIL-H21',
        brand: 'ACDelco',
        stock: 0
    },
    {
        id: 'p4',
        name: 'Wiper Blades (Set of 2)',
        description: 'All-weather performance wiper blades for a clear, streak-free wipe. Easy to install.',
        price: 1250.00,
        salesPrice: 1099.00,
        imageUrls: [
            '/placeholder.svg',
            '/placeholder.svg',
        ],
        category: 'Exterior',
        sku: 'WPR-BLD-22',
        brand: 'Bosch',
        stock: 100
    },
];

export const seedRentalCars: RentalCar[] = [
    {
        id: 'rc1',
        make: 'Toyota',
        model: 'Vios',
        year: 2023,
        type: 'Sedan',
        pricePerDay: 2200,
        seats: 5,
        imageUrl: '/images/cars/vios.jpg',
        isAvailable: true,
    },
    {
        id: 'rc2',
        make: 'Mitsubishi',
        model: 'Montero Sport',
        year: 2024,
        type: 'SUV',
        pricePerDay: 3500,
        seats: 7,
        imageUrl: '/images/cars/montero.jpg',
        isAvailable: true,
    },
    {
        id: 'rc3',
        make: 'Toyota',
        model: 'Hiace',
        year: 2022,
        type: 'Van',
        pricePerDay: 4000,
        seats: 12,
        imageUrl: '/images/cars/hiace.jpg',
        isAvailable: false,
    },
    {
        id: 'rc4',
        make: 'Ford',
        model: 'Mustang',
        year: 2024,
        type: 'Luxury',
        pricePerDay: 8000,
        seats: 4,
        imageUrl: '/images/cars/mustang.jpg',
        isAvailable: true,
    }
];

export const seedHireDrivers: HireDriver[] = [
    {
        id: 'hd1',
        name: 'Danilo Santos',
        phone: '0917-123-4567',
        licenseType: 'Professional',
        licenseNumber: 'N01-12-345678',
        experience: '5+ years',
        geoLimit: 'Within City',
        pricePerHour: 150,
        pricePerDay: 1200,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
        rating: 4.8,
        totalTrips: 142,
        languages: ['Filipino', 'English'],
        description: 'Punctual, polite, and very familiar with Metro Manila shortcuts. Specialized in driving automatic sedans and SUVs.'
    },
    {
        id: 'hd2',
        name: 'Marlon Dizon',
        phone: '0918-987-6543',
        licenseType: 'Professional',
        licenseNumber: 'N02-15-987654',
        experience: '10+ years',
        geoLimit: 'Province Wide',
        pricePerHour: 200,
        pricePerDay: 1800,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
        rating: 4.95,
        totalTrips: 310,
        languages: ['Filipino', 'English', 'Ilocano'],
        description: 'Experienced long-distance driver. Perfect for family out-of-town trips. Certified defensive driver with zero accident record.'
    },
    {
        id: 'hd3',
        name: 'Arnel Pineda',
        phone: '0922-555-8888',
        licenseType: 'Professional',
        licenseNumber: 'N03-18-555888',
        experience: '3-5 years',
        geoLimit: 'Within City',
        pricePerHour: 120,
        pricePerDay: 1000,
        isAvailable: false,
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
        rating: 4.7,
        totalTrips: 88,
        languages: ['Filipino', 'English'],
        description: 'Friendly driver, non-smoker, keeps vehicles clean. Experienced with manual and automatic transmissions.'
    }
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const vacationStart = new Date(tomorrow);
vacationStart.setDate(tomorrow.getDate() + 14);

const vacationEnd = new Date(vacationStart);
vacationEnd.setDate(vacationStart.getDate() + 5);


export const seedMechanics: Mechanic[] = [
    {
        id: 'm1',
        name: 'Ricardo Reyes',
        email: 'ricardo@ridersbud.com',
        password: 'password123',
        phone: '555-0101-111',
        bio: 'ASE certified mechanic with over 15 years of experience specializing in Japanese vehicles. Customer satisfaction is my top priority.',
        rating: 4.9,
        reviews: 120,
        specializations: ['Oil Change', 'Engine Diagnostics', 'Mitsubishi Expert', 'Brake Service'],
        status: 'Active',
        isOnline: true,
        imageUrl: '/placeholder.svg',
        lat: 14.5547,
        lng: 121.0244,
        registrationDate: '2022-01-15',
        birthday: '1985-05-20',
        payoutDetails: {
            method: 'Bank Transfer',
            accountName: 'Ricardo M. Reyes',
            accountNumber: '1234-5678-90',
            bankName: 'BDO Unibank',
        },
        portfolioImages: [
            '/placeholder.svg',
            '/placeholder.svg',
            '/placeholder.svg',
        ],
        availability: {
            monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        },
        unavailableDates: [
            {
                startDate: vacationStart.toISOString().split('T')[0],
                endDate: vacationEnd.toISOString().split('T')[0],
                reason: 'Vacation'
            }
        ],
        reviewsList: [
            { id: 'r1', customerName: 'Juan Dela Cruz', rating: 5, comment: 'Ricardo is the best! Fast and very professional. He explained everything clearly.', date: '2023-10-15T10:00:00Z' },
            { id: 'r2', customerName: 'Maria Santos', rating: 4, comment: 'Good service, but arrived a bit late. The work itself was excellent though.', date: '2023-09-22T14:30:00Z' },
        ],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved'
        }
    },
    {
        id: 'm2',
        name: 'Jane Smith',
        email: 'jane@ridersbud.com',
        password: 'password123',
        phone: '555-0102-222',
        bio: 'Expert in European brake systems and suspension tuning. I treat every car like it\'s my own.',
        rating: 4.8,
        reviews: 97,
        specializations: ['Brake Systems', 'Honda Pro', 'Suspension', 'Brake Service'],
        status: 'Active',
        isOnline: true,
        imageUrl: '/placeholder.svg',
        lat: 14.6091,
        lng: 121.0223,
        registrationDate: '2022-03-20',
        birthday: '1990-11-12',
        payoutDetails: {
            method: 'E-Wallet',
            accountName: 'Jane T. Smith',
            accountNumber: '09171234567',
            walletName: 'GCash',
        },
        availability: {
            monday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
            tuesday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
            wednesday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
            thursday: { isAvailable: false, startTime: '08:00', endTime: '16:00' },
            friday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
            saturday: { isAvailable: true, startTime: '10:00', endTime: '14:00' },
            sunday: { isAvailable: false, startTime: '10:00', endTime: '14:00' },
        },
        reviewsList: [
            { id: 'r3', customerName: 'Alex Rider', rating: 5, comment: 'Jane fixed my brakes perfectly. My car feels brand new!', date: '2023-11-01T11:00:00Z' },
        ],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved'
        }
    },
    {
        id: 'm3',
        name: 'Carlos Rivera',
        email: 'carlos@ridersbud.com',
        password: 'password123',
        phone: '555-0103-333',
        bio: 'Certified EV technician and BMW specialist. Passionate about modern vehicle technology.',
        rating: 4.9,
        reviews: 152,
        specializations: ['BMW Specialist', 'EV Certified', 'Aircon Repair', 'Maintenance'],
        status: 'Active',
        isOnline: true,
        imageUrl: '/placeholder.svg',
        lat: 14.5825,
        lng: 121.0616,
        registrationDate: '2021-11-05',
        birthday: '1988-02-29',
        payoutDetails: {
            method: 'Bank Transfer',
            accountName: 'Carlos D. Rivera',
            accountNumber: '9876-5432-10',
            bankName: 'BPI',
        },
        availability: {
            monday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
            friday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isAvailable: true, startTime: '09:00', endTime: '13:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        },
        reviewsList: [],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved'
        }
    },
    {
        id: 'm4',
        name: 'Luis Reyes',
        email: 'luis@ridersbud.com',
        password: 'password123',
        phone: '555-0104-444',
        bio: 'General maintenance and emergency services expert. Available 24/7 for towing.',
        rating: 4.7,
        reviews: 88,
        specializations: ['General Maintenance', 'Towing', 'Tire Services', 'Tire Rotation & Balancing'],
        status: 'Active',
        isOnline: true,
        imageUrl: '/placeholder.svg',
        lat: 14.5560, // Near m1
        lng: 121.0250,
        registrationDate: '2023-02-10',
        birthday: '1992-08-15',
        payoutDetails: {
            method: 'E-Wallet',
            accountName: 'Luisito Reyes',
            accountNumber: '09187654321',
            walletName: 'Paymaya',
        },
        availability: {
            monday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            tuesday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            wednesday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            thursday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            friday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            saturday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
            sunday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
        },
        reviewsList: [],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved'
        }
    },
    {
        id: 'm5',
        name: 'Sofia Garcia',
        email: 'sofia@ridersbud.com',
        password: 'password123',
        phone: '555-0105-555',
        bio: 'Ford certified and a wizard with electrical diagnostics. No check engine light is safe!',
        rating: 4.8,
        reviews: 110,
        specializations: ['Ford Certified', 'Diagnostics', 'Electrical', 'Tire Rotation & Balancing', 'Engine Tune-up'],
        status: 'Active',
        isOnline: true,
        imageUrl: '/placeholder.svg',
        lat: 14.6105, // Near m2
        lng: 121.0235,
        registrationDate: '2022-08-01',
        birthday: '1995-07-22',
        payoutDetails: {
            method: 'Bank Transfer',
            accountName: 'Sofia B. Garcia',
            accountNumber: '1122-3344-55',
            bankName: 'Security Bank',
        },
        availability: {
            monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isAvailable: true, startTime: '10:00', endTime: '16:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        },
        reviewsList: [],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved'
        }
    },
    {
        id: 'm6',
        name: 'David Chen',
        email: 'david@ridersbud.com',
        password: 'password123',
        phone: '555-0106-666',
        bio: 'Subaru specialist with a passion for bodywork and customization.',
        isOnline: false,
        rating: 4.6,
        reviews: 75,
        reviewsCount: 75,
        specialties: ['Subaru Specialist', 'Body Repair', 'Engine Tune-up'],
        specializations: ['Subaru Specialist', 'Body Repair', 'Engine Tune-up'],
        status: 'Inactive',
        imageUrl: '/placeholder.svg',
        lat: 14.5530, // Near m1
        lng: 121.0261,
        registrationDate: '2023-05-18',
        joinedAt: '2023-05-18',
        walletBalance: 0,
        totalEarnings: 0,
        birthday: '1991-03-10',
        payoutDetails: {
            method: 'Bank Transfer',
            accountName: 'David L. Chen',
            accountNumber: '0011-2233-44',
            bankName: 'Metrobank',
        },
        availability: {
            monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
            thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isAvailable: true, startTime: '09:00', endTime: '13:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        },
        reviewsList: [],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Approved' // Even if inactive, they should have docs if they were approved
        }
    },
    {
        id: 'm7',
        name: 'Isabella Cruz',
        email: 'isabella@ridersbud.com',
        password: 'password123',
        phone: '555-0107-777',
        bio: 'Hyundai Master Tech. I specialize in battery services and hybrid vehicles.',
        isOnline: false,
        rating: 4.9,
        reviews: 135,
        reviewsCount: 135,
        specialties: ['Hyundai Master Tech', 'Battery Services'],
        specializations: ['Hyundai Master Tech', 'Battery Services'],
        status: 'Pending',
        imageUrl: '/placeholder.svg',
        lat: 14.6760, // North QC
        lng: 121.0437,
        registrationDate: '2023-09-01',
        joinedAt: '2023-09-01',
        walletBalance: 0,
        totalEarnings: 0,
        birthday: '1998-12-01',
        availability: {
            monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        },
        reviewsList: [],
        verificationDocuments: {
            nbiClearanceUrl: '/placeholder.svg',
            driversLicenseUrl: '/placeholder.svg',
            certificateOfTrainingsUrl: '/placeholder.svg',
            verificationStatus: 'Pending'
        }
    }
];

export const seedBookings: Booking[] = [
    {
        id: 'b1',
        customerName: 'Juan Dela Cruz',
        services: [seedServices[0]],
        service: seedServices[0],
        mechanic: seedMechanics[0], // Ricardo Reyes
        date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'En Route',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
        },
        location: { lat: 14.5510, lng: 121.0232 },
        statusHistory: [
            { status: 'Booking Confirmed', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
            { status: 'Mechanic Assigned', timestamp: new Date().toISOString() },
        ],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b2',
        customerName: 'Juan Dela Cruz',
        services: [seedServices[1]], // Battery
        service: seedServices[1],
        mechanic: seedMechanics[1], // Jane Smith
        date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        time: '01:00 PM',
        status: 'Completed',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
        },
        location: { lat: 14.5510, lng: 121.0232 },
        isPaid: true,
        isReviewed: true,
        statusHistory: [
            { status: 'Booking Confirmed', timestamp: new Date(new Date().setDate(new Date().getDate() - 31)).toISOString() },
            { status: 'Mechanic Assigned', timestamp: new Date(new Date().setDate(new Date().getDate() - 31)).toISOString() },
            { status: 'En Route', timestamp: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString() },
            { status: 'In Progress', timestamp: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString() },
            { status: 'Completed', timestamp: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString() },
        ],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b3',
        customerName: 'Juan Dela Cruz',
        services: [seedServices[3]], // Diagnostics
        service: seedServices[3],
        mechanic: seedMechanics[0], // Ricardo Reyes
        date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        time: '09:00 AM',
        status: 'Completed',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
        },
        location: { lat: 14.5510, lng: 121.0232 },
        isPaid: true,
        isReviewed: false,
        statusHistory: [
            { status: 'Completed', timestamp: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString() },
        ],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b4',
        customerName: 'Juan Dela Cruz',
        services: [seedServices[2]], // Towing
        service: seedServices[2],
        mechanic: seedMechanics[2], // Carlos Rivera
        date: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
        time: '03:00 PM',
        status: 'Cancelled',
        cancellationReason: 'Customer no longer available.',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
        },
        location: { lat: 14.5510, lng: 121.0232 },
        statusHistory: [
            { status: 'Booking Confirmed', timestamp: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString() },
            { status: 'Cancelled', timestamp: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString() },
        ],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b-unpaid',
        customerName: 'Juan Dela Cruz',
        services: [seedServices[4]], // Body Repair
        service: seedServices[4],
        mechanic: seedMechanics[2], // Carlos Rivera
        date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Completed',
        vehicle: {
            make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'GHI 111', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: false,
            vin: 'JT1AZ01Z000654321', mileage: 45000, insuranceProvider: 'BPI/MS Insurance', insurancePolicyNumber: 'POL-123456789'
        },
        location: { lat: 14.5510, lng: 121.0232 },
        isPaid: false,
        isReviewed: false,
        statusHistory: [
            { status: 'Completed', timestamp: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString() },
        ],
        beforeImages: [],
        afterImages: [],
    },
    // --- Unassigned Bookings for Dashboard ---
    {
        id: 'b5',
        customerName: 'Alex Rider',
        services: [seedServices[0]],
        service: seedServices[0],
        date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Upcoming',
        vehicle: {
            make: 'Honda', model: 'Civic', year: 2022, plateNumber: 'XYZ 789', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'HN1AZ01Z000112233', mileage: 25000, insuranceProvider: 'State Farm', insurancePolicyNumber: 'POL-SF-445566'
        },
        location: { lat: 14.6042, lng: 121.0485 },
        statusHistory: [{ status: 'Upcoming', timestamp: new Date().toISOString() }],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b6',
        customerName: 'Maria Santos',
        services: [seedServices[1]],
        service: seedServices[1],
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '02:00 PM',
        status: 'Upcoming',
        vehicle: {
            make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'DEF 456', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: false,
            vin: 'TY1AZ01Z000445566', mileage: 35000, insuranceProvider: 'Geico', insurancePolicyNumber: 'POL-GC-778899'
        },
        location: { lat: 14.6521, lng: 121.0333 },
        statusHistory: [{ status: 'Upcoming', timestamp: new Date().toISOString() }],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b7',
        customerName: 'Antonio Luna',
        services: [seedServices[4]],
        service: seedServices[4],
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '04:00 PM',
        status: 'Upcoming',
        vehicle: {
            make: 'Ford', model: 'Everest', year: 2023, plateNumber: 'GHI 123', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'FD1AZ01Z000778899', mileage: 5000, insuranceProvider: 'Allstate', insurancePolicyNumber: 'POL-AS-112233'
        },
        location: { lat: 14.5510, lng: 121.0232 }, // Placeholder
        statusHistory: [{ status: 'Upcoming', timestamp: new Date().toISOString() }],
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b8',
        customerName: 'Teresa Magbanua',
        services: [seedServices[5]],
        service: seedServices[5],
        date: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'Upcoming',
        vehicle: {
            make: 'Hyundai', model: 'Tucson', year: 2020, plateNumber: 'JKL 789', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'HY1AZ01Z000998877', mileage: 60000, insuranceProvider: 'Progressive', insurancePolicyNumber: 'POL-PG-665544'
        },
        location: { lat: 14.5510, lng: 121.0232 }, // Placeholder
        statusHistory: [{ status: 'Upcoming', timestamp: new Date().toISOString() }],
        beforeImages: [],
        afterImages: [],
    }
];

export const seedCustomers: Customer[] = [
    {
        id: 'c1',
        name: 'Juan Dela Cruz',
        email: 'juan.delacruz@example.com',
        password: 'password',
        phone: '555-123-4567',
        vehicles: [
            {
                make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
                vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
            },
            {
                make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'GHI 111', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: false,
                vin: 'JT1AZ01Z000654321', mileage: 45000, insuranceProvider: 'BPI/MS Insurance', insurancePolicyNumber: 'POL-123456789'
            },
            {
                make: 'Ford', model: 'Ranger', year: 2022, plateNumber: 'RAP 888', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: false,
                vin: 'FD1RAPTOR00012345', mileage: 32000, insuranceProvider: 'FPG Insurance', insurancePolicyNumber: 'POL-FPG-456789'
            },
            {
                make: 'Nissan', model: 'Navara', year: 2020, plateNumber: 'NAV 777', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: false,
                vin: 'NS1NVRA000777', mileage: 55000, insuranceProvider: 'Standard Insurance', insurancePolicyNumber: 'POL-STD-555444'
            }
        ],
        picture: '/placeholder.svg',
        lat: 14.5510,
        lng: 121.0232,
        status: 'Active',
        registrationDate: '2023-01-15',
    },
    {
        id: 'c2', name: 'Alex Rider', email: 'alex.rider@example.com', password: 'password', phone: '555-111-2222',
        vehicles: [{
            make: 'Honda', model: 'Civic', year: 2022, plateNumber: 'XYZ 789', imageUrls: ['https://placehold.co/400x300/1A1A1D/FE7803?text='], isPrimary: true,
            vin: 'HN1AZ01Z000112233', mileage: 25000, insuranceProvider: 'State Farm', insurancePolicyNumber: 'POL-SF-445566'
        }],
        picture: '/placeholder.svg',
        lat: 14.6042, lng: 121.0485,
        status: 'Active',
        registrationDate: '2023-06-20',
    },
    { id: 'c3', name: 'Maria Santos', email: 'maria.s@example.com', password: 'password', phone: '555-333-4444', vehicles: [], picture: '/placeholder.svg', lat: 14.6521, lng: 121.0333, status: 'Active', registrationDate: '2023-11-10' },
];

export const seedOrders: Order[] = [
    {
        id: 'o1',
        customerName: 'Juan Dela Cruz',
        items: [
            { ...seedParts[1], quantity: 1 }, // Ceramic Brake Pads
            { ...seedParts[3], quantity: 2 }, // Wiper Blades
        ],
        total: (2999.00 * 1) + (1250.00 * 2) + 150, // subtotal + shipping
        paymentMethod: 'Credit Card',
        date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        status: 'Shipped',
        statusHistory: [
            { status: 'Processing', timestamp: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
            { status: 'Shipped', timestamp: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
        ]
    },
    {
        id: 'o2',
        customerName: 'Alex Rider',
        items: [
            { ...seedParts[0], quantity: 1 }, // Synthetic Engine Oil
        ],
        total: (1750.00 * 1) + 150,
        paymentMethod: 'GCash',
        date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
        status: 'Delivered',
        statusHistory: [
            { status: 'Processing', timestamp: new Date(new Date().setDate(new Date().getDate() - 12)).toISOString() },
            { status: 'Shipped', timestamp: new Date(new Date().setDate(new Date().getDate() - 11)).toISOString() },
            { status: 'Delivered', timestamp: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString() },
        ]
    },
    {
        id: 'o3',
        customerName: 'Maria Santos',
        items: [
            { ...seedParts[1], quantity: 2 },
        ],
        total: (2999.00 * 2) + 150,
        paymentMethod: 'Cash on Delivery',
        date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
        status: 'Cancelled',
        statusHistory: [
            { status: 'Processing', timestamp: new Date(new Date().setDate(new Date().getDate() - 16)).toISOString() },
            { status: 'Cancelled', timestamp: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString() },
        ]
    },
    {
        id: 'o4',
        customerName: 'Juan Dela Cruz',
        items: [
            { ...seedParts[3], quantity: 4 },
        ],
        total: (1250.00 * 4) + 150,
        paymentMethod: 'Paymaya',
        date: new Date().toISOString(),
        status: 'Processing',
        statusHistory: [
            { status: 'Processing', timestamp: new Date().toISOString() },
        ]
    }
];

export const seedTasks: Task[] = [
    {
        id: 't1',
        mechanicId: 'm1',
        title: 'Call customer for booking b1',
        description: 'Confirm the address and time for the Montero oil change.',
        dueDate: new Date().toISOString().split('T')[0],
        isComplete: false,
        priority: 'High'
    },
    {
        id: 't2',
        mechanicId: 'm1',
        title: 'Pick up special oil filter',
        description: 'Get the OEM Mitsubishi filter from the parts supplier.',
        dueDate: new Date().toISOString().split('T')[0],
        isComplete: true,
        priority: 'High',
        completionDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    },
    {
        id: 't3',
        mechanicId: 'm1',
        title: 'Organize toolbox',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
        isComplete: false,
        priority: 'Low'
    },
    {
        id: 't4',
        mechanicId: 'm2',
        title: 'Follow up on brake pad supplier',
        description: 'Check stock for BMW M-series ceramic pads.',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        isComplete: false,
        priority: 'Medium'
    }
];

export const seedPayouts: PayoutRequest[] = [
    {
        id: 'po1',
        mechanicId: 'm1',
        mechanicName: 'Ricardo Reyes',
        amount: 5000,
        requestDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        status: 'Pending',
        paymentMethod: 'GCash',
        accountDetails: '09123456789',
    },
    {
        id: 'po2',
        mechanicId: 'm2',
        mechanicName: 'Jane Smith',
        amount: 3500,
        requestDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
        status: 'Approved',
        processDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        paymentMethod: 'Bank Transfer',
        accountDetails: 'BPI: 1234 5678 90',
    },
    {
        id: 'po3',
        mechanicId: 'm3',
        mechanicName: 'Carlos Rivera',
        amount: 8000,
        requestDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
        status: 'Rejected',
        processDate: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(),
        rejectionReason: 'Payout details do not match bank records.',
        paymentMethod: 'GCash',
        accountDetails: '09987654321',
    }
];

export const seedBanners: Banner[] = [
    {
        id: 'banner1',
        title: '20% Off All Services',
        description: 'Get 20% off on all our premium services. Limited time offer!',
        imageUrl: 'https://placehold.co/400x300/1A1A1D/FE7803?text=',
        link: '/services',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isActive: true,
        targetAudience: 'All',
    },
    {
        id: 'banner2',
        title: 'New Parts in Stock!',
        description: 'Check out our new collection of high-quality engine and brake parts.',
        imageUrl: 'https://placehold.co/400x300/1A1A1D/FE7803?text=',
        link: '/parts-store',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isActive: true,
        targetAudience: 'All',
    },
    {
        id: 'banner3',
        title: 'Never Miss a Tune-Up',
        description: 'Set maintenance reminders for your vehicles and stay on top of their health.',
        imageUrl: 'https://placehold.co/400x300/1A1A1D/FE7803?text=',
        link: '/reminders',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isActive: true,
        targetAudience: 'Customers',
    },
    {
        id: 'banner4',
        title: 'Hassle-Free Oil Change',
        description: 'Book a professional oil change service at your location in just a few taps.',
        imageUrl: 'https://placehold.co/400x300/1A1A1D/FE7803?text=',
        link: '/booking/1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isActive: false,
        targetAudience: 'Customers',
    }
];


export const seedSettings: Settings = {
    // Appearance & Logos
    splashLogoUrl: '/ridersbud_logo_large.png',
    authLogoUrl: '/assets/signin_logo.png',
    adminLoginLogoUrl: '/assets/admin_branding.png',
    adminPanelLogoUrl: '/ridersbud_logo.png',
    sidebarLogoUrl: '/assets/sidebar_branding.png',
    mapLogoUrl: '/assets/map_marker.png',
    invoiceLogoUrl: '/ridersbud_logo_dark.png',
    faviconUrl: '/favicon.ico',

    // General
    appName: 'RidersBUD',
    appTagline: 'Trusted Car Care Wherever You Are',
    appLogoUrl: '/ridersbud_logo.png',
    contactEmail: 'support@ridersbud.com',
    contactPhone: '1-800-RIDERSBUD',
    address: '123 Auto Lane, Car City, 12345',
    supportEmail: 'help@ridersbud.com',
    supportPhone: '1-800-HELP-NOW',

    // Social
    socialLinks: {
        facebook: 'https://facebook.com/ridersbud',
        twitter: 'https://twitter.com/ridersbud',
        instagram: 'https://instagram.com/ridersbud',
    },

    // Operations
    bookingStartTime: '09:00',
    bookingEndTime: '17:00',
    bookingSlotDuration: 120, // minutes
    maxBookingsPerSlot: 2,
    mechanicMarkerUrl: '/assets/mechanic_marker.png',

    // Financials
    currency: 'PHP',
    serviceFeePercentage: 5,
    minimumPayout: 500,
    maximumPayout: 50000,
    payoutSchedule: 'Weekly',

    // Notifications
    emailOnNewBooking: true,
    emailOnCancellation: true,

    // System
    maintenanceMode: false,
    adminPanelTitle: 'RidersBUD Admin',
    adminSidebarLogoUrl: '/ridersbud_logo_white.png',
    serviceCategories: ['Maintenance', 'Repair', 'Emergency', 'Diagnostics', 'Body Work', 'Detailing'],
    partCategories: ['Engine', 'Brakes', 'Suspension', 'Electrical', 'Fluids', 'Tires', 'Accessories'],

    // Verification
    verificationRequirements: [
        { id: 'nbi', label: 'NBI Clearance', description: 'National Bureau of Investigation clearance', isRequired: true },
        { id: 'license', label: "Driver's License", description: 'Valid driver\'s license', isRequired: true },
        { id: 'certificate', label: 'Technical Certification', description: 'Professional automotive certification', isRequired: true }
    ]
};

export const seedFaqs: FAQCategory[] = [
    {
        category: "General",
        items: [
            {
                question: "What is RidersBUD?",
                answer: "RidersBUD is a platform that connects vehicle owners with professional, mobile mechanics for convenient on-site repairs and maintenance. We also offer an online store for parts and tools."
            },
            {
                question: "Is my location serviced?",
                answer: "We are currently operating within Metro Manila. During the booking process, you'll be able to see available mechanics based on your specified location."
            }
        ]
    },
    {
        category: "Booking & Services",
        items: [
            {
                question: "How do I book a service?",
                answer: "You can book a service through our app by navigating to the 'Services' tab, selecting the service you need, choosing a mechanic, and picking an available date and time."
            },
            {
                question: "Can I choose a specific mechanic?",
                answer: "Yes! After selecting a service, you can browse through a list of available mechanics, view their profiles, ratings, and specializations, and choose the one you prefer."
            },
            {
                question: "What if the service I need isn't listed?",
                answer: "If you can't find a specific service, we recommend booking a 'Diagnostics' service. A mechanic will come to assess your vehicle and provide a detailed quote for the required repairs."
            }
        ]
    },
    {
        category: "Payments & Pricing",
        items: [
            {
                question: "How do payments work?",
                answer: "Payments for services are handled after the job is completed. For parts purchased from our store, payment is required at checkout. We accept major credit cards, GCash, and Paymaya."
            },
            {
                question: "Are the prices listed fixed?",
                answer: "Prices for standard services like 'Change Oil' are fixed. For complex repairs like 'Body Repair', the listed price is a base for a quote, and the final cost will be determined after an assessment by the mechanic."
            }
        ]
    }
];

export const seedSubscriptions: Subscription[] = [
    {
        id: 'sub1',
        customerId: 'c1',
        customerName: 'Juan Dela Cruz',
        plan: 'Premium',
        status: 'Active',
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        amount: 2500,
        billingCycle: 'Monthly',
    },
    {
        id: 'sub2',
        customerId: 'c2',
        customerName: 'Alex Rider',
        plan: 'Basic',
        status: 'Active',
        startDate: '2024-02-15',
        endDate: '2025-02-15',
        amount: 1200,
        billingCycle: 'Monthly',
    },
    {
        id: 'sub3',
        customerId: 'c3',
        customerName: 'Maria Santos',
        plan: 'Enterprise',
        status: 'Cancelled',
        startDate: '2023-11-01',
        endDate: '2024-11-01',
        amount: 8500,
        billingCycle: 'Yearly',
    }
];

export const seedPromoCodes: PromoCode[] = [
    {
        id: 'prm1',
        code: 'WELCOME20',
        discountType: 'Percentage',
        discountValue: 20,
        description: 'Welcome discount for new members',
        expiryDate: '2025-12-31',
        usageLimit: 1000,
        usageCount: 154,
        isActive: true,
        category: 'General',
    },
    {
        id: 'prm2',
        code: 'RIDERS500',
        discountType: 'Fixed Amount',
        discountValue: 500,
        description: 'Flat discount on any major service',
        expiryDate: '2024-12-31',
        usageLimit: 100,
        usageCount: 12,
        isActive: true,
        category: 'Services',
    },
    {
        id: 'prm3',
        code: 'HOLIDAY10',
        discountType: 'Percentage',
        discountValue: 10,
        description: 'Festive season store discount',
        expiryDate: '2024-12-25',
        usageLimit: 500,
        usageCount: 45,
        isActive: false,
        category: 'Store',
    }
];

export const getSeedData = () => ({
    services: seedServices,
    parts: seedParts,
    mechanics: seedMechanics,
    bookings: seedBookings,
    customers: seedCustomers,
    orders: seedOrders,
    banners: seedBanners,
    settings: seedSettings,
    faqs: seedFaqs,
    adminUsers: seedAdminUsers,
    roles: seedRoles,
    tasks: seedTasks,
    payouts: seedPayouts,
    rentalCars: seedRentalCars,
    rentalBookings: [],
    hireDrivers: seedHireDrivers,
    subscriptions: seedSubscriptions,
    promoCodes: seedPromoCodes,
});
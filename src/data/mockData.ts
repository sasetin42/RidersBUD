import { Service, Mechanic, Booking, Part, Customer, Settings, Vehicle, Order, Banner, FAQCategory, AdminUser, Role, Task, PayoutRequest, RentalCar } from '../types';

// This file now acts as a "seeder" for the database on the first run.
// It provides the initial state if no data is found in localStorage.

export const seedRoles: Role[] = [
    {
        name: 'Super Admin',
        isEditable: false,
        description: 'Has unrestricted access to all admin features and settings.',
        defaultPermissions: {
            dashboard: 'view', analytics: 'view', bookings: 'edit', catalog: 'edit', mechanics: 'edit', customers: 'edit', marketing: 'edit', users: 'edit', settings: 'edit', orders: 'edit',
        }
    },
    {
        name: 'Content Manager',
        isEditable: true,
        description: 'Can manage content like the catalog and marketing, but cannot change core settings or users.',
        defaultPermissions: {
            dashboard: 'view', analytics: 'view', bookings: 'view', catalog: 'edit', mechanics: 'view', customers: 'view', marketing: 'edit', users: 'none', settings: 'none', orders: 'view',
        }
    },
    {
        name: 'Viewer',
        isEditable: true,
        description: 'Has read-only access to most parts of the admin panel. Cannot make changes.',
        defaultPermissions: {
            dashboard: 'view', analytics: 'view', bookings: 'view', catalog: 'view', mechanics: 'view', customers: 'view', marketing: 'view', users: 'none', settings: 'none', orders: 'view',
        }
    }
];


export const seedAdminUsers: AdminUser[] = [
    {
        id: 'admin1',
        email: 'admin@ridersbud.com',
        password: 'password',
        role: 'Super Admin',
        permissions: {
            dashboard: 'view',
            analytics: 'view',
            bookings: 'edit',
            catalog: 'edit',
            mechanics: 'edit',
            customers: 'edit',
            marketing: 'edit',
            users: 'edit',
            settings: 'edit',
            orders: 'edit',
        }
    }
];

export const seedServices: Service[] = [
    {
        id: '1',
        name: 'Change Oil',
        description: 'Full synthetic oil change with filter replacement. Recommended every 5,000 miles.',
        price: 2500,
        estimatedTime: '45 mins',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_oil_change.png',
        category: 'Maintenance',
        icon: 'Droplet'
    },
    {
        id: '2',
        name: 'Battery',
        description: 'Complete battery health check, terminal cleaning, and replacement if necessary. Ensures reliable starts.',
        price: 4000,
        estimatedTime: '30 mins',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_battery.png',
        category: 'Repair',
        icon: 'Battery'
    },
    {
        id: '6',
        name: 'Towing',
        description: 'Reliable and fast towing service to get your vehicle to a safe location or one of our partner shops.',
        price: 3500,
        estimatedTime: 'N/A',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_towing.png',
        category: 'Emergency',
        icon: 'Truck'
    },
    {
        id: '3',
        name: 'Diagnostics',
        description: 'Comprehensive diagnostic scan using OBD-II tools to identify and troubleshoot engine and electronic issues.',
        price: 1200,
        estimatedTime: '1 hour',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_diagnostics.png',
        category: 'Diagnostics',
        icon: 'Activity'
    },
    {
        id: '4',
        name: 'Body Repair',
        description: 'Professional body repair for dents, scratches, and collision damage. Request a quote for pricing.',
        price: 0,
        estimatedTime: 'Quote Required',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_body_repair.png',
        category: 'Repair',
        icon: 'Hammer'
    },
    {
        id: '5',
        name: 'Aircon',
        description: 'Air conditioning system check, freon recharge, and leak detection to keep you cool.',
        price: 1800,
        estimatedTime: '1.5 hours',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_aircon.png',
        category: 'Maintenance',
        icon: 'Wind'
    },
    {
        id: '7',
        name: 'Driver for Hire',
        description: 'Professional and reliable drivers for your special trips, errands, or emergencies. Choose from hourly, daily, or specific trip rates.',
        price: 800,
        estimatedTime: 'Per Hour',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_driver_hire.png',
        category: 'Specialty Services',
        icon: 'UserCheck'
    },
    {
        id: '8',
        name: 'Auto Detailing',
        description: 'Comprehensive interior and exterior cleaning, polishing, and waxing to make your car look brand new.',
        price: 3000,
        estimatedTime: '4 hours',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_detailing.png',
        category: 'Cleaning & Detailing',
        icon: 'Sparkles'
    },
    {
        id: '9',
        name: 'Registration Assistance',
        description: 'Hassle-free LTO car registration, license renewal, and transfer of ownership services. Let our liason handle the paperwork and long lines for you.',
        price: 2500,
        estimatedTime: 'Varies',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_lto.png',
        category: 'Liason Services',
        icon: 'FileText'
    },
    {
        id: '10',
        name: 'Rent a Car',
        description: 'Browse and rent from our collection of well-maintained vehicles for your personal or business needs. Redirects to the rental page.',
        price: 0,
        estimatedTime: 'N/A',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_rent_car.png',
        category: 'Rentals',
        icon: 'Car'
    },
    {
        id: '11',
        name: 'Brake Service',
        description: 'Includes inspection of pads, rotors, and brake fluid. Replacement of pads if necessary.',
        price: 3200,
        estimatedTime: '1.5 hours',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_brakes.png',
        category: 'Maintenance',
        icon: 'Disc'
    },
    {
        id: '12',
        name: 'Tire Rotation & Balancing',
        description: 'Rotate tires to ensure even wear and balance them to prevent vibrations. Improves tire life and ride quality.',
        price: 1500,
        estimatedTime: '1 hour',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_tires.png',
        category: 'Maintenance',
        icon: 'CircleDot'
    },
    {
        id: '13',
        name: 'Engine Tune-up',
        description: 'Comprehensive engine check, spark plug replacement, and performance optimization for better fuel efficiency and power.',
        price: 2800,
        estimatedTime: '2 hours',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_engine.png',
        category: 'Maintenance',
        icon: 'Settings'
    },
    {
        id: '14',
        name: 'Engine Diagnostics',
        description: 'Comprehensive diagnostic scan using OBD-II tools to identify and troubleshoot engine and electronic issues.',
        price: 1200,
        estimatedTime: '1 hour',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/service_diagnostics.png',
        category: 'Diagnostics',
        icon: 'Activity'
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
            'https://picsum.photos/seed/engineoil/400/300',
            'https://picsum.photos/seed/engineoil2/400/300',
            'https://picsum.photos/seed/engineoil3/400/300'
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
            'https://picsum.photos/seed/brakepads/400/300',
            'https://picsum.photos/seed/brakepads2/400/300'
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
            'https://picsum.photos/seed/airfilter/400/300'
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
            'https://picsum.photos/seed/wipers/400/300',
            'https://picsum.photos/seed/wipers2/400/300',
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
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_gray.png',
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
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png',
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
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/rental_van_white.png',
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
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/rental_mustang_red.png',
        isAvailable: true,
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
        imageUrl: 'https://picsum.photos/seed/mech1/200/200',
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
            'https://picsum.photos/seed/portfolio1/400/300',
            'https://picsum.photos/seed/portfolio2/400/300',
            'https://picsum.photos/seed/portfolio3/400/300',
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
        businessLicenseUrl: 'https://picsum.photos/seed/license1/400/300',
        certifications: [{ name: 'ASE Certified Master Technician', fileUrl: 'https://picsum.photos/seed/cert1/400/300' }],
        insurances: [{ type: 'General Liability', provider: 'AXA', policyNumber: 'GL-12345' }]
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
        imageUrl: 'https://picsum.photos/seed/mech2/200/200',
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
        ]
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
        imageUrl: 'https://picsum.photos/seed/mech3/200/200',
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
        reviewsList: []
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
        imageUrl: 'https://picsum.photos/seed/mech4/200/200',
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
        reviewsList: []
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
        imageUrl: 'https://picsum.photos/seed/mech5/200/200',
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
        reviewsList: []
    },
    {
        id: 'm6',
        name: 'David Chen',
        email: 'david@ridersbud.com',
        password: 'password123',
        phone: '555-0106-666',
        bio: 'Subaru specialist with a passion for bodywork and customization.',
        rating: 4.6,
        reviews: 75,
        specializations: ['Subaru Specialist', 'Body Repair', 'Engine Tune-up'],
        status: 'Inactive',
        imageUrl: 'https://picsum.photos/seed/mech6/200/200',
        lat: 14.5530, // Near m1
        lng: 121.0261,
        registrationDate: '2023-05-18',
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
        reviewsList: []
    },
    {
        id: 'm7',
        name: 'Isabella Cruz',
        email: 'isabella@ridersbud.com',
        password: 'password123',
        phone: '555-0107-777',
        bio: 'Hyundai Master Tech. I specialize in battery services and hybrid vehicles.',
        rating: 4.9,
        reviews: 135,
        specializations: ['Hyundai Master Tech', 'Battery Services'],
        status: 'Pending',
        imageUrl: 'https://picsum.photos/seed/mech7/200/200',
        lat: 14.6760, // North QC
        lng: 121.0437,
        registrationDate: '2023-09-01',
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
        reviewsList: []
    }
];

export const seedBookings: Booking[] = [
    {
        id: 'b1',
        customerName: 'Juan Dela Cruz',
        service: seedServices[0],
        mechanic: seedMechanics[0], // Ricardo Reyes
        date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'En Route',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png'], isPrimary: true,
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
        service: seedServices[1], // Battery
        mechanic: seedMechanics[1], // Jane Smith
        date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        time: '01:00 PM',
        status: 'Completed',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png'], isPrimary: true,
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
        service: seedServices[3], // Diagnostics
        mechanic: seedMechanics[0], // Ricardo Reyes
        date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        time: '09:00 AM',
        status: 'Completed',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png'], isPrimary: true,
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
        service: seedServices[2], // Towing
        mechanic: seedMechanics[2], // Carlos Rivera
        date: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
        time: '03:00 PM',
        status: 'Cancelled',
        cancellationReason: 'Customer no longer available.',
        vehicle: {
            make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png'], isPrimary: true,
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
        service: seedServices[4], // Body Repair
        mechanic: seedMechanics[2], // Carlos Rivera
        date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Completed',
        vehicle: {
            make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'GHI 111', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_gray.png'], isPrimary: false,
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
        service: seedServices[0],
        date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Upcoming',
        vehicle: {
            make: 'Honda', model: 'Civic', year: 2022, plateNumber: 'XYZ 789', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_black.png'], isPrimary: true,
            vin: 'HN1AZ01Z000112233', mileage: 25000, insuranceProvider: 'State Farm', insurancePolicyNumber: 'POL-SF-445566'
        },
        location: { lat: 14.6042, lng: 121.0485 },
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b6',
        customerName: 'Maria Santos',
        service: seedServices[1],
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '02:00 PM',
        status: 'Upcoming',
        vehicle: {
            make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'DEF 456', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_gray.png'], isPrimary: false,
            vin: 'TY1AZ01Z000445566', mileage: 35000, insuranceProvider: 'Geico', insurancePolicyNumber: 'POL-GC-778899'
        },
        location: { lat: 14.6521, lng: 121.0333 },
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b7',
        customerName: 'Antonio Luna',
        service: seedServices[4],
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '04:00 PM',
        status: 'Upcoming',
        vehicle: {
            make: 'Ford', model: 'Everest', year: 2023, plateNumber: 'GHI 123', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_blue.png'], isPrimary: true,
            vin: 'FD1AZ01Z000778899', mileage: 5000, insuranceProvider: 'Allstate', insurancePolicyNumber: 'POL-AS-112233'
        },
        location: { lat: 14.5510, lng: 121.0232 }, // Placeholder
        beforeImages: [],
        afterImages: [],
    },
    {
        id: 'b8',
        customerName: 'Teresa Magbanua',
        service: seedServices[5],
        date: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'Upcoming',
        vehicle: {
            make: 'Hyundai', model: 'Tucson', year: 2020, plateNumber: 'JKL 789', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_gray.png'], isPrimary: true,
            vin: 'HY1AZ01Z000998877', mileage: 60000, insuranceProvider: 'Progressive', insurancePolicyNumber: 'POL-PG-665544'
        },
        location: { lat: 14.5510, lng: 121.0232 }, // Placeholder
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
                make: 'Mitsubishi', model: 'Montero', year: 2023, plateNumber: 'ABC 1234', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_suv_white.png'], isPrimary: true,
                vin: 'JN1AZ01Z000123456', mileage: 15000, insuranceProvider: 'AXA Insurance', insurancePolicyNumber: 'POL-987654321'
            },
            {
                make: 'Toyota', model: 'Vios', year: 2021, plateNumber: 'GHI 111', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_gray.png'], isPrimary: false,
                vin: 'JT1AZ01Z000654321', mileage: 45000, insuranceProvider: 'BPI/MS Insurance', insurancePolicyNumber: 'POL-123456789'
            },
            {
                make: 'Ford', model: 'Ranger', year: 2022, plateNumber: 'RAP 888', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_truck_red.png'], isPrimary: false,
                vin: 'FD1RAPTOR00012345', mileage: 32000, insuranceProvider: 'FPG Insurance', insurancePolicyNumber: 'POL-FPG-456789'
            },
            {
                make: 'Nissan', model: 'Navara', year: 2020, plateNumber: 'NAV 777', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_truck_black.png'], isPrimary: false,
                vin: 'NS1NVRA000777', mileage: 55000, insuranceProvider: 'Standard Insurance', insurancePolicyNumber: 'POL-STD-555444'
            }
        ],
        picture: 'https://picsum.photos/seed/juan/200/200',
        lat: 14.5510,
        lng: 121.0232,
    },
    {
        id: 'c2', name: 'Alex Rider', email: 'alex.rider@example.com', password: 'password', phone: '555-111-2222',
        vehicles: [{
            make: 'Honda', model: 'Civic', year: 2022, plateNumber: 'XYZ 789', imageUrls: ['https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_black.png'], isPrimary: true,
            vin: 'HN1AZ01Z000112233', mileage: 25000, insuranceProvider: 'State Farm', insurancePolicyNumber: 'POL-SF-445566'
        }],
        picture: 'https://picsum.photos/seed/alex/200/200',
        lat: 14.6042, lng: 121.0485,
    },
    { id: 'c3', name: 'Maria Santos', email: 'maria.s@example.com', password: 'password', phone: '555-333-4444', vehicles: [], picture: 'https://picsum.photos/seed/maria/200/200', lat: 14.6521, lng: 121.0333, },
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
    },
    {
        id: 'po2',
        mechanicId: 'm2',
        mechanicName: 'Jane Smith',
        amount: 3500,
        requestDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
        status: 'Approved',
        processDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
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
    }
];

export const seedBanners: Banner[] = [
    {
        id: 'banner1',
        name: '20% Off All Services',
        description: 'Get 20% off on all our premium services. Limited time offer!',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/ad_banner_1.png',
        link: '/services',
        category: 'Services',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
    },
    {
        id: 'banner2',
        name: 'New Parts in Stock!',
        description: 'Check out our new collection of high-quality engine and brake parts.',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/ad_banner_2.png',
        link: '/parts-store',
        category: 'Store',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
    },
    {
        id: 'banner3',
        name: 'Never Miss a Tune-Up',
        description: 'Set maintenance reminders for your vehicles and stay on top of their health.',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/ad_banner_3.png',
        link: '/reminders',
        category: 'Reminders',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
    },
    {
        id: 'banner4',
        name: 'Hassle-Free Oil Change',
        description: 'Book a professional oil change service at your location in just a few taps.',
        imageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/ad_banner_4.png',
        link: '/booking/1',
        category: 'Booking',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
    }
];


export const seedSettings: Settings = {
    appName: 'RidersBUD',
    contactEmail: 'support@ridersbud.com',
    contactPhone: '1-800-RIDERSBUD',
    address: '123 Auto Lane, Car City, 12345',
    bookingStartTime: '09:00',
    bookingEndTime: '17:00',
    bookingSlotDuration: 120,
    maxBookingsPerSlot: 2,
    emailOnNewBooking: true,
    emailOnCancellation: false,
    appLogoUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png',
    appTagline: 'Trusted Car Care Wherever You Are',
    virtualMechanicName: 'RiderAI',
    virtualMechanicImageUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/virtual_mechanic_avatar.png',
    virtualMechanicSystemInstruction: `You are an expert and friendly AI mechanic assistant for the RidersBUD application. Your goal is to provide helpful and accurate information to users based ONLY on the data provided about our services, parts, and mechanics. Do not invent information.

If a user asks about something not in your knowledge base (e.g., "Can you fix my boat?"), politely inform them that you don't have information on that topic and suggest they ask about car maintenance or browse the app's services and parts store.

Your responses should be friendly, conversational, and easy to understand. Keep answers concise. When the conversation starts, greet the user and ask how you can help them today.`,
    mechanicMarkerUrl: '',
    googleMapsApiKey: 'AIzaSyDk8M9aZVVeUDPPgd2R4TebXr3YOajbPRM',
    adminPanelTitle: 'RidersBUD Admin',
    adminSidebarLogoUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_icon.png',
    serviceCategories: ['Maintenance', 'Repair', 'Emergency', 'Diagnostics', 'Specialty Services', 'Cleaning & Detailing', 'Liason Services', 'Rentals'],
    partCategories: ['Engine', 'Brakes', 'Exterior', 'Oils & Fluids'],
    minimumPayout: 1000,
    maximumPayout: 50000,
    payoutSchedule: 'Manual',

    // Enhanced General Information
    supportEmail: 'support@ridersbud.com',
    businessHoursDisplay: 'Mon-Fri: 8AM-6PM, Sat: 9AM-3PM',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    language: 'en',

    // Social Links
    socialLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
        website: ''
    },

    // Booking Configuration
    bookingBufferTime: 15,
    maxAdvanceBookingDays: 30,
    cancellationPolicyWindow: 24,
    autoAssignMechanic: false,
    emergencyBookingEnabled: true,
    weekendBookingEnabled: true,
    holidayDates: [],
    minimumBookingNotice: 2,

    // Branding Assets
    brandingAssets: {
        splashLogoUrl: '',
        customerAuthLogoUrl: '',
        mechanicAuthLogoUrl: ''
    }
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
});
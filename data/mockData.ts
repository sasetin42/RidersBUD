import { Service, Mechanic, User, Booking, Part, BookingStatus, Customer, Settings } from '../types';

export let mockServices: Service[] = [
    {
        id: '1',
        name: 'Oil Change',
        description: 'Full synthetic oil change with filter replacement. Recommended every 5,000 miles.',
        price: 89.99,
        estimatedTime: '45 mins',
        imageUrl: 'https://picsum.photos/seed/oil/400/300',
        category: 'Maintenance'
    },
    {
        id: '2',
        name: 'Brake Repair',
        description: 'Complete brake pad and rotor inspection and replacement. Ensures your safety on the road.',
        price: 249.99,
        estimatedTime: '1.5 hours',
        imageUrl: 'https://picsum.photos/seed/brake/400/300',
        category: 'Repair'
    },
    {
        id: '3',
        name: 'Engine Check',
        description: 'Comprehensive engine diagnostic using OBD-II tools to identify and troubleshoot issues.',
        price: 120.00,
        estimatedTime: '1 hour',
        imageUrl: 'https://picsum.photos/seed/engine/400/300',
        category: 'Diagnostics'
    },
    {
        id: '4',
        name: 'Tire Rotation',
        description: 'Rotation of tires to ensure even wear and extend their lifespan.',
        price: 45.00,
        estimatedTime: '30 mins',
        imageUrl: 'https://picsum.photos/seed/tire/400/300',
        category: 'Maintenance'
    },
    {
        id: '5',
        name: 'Battery Check',
        description: 'Testing battery health, checking connections, and cleaning terminals.',
        price: 25.00,
        estimatedTime: '15 mins',
        imageUrl: 'https://picsum.photos/seed/battery/400/300',
        category: 'Maintenance'
    },
    {
        id: '6',
        name: 'Towing Service',
        description: 'A complete multi-point inspection covering all major systems of your vehicle.',
        price: 150.00,
        estimatedTime: 'N/A',
        imageUrl: 'https://picsum.photos/seed/inspect/400/300',
        category: 'Emergency'
    }
];

export let mockParts: Part[] = [
    {
        id: 'p1',
        name: 'Synthetic Engine Oil',
        description: '5 Quarts of 5W-30 Full Synthetic motor oil. Provides excellent engine protection.',
        price: 34.99,
        imageUrl: 'https://picsum.photos/seed/engineoil/400/300',
        category: 'Engine',
        sku: 'SYN-5W30-5QT'
    },
    {
        id: 'p2',
        name: 'Ceramic Brake Pads',
        description: 'Front set of premium ceramic brake pads for superior stopping power and low dust.',
        price: 59.99,
        imageUrl: 'https://picsum.photos/seed/brakepads/400/300',
        category: 'Brakes',
        sku: 'CER-PAD-F78'
    },
    {
        id: 'p3',
        name: 'Engine Air Filter',
        description: 'High-performance engine air filter. Improves airflow and engine efficiency.',
        price: 19.99,
        imageUrl: 'https://picsum.photos/seed/airfilter/400/300',
        category: 'Engine',
        sku: 'AIR-FIL-H21'
    },
    {
        id: 'p4',
        name: 'Wiper Blades (Set of 2)',
        description: 'All-weather performance wiper blades for a clear, streak-free wipe. 22-inch.',
        price: 24.99,
        imageUrl: 'https://picsum.photos/seed/wipers/400/300',
        category: 'Exterior',
        sku: 'WPR-BLD-22'
    },
];

export let mockMechanics: Mechanic[] = [
    {
        id: 'm1',
        name: 'John Doe',
        rating: 4.9,
        reviews: 128,
        certifications: ['ASE Certified', 'Toyota Master Tech'],
        imageUrl: 'https://picsum.photos/seed/mech1/200/200',
        lat: 14.5547,
        lng: 121.0244
    },
    {
        id: 'm2',
        name: 'Jane Smith',
        rating: 4.8,
        reviews: 97,
        certifications: ['ASE Certified', 'Honda Pro'],
        imageUrl: 'https://picsum.photos/seed/mech2/200/200',
        lat: 14.6091,
        lng: 121.0223
    },
    {
        id: 'm3',
        name: 'Carlos Rivera',
        rating: 4.9,
        reviews: 152,
        certifications: ['BMW Specialist', 'EV Certified'],
        imageUrl: 'https://picsum.photos/seed/mech3/200/200',
        lat: 14.5825,
        lng: 121.0616
    },
    {
        id: 'm4',
        name: 'Luis Reyes',
        rating: 4.7,
        reviews: 88,
        certifications: ['ASE Certified'],
        imageUrl: 'https://picsum.photos/seed/mech4/200/200',
        lat: 14.5560, // Near m1
        lng: 121.0250
    },
    {
        id: 'm5',
        name: 'Sofia Garcia',
        rating: 4.8,
        reviews: 110,
        certifications: ['Ford Certified'],
        imageUrl: 'https://picsum.photos/seed/mech5/200/200',
        lat: 14.6105, // Near m2
        lng: 121.0235
    },
    {
        id: 'm6',
        name: 'David Chen',
        rating: 4.6,
        reviews: 75,
        certifications: ['Subaru Specialist'],
        imageUrl: 'https://picsum.photos/seed/mech6/200/200',
        lat: 14.5530, // Near m1
        lng: 121.0261
    },
    {
        id: 'm7',
        name: 'Isabella Cruz',
        rating: 4.9,
        reviews: 135,
        certifications: ['Hyundai Master Tech'],
        imageUrl: 'https://picsum.photos/seed/mech7/200/200',
        lat: 14.6760, // North QC
        lng: 121.0437
    }
];

export const mockUser: User = {
    id: 'u1',
    name: 'Alex Rider',
    email: 'alex.rider@example.com',
    phone: '555-123-4567',
    vehicles: [
        {
            make: 'Toyota',
            model: 'Camry',
            year: 2021,
            plateNumber: 'XYZ-1234'
        }
    ]
};

export let mockBookings: Booking[] = [
    {
        id: 'b1',
        customerName: 'Alex Rider',
        service: mockServices[0], // Oil Change
        mechanic: mockMechanics[0], // John Doe
        date: new Date().toISOString().split('T')[0], // Set to today to make mechanic busy
        time: '11:00 AM',
        status: 'Upcoming',
    },
    {
        id: 'b2',
        customerName: 'Alex Rider',
        service: mockServices[1], // Brake Repair
        mechanic: mockMechanics[1], // Jane Smith
        date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        time: '01:00 PM',
        status: 'Completed',
    },
    {
        id: 'b3',
        customerName: 'Alex Rider',
        service: mockServices[3], // Tire Rotation
        mechanic: mockMechanics[0], // John Doe
        date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        time: '09:00 AM',
        status: 'Completed',
    },
    {
        id: 'b4',
        customerName: 'Alex Rider',
        service: mockServices[2], // Engine Check
        mechanic: mockMechanics[2], // Carlos Rivera
        date: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
        time: '03:00 PM',
        status: 'Cancelled',
    },
    // --- Unassigned Bookings for Dashboard ---
    {
        id: 'b5',
        customerName: 'Juan dela Cruz',
        service: mockServices[0], // Oil Change
        date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Upcoming',
    },
    {
        id: 'b6',
        customerName: 'Maria Santos',
        service: mockServices[1], // Brake Repair
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '02:00 PM',
        status: 'Upcoming',
    },
    {
        id: 'b7',
        customerName: 'Antonio Luna',
        service: mockServices[4], // Battery Check
        date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
        time: '04:00 PM',
        status: 'Upcoming',
    },
        {
        id: 'b8',
        customerName: 'Teresa Magbanua',
        service: mockServices[5], // Towing Service
        date: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'Upcoming',
    }
];

export let mockCustomers: Customer[] = [
    { id: 'c1', name: 'Alex Rider', email: 'alex.rider@example.com', phone: '555-123-4567' },
    { id: 'c2', name: 'Juan dela Cruz', email: 'juan.c@example.com', phone: '555-111-2222' },
    { id: 'c3', name: 'Maria Santos', email: 'maria.s@example.com', phone: '555-333-4444' },
];

export let mockSettings: Settings = {
    appName: 'RidersBUD',
    contactEmail: 'support@ridersbud.com',
    contactPhone: '1-800-RIDERSBUD',
    address: '123 Auto Lane, Car City, 12345',
    bookingStartTime: '08:00',
    bookingEndTime: '17:00',
    bookingSlotDuration: 60,
    maxBookingsPerSlot: 2,
    emailOnNewBooking: true,
    emailOnCancellation: false,
    splashLogoUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png',
    authLogoUrl: '',
    sidebarLogoUrl: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png',
    loginTitle: 'RidersBUD',
    loginSubtitle: 'Sign in to continue',
    signupTitle: 'RidersBUD',
    signupSubtitle: 'Create your account',
};

// --- Data Mutation Functions for Admin Panel ---

// Services
export const addService = (service: Omit<Service, 'id'>) => {
    const newService: Service = { ...service, id: `s-${Date.now()}` };
    mockServices.push(newService);
};
export const updateService = (updatedService: Service) => {
    const index = mockServices.findIndex(s => s.id === updatedService.id);
    if (index !== -1) {
        mockServices[index] = updatedService;
    }
};
export const deleteService = (serviceId: string) => {
    mockServices = mockServices.filter(s => s.id !== serviceId);
};

// Parts
export const addPart = (part: Omit<Part, 'id'>) => {
    const newPart: Part = { ...part, id: `p-${Date.now()}` };
    mockParts.push(newPart);
};
export const updatePart = (updatedPart: Part) => {
    const index = mockParts.findIndex(p => p.id === updatedPart.id);
    if (index !== -1) {
        mockParts[index] = updatedPart;
    }
};
export const deletePart = (partId: string) => {
    mockParts = mockParts.filter(p => p.id !== partId);
};

// Mechanics
export const addMechanic = (mechanic: Omit<Mechanic, 'id'>) => {
    const newMechanic: Mechanic = { ...mechanic, id: `m-${Date.now()}` };
    mockMechanics.push(newMechanic);
};
export const updateMechanic = (updatedMechanic: Mechanic) => {
    const index = mockMechanics.findIndex(m => m.id === updatedMechanic.id);
    if (index !== -1) {
        mockMechanics[index] = updatedMechanic;
    }
};
export const deleteMechanic = (mechanicId: string) => {
    mockMechanics = mockMechanics.filter(m => m.id !== mechanicId);
};

// Bookings
export const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    const index = mockBookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        mockBookings[index].status = status;
    }
};

// Customers
export const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = { ...customer, id: `c-${Date.now()}` };
    mockCustomers.push(newCustomer);
};
export const updateCustomer = (updatedCustomer: Customer) => {
    const index = mockCustomers.findIndex(c => c.id === updatedCustomer.id);
    if (index !== -1) {
        mockCustomers[index] = updatedCustomer;
    }
};
export const deleteCustomer = (customerId: string) => {
    mockCustomers = mockCustomers.filter(c => c.id !== customerId);
};

// Settings
export const getSettings = (): Settings => {
    return mockSettings;
};
export const updateSettings = (newSettings: Partial<Settings>) => {
    mockSettings = { ...mockSettings, ...newSettings };
};
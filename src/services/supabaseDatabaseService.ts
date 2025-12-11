import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Service, Part, Mechanic, Booking, Customer, Order, Review, Banner, Settings, AdminUser, Role, Task, PayoutRequest, Database } from '../types';

/**
 * Supabase Database Service
 * Provides CRUD operations for all tables with realtime support
 */
export class SupabaseDatabaseService {
    // ============================================================================
    // SERVICES
    // ============================================================================

    static async getServices(): Promise<Service[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('services')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get services error:', error);
            return [];
        }

        return data || [];
    }

    static async addService(service: Omit<Service, 'id'>): Promise<Service | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase!
            .from('services')
            .insert([service])
            .select()
            .single();

        if (error) {
            console.error('[DB] Add service error:', error);
            return null;
        }

        return data;
    }

    static async updateService(id: string, updates: Partial<Service>): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('services')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('[DB] Update service error:', error);
            return false;
        }

        return true;
    }

    static async deleteService(id: string): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('services')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[DB] Delete service error:', error);
            return false;
        }

        return true;
    }

    // ============================================================================
    // PARTS
    // ============================================================================

    static async getParts(): Promise<Part[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('parts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get parts error:', error);
            return [];
        }

        return data || [];
    }

    static async addPart(part: Omit<Part, 'id'>): Promise<Part | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase!
            .from('parts')
            .insert([part])
            .select()
            .single();

        if (error) {
            console.error('[DB] Add part error:', error);
            return null;
        }

        return data;
    }

    static async updatePart(id: string, updates: Partial<Part>): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('parts')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('[DB] Update part error:', error);
            return false;
        }

        return true;
    }

    // ============================================================================
    // MECHANICS
    // ============================================================================

    static async getMechanics(): Promise<Mechanic[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('mechanics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get mechanics error:', error);
            return [];
        }

        return data || [];
    }

    static async getMechanicById(id: string): Promise<Mechanic | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase!
            .from('mechanics')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('[DB] Get mechanic error:', error);
            return null;
        }

        return data;
    }

    static async updateMechanicLocation(id: string, lat: number, lng: number): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('mechanics')
            .update({ lat, lng, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('[DB] Update mechanic location error:', error);
            return false;
        }

        return true;
    }

    static async updateMechanicOnlineStatus(id: string, isOnline: boolean): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('mechanics')
            .update({ is_online: isOnline })
            .eq('id', id);

        if (error) {
            console.error('[DB] Update mechanic online status error:', error);
            return false;
        }

        return true;
    }

    // ============================================================================
    // BOOKINGS
    // ============================================================================

    static async getBookings(): Promise<Booking[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get bookings error:', error);
            return [];
        }

        return data || [];
    }

    static async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('bookings')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get customer bookings error:', error);
            return [];
        }

        return data || [];
    }

    static async getBookingsByMechanic(mechanicId: string): Promise<Booking[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('bookings')
            .select('*')
            .eq('mechanic_id', mechanicId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get mechanic bookings error:', error);
            return [];
        }

        return data || [];
    }

    static async addBooking(booking: Omit<Booking, 'id'>): Promise<Booking | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase!
            .from('bookings')
            .insert([booking])
            .select()
            .single();

        if (error) {
            console.error('[DB] Add booking error:', error);
            return null;
        }

        // Add initial status history
        if (data) {
            await supabase!
                .from('booking_status_history')
                .insert([{
                    booking_id: data.id,
                    status: booking.status || 'Upcoming',
                    timestamp: new Date().toISOString(),
                }]);
        }

        return data;
    }

    static async updateBookingStatus(id: string, status: string): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('bookings')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('[DB] Update booking status error:', error);
            return false;
        }

        // Add to status history
        await supabase!
            .from('booking_status_history')
            .insert([{
                booking_id: id,
                status,
                timestamp: new Date().toISOString(),
            }]);

        return true;
    }

    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================

    static async getNotifications(recipientId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];

        const { data, error } = await supabase!
            .from('notifications')
            .select('*')
            .or(`recipient_id.eq.all,recipient_id.eq.${recipientId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Get notifications error:', error);
            return [];
        }

        return data || [];
    }

    static async markNotificationAsRead(id: string): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) {
            console.error('[DB] Mark notification as read error:', error);
            return false;
        }

        return true;
    }

    static async createNotification(notification: {
        type: string;
        title: string;
        message: string;
        recipient_id: string;
        link?: string;
    }): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { error } = await supabase!
            .from('notifications')
            .insert([notification]);

        if (error) {
            console.error('[DB] Create notification error:', error);
            return false;
        }

        return true;
    }

    // ============================================================================
    // SETTINGS
    // ============================================================================

    static async getSettings(): Promise<Settings | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase!
            .from('settings')
            .select('value')
            .eq('key', 'app_settings')
            .single();

        if (error) {
            console.error('[DB] Get settings error:', error);
            return null;
        }

        return data?.value as Settings;
    }

    static async updateSettings(settings: Partial<Settings>): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        // Get current settings
        const current = await this.getSettings();
        const updated = { ...current, ...settings };

        const { error } = await supabase!
            .from('settings')
            .update({ value: updated, updated_at: new Date().toISOString() })
            .eq('key', 'app_settings');

        if (error) {
            console.error('[DB] Update settings error:', error);
            return false;
        }

        return true;
    }
    // ============================================================================
    // CUSTOMERS
    // ============================================================================

    static async getCustomers(): Promise<Customer[]> {
        if (!isSupabaseConfigured()) return [];
        // Select all fields AND join vehicles table
        const { data, error } = await supabase!
            .from('customers')
            .select('*, vehicles(*)');

        if (error) {
            console.error('[DB] Get customers error:', error);
            return [];
        }

        // Transform Supabase data to match Customer interface
        return (data || []).map((row: any) => ({
            ...row,
            password: row.password_hash, // Map back
            vehicles: row.vehicles ? row.vehicles.map((v: any) => ({
                ...v,
                plateNumber: v.plate_number, // Map snake_case to camelCase
                isPrimary: v.is_primary
            })) : []
        })) as Customer[];
    }

    static async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer | null> {
        if (!isSupabaseConfigured()) return null;

        // Separate fields that need transformation
        const { password, vehicles, ...rest } = customer;

        // Prepare payload for 'customers' table
        const customerPayload = {
            ...rest,
            password_hash: password, // Map password to password_hash
            vehicles: undefined     // Exclude array, stored in separate table
        };
        // Remove undefined properties to avoid errors
        delete (customerPayload as any).vehicles;

        // 1. Insert Customer
        const { data: newCustomer, error: insertError } = await supabase!
            .from('customers')
            .insert([customerPayload])
            .select() // Return the created row
            .single();

        if (insertError) {
            console.error('[DB] Add customer insert error:', insertError);
            return null;
        }

        if (!newCustomer) return null;

        // 2. Insert Vehicles (if any)
        if (vehicles && vehicles.length > 0) {
            const vehiclesPayload = vehicles.map((v: any) => ({
                customer_id: newCustomer.id,
                make: v.make,
                model: v.model,
                year: v.year,
                plate_number: v.plateNumber,
                is_primary: v.isPrimary,
                // ... map other vehicle fields if necessary
            }));

            const { error: vehicleError } = await supabase!.from('vehicles').insert(vehiclesPayload);
            if (vehicleError) {
                console.error('[DB] Add customer vehicles error:', vehicleError);
                // Non-fatal, return customer but warn
            }
        }

        // Return combined object matching Customer interface
        return {
            ...newCustomer,
            password: newCustomer.password_hash, // Map back for app usage
            vehicles: vehicles || [] // Return initial vehicles (optimistic)
        } as Customer;
    }

    static async updateCustomer(id: string, updates: Partial<Customer>): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        const { password, vehicles, id: _id, ...rest } = updates; // Extract ID to avoid updating it

        const customerPayload: any = { ...rest };
        if (password) customerPayload.password_hash = password;

        // 1. Update Customer fields
        const { error } = await supabase!
            .from('customers')
            .update(customerPayload)
            .eq('id', id);

        if (error) {
            console.error('[DB] Update customer error:', error);
            return false;
        }

        // 2. Sync Vehicles if provided
        if (vehicles) {
            // A. Fetch existing vehicles
            const { data: existingVehicles } = await supabase!
                .from('vehicles')
                .select('id, plate_number')
                .eq('customer_id', id);

            const existingPlates = new Set((existingVehicles || []).map(v => v.plate_number));
            const newPlates = new Set(vehicles.map(v => v.plateNumber));

            // B. Upsert (Add/Update)
            for (const v of vehicles) {
                const vehiclePayload = {
                    customer_id: id,
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    plate_number: v.plateNumber,
                    is_primary: v.isPrimary,
                    image_urls: v.imageUrls
                };

                // Use upsert with conflict on customer_id + plate_number (requires constraint)
                const { error: upsertError } = await supabase!
                    .from('vehicles')
                    .upsert(vehiclePayload, { onConflict: 'customer_id, plate_number' });

                if (upsertError) console.error('[DB] Vehicle upsert error:', upsertError);
            }

            // C. Delete removed vehicles
            // Find plates that are in existing but NOT in new list
            const platesToDelete = (existingVehicles || [])
                .filter(v => !newPlates.has(v.plate_number))
                .map(v => v.plate_number);

            if (platesToDelete.length > 0) {
                const { error: deleteError } = await supabase!
                    .from('vehicles')
                    .delete()
                    .eq('customer_id', id)
                    .in('plate_number', platesToDelete);

                if (deleteError) console.error('[DB] Vehicle delete error (likely referenced by booking):', deleteError);
            }
        }

        return true;
    }

    // ============================================================================
    // ORDERS
    // ============================================================================

    static async getOrders(): Promise<Order[]> {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false });
        if (error) { console.error('[DB] Get orders error:', error); return []; }
        // Transform items if necessary, depending on how supabase returns joined data
        return data || [];
    }

    // ============================================================================
    // BANNERS
    // ============================================================================

    static async getBanners(): Promise<Banner[]> {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('banners').select('*');
        if (error) { console.error('[DB] Get banners error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // ADMIN USERS & ROLES
    // ============================================================================

    static async getAdminUsers(): Promise<AdminUser[]> { // Import AdminUser type if not transparent
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('admin_users').select('*');
        if (error) { console.error('[DB] Get admin users error:', error); return []; }
        return data || [];
    }

    static async getRoles(): Promise<any[]> { // Import Role type
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('roles').select('*');
        if (error) { console.error('[DB] Get roles error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // TASKS
    // ============================================================================

    static async getTasks(): Promise<any[]> { // Import Task type
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('tasks').select('*');
        if (error) { console.error('[DB] Get tasks error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // PAYOUTS
    // ============================================================================

    static async getPayouts(): Promise<any[]> { // Import PayoutRequest type
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('payout_requests').select('*');
        if (error) { console.error('[DB] Get payouts error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // FAQS
    // ============================================================================

    static async getFAQs(): Promise<any[]> { // Returns raw FAQ items, needs grouping
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('faqs').select('*');
        if (error) { console.error('[DB] Get FAQs error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // RENTAL CARS
    // ============================================================================

    static async getRentalCars(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('rental_cars').select('*');
        if (error) { console.error('[DB] Get rental cars error:', error); return []; }
        return data || [];
    }

    static async getRentalBookings(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase!.from('rental_bookings').select('*');
        if (error) { console.error('[DB] Get rental bookings error:', error); return []; }
        return data || [];
    }

    // ============================================================================
    // AGGREGATOR
    // ============================================================================

    /**
     * Fetches all data to build the initial Database state
     */
    static async getDatabase(): Promise<any | null> { // Returns Database type
        if (!isSupabaseConfigured()) return null;

        try {
            const [
                services, parts, mechanics, bookings, customers, orders, banners, settings,
                adminUsers, roles, tasks, payouts, faqsRaw, rentalCars, rentalBookings, notifications
            ] = await Promise.all([
                this.getServices(),
                this.getParts(),
                this.getMechanics(),
                this.getBookings(),
                this.getCustomers(),
                this.getOrders(),
                this.getBanners(),
                this.getSettings(),
                this.getAdminUsers(),
                this.getRoles(),
                this.getTasks(),
                this.getPayouts(),
                this.getFAQs(),
                this.getRentalCars(),
                this.getRentalBookings(),
                this.getNotifications('all') // Fetch globally for context?
            ]);

            // Transform FAQs from flat list to Categories
            // Need to implement grouping logic here or in Context.
            // For now returning raw array, Context might need adjustment or we adjust here.
            // Let's assume Context expects FAQCategory[].
            const faqs: any[] = [];
            // Simple grouping
            const categories = new Set(faqsRaw.map((f: any) => f.category));
            categories.forEach(cat => {
                faqs.push({
                    category: cat,
                    items: faqsRaw.filter((f: any) => f.category === cat)
                });
            });

            return {
                services,
                parts,
                mechanics,
                bookings,
                customers,
                orders,
                banners,
                settings: settings || {
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
                    appTagline: '',
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
                    socialLinks: { facebook: '', twitter: '', instagram: '', website: '' },
                    bookingBufferTime: 0,
                    maxAdvanceBookingDays: 30,
                    cancellationPolicyWindow: 24,
                    brandingAssets: { splashLogoUrl: '', customerAuthLogoUrl: '', mechanicAuthLogoUrl: '' }
                }, // Fallback for settings if null
                faqs,
                adminUsers,
                roles,
                tasks,
                payouts,
                rentalCars,
                rentalBookings
            };

        } catch (error) {
            console.error('[DB] Failed to build database:', error);
            return null;
        }
    }
}

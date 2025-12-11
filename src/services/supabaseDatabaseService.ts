import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Service, Part, Mechanic, Booking, Customer, Order, Review, Banner, Settings } from '../types';

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
}

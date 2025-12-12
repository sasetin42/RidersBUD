import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Service for managing mechanic location tracking and broadcasting
 */
export class MechanicLocationService {
    private watchId: number | null = null;
    private updateInterval: NodeJS.Timeout | null = null;
    private isTracking: boolean = false;

    // Update location every 10 seconds
    private readonly UPDATE_INTERVAL = 10000;

    /**
     * Start broadcasting mechanic's location
     */
    async startTracking(mechanicId: string): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (this.isTracking) {
            console.log('[MechanicLocation] Already tracking');
            return { success: true };
        }

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            return { success: false, error: 'Geolocation not supported' };
        }

        try {
            // Request permission and get initial location
            const position = await this.getCurrentPosition();

            // Update location immediately
            await this.updateLocation(mechanicId, position);

            // Watch position changes
            this.watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    // Position updates are handled by interval
                    console.log('[MechanicLocation] Position updated');
                },
                (error) => {
                    console.error('[MechanicLocation] Watch error:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );

            // Set up interval to update location
            this.updateInterval = setInterval(async () => {
                try {
                    const pos = await this.getCurrentPosition();
                    await this.updateLocation(mechanicId, pos);
                } catch (error) {
                    console.error('[MechanicLocation] Update error:', error);
                }
            }, this.UPDATE_INTERVAL);

            this.isTracking = true;
            console.log('[MechanicLocation] Tracking started');

            return { success: true };
        } catch (error) {
            console.error('[MechanicLocation] Start tracking error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start tracking'
            };
        }
    }

    /**
     * Stop broadcasting location
     */
    async stopTracking(mechanicId: string): Promise<void> {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Update status to offline
        if (isSupabaseConfigured() && mechanicId) {
            try {
                await supabase!
                    .from('mechanic_locations')
                    .update({ is_online: false })
                    .eq('mechanic_id', mechanicId);
            } catch (error) {
                console.error('[MechanicLocation] Error updating offline status:', error);
            }
        }

        this.isTracking = false;
        console.log('[MechanicLocation] Tracking stopped');
    }

    /**
     * Get current position as Promise
     */
    private getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });
    }

    /**
     * Update mechanic location in database
     */
    private async updateLocation(
        mechanicId: string,
        position: GeolocationPosition
    ): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            const locationData = {
                mechanic_id: mechanicId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                is_online: true,
                last_updated: new Date().toISOString()
            };

            const { error } = await supabase!
                .from('mechanic_locations')
                .upsert(locationData, {
                    onConflict: 'mechanic_id'
                });

            if (error) {
                console.error('[MechanicLocation] Update error:', error);
            } else {
                console.log('[MechanicLocation] Location updated:', {
                    lat: locationData.latitude,
                    lng: locationData.longitude
                });
            }
        } catch (error) {
            console.error('[MechanicLocation] Update exception:', error);
        }
    }

    /**
     * Subscribe to mechanic location updates
     */
    subscribeToMechanic(
        mechanicId: string,
        callback: (location: MechanicLocation) => void
    ): () => void {
        if (!isSupabaseConfigured()) {
            console.warn('[MechanicLocation] Supabase not configured');
            return () => { };
        }

        const channel = supabase!
            .channel(`mechanic-location-${mechanicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'mechanic_locations',
                    filter: `mechanic_id=eq.${mechanicId}`
                },
                (payload) => {
                    const location: MechanicLocation = {
                        mechanicId: payload.new.mechanic_id,
                        latitude: payload.new.latitude,
                        longitude: payload.new.longitude,
                        accuracy: payload.new.accuracy,
                        heading: payload.new.heading,
                        speed: payload.new.speed,
                        isOnline: payload.new.is_online,
                        lastUpdated: payload.new.last_updated
                    };
                    callback(location);
                }
            )
            .subscribe();

        // Return unsubscribe function
        return () => {
            channel.unsubscribe();
        };
    }

    /**
     * Subscribe to all online mechanics
     */
    subscribeToAllMechanics(
        callback: (locations: MechanicLocation[]) => void
    ): () => void {
        if (!isSupabaseConfigured()) {
            console.warn('[MechanicLocation] Supabase not configured');
            return () => { };
        }

        const channel = supabase!
            .channel('all-mechanic-locations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mechanic_locations'
                },
                async () => {
                    // Fetch all online mechanics
                    const locations = await this.getAllOnlineMechanics();
                    callback(locations);
                }
            )
            .subscribe();

        // Initial fetch
        this.getAllOnlineMechanics().then(callback);

        return () => {
            channel.unsubscribe();
        };
    }

    /**
     * Get all online mechanics
     */
    async getAllOnlineMechanics(): Promise<MechanicLocation[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase!
                .from('mechanic_locations')
                .select('*')
                .eq('is_online', true);

            if (error) throw error;

            return (data || []).map(loc => ({
                mechanicId: loc.mechanic_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy,
                heading: loc.heading,
                speed: loc.speed,
                isOnline: loc.is_online,
                lastUpdated: loc.last_updated
            }));
        } catch (error) {
            console.error('[MechanicLocation] Error fetching mechanics:', error);
            return [];
        }
    }

    /**
     * Get mechanic's current location
     */
    async getMechanicLocation(mechanicId: string): Promise<MechanicLocation | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            const { data, error } = await supabase!
                .from('mechanic_locations')
                .select('*')
                .eq('mechanic_id', mechanicId)
                .single();

            if (error || !data) return null;

            return {
                mechanicId: data.mechanic_id,
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy,
                heading: data.heading,
                speed: data.speed,
                isOnline: data.is_online,
                lastUpdated: data.last_updated
            };
        } catch (error) {
            console.error('[MechanicLocation] Error fetching location:', error);
            return null;
        }
    }
}

/**
 * Mechanic location type
 */
export interface MechanicLocation {
    mechanicId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number | null;
    speed?: number | null;
    isOnline: boolean;
    lastUpdated: string;
}

// Export singleton instance
export const mechanicLocationService = new MechanicLocationService();

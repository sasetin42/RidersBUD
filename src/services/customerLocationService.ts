import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Service for managing customer location and map-related operations
 */
export class CustomerLocationService {
    /**
     * Get current location from browser
     */
    async getCurrentLocation(): Promise<{
        lat: number;
        lng: number;
        accuracy?: number;
    } | null> {
        if (!navigator.geolocation) {
            console.error('[CustomerLocation] Geolocation not supported');
            return null;
        }

        try {
            const position = await this.getPosition();
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (error) {
            console.error('[CustomerLocation] Error getting location:', error);
            return null;
        }
    }

    /**
     * Get position as Promise
     */
    private getPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }

    /**
     * Reverse geocode coordinates to address
     */
    async getAddressFromCoordinates(
        lat: number,
        lng: number
    ): Promise<string | null> {
        try {
            // Use Google Maps Geocoding API
            const geocoder = new google.maps.Geocoder();
            const result = await geocoder.geocode({
                location: { lat, lng }
            });

            if (result.results && result.results.length > 0) {
                return result.results[0].formatted_address;
            }

            return null;
        } catch (error) {
            console.error('[CustomerLocation] Geocoding error:', error);
            return null;
        }
    }

    /**
     * Get current location with address
     */
    async getCurrentLocationWithAddress(): Promise<{
        lat: number;
        lng: number;
        address: string;
    } | null> {
        const location = await this.getCurrentLocation();
        if (!location) return null;

        const address = await this.getAddressFromCoordinates(
            location.lat,
            location.lng
        );

        return {
            lat: location.lat,
            lng: location.lng,
            address: address || 'Unknown location'
        };
    }

    /**
     * Share customer location for a booking
     */
    async shareLocationForBooking(
        bookingId: string,
        location: { lat: number; lng: number; address?: string }
    ): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { error } = await supabase!
                .from('bookings')
                .update({
                    customer_location_lat: location.lat,
                    customer_location_lng: location.lng,
                    customer_location_address: location.address || null,
                    share_location_with_mechanic: true
                })
                .eq('id', bookingId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CustomerLocation] Error sharing location:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to share location'
            };
        }
    }

    /**
     * Toggle location sharing for a booking
     */
    async toggleLocationSharing(
        bookingId: string,
        share: boolean
    ): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { error } = await supabase!
                .from('bookings')
                .update({ share_location_with_mechanic: share })
                .eq('id', bookingId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CustomerLocation] Error toggling sharing:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to toggle sharing'
            };
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance * 10) / 10; // Round to 1 decimal
    }

    /**
     * Convert degrees to radians
     */
    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Calculate ETA using Google Maps Distance Matrix API
     */
    async calculateETA(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number }
    ): Promise<{
        distance: number; // in km
        duration: number; // in minutes
        distanceText: string;
        durationText: string;
    } | null> {
        try {
            const service = new google.maps.DistanceMatrixService();
            const result = await service.getDistanceMatrix({
                origins: [new google.maps.LatLng(origin.lat, origin.lng)],
                destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC
            });

            if (
                result.rows &&
                result.rows[0] &&
                result.rows[0].elements &&
                result.rows[0].elements[0].status === 'OK'
            ) {
                const element = result.rows[0].elements[0];
                return {
                    distance: element.distance.value / 1000, // Convert to km
                    duration: Math.ceil(element.duration.value / 60), // Convert to minutes
                    distanceText: element.distance.text,
                    durationText: element.duration.text
                };
            }

            return null;
        } catch (error) {
            console.error('[CustomerLocation] ETA calculation error:', error);
            return null;
        }
    }

    /**
     * Get directions route
     */
    async getDirections(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number }
    ): Promise<google.maps.DirectionsResult | null> {
        try {
            const directionsService = new google.maps.DirectionsService();
            const result = await directionsService.route({
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                travelMode: google.maps.TravelMode.DRIVING
            });

            return result;
        } catch (error) {
            console.error('[CustomerLocation] Directions error:', error);
            return null;
        }
    }

    /**
     * Find nearby mechanics
     */
    async findNearbyMechanics(
        customerLat: number,
        customerLng: number,
        radiusKm: number = 10
    ): Promise<NearbyMechanic[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase!
                .rpc('find_nearby_mechanics', {
                    customer_lat: customerLat,
                    customer_lng: customerLng,
                    radius_km: radiusKm
                });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('[CustomerLocation] Error finding mechanics:', error);
            return [];
        }
    }

    /**
     * Update booking ETA
     */
    async updateBookingETA(
        bookingId: string,
        etaMinutes: number,
        distanceKm: number
    ): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            await supabase!
                .from('bookings')
                .update({
                    mechanic_eta_minutes: etaMinutes,
                    distance_km: distanceKm
                })
                .eq('id', bookingId);
        } catch (error) {
            console.error('[CustomerLocation] Error updating ETA:', error);
        }
    }
}

/**
 * Nearby mechanic type
 */
export interface NearbyMechanic {
    mechanic_id: string;
    mechanic_name: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    is_online: boolean;
}

// Export singleton instance
export const customerLocationService = new CustomerLocationService();

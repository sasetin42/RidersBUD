import React, { useEffect, useState } from 'react';
import { Booking, Mechanic } from '../../types';
import { InteractiveMap, MapMarkerData } from '../map/InteractiveMap';
import { mechanicLocationService, MechanicLocation } from '../../services/mechanicLocationService';
import { customerLocationService } from '../../services/customerLocationService';
import { DirectionsRenderer } from '@react-google-maps/api';
import { X, Phone, Navigation, MapPin, Clock } from 'lucide-react';
import Spinner from '../Spinner';

interface BookingMapViewProps {
    booking: Booking;
    mechanic: Mechanic;
    onClose: () => void;
}

export const BookingMapView: React.FC<BookingMapViewProps> = ({
    booking,
    mechanic,
    onClose
}) => {
    const [mechanicLocation, setMechanicLocation] = useState<MechanicLocation | null>(null);
    const [eta, setEta] = useState<{ distance: string; duration: string } | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [loading, setLoading] = useState(true);

    // Subscribe to mechanic location updates
    useEffect(() => {
        const unsubscribe = mechanicLocationService.subscribeToMechanic(
            mechanic.id,
            (location) => {
                setMechanicLocation(location);
                updateETA(location);
            }
        );

        // Initial fetch
        mechanicLocationService.getMechanicLocation(mechanic.id).then((location) => {
            if (location) {
                setMechanicLocation(location);
                updateETA(location);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, [mechanic.id]);

    // Update ETA when mechanic location changes
    const updateETA = async (location: MechanicLocation) => {
        if (!booking.customer_location_lat || !booking.customer_location_lng) return;

        const etaData = await customerLocationService.calculateETA(
            { lat: location.latitude, lng: location.longitude },
            { lat: booking.customer_location_lat, lng: booking.customer_location_lng }
        );

        if (etaData) {
            setEta({
                distance: etaData.distanceText,
                duration: etaData.durationText
            });
        }

        // Get directions
        const directionsResult = await customerLocationService.getDirections(
            { lat: location.latitude, lng: location.longitude },
            { lat: booking.customer_location_lat, lng: booking.customer_location_lng }
        );

        if (directionsResult) {
            setDirections(directionsResult);
        }
    };

    const markers: MapMarkerData[] = [];

    // Add mechanic marker
    if (mechanicLocation) {
        markers.push({
            id: 'mechanic',
            position: { lat: mechanicLocation.latitude, lng: mechanicLocation.longitude },
            type: 'mechanic',
            title: mechanic.name,
            subtitle: 'Your Mechanic',
            data: mechanic
        });
    }

    // Add customer marker
    if (booking.customer_location_lat && booking.customer_location_lng) {
        markers.push({
            id: 'customer',
            position: { lat: booking.customer_location_lat, lng: booking.customer_location_lng },
            type: 'customer',
            title: booking.customer_name,
            subtitle: 'Service Location'
        });
    }

    // Calculate map center (midpoint between mechanic and customer)
    const mapCenter = mechanicLocation && booking.customer_location_lat && booking.customer_location_lng
        ? {
            lat: (mechanicLocation.latitude + booking.customer_location_lat) / 2,
            lng: (mechanicLocation.longitude + booking.customer_location_lng) / 2
        }
        : mechanicLocation
            ? { lat: mechanicLocation.latitude, lng: mechanicLocation.longitude }
            : { lat: 14.5995, lng: 120.9842 };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-secondary rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Navigation className="text-primary" size={24} />
                        Track Mechanic
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="text-white" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Map */}
                    <div className="flex-1 relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-dark-gray">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <InteractiveMap
                                center={mapCenter}
                                zoom={14}
                                markers={markers}
                                className="h-full"
                            >
                                {directions && (
                                    <DirectionsRenderer
                                        directions={directions}
                                        options={{
                                            suppressMarkers: true,
                                            polylineOptions: {
                                                strokeColor: '#FE7803',
                                                strokeWeight: 4
                                            }
                                        }}
                                    />
                                )}
                            </InteractiveMap>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 bg-dark-gray p-6 space-y-6 overflow-y-auto">
                        {/* Mechanic Info */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src={mechanic.imageUrl || '/default-avatar.png'}
                                    alt={mechanic.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-white">{mechanic.name}</h3>
                                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                        <span>⭐</span>
                                        <span>{mechanic.rating.toFixed(1)}</span>
                                        <span className="text-gray-400">({mechanic.reviewsCount})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${mechanicLocation?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="text-gray-400">
                                    {mechanicLocation?.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {/* ETA Info */}
                        {eta && (
                            <div className="space-y-3">
                                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-primary mb-2">
                                        <Clock size={20} />
                                        <span className="font-bold">Estimated Arrival</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{eta.duration}</p>
                                    <p className="text-sm text-gray-400">{eta.distance} away</p>
                                </div>
                            </div>
                        )}

                        {/* Service Location */}
                        {booking.customer_location_address && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <MapPin size={18} />
                                    <span className="font-bold text-sm">Service Location</span>
                                </div>
                                <p className="text-white text-sm">{booking.customer_location_address}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={() => window.open(`tel:${mechanic.phone}`, '_self')}
                                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Phone size={20} />
                                Call Mechanic
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>

                        {/* Booking Details */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm">
                            <h4 className="font-bold text-white mb-3">Booking Details</h4>
                            <div className="space-y-2 text-gray-400">
                                <div className="flex justify-between">
                                    <span>Booking ID:</span>
                                    <span className="text-white font-mono">#{booking.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="text-primary font-bold">{booking.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Date:</span>
                                    <span className="text-white">{new Date(booking.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Time:</span>
                                    <span className="text-white">{booking.time}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingMapView;

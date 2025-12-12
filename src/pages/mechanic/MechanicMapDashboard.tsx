import React, { useEffect, useState } from 'react';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { mechanicLocationService } from '../../services/mechanicLocationService';
import { InteractiveMap, MapMarkerData } from '../../components/map/InteractiveMap';
import { Booking } from '../../types';
import { MapPin, Navigation, Power, PowerOff } from 'lucide-react';
import Spinner from '../../components/Spinner';

export const MechanicMapDashboard: React.FC = () => {
    const { mechanic } = useMechanicAuth();
    const { db } = useDatabase();
    const [isTracking, setIsTracking] = useState(false);
    const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // Start/stop location tracking
    const toggleTracking = async () => {
        if (!mechanic) return;

        if (isTracking) {
            await mechanicLocationService.stopTracking(mechanic.id);
            setIsTracking(false);
        } else {
            const result = await mechanicLocationService.startTracking(mechanic.id);
            if (result.success) {
                setIsTracking(true);
            } else {
                alert(result.error || 'Failed to start tracking');
            }
        }
    };

    // Load active bookings
    useEffect(() => {
        if (!mechanic) return;

        const bookings = db.bookings.filter(
            (b) =>
                b.mechanicId === mechanic.id &&
                ['Pending', 'Confirmed', 'In Progress'].includes(b.status) &&
                b.customer_location_lat &&
                b.customer_location_lng
        );

        setActiveBookings(bookings);
        setLoading(false);
    }, [mechanic, db.bookings]);

    // Create markers for customer locations
    const markers: MapMarkerData[] = activeBookings.map((booking) => ({
        id: booking.id,
        position: {
            lat: booking.customer_location_lat!,
            lng: booking.customer_location_lng!
        },
        type: 'customer',
        title: booking.customerName,
        subtitle: booking.customer_location_address || 'Service Location',
        data: booking
    }));

    const handleMarkerClick = (marker: MapMarkerData) => {
        const booking = marker.data as Booking;
        setSelectedBooking(booking);
    };

    const navigateToCustomer = (booking: Booking) => {
        if (!booking.customer_location_lat || !booking.customer_location_lng) return;

        const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.customer_location_lat},${booking.customer_location_lng}`;
        window.open(url, '_blank');
    };

    if (!mechanic) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-secondary">
            {/* Header */}
            <div className="bg-dark-gray border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-primary" />
                        Map Dashboard
                    </h1>

                    {/* Location Tracking Toggle */}
                    <button
                        onClick={toggleTracking}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isTracking
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                    >
                        {isTracking ? (
                            <>
                                <Power size={18} />
                                Tracking On
                            </>
                        ) : (
                            <>
                                <PowerOff size={18} />
                                Start Tracking
                            </>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Active Jobs</p>
                        <p className="text-2xl font-bold text-white">{activeBookings.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-sm font-bold text-green-400">
                            {isTracking ? 'Online' : 'Offline'}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Today's Earnings</p>
                        <p className="text-xl font-bold text-primary">₱0</p>
                    </div>
                </div>
            </div>

            {/* Map and Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Map */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <InteractiveMap
                            markers={markers}
                            onMarkerClick={handleMarkerClick}
                            showUserLocation={isTracking}
                            className="h-full"
                        />
                    )}
                </div>

                {/* Sidebar - Booking List */}
                <div className="w-80 bg-dark-gray border-l border-white/10 overflow-y-auto">
                    <div className="p-4">
                        <h2 className="text-lg font-bold text-white mb-4">Active Bookings</h2>

                        {activeBookings.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                                <p>No active bookings</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className={`bg-white/5 rounded-xl p-4 border cursor-pointer transition-all ${selectedBooking?.id === booking.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-white/10 hover:border-white/20'
                                            }`}
                                        onClick={() => setSelectedBooking(booking)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="font-bold text-white">{booking.customerName}</h3>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(booking.date).toLocaleDateString()} • {booking.time}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${booking.status === 'In Progress'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}
                                            >
                                                {booking.status}
                                            </span>
                                        </div>

                                        {booking.customer_location_address && (
                                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                                                📍 {booking.customer_location_address}
                                            </p>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToCustomer(booking);
                                            }}
                                            className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Navigation size={16} />
                                            Navigate
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            {!isTracking && (
                <div className="bg-yellow-500/10 border-t border-yellow-500/20 p-3 text-center">
                    <p className="text-yellow-400 text-sm">
                        ⚠️ Location tracking is off. Turn it on to let customers see your location.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MechanicMapDashboard;

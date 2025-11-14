import React, { useState, useMemo, useCallback } from 'react';
import HomeLiveMap from '../components/HomeLiveMap';
import { useDatabase } from '../context/DatabaseContext';
import { Mechanic } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const HomeScreen: React.FC = () => {
    const { db } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [availableNowFilter, setAvailableNowFilter] = useState(false);
    const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);

    const customerLocation = (user && user.lat && user.lng) ? { lat: user.lat, lng: user.lng } : null;

    const handleMapClickToBook = useCallback((latlng: { lat: number, lng: number }) => {
        if (window.confirm(`Book a diagnostic service at this location? A nearby mechanic will be assigned.`)) {
            // serviceId for Diagnostics is '3' in mockData
            navigate(`/booking/3`, { state: { serviceLocation: latlng } });
        }
    }, [navigate]);
    
    const handleBookMechanic = useCallback((mechanic: Mechanic) => {
        if (window.confirm(`Book a diagnostic service with ${mechanic.name}? This will use their current location as the service address.`)) {
            // Service ID '3' is for Diagnostics
            navigate('/booking/3', { state: { 
                serviceLocation: { lat: mechanic.lat, lng: mechanic.lng },
                preselectedMechanicId: mechanic.id 
            }});
        }
    }, [navigate]);

    const mechanicsWithAvailability = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        
        const busyMechanicIds = new Set(
            bookings
                .filter(booking => (booking.status === 'Upcoming' || booking.status === 'En Route' || booking.status === 'In Progress') && booking.mechanic && booking.date === todayStr)
                .map(booking => booking.mechanic!.id)
        );
        
        const filteredMechanics = mechanics.filter(mechanic => {
            const isAvailableForWork = (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id);
            if (availableNowFilter && !isAvailableForWork) {
                return false;
            }
            return mechanic.status === 'Active';
        });

        return filteredMechanics.map(mechanic => ({ ...mechanic, isAvailable: (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db, availableNowFilter]);

    return (
        <div className="bg-secondary min-h-full">
            <div className="flex justify-between items-start p-6">
                <div>
                    <p className="text-light-gray">Welcome back,</p>
                    <h1 className="text-4xl font-bold text-white">{user?.name.split(' ')[0]}!</h1>
                </div>
                <NotificationBell />
            </div>

            <div className="px-6 mb-4">
                <div className="flex items-center bg-field rounded-lg px-4 py-2 border border-dark-gray">
                    <input 
                        id="availability-filter" 
                        type="checkbox" 
                        checked={availableNowFilter} 
                        onChange={e => setAvailableNowFilter(e.target.checked)} 
                        className="h-4 w-4 rounded border-gray-500 bg-secondary text-primary focus:ring-primary focus:ring-offset-field"
                    />
                    <label htmlFor="availability-filter" className="ml-3 text-sm font-medium text-white select-none cursor-pointer">Show "Available Today" only</label>
                </div>
            </div>

            <div className="px-6">
                <h2 className="text-xl font-semibold mb-3 text-white">Nearby Mechanics</h2>
                <div className="h-96 w-full rounded-xl shadow-lg overflow-hidden relative z-0">
                   <HomeLiveMap 
                        mechanics={mechanicsWithAvailability} 
                        customerLocation={customerLocation}
                        selectedMechanicId={selectedMechanicId}
                        onMarkerClick={setSelectedMechanicId}
                        onMapClickToBook={handleMapClickToBook}
                        onBookMechanic={handleBookMechanic}
                    />
                </div>
                 <div className="mt-4">
                    <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-3 -mx-6 px-6">
                        {mechanicsWithAvailability.length > 0 ? (
                            mechanicsWithAvailability.map(mechanic => (
                                <div
                                    key={mechanic.id}
                                    onClick={() => setSelectedMechanicId(mechanic.id === selectedMechanicId ? null : mechanic.id)}
                                    className={`flex-shrink-0 w-80 bg-dark-gray p-3 rounded-lg cursor-pointer border-2 transition-all duration-300 ${selectedMechanicId === mechanic.id ? 'border-primary' : 'border-transparent hover:border-field'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0"/>
                                        <div className="flex-grow overflow-hidden">
                                            <p className="font-bold text-white truncate text-lg">{mechanic.name}</p>
                                            <p className="text-sm text-yellow-400">★ {mechanic.rating.toFixed(1)} ({mechanic.reviews} jobs)</p>
                                            {mechanic.isAvailable ? (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                    <p className="text-xs text-green-400 font-semibold">Available Today</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                                                    <p className="text-xs text-gray-500">Unavailable Today</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-light-gray mt-2 pt-2 border-t border-field truncate">
                                        Specializes in: {mechanic.specializations.join(', ')}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="w-full text-center text-light-gray py-4 bg-dark-gray rounded-lg">
                                <p>No mechanics found matching your filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;

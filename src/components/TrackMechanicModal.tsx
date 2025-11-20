import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';

declare const L: any;

// Haversine distance formula to calculate distance between two lat/lng points
const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Function to generate a more realistic, winding route
const generateSimulatedRoute = (start: [number, number], end: [number, number], numPoints: number = 20): [number, number][] => {
    const route: [number, number][] = [start];
    const [startLat, startLng] = start;
    const [endLat, endLng] = end;
    const latDiff = endLat - startLat;
    const lngDiff = endLng - startLng;
    const totalDistance = getDistanceInKm(startLat, startLng, endLat, endLng);
    const wobbleFactor = Math.min(totalDistance * 0.1, 0.005);

    for (let i = 1; i < numPoints; i++) {
        const progress = i / numPoints;
        const interpLat = startLat + latDiff * progress;
        const interpLng = startLng + lngDiff * progress;
        const offsetX = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);
        const offsetY = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);
        route.push([interpLat + offsetX, interpLng + offsetY]);
    }
    route.push(end);
    return route;
};

const calculateRemainingDistance = (route: [number, number][], currentIndex: number): number => {
    let dist = 0;
    for (let i = currentIndex; i < route.length - 1; i++) {
        dist += getDistanceInKm(route[i][0], route[i][1], route[i+1][0], route[i+1][1]);
    }
    return dist;
};

interface TrackMechanicModalProps {
    booking: Booking;
    onClose: () => void;
    onShare: () => void;
    customerLocation: { lat: number; lng: number } | null
}

const TrackMechanicModal: React.FC<TrackMechanicModalProps> = ({ booking, onClose, onShare, customerLocation }) => {
    const { db } = useDatabase();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 'Calculating...', eta: '...' });
    const mechanic = booking.mechanic;
    const destination = customerLocation;
    
    // Refs for simulation
    const simulationIntervalRef = useRef<any>(null);

    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];
    const currentStatusIndex = useMemo(() => {
        const historyStatuses = booking.statusHistory?.map(h => h.status) || [];
        const allStatuses = [...historyStatuses, booking.status];
        
        let highestIndex = -1;
        allStatuses.forEach(status => {
            const indexInTimeline = timelineSteps.indexOf(status as BookingStatus);
            if (indexInTimeline > highestIndex) {
                highestIndex = indexInTimeline;
            }
        });
        return highestIndex;
    }, [booking.status, booking.statusHistory]);


    useEffect(() => {
        if (!mapRef.current || !mechanic || !destination || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current).setView([mechanic.lat, mechanic.lng], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapInstanceRef.current);

        const homeIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 32]
        });
        L.marker([destination.lat, destination.lng], { icon: homeIcon }).addTo(mapInstanceRef.current).bindPopup("Your Location");

        const mechanicIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 32]
        });
        mechanicMarkerRef.current = L.marker([mechanic.lat, mechanic.lng], { icon: mechanicIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>${mechanic.name}</b>`);
        
        const simulatedRoute = generateSimulatedRoute([mechanic.lat, mechanic.lng], [destination.lat, destination.lng]);
        L.polyline(simulatedRoute, { color: '#FE7803', weight: 4, opacity: 0.7 }).addTo(mapInstanceRef.current);

        const bounds = L.latLngBounds(simulatedRoute);
        mapInstanceRef.current.fitBounds(bounds.pad(0.25));

        // Start Simulation
        let currentIndex = 0;
        const totalPoints = simulatedRoute.length;
        
        const updateRouteInfo = (idx: number) => {
            const dist = calculateRemainingDistance(simulatedRoute, idx);
            const etaMins = Math.ceil((dist / 30) * 60); // 30km/h avg speed in city
            setRouteInfo({
                distance: dist < 0.1 ? 'Arrived' : `${dist.toFixed(1)} km`,
                eta: dist < 0.1 ? 'Now' : `${etaMins} min`
            });
        };
        
        updateRouteInfo(0);

        simulationIntervalRef.current = setInterval(() => {
            if (currentIndex < totalPoints - 1) {
                currentIndex++;
                const nextPos = simulatedRoute[currentIndex];
                mechanicMarkerRef.current.setLatLng(nextPos);
                updateRouteInfo(currentIndex);
            } else {
                clearInterval(simulationIntervalRef.current);
            }
        }, 1000); // Update every second

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
            }
        };
    }, [mechanic, destination]);


    if (!mechanic) return null;

    if (!destination) {
         return (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
                <header className="flex items-center justify-between pb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Track Mechanic</h2>
                    <button onClick={onClose} className="text-white text-3xl">&times;</button>
                </header>
                <div className="flex-grow rounded-lg bg-field flex items-center justify-center text-center p-4">
                    <p className="text-light-gray">Customer location data is not available for tracking.</p>
                </div>
                 <footer className="bg-field mt-4 p-4 rounded-lg flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                            <p className="font-bold text-white">{mechanic.name}</p>
                            <p className="text-sm text-yellow-400">⭐ {mechanic.rating} ({mechanic.reviews} jobs)</p>
                        </div>
                    </div>
                </footer>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between pb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Track Mechanic</h2>
                <button onClick={onClose} className="text-white text-3xl">&times;</button>
            </header>

            <div className="bg-field mb-4 p-4 rounded-lg">
                <div className="relative pl-5">
                    {timelineSteps.map((step, index) => {
                        const isCompleted = index <= currentStatusIndex;
                        const historyEntry = booking.statusHistory?.find(h => h.status === step);
                        return (
                            <div key={step} className={`relative pb-4 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                                {index < timelineSteps.length - 1 && <div className={`absolute top-2.5 left-[3px] w-0.5 h-full ${isCompleted && index < currentStatusIndex ? 'bg-primary' : 'bg-dark-gray'}`}></div>}
                                <div className="flex items-start">
                                    <div className={`-left-2 absolute w-2 h-2 rounded-full mt-[7px] ${isCompleted ? 'bg-primary ring-4 ring-primary/20' : 'bg-dark-gray'}`}></div>
                                    <div className="ml-4">
                                        <p className={`font-semibold text-xs ${isCompleted ? 'text-white' : 'text-gray-500'}`}>{step}</p>
                                        <p className="text-[10px] text-gray-400">{historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div ref={mapRef} className="flex-grow rounded-lg" />

            <footer className="bg-field mt-4 p-4 rounded-lg flex-shrink-0">
                 <div className="flex justify-between items-center text-center mb-3">
                    <div>
                        <p className="text-xs text-light-gray">ETA</p>
                        <p className="text-lg text-primary font-bold">{routeInfo.eta}</p>
                    </div>
                    <div>
                        <p className="text-xs text-light-gray">DISTANCE</p>
                        <p className="text-lg text-white font-bold">{routeInfo.distance}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-3 border-t border-dark-gray pt-3">
                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-grow">
                        <p className="font-bold text-white">{mechanic.name}</p>
                        <p className="text-sm text-yellow-400">⭐ {mechanic.rating} ({mechanic.reviews} jobs)</p>
                    </div>
                     <button onClick={onShare} className="bg-secondary text-white p-3 rounded-full hover:bg-gray-600 transition" aria-label="Share tracking link">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default TrackMechanicModal;
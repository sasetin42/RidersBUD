import React, { useEffect, useRef, useState } from 'react';
import { Booking, Customer } from '../../types';

declare const L: any;

interface DirectionsModalProps {
    booking: Booking;
    customer: Customer;
    onClose: () => void;
}

// Haversine distance formula
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
const generateSimulatedRoute = (start: [number, number], end: [number, number], numPoints: number = 15): [number, number][] => {
    const route: [number, number][] = [start];
    const [startLat, startLng] = start;
    const [endLat, endLng] = end;
    const latDiff = endLat - startLat;
    const lngDiff = endLng - startLng;

    // Determine the "wobble" factor based on distance to make it look more natural
    const totalDistance = getDistanceInKm(startLat, startLng, endLat, endLng);
    const wobbleFactor = Math.min(totalDistance * 0.01, 0.01); // Cap the wobble

    for (let i = 1; i < numPoints; i++) {
        const progress = i / numPoints;
        const interpLat = startLat + latDiff * progress;
        const interpLng = startLng + lngDiff * progress;

        // Add a random perpendicular offset to create a curve
        const offsetX = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);
        const offsetY = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);

        route.push([interpLat + offsetX, interpLng + offsetY]);
    }

    route.push(end);
    return route;
};

// Calculate the total distance of a route made of multiple segments
const calculateTotalDistance = (points: [number, number][]): number => {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += getDistanceInKm(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
    }
    return totalDistance;
};

const DirectionsModal: React.FC<DirectionsModalProps> = ({ booking, customer, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, eta: 0 });

    const mechanic = booking.mechanic;
    const mechanicLat = mechanic?.lat;
    const mechanicLng = mechanic?.lng;
    const customerLat = customer?.lat;
    const customerLng = customer?.lng;

    useEffect(() => {
        if (!mapRef.current || !mechanicLat || !mechanicLng || !customerLat || !customerLng || mapInstanceRef.current || typeof L === 'undefined') return;

        const mechanicStartPos: [number, number] = [mechanicLat, mechanicLng];
        const customerPos: [number, number] = [customerLat, customerLng];

        // Generate the simulated winding route
        const simulatedRoute = generateSimulatedRoute(mechanicStartPos, customerPos);
        
        mapInstanceRef.current = L.map(mapRef.current).setView(mechanicStartPos, 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapInstanceRef.current);

        const customerIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
        });
        L.marker(customerPos, { icon: customerIcon }).addTo(mapInstanceRef.current).bindPopup("Customer Location");
        
        const mechanicIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
            className: 'bg-transparent border-0', iconSize: [32, 32], iconAnchor: [16, 32]
        });
        const localMechanicMarker = L.marker(mechanicStartPos, { icon: mechanicIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>Your Location</b>`);

        // Draw the new, winding route
        L.polyline(simulatedRoute, { color: '#FE7803', weight: 4, opacity: 0.7 }).addTo(mapInstanceRef.current);

        const bounds = L.latLngBounds(simulatedRoute);
        mapInstanceRef.current.fitBounds(bounds.pad(0.2));

        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 400);

        // --- Simulation Logic ---
        let currentRouteIndex = 0;
        const simulationSpeed = 0.15; // Represents the fraction of the segment to travel each interval

        const simulationInterval = setInterval(() => {
            if (currentRouteIndex >= simulatedRoute.length - 1) {
                clearInterval(simulationInterval);
                localMechanicMarker.setLatLng(customerPos);
                setRouteInfo({ distance: 0, eta: 0 });
                return;
            }

            const currentPos = localMechanicMarker.getLatLng();
            const targetPoint = simulatedRoute[currentRouteIndex + 1];
            
            const newLat = currentPos.lat + (targetPoint[0] - currentPos.lat) * simulationSpeed;
            const newLng = currentPos.lng + (targetPoint[1] - currentPos.lng) * simulationSpeed;
            localMechanicMarker.setLatLng([newLat, newLng]);

            // If we are close to the next point, snap to it and advance the index
            const distanceToNextPoint = getDistanceInKm(newLat, newLng, targetPoint[0], targetPoint[1]);
            if (distanceToNextPoint < 0.05) { // 50 meters threshold
                currentRouteIndex++;
            }

            // Calculate remaining distance
            const distanceOfRemainingRoute = calculateTotalDistance([[newLat, newLng], ...simulatedRoute.slice(currentRouteIndex + 1)]);

            // Assuming average speed of 40 km/h for ETA calculation
            const eta = Math.ceil((distanceOfRemainingRoute / 40) * 60);

            setRouteInfo({ distance: distanceOfRemainingRoute, eta });

        }, 1000); // Update every second

        return () => {
            clearInterval(simulationInterval);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mechanicLat, mechanicLng, customerLat, customerLng]);

    return (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-sm flex flex-col z-50 animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 flex items-center justify-between p-4 bg-[#1D1D1D]/80 border-b border-dark-gray">
                <h2 className="text-xl font-bold text-white">Live Directions</h2>
                <button onClick={onClose} className="text-primary" aria-label="Close directions">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>
            <div className="flex-grow p-4">
                <div ref={mapRef} className="h-full w-full rounded-lg" />
            </div>
            <footer className="flex-shrink-0 p-4">
                <div className="bg-[#1D1D1D]/80 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                         <p className="font-bold text-primary text-lg">
                           {routeInfo.eta > 1 ? `Est. Arrival: ${routeInfo.eta} mins` : routeInfo.eta === 1 ? `Est. Arrival: ~1 min` : 'Arriving now'}
                        </p>
                        <p className="text-sm text-light-gray font-mono">
                            {routeInfo.distance.toFixed(1)} km
                        </p>
                    </div>
                    <div className="border-t border-dark-gray pt-3 mt-3">
                        <p className="font-bold text-lg text-white">{customer.name}</p>
                        <p className="text-sm text-light-gray">{booking.service.name} for {booking.vehicle.make} {booking.vehicle.model}</p>
                        <p className="text-sm text-light-gray">Appointment: {booking.time}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DirectionsModal;
import React, { useEffect, useRef } from 'react';
import { Booking, Customer } from '../../types';

declare const L: any;

interface DirectionsModalProps {
    booking: Booking;
    customer: Customer;
    onClose: () => void;
}

const DirectionsModal: React.FC<DirectionsModalProps> = ({ booking, customer, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);

    const mechanic = booking.mechanic;

    const mechanicLat = mechanic?.lat;
    const mechanicLng = mechanic?.lng;
    const customerLat = customer?.lat;
    const customerLng = customer?.lng;

    useEffect(() => {
        if (!mapRef.current || !mechanicLat || !mechanicLng || !customerLat || !customerLng || mapInstanceRef.current || typeof L === 'undefined') return;

        const mechanicPos: [number, number] = [mechanicLat, mechanicLng];
        const customerPos: [number, number] = [customerLat, customerLng];

        mapInstanceRef.current = L.map(mapRef.current).setView(mechanicPos, 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapInstanceRef.current);

        const customerIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        L.marker(customerPos, { icon: customerIcon }).addTo(mapInstanceRef.current).bindPopup("Customer Location");
        
        const mechanicIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
            className: 'bg-transparent border-0', 
            iconSize: [32, 32], 
            iconAnchor: [16, 32]
        });
        mechanicMarkerRef.current = L.marker(mechanicPos, { icon: mechanicIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>Your Location</b>`);

        const bounds = L.latLngBounds([customerPos, mechanicPos]);
        mapInstanceRef.current.fitBounds(bounds.pad(0.3));

        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 400);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!customerLat || !customerLng) return;
        
        const interval = setInterval(() => {
            if (!mechanicMarkerRef.current) return;
            const currentPos = mechanicMarkerRef.current.getLatLng();
            const destinationPos = { lat: customerLat, lng: customerLng };
            const distance = Math.sqrt(Math.pow(destinationPos.lat - currentPos.lat, 2) + Math.pow(destinationPos.lng - currentPos.lng, 2));

            if (distance < 0.0001) {
                clearInterval(interval);
                return;
            }
            
            const newLat = currentPos.lat + (destinationPos.lat - currentPos.lat) * 0.1;
            const newLng = currentPos.lng + (destinationPos.lng - currentPos.lng) * 0.1;

            mechanicMarkerRef.current.setLatLng([newLat, newLng]);
        }, 1500);

        return () => clearInterval(interval);
    }, [customerLat, customerLng]);

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
                        <p className="font-bold text-primary">Est. Arrival: 5 mins</p>
                        <p className="text-sm text-light-gray">1.2 km</p>
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

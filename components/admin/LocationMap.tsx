import React, { useEffect, useRef } from 'react';

declare const L: any;

interface LocationMapProps {
    latitude: number;
    longitude: number;
    popupText: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ latitude, longitude, popupText }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstance.current || typeof L === 'undefined' || !latitude || !longitude) return;

        mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(mapInstance.current);

        const icon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>`,
            className: 'bg-transparent border-0',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        L.marker([latitude, longitude], { icon }).addTo(mapInstance.current).bindPopup(popupText);
        
        // Invalidate size after modal animation to prevent gray tiles
        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 400);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [latitude, longitude, popupText]);

    return <div ref={mapRef} className="h-48 w-full rounded-lg" />;
};

export default LocationMap;


import React, { useEffect, useRef, useState } from 'react';
import { Mechanic } from '../../types';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

// SVG for map pins
const greenPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%2328a745"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;
const redPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%23dc3545"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;

interface LiveMapProps {
    mechanics: Mechanic[];
}

const LiveMap: React.FC<LiveMapProps> = ({ mechanics }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<{ [key: string]: any }>({});
    const [mechanicsWithPositions, setMechanicsWithPositions] = useState(mechanics);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || !L) return;

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [14.58, 121.05],
            zoom: 12,
            zoomControl: true,
            dragging: true,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
        
        const markerClusterGroup = L.markerClusterGroup();

        const greenIcon = L.icon({
            iconUrl: `data:image/svg+xml;charset=UTF-8,${greenPinSvg}`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });

        const redIcon = L.icon({
            iconUrl: `data:image/svg+xml;charset=UTF-8,${redPinSvg}`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });

        mechanicsWithPositions.forEach(mechanic => {
            const { lat, lng, id, name, rating } = mechanic;
            const markerIcon = mechanic.isAvailable ? greenIcon : redIcon;
            
            const marker = L.marker([lat, lng], { icon: markerIcon });
            marker.bindPopup(`<b>${name}</b><br>Rating: ${rating} ⭐`);
            
            markerClusterGroup.addLayer(marker);
            markersRef.current[id] = marker;
        });

        mapInstanceRef.current.addLayer(markerClusterGroup);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setMechanicsWithPositions(prevMechanics => {
                return prevMechanics.map(mechanic => {
                    const newLat = mechanic.lat + (Math.random() - 0.5) * 0.0005;
                    const newLng = mechanic.lng + (Math.random() - 0.5) * 0.0005;
                    
                    const marker = markersRef.current[mechanic.id];
                    if (marker) {
                        marker.setLatLng([newLat, newLng]);
                    }

                    return { ...mechanic, lat: newLat, lng: newLng };
                });
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return <div ref={mapRef} style={{ height: '450px', borderRadius: '8px' }} />;
};

export default LiveMap;

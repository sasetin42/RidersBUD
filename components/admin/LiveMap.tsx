import React, { useEffect, useRef } from 'react';
import { Mechanic, Settings } from '../../types';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

// SVG for default map pins
const greenPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%2328a745"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;
const redPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%23dc3545"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;

// Fix: Define a local type that includes the dynamically added 'isAvailable' property.
type MappedMechanic = Mechanic & { isAvailable?: boolean };

interface LiveMapProps {
    mechanics: MappedMechanic[];
    settings: Settings;
    onViewProfile: (mechanicId: string) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ mechanics, settings, onViewProfile }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null); // To hold the cluster group
    const markersRef = useRef<{ [key: string]: any }>({}); // To hold individual markers for updates

    // 1. Initialize map on component mount
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || !L) return;

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [14.58, 121.05],
            zoom: 12,
            zoomControl: true,
            dragging: true,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(mapInstanceRef.current);
        
        markersLayerRef.current = L.markerClusterGroup();
        mapInstanceRef.current.addLayer(markersLayerRef.current);

        mapInstanceRef.current.on('popupopen', (e: any) => {
            const popupNode = e.popup.getElement();
            const viewProfileBtn = popupNode.querySelector('.view-profile-btn');
            if (viewProfileBtn) {
                // Use L.DomEvent to handle the click without closing the popup
                L.DomEvent.on(viewProfileBtn, 'click', (ev: any) => {
                    L.DomEvent.stop(ev); // Prevent the map from handling the click
                    const mechanicId = ev.target.dataset.mechanicId;
                    if (mechanicId) {
                        onViewProfile(mechanicId);
                    }
                });
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // 2. Sync markers with mechanics prop
    useEffect(() => {
        if (!markersLayerRef.current) return;

        const availablePinIcon = L.icon({
            iconUrl: `data:image/svg+xml;charset=UTF-8,${greenPinSvg}`,
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
        });
        const unavailablePinIcon = L.icon({
            iconUrl: `data:image/svg+xml;charset=UTF-8,${redPinSvg}`,
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
        });

        const mechanicIds = new Set(mechanics.map(m => m.id));

        // Remove markers for mechanics no longer present
        Object.keys(markersRef.current).forEach(markerId => {
            if (!mechanicIds.has(markerId)) {
                markersLayerRef.current.removeLayer(markersRef.current[markerId]);
                delete markersRef.current[markerId];
            }
        });
        
        // Add or update markers for each mechanic
        mechanics.forEach(mechanic => {
            const isAvailable = mechanic.isAvailable ?? false;
            let icon;

            if (mechanic.imageUrl) {
                 const iconHtml = `
                    <div class="custom-marker-container">
                        <img src="${mechanic.imageUrl}" class="custom-marker-image ${!isAvailable ? 'unavailable' : ''}" alt="${mechanic.name}" />
                    </div>`;
                icon = L.divIcon({
                    html: iconHtml,
                    className: 'custom-marker-div-icon',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -18],
                });
            } else {
                icon = isAvailable ? availablePinIcon : unavailablePinIcon;
            }
            
            const popupContent = `
                <div style="font-family: 'Poppins', sans-serif; color: #333; width: 160px;">
                    <img src="${mechanic.imageUrl}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" alt="${mechanic.name}" />
                    <h3 style="font-weight: 700; font-size: 1rem; margin: 0 0 4px;">${mechanic.name}</h3>
                    <p style="font-size: 0.75rem; color: #666; margin: 0;">${mechanic.specializations.slice(0, 2).join(', ')}</p>
                    <p style="font-size: 0.75rem; color: #f59e0b; font-weight: 600; margin: 4px 0;">⭐ ${mechanic.rating.toFixed(1)} (${mechanic.reviews} jobs)</p>
                    <button class="view-profile-btn" data-mechanic-id="${mechanic.id}" style="margin-top: 8px; font-size: 0.75rem; background-color: #FE7803; color: white; font-weight: 700; padding: 4px 8px; border-radius: 4px; width: 100%; border: none; cursor: pointer;">
                        View Profile
                    </button>
                </div>
            `;
            
            const marker = markersRef.current[mechanic.id];
            
            if (marker) {
                marker.setIcon(icon);
                marker.setLatLng([mechanic.lat, mechanic.lng]);
                marker.getPopup().setContent(popupContent);
            } else {
                const newMarker = L.marker([mechanic.lat, mechanic.lng], { icon: icon });
                newMarker.bindPopup(popupContent);
                markersLayerRef.current.addLayer(newMarker);
                markersRef.current[mechanic.id] = newMarker;
            }
        });
    }, [mechanics, settings.mechanicMarkerUrl, onViewProfile]);

    // 3. Simulate live movement for existing markers
    useEffect(() => {
        const interval = setInterval(() => {
            Object.values(markersRef.current).forEach((marker: any) => {
                 if (Math.random() < 0.2) { // Only move some markers for a more realistic simulation
                    const latlng = marker.getLatLng();
                    const newLat = latlng.lat + (Math.random() - 0.5) * 0.0005;
                    const newLng = latlng.lng + (Math.random() - 0.5) * 0.0005;
                    marker.setLatLng([newLat, newLng]);
                 }
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return <div ref={mapRef} style={{ height: '100%', minHeight: '400px', borderRadius: '8px', width: '100%' }} />;
};

export default LiveMap;
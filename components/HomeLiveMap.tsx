import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mechanic } from '../types';

declare const L: any;

// A type that includes the dynamically added 'isAvailable' property
type MappedMechanic = Mechanic & { isAvailable: boolean };

interface HomeLiveMapProps {
    mechanics: MappedMechanic[];
}

const HomeLiveMap: React.FC<HomeLiveMapProps> = ({ mechanics }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null); // To hold the cluster group
    const markersRef = useRef<{ [key: string]: any }>({}); // To hold individual markers for updates
    const navigate = useNavigate();

    // 1. Initialize map on component mount
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [14.58, 121.05], // Centered on Metro Manila
            zoom: 12,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(mapInstanceRef.current);
        
        markersLayerRef.current = L.markerClusterGroup({
             iconCreateFunction: function (cluster: any) {
                return L.divIcon({
                    html: `<div><span>${cluster.getChildCount()}</span></div>`,
                    className: 'marker-cluster-ridersbud',
                    iconSize: L.point(40, 40, true),
                });
            },
        });
        mapInstanceRef.current.addLayer(markersLayerRef.current);

        // Add a single, persistent event listener to the map for popup events
        mapInstanceRef.current.on('popupopen', (e: any) => {
            const popupNode = e.popup.getElement();
            const viewProfileBtn = popupNode.querySelector('.view-profile-btn');
            if (viewProfileBtn) {
                // Use L.DomEvent to handle the click without closing the popup
                L.DomEvent.on(viewProfileBtn, 'click', (ev: any) => {
                    L.DomEvent.stop(ev); // Prevent the map from handling the click
                    const mechanicId = ev.target.dataset.mechanicId;
                    if (mechanicId) {
                        navigate(`/mechanic-profile/${mechanicId}`);
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
    }, [navigate]);

    // 2. Sync markers with mechanics prop
    useEffect(() => {
        if (!markersLayerRef.current || !mechanics) return;
        
        const mechanicIds = new Set(mechanics.map(m => m.id));

        // Remove markers for mechanics no longer present
        Object.keys(markersRef.current).forEach(markerId => {
            if (!mechanicIds.has(markerId)) {
                markersLayerRef.current.removeLayer(markersRef.current[markerId]);
                delete markersRef.current[markerId];
            }
        });

        // Add or update markers
        mechanics.forEach(mechanic => {
            const isAvailable = mechanic.isAvailable;
            
             const animationClass = isAvailable ? 'pulse-green' : '';
            const iconHtml = `
                <div class="custom-marker-container ${animationClass}">
                    <img src="${mechanic.imageUrl}" class="custom-marker-image ${!isAvailable ? 'unavailable' : ''}" alt="${mechanic.name}" />
                </div>`;
                
            const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-marker-div-icon',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -18],
            });

            const popupContent = `
                <div class="ridersbud-popup-inner">
                    <img src="${mechanic.imageUrl}" class="ridersbud-popup-img" alt="${mechanic.name}" />
                    <h3 class="ridersbud-popup-name">${mechanic.name}</h3>
                    <p class="ridersbud-popup-spec">${mechanic.specializations.slice(0, 2).join(', ')}</p>
                    <p class="ridersbud-popup-rating">⭐ ${mechanic.rating.toFixed(1)} (${mechanic.reviews} jobs)</p>
                    <button class="view-profile-btn ridersbud-popup-btn" data-mechanic-id="${mechanic.id}">
                        View Profile
                    </button>
                </div>
            `;
            
            const popupOptions = { className: 'ridersbud-popup' };
            const marker = markersRef.current[mechanic.id];
            
            if (marker) {
                marker.setLatLng([mechanic.lat, mechanic.lng]);
                marker.setIcon(icon);
                marker.unbindPopup().bindPopup(popupContent, popupOptions);
            } else {
                const newMarker = L.marker([mechanic.lat, mechanic.lng], { icon: icon });
                newMarker.bindPopup(popupContent, popupOptions);
                markersLayerRef.current.addLayer(newMarker);
                markersRef.current[mechanic.id] = newMarker;
            }
        });

    }, [mechanics]);

    return <div ref={mapRef} className="h-full w-full rounded-xl" />;
};

export default HomeLiveMap;
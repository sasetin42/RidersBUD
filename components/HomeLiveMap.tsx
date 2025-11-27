import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mechanic } from '../types';

declare const L: any;

// A type that includes the dynamically added 'isAvailable' property
type MappedMechanic = Mechanic & { isAvailable: boolean };

interface HomeLiveMapProps {
    mechanics: MappedMechanic[];
    customerLocation: { lat: number, lng: number } | null;
    selectedMechanicId: string | null;
    onMarkerClick: (mechanicId: string | null) => void;
    onMapClickToBook: (latlng: { lat: number, lng: number }) => void;
    onBookMechanic: (mechanic: MappedMechanic) => void;
}

const HomeLiveMap: React.FC<HomeLiveMapProps> = ({ mechanics, customerLocation, selectedMechanicId, onMarkerClick, onMapClickToBook, onBookMechanic }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null); // To hold the cluster group
    const markersRef = useRef<{ [key: string]: any }>({}); // To hold individual markers for updates
    const navigate = useNavigate();

    // Use refs for props and callbacks to prevent stale closures in Leaflet event handlers
    const onMarkerClickRef = useRef(onMarkerClick);
    onMarkerClickRef.current = onMarkerClick;
    const onMapClickToBookRef = useRef(onMapClickToBook);
    onMapClickToBookRef.current = onMapClickToBook;
    const onBookMechanicRef = useRef(onBookMechanic);
    onBookMechanicRef.current = onBookMechanic;
    const mechanicsRef = useRef(mechanics);
    mechanicsRef.current = mechanics;

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [14.58, 121.05], // Centered on Metro Manila
            zoom: 12,
            zoomControl: true,
            scrollWheelZoom: false,
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
        
        const mapClickHandler = (e: any) => {
             // Ignore clicks on markers as they have their own handlers
            if (e.originalEvent.target.closest('.leaflet-marker-pane')) {
                return;
            }
             // Deselect any active marker
            onMarkerClickRef.current(null);

            // Directly call the booking handler from props using a ref
            onMapClickToBookRef.current(e.latlng);
        };
        mapInstanceRef.current.on('click', mapClickHandler);

        const popupOpenHandler = (e: any) => {
            const popupNode = e.popup.getElement();
            const viewProfileBtn = popupNode.querySelector('.view-profile-btn');
            if (viewProfileBtn) {
                L.DomEvent.on(viewProfileBtn, 'click', (ev: any) => {
                    L.DomEvent.stop(ev);
                    const mechanicId = ev.target.dataset.mechanicId;
                    if (mechanicId) navigate(`/mechanic-profile/${mechanicId}`);
                });
            }
            // Add handler for new "Book Diagnostic" button
            const bookBtn = popupNode.querySelector('.book-diagnostic-btn');
            if (bookBtn) {
                 L.DomEvent.on(bookBtn, 'click', (ev: any) => {
                    L.DomEvent.stop(ev);
                    const mechanicId = ev.target.dataset.mechanicId;
                    const mechanic = mechanicsRef.current.find(m => m.id === mechanicId);
                    if (mechanic) {
                        onBookMechanicRef.current(mechanic);
                    }
                });
            }
        };
        mapInstanceRef.current.on('popupopen', popupOpenHandler);

        return () => {
            if (mapInstanceRef.current) {
                // Remove event listeners before destroying the map
                mapInstanceRef.current.off('click', mapClickHandler);
                mapInstanceRef.current.off('popupopen', popupOpenHandler);

                // Explicitly clear layers and remove the map instance
                if (markersLayerRef.current) {
                    markersLayerRef.current.clearLayers();
                    mapInstanceRef.current.removeLayer(markersLayerRef.current);
                }
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            // Clear refs
            markersLayerRef.current = null;
            markersRef.current = {};
        };
    }, [navigate]); // navigate is stable, so this effect runs only once.

    useEffect(() => {
        if (!markersLayerRef.current || !mechanics) return;
        
        const mechanicIds = new Set(mechanics.map(m => m.id));

        Object.keys(markersRef.current).forEach(markerId => {
            if (!mechanicIds.has(markerId)) {
                if(markersRef.current[markerId]) {
                    markersLayerRef.current.removeLayer(markersRef.current[markerId]);
                }
                delete markersRef.current[markerId];
            }
        });

        mechanics.forEach(mechanic => {
            const isAvailable = mechanic.isAvailable;
            const isSelected = mechanic.id === selectedMechanicId;
            
            const animationClass = isAvailable ? 'pulse-green' : '';
            const selectedClass = isSelected ? 'selected' : '';
            const iconHtml = `
                <div class="custom-marker-container ${animationClass} ${selectedClass}">
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
                    <img src="${mechanic.imageUrl}" alt="${mechanic.name}" class="ridersbud-popup-img" />
                    <h3 class="ridersbud-popup-name">${mechanic.name}</h3>
                    <p class="ridersbud-popup-spec">${mechanic.specializations.slice(0, 2).join(' & ')}</p>
                    <p class="ridersbud-popup-rating">★ ${mechanic.rating.toFixed(1)}</p>
                    <button class="view-profile-btn ridersbud-popup-btn" data-mechanic-id="${mechanic.id}">
                        View Profile
                    </button>
                    <button class="book-diagnostic-btn ridersbud-popup-btn" data-mechanic-id="${mechanic.id}" style="background-color: #3b82f6; margin-top: 4px;">
                        Book Diagnostic
                    </button>
                </div>
            `;
            
            const popupOptions = { className: 'ridersbud-popup' };
            const marker = markersRef.current[mechanic.id];
            
            if (marker) {
                marker.setLatLng([mechanic.lat, mechanic.lng]);
                marker.setIcon(icon);
                // Only bind if content changed or not bound (simplified here to rebind)
                if (marker.getPopup()) {
                    marker.setPopupContent(popupContent);
                } else {
                    marker.bindPopup(popupContent, popupOptions);
                }
            } else {
                const newMarker = L.marker([mechanic.lat, mechanic.lng], { icon: icon });
                newMarker.bindPopup(popupContent, popupOptions);
                
                newMarker.on('click', (e: any) => {
                    L.DomEvent.stop(e);
                    onMarkerClickRef.current(mechanic.id);
                });

                markersLayerRef.current.addLayer(newMarker);
                markersRef.current[mechanic.id] = newMarker;
            }
        });

        if (selectedMechanicId && markersRef.current[selectedMechanicId] && mapInstanceRef.current && markersLayerRef.current) {
            const marker = markersRef.current[selectedMechanicId];
            const latLng = marker.getLatLng();
            markersLayerRef.current.zoomToShowLayer(marker, () => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView(latLng, 15, { animate: true, pan: { duration: 0.5 }});
                    if (!marker.isPopupOpen()) {
                        marker.openPopup();
                    }
                }
            });
        }

    }, [mechanics, customerLocation, selectedMechanicId]);

    // Simulate live movement for available mechanics
    useEffect(() => {
        const interval = setInterval(() => {
            Object.keys(markersRef.current).forEach(key => {
                const marker = markersRef.current[key];
                // Only move if available (implied by existence in filtered mechanics list) and random chance
                // To check availability strictly we'd need to look up the mechanic again, but for visual flair random is okay
                if (marker && Math.random() > 0.7) { 
                     const latLng = marker.getLatLng();
                     // Small random jitter
                     const newLat = latLng.lat + (Math.random() - 0.5) * 0.0001; 
                     const newLng = latLng.lng + (Math.random() - 0.5) * 0.0001;
                     marker.setLatLng([newLat, newLng]);
                }
            });
        }, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, []);

    return <div ref={mapRef} className="h-full w-full" />;
};

export default HomeLiveMap;
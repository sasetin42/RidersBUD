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
    const customerMarkerRef = useRef<any>(null);
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

    const [retryTrigger, setRetryTrigger] = React.useState(0);
    const [leafletLoaded, setLeafletLoaded] = React.useState(typeof window !== 'undefined' && !!(window as any).L);

    useEffect(() => {
        if (leafletLoaded) return;
        const interval = setInterval(() => {
            if ((window as any).L) {
                setLeafletLoaded(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [leafletLoaded]);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || typeof L === 'undefined') return;

        if (!L.MarkerClusterGroup) {
            const timer = setTimeout(() => {
                setRetryTrigger(prev => prev + 1);
            }, 100);
            return () => clearTimeout(timer);
        }

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [14.58, 121.05], // Centered on Metro Manila
            zoom: 12,
            zoomControl: true,
            scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(mapInstanceRef.current);


        markersLayerRef.current = new L.MarkerClusterGroup({
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            iconCreateFunction: function (cluster: any) {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `<div class="rb-cluster-badge">${count}</div>`,
                    className: 'rb-leaflet-icon',
                    iconSize: L.point(56, 56, true),
                    iconAnchor: L.point(28, 28),
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
                    if (mechanicId) navigate(`/customer-portal/mechanic-profile/${mechanicId}`);
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
    }, [navigate, retryTrigger, leafletLoaded]); // rerun if retryTrigger or leafletLoaded changes to retry initialization

    useEffect(() => {
        if (!markersLayerRef.current || !mechanics) return;

        const mechanicIds = new Set(mechanics.map(m => m.id));

        Object.keys(markersRef.current).forEach(markerId => {
            if (!mechanicIds.has(markerId)) {
                if (markersRef.current[markerId]) {
                    markersLayerRef.current.removeLayer(markersRef.current[markerId]);
                }
                delete markersRef.current[markerId];
            }
        });

        mechanics.forEach(mechanic => {
            const isAvailable = mechanic.isAvailable;
            const isSelected = mechanic.id === selectedMechanicId;

            const pulseClass = isAvailable ? 'pulse-available' : '';
            const selectedClass = isSelected ? 'selected' : '';
            const unavailableClass = !isAvailable ? 'unavailable' : '';

            const iconHtml = `
                <div class="rb-map-pin-wrapper ${pulseClass}">
                    <div class="rb-pin-circle ${selectedClass} ${unavailableClass}">
                        <img src="${mechanic.imageUrl || '/riders-logo.png'}" alt="${mechanic.name}" />
                    </div>
                    <div class="rb-pin-stem"></div>
                    <div class="rb-pin-dot"></div>
                </div>`;

            const icon = L.divIcon({
                html: iconHtml,
                className: 'rb-leaflet-icon',
                iconSize: [56, 72],
                iconAnchor: [28, 72],
                popupAnchor: [0, -74],
            });

            const availBadge = isAvailable
                ? `<span style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);padding:2px 8px;border-radius:99px;font-size:9px;font-weight:900;letter-spacing:0.08em;">● AVAILABLE</span>`
                : `<span style="background:rgba(255,255,255,0.06);color:#6b7280;border:1px solid rgba(255,255,255,0.08);padding:2px 8px;border-radius:99px;font-size:9px;font-weight:900;letter-spacing:0.08em;">BUSY</span>`;

            const popupContent = `
                <div class="ridersbud-popup-inner" style="padding:16px;min-width:210px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <img src="${mechanic.imageUrl || '/riders-logo.png'}" alt="${mechanic.name}"
                            style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #FE7803;flex-shrink:0;" />
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:900;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;">${mechanic.name}</div>
                            ${availBadge}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="color:#FE7803;font-size:12px;">★</span>
                        <span style="font-weight:900;color:#fff;font-size:12px;">${mechanic.rating.toFixed(1)}</span>
                        <span style="color:#4b5563;font-size:10px;">&bull;</span>
                        <span style="color:#9ca3af;font-size:10px;">${mechanic.specializations.slice(0, 2).join(' / ')}</span>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button class="view-profile-btn ridersbud-popup-btn" data-mechanic-id="${mechanic.id}"
                            style="flex:1;padding:8px 4px;font-size:10px;font-weight:800;border-radius:10px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.1);cursor:pointer;">
                            View Profile
                        </button>
                        <button class="book-diagnostic-btn ridersbud-popup-btn" data-mechanic-id="${mechanic.id}"
                            style="flex:1;padding:8px 4px;font-size:10px;font-weight:800;border-radius:10px;background:#FE7803;color:#fff;border:none;cursor:pointer;">
                            Book Now
                        </button>
                    </div>
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

        // Customer Location marker (clean real-time live pin without obtrusive radius circle)
        if (customerLocation && mapInstanceRef.current) {
            const nextPos: [number, number] = [customerLocation.lat, customerLocation.lng];
            if (!customerMarkerRef.current) {
                const userIcon = L.divIcon({
                    html: `
                        <div class="rb-user-location-marker">
                            <div class="rb-user-location-pulse"></div>
                            <div class="rb-user-location-core"></div>
                        </div>
                    `,
                    className: 'rb-leaflet-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                });
                customerMarkerRef.current = L.marker(nextPos, { icon: userIcon }).addTo(mapInstanceRef.current);
            } else {
                const prevPos = customerMarkerRef.current.getLatLng();
                // Skip sub-meter sensor noise so the live pin doesn't shimmer
                if (Math.abs(prevPos.lat - nextPos[0]) > 1e-6 || Math.abs(prevPos.lng - nextPos[1]) > 1e-6) {
                    customerMarkerRef.current.setLatLng(nextPos);
                }
            }
        }

        if (selectedMechanicId && markersRef.current[selectedMechanicId] && mapInstanceRef.current && markersLayerRef.current) {
            const marker = markersRef.current[selectedMechanicId];
            const latLng = marker.getLatLng();
            markersLayerRef.current.zoomToShowLayer(marker, () => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView(latLng, 15, { animate: true, pan: { duration: 0.5 } });
                    if (!marker.isPopupOpen()) {
                        marker.openPopup();
                    }
                }
            });
        }

    }, [mechanics, customerLocation, selectedMechanicId]);

    // NOTE: Mechanic pins are driven exclusively by the realtime Firestore stream
    // (db.mechanics → updateMechanicLocation). A previous "simulated movement" timer
    // that jittered markers randomly every 2s was removed so positions stay truthful
    // and consistent with the tracking maps.

    return <div ref={mapRef} className="h-full w-full" />;
};

export default HomeLiveMap;

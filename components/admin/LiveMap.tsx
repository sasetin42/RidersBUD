import React, { useEffect, useRef } from 'react';
import { Mechanic, Settings, Booking } from '../../types';
import { rtdb } from '../../firebase';
import { ref, onValue, off } from 'firebase/database';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

// SVG for default map pins
const greenPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%2328a745"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;
const redPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%23dc3545"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;
const bluePinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="%233b82f6"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 256c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64-64 28.654 64 64 64z"/></svg>`;

// Google Maps Distance Matrix API key (same key used for map rendering)
const GMAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

// Fetch real driving ETA from Google Maps Distance Matrix API
const fetchGoogleMapsETA = async (
    originLat: number, originLng: number,
    destLat: number, destLng: number
): Promise<string> => {
    try {
        if (!GMAPS_API_KEY) throw new Error('No API key');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&key=${GMAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const element = data?.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK') {
            return element.duration.text; // e.g. "12 mins"
        }
    } catch (_) { /* fall through */ }
    // Fallback: haversine straight-line estimate
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(originLat*Math.PI/180)*Math.cos(destLat*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return `~${Math.round((dist / 25) * 60 + 2)} mins`;
};

// Fix: Define a local type that includes the dynamically added 'isAvailable' property.
type MappedMechanic = Mechanic & { isAvailable?: boolean };

interface LiveMapProps {
    mechanics: MappedMechanic[];
    bookings: Booking[];
    settings: Settings;
    onViewProfile: (mechanicId: string) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ mechanics, bookings, settings, onViewProfile }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const bookingMarkersRef = useRef<{ [key: string]: any }>({});
    const mechanicMarkersRef = useRef<{ [key: string]: any }>({});
    const polylinesRef = useRef<{ [key: string]: any }>({});

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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(mapInstanceRef.current);

        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // 2. Sync markers and lines
    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current) return;

        // Clear only non-tracking markers if needed, or update intelligently
        const currentMechanicIds = new Set(mechanics.map(m => m.id));
        const currentBookingIds = new Set(bookings.filter(b => b.location).map(b => b.id));

        // Cleanup stale polylines
        Object.keys(polylinesRef.current).forEach(id => {
            if (!currentBookingIds.has(id)) {
                polylinesRef.current[id].remove();
                delete polylinesRef.current[id];
            }
        });

        // Update Mechanic Markers
        mechanics.forEach(mechanic => {
            const isAvailable = mechanic.status === 'Active';
            const iconHtml = `
                <div class="relative group premium-marker-shadow">
                    <div class="absolute -inset-2 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all ${isAvailable ? 'animate-pulse' : ''}"></div>
                    <img src="${mechanic.imageUrl}" alt="${mechanic.name}" class="w-10 h-10 rounded-full border-2 border-primary object-cover relative z-10 shadow-2xl" />
                    <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 ${isAvailable ? 'bg-green-500' : 'bg-red-500'} border-2 border-[#121212] rounded-full z-20"></div>
                </div>`;
            
            const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-mechanic-icon',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });

            if (mechanicMarkersRef.current[mechanic.id]) {
                mechanicMarkersRef.current[mechanic.id].setLatLng([mechanic.lat, mechanic.lng]).setIcon(icon);
            } else {
                const m = L.marker([mechanic.lat, mechanic.lng], { icon }).addTo(markersLayerRef.current);
                m.bindPopup(`<div class="p-4 font-bold text-white bg-[#121212] rounded-2xl border border-white/10 shadow-2xl">
                    <p class="text-sm">${mechanic.name}</p>
                    <p class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">${mechanic.status}</p>
                </div>`);
                mechanicMarkersRef.current[mechanic.id] = m;
            }
        });

        // Update Booking Markers
        bookings.filter(b => b.location).forEach(booking => {
            const isCritical = booking.status === 'Upcoming' && !booking.mechanicId;
            const iconUrl = `data:image/svg+xml;charset=UTF-8,${isCritical ? redPinSvg : bluePinSvg}`;
            const icon = L.icon({
                iconUrl,
                iconSize: [32, 48],
                iconAnchor: [16, 48],
                popupAnchor: [0, -45]
            });

            const popupContent = `
                <div class="p-5 min-w-[220px] bg-[#121212] text-white">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <span class="text-primary text-xs font-black">${(booking.customerName?.charAt(0)) || '?'}</span>
                        </div>
                        <div>
                            <p class="text-sm font-black leading-none">${booking.customerName}</p>
                            <p class="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-tighter">${(booking.services?.[0]?.name) || 'Service'}</p>
                        </div>
                    </div>
                    <div class="space-y-3 border-t border-white/5 pt-4">
                        <div id="eta-${booking.id}" class="hidden">
                            <div class="flex justify-between items-center text-[10px] mb-2">
                                <span class="text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                                    Live ETA
                                </span>
                                <span class="text-primary font-black eta-value">Calculating...</span>
                            </div>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Current Status</span>
                            <span class="text-primary font-black uppercase tracking-widest animate-pulse">${booking.status}</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Service Point</span>
                            <span class="text-gray-300 font-bold truncate max-w-[120px]">${booking.location?.address}</span>
                        </div>
                    </div>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${booking.location?.lat},${booking.location?.lng}" target="_blank" class="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white text-[10px] font-black tracking-widest rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-primary/20">
                        OPEN IN NAVIGATION
                    </a>
                </div>
            `;

            if (bookingMarkersRef.current[booking.id]) {
                bookingMarkersRef.current[booking.id].setLatLng([booking.location!.lat, booking.location!.lng]).setIcon(icon).setPopupContent(popupContent);
            } else {
                const bMarker = L.marker([booking.location!.lat, booking.location!.lng], { icon }).addTo(markersLayerRef.current);
                bMarker.bindPopup(popupContent);
                bookingMarkersRef.current[booking.id] = bMarker;
            }

            // Draw connecting line if mechanic is assigned and en route/in progress
            if (booking.mechanicId && (booking.status === 'En Route' || booking.status === 'In Progress')) {
                const mechanic = mechanics.find(m => m.id === booking.mechanicId);
                if (mechanic) {
                    const latlngs = [
                        [mechanic.lat, mechanic.lng],
                        [booking.location!.lat, booking.location!.lng]
                    ];
                    
                    if (polylinesRef.current[booking.id]) {
                        polylinesRef.current[booking.id].setLatLngs(latlngs);
                    } else {
                        polylinesRef.current[booking.id] = L.polyline(latlngs, {
                            color: '#FE7803',
                            weight: 3,
                            opacity: 0.6,
                            dashArray: '10, 10',
                            lineCap: 'round'
                        }).addTo(mapInstanceRef.current);
                    }

                    // Update Popup with Live Google Maps ETA (async)
                    const bId = booking.id;
                    fetchGoogleMapsETA(mechanic.lat, mechanic.lng, booking.location!.lat, booking.location!.lng).then(etaText => {
                        let updatedPopup = popupContent.replace('class="hidden"', 'class="block"');
                        updatedPopup = updatedPopup.replace('Calculating...', etaText);
                        if (bookingMarkersRef.current[bId]) {
                            bookingMarkersRef.current[bId].setPopupContent(updatedPopup);
                        }
                    });
                }
            }
        });

    }, [mechanics, bookings, settings, onViewProfile]);

    // 3. Real-time Tracking Sync from RTDB
    useEffect(() => {
        if (!rtdb || !L) return;

        const trackingRef = ref(rtdb, 'tracking');
        const unsubscribe = onValue(trackingRef, (snapshot) => {
            const trackingData = snapshot.val();
            if (!trackingData) return;

            Object.entries(trackingData).forEach(([bookingId, data]: [string, any]) => {
                if (data.mechanicLocation && data.mechanicId) {
                    const mMarker = mechanicMarkersRef.current[data.mechanicId];
                    if (mMarker) {
                        const newPos = [data.mechanicLocation.lat, data.mechanicLocation.lng];
                        mMarker.setLatLng(newPos);
                        
                        // Update linked polyline
                        if (polylinesRef.current[bookingId]) {
                            const bMarker = bookingMarkersRef.current[bookingId];
                            if (bMarker) {
                                polylinesRef.current[bookingId].setLatLngs([
                                    newPos,
                                    bMarker.getLatLng()
                                ]);
                            }
                        }
                    }
                }
            });
        });

        return () => off(trackingRef);
    }, []);

    return <div ref={mapRef} className="h-full w-full rounded-2xl shadow-inner bg-[#111]" style={{ minHeight: '550px' }} />;
};

export default LiveMap;

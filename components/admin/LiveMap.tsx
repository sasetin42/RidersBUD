import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mechanic, Settings, Booking } from '../../types';
import { rtdb } from '../../firebase';
import { ref, onValue, off } from 'firebase/database';
import { getLeafletTileConfig } from '../../utils/mapTileProviders';

declare const L: any;


/**
 * Estimates driving ETA using the Haversine formula.
 * No external API key required — works offline too.
 * Assumes average city driving speed of ~25 km/h + 2 min buffer.
 */
const fetchETAEstimate = (
    originLat: number, originLng: number,
    destLat: number, destLng: number
): string => {
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const mins = Math.max(1, Math.round((dist / 25) * 60 + 2));
    return `~${mins} min${mins !== 1 ? 's' : ''}`;
};



type MappedMechanic = Mechanic & { isAvailable?: boolean };

interface LiveMapProps {
    mechanics: MappedMechanic[];
    bookings: Booking[];
    settings: Settings;
    onViewProfile: (mechanicId: string) => void;
    onAssignBooking?: (booking: Booking) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ mechanics, bookings, settings, onViewProfile, onAssignBooking }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const bookingMarkersRef = useRef<{ [key: string]: any }>({});
    const mechanicMarkersRef = useRef<{ [key: string]: any }>({});
    const polylinesRef = useRef<{ [key: string]: any }>({});
    const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
    const legendRef = useRef<HTMLDivElement>(null);

    const filteredMechanics = mechanics.filter(m =>
        filterStatus === 'all' ? true : m.status?.toLowerCase() === filterStatus
    );

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || !L) return;

        const centerLat = settings?.defaultMapCenterLat ?? 14.58;
        const centerLng = settings?.defaultMapCenterLng ?? 121.05;
        const zoom = settings?.defaultMapZoom ?? 12;

        const map = L.map(mapRef.current, {
            center: [centerLat, centerLng],
            zoom: zoom,
            zoomControl: false,
            dragging: true,
            scrollWheelZoom: true,
        });

        const tileConfig = getLeafletTileConfig(settings);
        if (tileConfig.providerId === 'osm-dark' && mapRef.current) {
            mapRef.current.classList.add('leaflet-dark-tiles');
        } else if (mapRef.current) {
            mapRef.current.classList.remove('leaflet-dark-tiles');
        }

        tileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);

        map.whenReady(() => setMapReady(true));

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const buildMechanicIcon = useCallback((mechanic: Mechanic, isSelected: boolean) => {
        const isAvailable = mechanic.status === 'Active';
        const selectedClass = isSelected ? 'selected' : '';
        const availClass = isAvailable ? 'pulse-available' : '';
        const unavailClass = !isAvailable ? 'unavailable' : '';

        const html = `
            <div class="rb-map-pin-wrapper ${availClass}">
                <div class="rb-pin-circle ${selectedClass} ${unavailClass}">
                    <img src="${mechanic.imageUrl || ''}" alt="${mechanic.name}" loading="lazy" />
                </div>
                <div class="rb-pin-stem"></div>
                <div class="rb-pin-dot"></div>
            </div>`;

        return L.divIcon({
            html,
            className: 'rb-leaflet-icon',
            iconSize: [42, 68],
            iconAnchor: [21, 68],
            popupAnchor: [0, -72]
        });
    }, []);

    const buildBookingIcon = useCallback((booking: Booking) => {
        const isCritical = booking.status === 'Upcoming' && !booking.mechanicId;
        const html = `
            <div class="rb-location-pin-wrapper">
                <div class="rb-location-circle">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
                <div class="rb-location-stem"></div>
                <div class="rb-location-dot"></div>
            </div>`;

        return L.divIcon({
            html,
            className: 'rb-leaflet-icon',
            iconSize: [44, 70],
            iconAnchor: [22, 70],
            popupAnchor: [0, -74]
        });
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current || !mapReady) return;

        const currentMechanicIds = new Set(mechanics.map(m => m.id));
        const currentBookingIds = new Set(bookings.filter(b => b.location).map(b => b.id));

        Object.keys(polylinesRef.current).forEach(id => {
            if (!currentBookingIds.has(id)) {
                polylinesRef.current[id].remove();
                delete polylinesRef.current[id];
            }
        });

        filteredMechanics.forEach(mechanic => {
            const isSelected = selectedMechanicId === mechanic.id;
            const icon = buildMechanicIcon(mechanic, isSelected);

            const popupContent = `
                <div class="p-5 min-w-[240px] bg-[#121212] text-white rounded-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/50">
                            <img src="${mechanic.imageUrl || ''}" alt="${mechanic.name}" class="w-full h-full object-cover" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-black leading-none text-white">${mechanic.name}</p>
                            <p class="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wider">${mechanic.status}</p>
                        </div>
                    </div>
                    <div class="space-y-2 border-t border-white/5 pt-3">
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Rating</span>
                            <span class="text-yellow-400 font-black">${(mechanic.rating || 0).toFixed(1)} ⭐</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Jobs Done</span>
                            <span class="text-white font-black">${mechanic.reviews || 0}</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Specialty</span>
                            <span class="text-gray-300 font-bold truncate max-w-[130px]">${mechanic.specializations?.slice(0, 2).join(', ') || 'N/A'}</span>
                        </div>
                    </div>
                    <button onclick="window.__mapViewProfile && window.__mapViewProfile('${mechanic.id}')" class="mt-4 w-full py-2.5 bg-primary text-white text-[10px] font-black tracking-widest rounded-xl hover:bg-orange-600 transition-all">
                        VIEW PROFILE
                    </button>
                </div>`;

            if (mechanicMarkersRef.current[mechanic.id]) {
                const marker = mechanicMarkersRef.current[mechanic.id];
                marker.setLatLng([mechanic.lat, mechanic.lng]);
                marker.setIcon(icon);
                marker.setPopupContent(popupContent);
            } else {
                const m = L.marker([mechanic.lat, mechanic.lng], { icon }).addTo(markersLayerRef.current);
                m.bindPopup(popupContent, {
                    className: 'rb-custom-popup',
                    closeButton: true,
                    maxWidth: 280,
                    minWidth: 240
                });
                m.on('click', () => {
                    setSelectedMechanicId(mechanic.id);
                });
                mechanicMarkersRef.current[mechanic.id] = m;
            }
        });

        Object.keys(mechanicMarkersRef.current).forEach(id => {
            if (!currentMechanicIds.has(id)) {
                mechanicMarkersRef.current[id].remove();
                delete mechanicMarkersRef.current[id];
            }
        });

        bookings.filter(b => b.location).forEach(booking => {
            const icon = buildBookingIcon(booking);

            const popupContent = `
                <div class="p-5 min-w-[240px] bg-[#121212] text-white rounded-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <span class="text-primary text-sm font-black">${(booking.customerName?.charAt(0)) || '?'}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-black leading-none text-white truncate">${booking.customerName}</p>
                            <p class="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-tighter">${booking.service?.name || (booking.services?.[0]?.name) || 'Service'}</p>
                        </div>
                    </div>
                    <div id="eta-${booking.id}" class="hidden">
                        <div class="flex justify-between items-center text-[10px] mb-2">
                            <span class="text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Live ETA
                            </span>
                            <span class="text-green-400 font-black eta-value">Calculating...</span>
                        </div>
                    </div>
                    <div class="space-y-2 border-t border-white/5 pt-3">
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Status</span>
                            <span class="text-primary font-black uppercase tracking-widest">${booking.status}</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Address</span>
                            <span class="text-gray-300 font-bold truncate max-w-[120px]">${booking.location?.address || 'N/A'}</span>
                        </div>
                        ${booking.mechanicName ? `
                        <div class="flex justify-between text-[10px]">
                            <span class="text-gray-500 font-bold uppercase tracking-wider">Mechanic</span>
                            <span class="text-primary font-bold">${booking.mechanicName}</span>
                        </div>` : ''}
                    </div>
                    <div class="mt-4 flex gap-2">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${booking.location?.lat},${booking.location?.lng}" target="_blank" class="flex-1 py-2.5 bg-primary text-white text-[10px] font-black tracking-widest rounded-xl hover:bg-orange-600 transition-all text-center">
                            NAVIGATE
                        </a>
                        ${!booking.mechanicId && onAssignBooking ? `
                        <button onclick="window.__mapAssignBooking && window.__mapAssignBooking('${booking.id}')" class="flex-1 py-2.5 bg-white/10 text-white text-[10px] font-black tracking-widest rounded-xl hover:bg-white/20 transition-all">
                            ASSIGN
                        </button>` : ''}
                    </div>
                </div>`;

            if (bookingMarkersRef.current[booking.id]) {
                bookingMarkersRef.current[booking.id].setLatLng([booking.location!.lat, booking.location!.lng]);
                bookingMarkersRef.current[booking.id].setIcon(icon);
                bookingMarkersRef.current[booking.id].setPopupContent(popupContent);
            } else {
                const bMarker = L.marker([booking.location!.lat, booking.location!.lng], { icon }).addTo(markersLayerRef.current);
                bMarker.bindPopup(popupContent, {
                    className: 'rb-custom-popup',
                    closeButton: true,
                    maxWidth: 280,
                    minWidth: 240
                });
                bookingMarkersRef.current[booking.id] = bMarker;
            }

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

                    const bId = booking.id;
                    const etaText = fetchETAEstimate(mechanic.lat, mechanic.lng, booking.location!.lat, booking.location!.lng);
                    let updatedPopup = popupContent.replace('class="hidden"', 'class="block"');
                    updatedPopup = updatedPopup.replace('Calculating...', etaText);
                    if (bookingMarkersRef.current[bId]) {
                        bookingMarkersRef.current[bId].setPopupContent(updatedPopup);
                    }
                }
            }
        });

        Object.keys(bookingMarkersRef.current).forEach(id => {
            if (!currentBookingIds.has(id)) {
                bookingMarkersRef.current[id].remove();
                delete bookingMarkersRef.current[id];
            }
        });

    }, [filteredMechanics, bookings, settings, onViewProfile, mapReady, selectedMechanicId, buildMechanicIcon, buildBookingIcon, onAssignBooking]);

    useEffect(() => {
        (window as any).__mapViewProfile = onViewProfile;
        (window as any).__mapAssignBooking = (bookingId: string) => {
            const booking = bookings.find(b => b.id === bookingId);
            if (booking && onAssignBooking) onAssignBooking(booking);
        };
        return () => {
            delete (window as any).__mapViewProfile;
            delete (window as any).__mapAssignBooking;
        };
    }, [onViewProfile, bookings, onAssignBooking]);

    useEffect(() => {
        if (!rtdb || !L || !mapReady) return;

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
    }, [mapReady]);

    const handleZoomToFit = () => {
        if (!mapInstanceRef.current) return;
        const allPoints: [number, number][] = [
            ...mechanics.map(m => [m.lat, m.lng] as [number, number]),
            ...bookings.filter(b => b.location).map(b => [b.location!.lat, b.location!.lng] as [number, number])
        ];
        if (allPoints.length > 0) {
            mapInstanceRef.current.fitBounds(allPoints, { padding: [50, 50] });
        }
    };

    const handleFullscreen = () => {
        if (!mapRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            mapRef.current.requestFullscreen();
        }
    };

    return (
        <div className="relative h-full w-full">
            <div ref={mapRef} className="h-full w-full rounded-2xl shadow-inner bg-[#111]" style={{ minHeight: '550px' }} />

            {/* Map Controls Overlay */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                {/* Filter Controls */}
                <div className="bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 flex gap-1 shadow-2xl">
                    {(['all', 'active', 'pending'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                filterStatus === status
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Pending'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button
                    onClick={handleZoomToFit}
                    className="w-9 h-9 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all shadow-2xl"
                    title="Fit all markers"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                </button>
                <button
                    onClick={handleFullscreen}
                    className="w-9 h-9 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all shadow-2xl"
                    title="Fullscreen"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                </button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full border-2 border-primary bg-[#1A1A1A]"></div>
                        <span className="text-[10px] font-bold text-gray-400">Mechanic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary border-2 border-white"></div>
                        <span className="text-[10px] font-bold text-gray-400">Job Site</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-0.5 bg-primary opacity-60" style={{ borderTop: '2px dashed #FE7803' }}></div>
                        <span className="text-[10px] font-bold text-gray-400">Route</span>
                    </div>
                </div>
            </div>

            {/* Stats Badge */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
                <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="text-green-400">{mechanics.filter(m => m.status === 'Active').length} Active</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-primary">{bookings.length} Jobs</span>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;

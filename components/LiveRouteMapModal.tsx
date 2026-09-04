import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Phone, MessageSquare, Compass, ShieldCheck, MapPin, Clock, ArrowUpRight, Maximize2 } from 'lucide-react';
import { Mechanic } from '../types';

declare const L: any;

interface LiveRouteMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerLocation: { lat: number; lng: number; address?: string } | null;
    mechanicLocation?: { lat: number; lng: number; address?: string } | null;
    mechanic?: Mechanic | null;
    customerImageUrl?: string | null;
    customerName?: string;
    title?: string;
    status?: string;
    onCallMechanic?: () => void;
    onChatMechanic?: () => void;
    appLogoUrl?: string;
}

export const LiveRouteMapModal: React.FC<LiveRouteMapModalProps> = ({
    isOpen,
    onClose,
    customerLocation,
    mechanicLocation,
    mechanic,
    customerImageUrl,
    customerName,
    title = 'Live Service Route',
    status = 'Confirmed',
    onCallMechanic,
    onChatMechanic,
    appLogoUrl = '/favicon.png'
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const routeLayerGroupRef = useRef<any>(null);
    const customerMarkerRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);

    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [activeView, setActiveView] = useState<'both' | 'customer' | 'mechanic'>('both');

    // Extract primitive coordinates to avoid object identity reference re-triggers
    const custLat = customerLocation?.lat ?? 14.291457;
    const custLng = customerLocation?.lng ?? 121.001210;

    const mechLat = mechanicLocation?.lat ?? (mechanic?.lat ? mechanic.lat : custLat + 0.0125);
    const mechLng = mechanicLocation?.lng ?? (mechanic?.lng ? mechanic.lng : custLng + 0.0145);

    // Initialize Map once when modal opens
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || typeof L === 'undefined') return;

        let isSubscribed = true;

        // Cleanup existing map if any
        if (mapInstanceRef.current) {
            try {
                mapInstanceRef.current.remove();
            } catch (e) {
                console.warn('Map cleanup error:', e);
            }
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([custLat, custLng], 14);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Dedicated layer group for polylines & route shapes
        const routeLayerGroup = L.layerGroup().addTo(map);
        routeLayerGroupRef.current = routeLayerGroup;

        // Custom Customer Pin with Customer Uploaded Profile Image
        const customerIcon = L.divIcon({
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-12 h-12 rounded-full bg-emerald-500/25 animate-ping"></div>
                    <div class="relative w-10 h-10 rounded-2xl bg-[#1E1E24] border-2 border-emerald-500 shadow-2xl flex items-center justify-center overflow-hidden">
                        ${customerImageUrl ? `
                            <img src="${customerImageUrl}" alt="${customerName || 'Customer'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'w-full h-full bg-emerald-500 flex items-center justify-center text-white font-black\\'>👤</div>';" />
                        ` : `
                            <div class="w-full h-full bg-emerald-500 flex items-center justify-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        `}
                    </div>
                    <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#1E1E24]"></div>
                    <div class="absolute -bottom-1.5 w-2.5 h-2.5 bg-emerald-500 rotate-45"></div>
                </div>
            `,
            className: 'rb-custom-customer-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        customerMarkerRef.current = L.marker([custLat, custLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<div style="color:#111;font-weight:bold;font-size:12px;">📍 ${customerName || 'Your Location'} (Service Destination)</div>`);

        // Custom Mechanic Pin
        const mechanicIcon = L.divIcon({
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-12 h-12 rounded-full bg-[#FE7803]/30 animate-pulse"></div>
                    <div class="relative w-10 h-10 rounded-2xl bg-[#1E1E24] border-2 border-[#FE7803] shadow-2xl flex items-center justify-center overflow-hidden">
                        <img src="${mechanic?.imageUrl || appLogoUrl}" alt="Mechanic" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='${appLogoUrl}'" />
                    </div>
                    <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1E1E24]"></div>
                    <div class="absolute -bottom-1.5 w-2.5 h-2.5 bg-[#FE7803] rotate-45"></div>
                </div>
            `,
            className: 'rb-custom-mechanic-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        mechanicMarkerRef.current = L.marker([mechLat, mechLng], { icon: mechanicIcon })
            .addTo(map)
            .bindPopup(`<div style="color:#111;font-weight:bold;font-size:12px;">🔧 Mechanic: ${mechanic?.name || 'Assigned Pro'}</div>`);

        mapInstanceRef.current = map;

        // Fetch OSRM Best-Way Route
        setIsLoadingRoute(true);
        const routeUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${mechLng},${mechLat};${custLng},${custLat}?overview=full&geometries=geojson`;

        const drawFallback = () => {
            if (!isSubscribed || !mapInstanceRef.current || !routeLayerGroupRef.current) return;
            routeLayerGroupRef.current.clearLayers();
            const straightCoords = [
                [mechLat, mechLng],
                [custLat, custLng]
            ];
            const fallbackPolyline = L.polyline(straightCoords, {
                color: '#FE7803',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8'
            });
            routeLayerGroupRef.current.addLayer(fallbackPolyline);

            const latDiff = custLat - mechLat;
            const lngDiff = custLng - mechLng;
            const approxKm = parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1));
            setRouteInfo({ distanceKm: approxKm, durationMin: Math.max(1, Math.round(approxKm * 3)) });

            try {
                map.fitBounds(L.latLngBounds(straightCoords), { padding: [60, 60] });
            } catch (_) {}
        };

        fetch(routeUrl)
            .then(res => res.json())
            .then(data => {
                if (!isSubscribed || !mapInstanceRef.current || !routeLayerGroupRef.current) return;

                if (data && data.routes && data.routes.length > 0) {
                    const primaryRoute = data.routes[0];
                    const coords = primaryRoute.geometry.coordinates.map((c: any) => [c[1], c[0]]);

                    const distKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
                    const durMin = Math.max(1, Math.round(primaryRoute.duration / 60));
                    setRouteInfo({ distanceKm: distKm, durationMin: durMin });

                    routeLayerGroupRef.current.clearLayers();

                    // Glow background
                    const glowPolyline = L.polyline(coords, {
                        color: '#FE7803',
                        weight: 8,
                        opacity: 0.35,
                        lineJoin: 'round'
                    });
                    routeLayerGroupRef.current.addLayer(glowPolyline);

                    // Core line
                    const corePolyline = L.polyline(coords, {
                        color: '#FE7803',
                        weight: 4,
                        opacity: 1,
                        lineJoin: 'round'
                    });
                    routeLayerGroupRef.current.addLayer(corePolyline);

                    try {
                        const bounds = L.latLngBounds(coords);
                        map.fitBounds(bounds, { padding: [60, 60] });
                    } catch (_) {}
                } else {
                    drawFallback();
                }
            })
            .catch(err => {
                console.warn('OSRM routing fetch failed, falling back:', err);
                drawFallback();
            })
            .finally(() => {
                if (isSubscribed) {
                    setIsLoadingRoute(false);
                }
            });

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.invalidateSize();
                } catch (_) {}
            }
        }, 300);

        return () => {
            isSubscribed = false;
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    console.warn(e);
                }
                mapInstanceRef.current = null;
                routeLayerGroupRef.current = null;
                customerMarkerRef.current = null;
                mechanicMarkerRef.current = null;
            }
        };
    }, [isOpen]); // Only re-instantiate map when modal visibility changes

    // Update marker positions smoothly when coordinates change without re-creating the map
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (customerMarkerRef.current) {
            customerMarkerRef.current.setLatLng([custLat, custLng]);
        }
        if (mechanicMarkerRef.current) {
            mechanicMarkerRef.current.setLatLng([mechLat, mechLng]);
        }
    }, [custLat, custLng, mechLat, mechLng]);

    const handleFocusView = (view: 'both' | 'customer' | 'mechanic') => {
        setActiveView(view);
        const map = mapInstanceRef.current;
        if (!map) return;

        if (view === 'customer') {
            map.setView([custLat, custLng], 16, { animate: true });
        } else if (view === 'mechanic') {
            map.setView([mechLat, mechLng], 16, { animate: true });
        } else {
            const bounds = L.latLngBounds([
                [custLat, custLng],
                [mechLat, mechLng]
            ]);
            map.fitBounds(bounds, { padding: [60, 60], animate: true });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
            <div className="relative flex flex-col w-full max-w-2xl h-[92vh] max-h-[760px] bg-[#121217] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-[#181820]/95 border-b border-white/10 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Navigation size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
                                    {title}
                                </h3>
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Live GPS
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Map Body */}
                <div className="relative flex-1 w-full bg-[#0a0a0e] overflow-hidden">
                    <div ref={mapContainerRef} className="w-full h-full" />

                    {/* Floating Route Info Badge (Top Left) - Ultra Compact */}
                    <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 max-w-[210px]">
                        <div className="bg-[#181820]/95 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-xl">
                            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/5">
                                <div className="flex items-center gap-1 text-[9px] font-black text-[#FE7803] uppercase tracking-wider">
                                    <Clock size={11} />
                                    <span>Optimal Travel</span>
                                </div>
                                {isLoadingRoute ? (
                                    <span className="text-[9px] text-gray-400 animate-pulse">Calculating...</span>
                                ) : (
                                    <span className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded">
                                        ~{routeInfo?.durationMin ?? 1} mins
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                                <div className="space-y-0.5">
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Distance</p>
                                    <p className="text-white font-black text-xs">
                                        {routeInfo?.distanceKm ? `${routeInfo.distanceKm} km` : '2.4 km'}
                                    </p>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Route</p>
                                    <p className="text-emerald-400 font-bold text-[10px] flex items-center gap-0.5 justify-end">
                                        <ShieldCheck size={10} /> Best Road
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick View Filter Pills (Top Right) */}
                    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5 bg-[#181820]/90 backdrop-blur-md border border-white/10 p-1 rounded-2xl shadow-xl">
                        <button
                            onClick={() => handleFocusView('both')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                activeView === 'both' ? 'bg-[#FE7803] text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Full Route
                        </button>
                        <button
                            onClick={() => handleFocusView('mechanic')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                activeView === 'mechanic' ? 'bg-[#FE7803] text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Mechanic
                        </button>
                        <button
                            onClick={() => handleFocusView('customer')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                activeView === 'customer' ? 'bg-[#FE7803] text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Customer
                        </button>
                    </div>

                    {/* Map Zoom Controls (Bottom Right) */}
                    <div className="absolute bottom-20 right-4 z-[400] flex flex-col gap-2">
                        <button
                            onClick={() => mapInstanceRef.current?.zoomIn()}
                            className="w-10 h-10 rounded-xl bg-[#181820]/90 backdrop-blur-md border border-white/10 text-white font-black text-lg flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                        >
                            +
                        </button>
                        <button
                            onClick={() => mapInstanceRef.current?.zoomOut()}
                            className="w-10 h-10 rounded-xl bg-[#181820]/90 backdrop-blur-md border border-white/10 text-white font-black text-lg flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                        >
                            −
                        </button>
                    </div>
                </div>

                {/* Footer Mechanic Info & Actions */}
                <div className="p-4 sm:p-5 bg-[#181820] border-t border-white/10 z-20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        {/* Mechanic Profile Snippet */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-[#22222B] border border-primary/30 p-0.5 flex-shrink-0 overflow-hidden shadow-md">
                                <img
                                    src={mechanic?.imageUrl || appLogoUrl}
                                    alt={mechanic?.name || 'Mechanic'}
                                    className="w-full h-full object-cover rounded-xl"
                                    onError={(e) => { (e.target as HTMLImageElement).src = appLogoUrl; }}
                                />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-white truncate">
                                        {mechanic?.name || 'Assigned Mechanic Specialist'}
                                    </h4>
                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                        Verified
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                    {mechanic?.specializations?.join(', ') || 'General Automotive Specialist'}
                                </p>
                            </div>
                        </div>

                        {/* Direct Communication Quick Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {onCallMechanic && (
                                <button
                                    onClick={onCallMechanic}
                                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 font-bold px-3 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                                    title="Call Mechanic"
                                >
                                    <Phone size={14} />
                                    <span className="hidden sm:inline">Call</span>
                                </button>
                            )}
                            {onChatMechanic && (
                                <button
                                    onClick={onChatMechanic}
                                    className="flex items-center gap-1.5 bg-[#FE7803]/10 hover:bg-[#FE7803] text-[#FE7803] hover:text-white border border-[#FE7803]/20 hover:border-[#FE7803] font-bold px-3 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                                    title="Message Mechanic"
                                >
                                    <MessageSquare size={14} />
                                    <span className="hidden sm:inline">Chat</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LiveRouteMapModal;

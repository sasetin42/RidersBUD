import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
    X, 
    Navigation, 
    Phone, 
    MessageSquare, 
    MapPin, 
    Clock, 
    ShieldCheck, 
    Car, 
    Compass, 
    ExternalLink, 
    Layers, 
    Maximize2, 
    Activity, 
    CheckCircle2,
    Route,
    Store,
    User,
    Wrench
} from 'lucide-react';
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
    customerPhone?: string;
    customerVehicle?: string;
    customerAddress?: string;
    title?: string;
    status?: string;
    eta?: string | null;
    etaNote?: string | null;
    viewMode?: 'customer' | 'mechanic';
    onCallMechanic?: () => void;
    onChatMechanic?: () => void;
    onCallCustomer?: () => void;
    onChatCustomer?: () => void;
    onOpenExternalNav?: () => void;
    appLogoUrl?: string;
    // Enhanced props for Order Delivery tracking
    trackingType?: 'service' | 'order';
    serviceType?: 'Car Rental' | 'Driver for Hire' | 'Liaison' | 'Towing' | string;
    hqLocation?: { lat: number; lng: number; name?: string; address?: string } | null;
    deliveryRider?: {
        name?: string;
        phone?: string;
        vehicle?: string;
        imageUrl?: string;
        plateNumber?: string;
    } | null;
    originAddress?: string;
    destinationAddress?: string;
    orderNumber?: string;
}

export const LiveRouteMapModal: React.FC<LiveRouteMapModalProps> = ({
    isOpen,
    onClose,
    customerLocation,
    mechanicLocation,
    mechanic,
    customerImageUrl,
    customerName,
    customerPhone,
    customerVehicle,
    customerAddress,
    title = 'Live Service Route',
    status = 'Confirmed',
    eta,
    etaNote,
    viewMode = 'customer',
    onCallMechanic,
    onChatMechanic,
    onCallCustomer,
    onChatCustomer,
    onOpenExternalNav,
    appLogoUrl = '/favicon.png',
    trackingType = 'service',
    serviceType,
    hqLocation,
    deliveryRider,
    originAddress = 'Carmona Commercial Center, Governor\'s Drive, Cavite',
    destinationAddress,
    orderNumber
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const routeLayerGroupRef = useRef<any>(null);
    const customerMarkerRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);
    // Realtime route bookkeeping: guards against out-of-order responses and
    // throttles OSRM refetches while positions stream in.
    const routeRequestSeqRef = useRef(0);
    const lastRouteKeyRef = useRef<string>('');
    const lastRouteFetchAtRef = useRef(0);

    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [activeView, setActiveView] = useState<'both' | 'customer' | 'mechanic'>('both');

    // Default HQ coordinates fallback (Carmona Commercial Center)
    const defaultHqLat = hqLocation?.lat ?? 14.3149;
    const defaultHqLng = hqLocation?.lng ?? 121.0583;
    const defaultHqName = hqLocation?.name ?? 'RidersBUD Central HQ & Dispatch Hub';
    const defaultHqAddress = hqLocation?.address ?? 'Carmona Commercial Center, Governor\'s Drive, Cavite';

    const isHqOriginService = Boolean(
        trackingType === 'order' ||
        serviceType === 'Car Rental' ||
        serviceType === 'Driver for Hire' ||
        serviceType === 'Liaison' ||
        serviceType === 'Towing' ||
        (!mechanicLocation && !mechanic?.lat)
    );

    const isMechanicAssigned = Boolean(mechanic?.name || mechanic?.id || deliveryRider?.name || mechanicLocation);

    // Extract primitive coordinates to avoid object identity reference re-triggers
    const custLat = customerLocation?.lat ?? 14.291457;
    const custLng = customerLocation?.lng ?? 121.001210;

    // Origin resolution: Live mechanic location if available, otherwise default HQ dispatch hub
    const mechLat = mechanicLocation?.lat ?? (mechanic?.lat ? mechanic.lat : (isHqOriginService ? defaultHqLat : custLat + 0.0125));
    const mechLng = mechanicLocation?.lng ?? (mechanic?.lng ? mechanic.lng : (isHqOriginService ? defaultHqLng : custLng + 0.0145));

    const fallbackExternalNav = () => {
        const destLat = viewMode === 'mechanic' ? custLat : mechLat;
        const destLng = viewMode === 'mechanic' ? custLng : mechLng;
        const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        window.open(navUrl, '_blank', 'noopener,noreferrer');
    };

    /**
     * Draws the OSRM route between two live endpoints. Called once when the modal
     * opens and again whenever either party moves far enough to matter, so the line
     * stays truthful without re-creating the map (or snapping the user's view).
     */
    const fetchAndDrawRoute = useCallback((from: [number, number], to: [number, number], fitBounds: boolean) => {
        const map = mapInstanceRef.current;
        const layer = routeLayerGroupRef.current;
        if (!map || !layer) return;

        const seq = ++routeRequestSeqRef.current;
        lastRouteFetchAtRef.current = Date.now();
        setIsLoadingRoute(true);

        const isCurrent = () =>
            seq === routeRequestSeqRef.current &&
            !!mapInstanceRef.current &&
            !!routeLayerGroupRef.current;

        const drawFallback = () => {
            if (!isCurrent()) return;
            routeLayerGroupRef.current.clearLayers();
            const straightCoords = [from, to];
            const fallbackPolyline = L.polyline(straightCoords, {
                color: '#FE7803',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8'
            });
            routeLayerGroupRef.current.addLayer(fallbackPolyline);

            const latDiff = to[0] - from[0];
            const lngDiff = to[1] - from[1];
            const approxKm = parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1));
            setRouteInfo({ distanceKm: approxKm, durationMin: Math.max(1, Math.round(approxKm * 3)) });

            if (fitBounds) {
                try {
                    mapInstanceRef.current.fitBounds(L.latLngBounds(straightCoords), { padding: [60, 60], animate: true });
                } catch (_) {}
            }
        };

        const routeUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

        fetch(routeUrl)
            .then(res => res.json())
            .then(data => {
                if (!isCurrent()) return;

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

                    if (fitBounds) {
                        try {
                            mapInstanceRef.current.fitBounds(L.latLngBounds(coords), { padding: [70, 70], animate: true });
                        } catch (_) {}
                    }
                } else {
                    drawFallback();
                }
            })
            .catch(err => {
                console.warn('OSRM routing fetch failed, falling back:', err);
                drawFallback();
            })
            .finally(() => {
                if (isCurrent()) setIsLoadingRoute(false);
            });
    }, []);

    // Initialize Map once when modal opens
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || typeof L === 'undefined') return;

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

        // Standard free OpenStreetMap tiles with dark CSS filter
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            subdomains: 'abc',
            crossOrigin: true,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Dedicated layer group for polylines & route shapes
        const routeLayerGroup = L.layerGroup().addTo(map);
        routeLayerGroupRef.current = routeLayerGroup;

        // Modern Custom Customer / Destination Pin
        const destinationTitle = trackingType === 'order' ? 'Client Delivery Address' : 'Service Destination';
        const customerIcon = L.divIcon({
            html: `
                <div class="relative flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(16,185,129,0.4)]">
                    <div class="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping"></div>
                    <div class="relative w-11 h-11 rounded-2xl bg-[#141419] border-2 border-emerald-400 p-0.5 shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110">
                        ${customerImageUrl ? `
                            <img src="${customerImageUrl}" alt="${customerName || 'Customer'}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'w-full h-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black rounded-xl\\'>👤</div>';" />
                        ` : `
                            <div class="w-full h-full bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        `}
                    </div>
                    <div class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#141419] flex items-center justify-center">
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <div class="absolute -bottom-1 w-2.5 h-2.5 bg-emerald-400 rotate-45 border-r border-b border-[#141419]"></div>
                </div>
            `,
            className: 'rb-custom-customer-icon',
            iconSize: [44, 44],
            iconAnchor: [22, 44]
        });

        customerMarkerRef.current = L.marker([custLat, custLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`
                <div style="font-family:inherit;padding:8px 10px;min-width:170px;max-width:210px;background:#141419;border-radius:14px;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;padding-right:16px;">
                        <span style="width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0;"></span>
                        <span style="font-weight:900;font-size:9px;color:#34d399;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${destinationTitle}</span>
                    </div>
                    <div style="font-weight:800;font-size:12px;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">
                        ${customerName || 'Client'}
                    </div>
                    <div style="font-size:10px;color:#9ca3af;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        📍 ${destinationAddress || customerAddress || 'Carmona City Delivery Area'}
                    </div>
                </div>
            `, {
                autoPan: true,
                autoPanPadding: [15, 15],
                offset: [0, -18],
                closeButton: true
            });

        // Modern Custom Store Hub or Courier / Mechanic Pin
        const isMechanicAssigned = Boolean(mechanicLocation || mechanic?.lat);
        const originTitle = trackingType === 'order' 
            ? 'Store Hub' 
            : (!isMechanicAssigned && isHqOriginService)
                ? 'RidersBUD Central HQ'
                : 'Mechanic';

        const originSub = trackingType === 'order' 
            ? 'RidersBUD Store'
            : (!isMechanicAssigned && isHqOriginService)
                ? (defaultHqName || 'Dispatch Hub')
                : (mechanic?.name || 'Specialist');

        const originImage = trackingType === 'order' 
            ? (appLogoUrl || '/ridersbud_logo.png')
            : (!isMechanicAssigned && isHqOriginService)
                ? (appLogoUrl || '/ridersbud_logo.png')
                : (mechanic?.imageUrl || appLogoUrl);

        const mechanicIcon = L.divIcon({
            html: `
                <div class="relative flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(254,120,3,0.45)]">
                    <div class="absolute w-12 h-12 rounded-full bg-[#FE7803]/25 animate-pulse"></div>
                    <div class="relative w-11 h-11 rounded-2xl bg-[#141419] border-2 border-[#FE7803] p-0.5 shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110">
                        ${(trackingType === 'order' || (!isMechanicAssigned && isHqOriginService)) ? `
                            <div class="w-full h-full bg-[#FE7803]/15 rounded-xl flex items-center justify-center p-1">
                                <img src="${originImage}" alt="${originTitle}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:16px;\\'>🏬</span>';" />
                            </div>
                        ` : `
                            <img src="${originImage}" alt="Mechanic" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.src='${appLogoUrl}'" />
                        `}
                    </div>
                    <div class="absolute -top-1 -right-1 w-4 h-4 bg-[#FE7803] rounded-full border-2 border-[#141419] flex items-center justify-center">
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <div class="absolute -bottom-1 w-2.5 h-2.5 bg-[#FE7803] rotate-45 border-r border-b border-[#141419]"></div>
                </div>
            `,
            className: 'rb-custom-mechanic-icon',
            iconSize: [44, 44],
            iconAnchor: [22, 44]
        });

        mechanicMarkerRef.current = L.marker([mechLat, mechLng], { icon: mechanicIcon })
            .addTo(map)
            .bindPopup(`
                <div style="font-family:inherit;padding:8px 10px;min-width:180px;max-width:230px;background:#141419;border-radius:14px;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;padding-right:16px;">
                        <span style="width:6px;height:6px;border-radius:50%;background:#FE7803;flex-shrink:0;"></span>
                        <span style="font-weight:900;font-size:9px;color:#FE7803;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${originTitle}</span>
                    </div>
                    <div style="font-weight:800;font-size:12px;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">
                        ${originSub}
                    </div>
                    <div style="font-size:10px;color:#9ca3af;line-height:1.3;white-space:normal;">
                        ${(!isMechanicAssigned && isHqOriginService) ? `🏬 ${defaultHqAddress}` : (trackingType === 'order' ? '🏬 Carmona Commercial Center' : '🔧 Live GPS Position')}
                    </div>
                </div>
            `, {
                autoPan: true,
                autoPanPadding: [15, 15],
                offset: [0, -18],
                closeButton: true
            });

        mapInstanceRef.current = map;

        // Initial route draw (also seeds the realtime refresh key)
        lastRouteKeyRef.current = `${custLat.toFixed(3)},${custLng.toFixed(3)}|${mechLat.toFixed(3)},${mechLng.toFixed(3)}`;
        fetchAndDrawRoute([mechLat, mechLng], [custLat, custLng], true);

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.invalidateSize();
                } catch (_) {}
            }
        }, 300);

        return () => {
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
            // Invalidate any in-flight route response and re-seed on next open
            routeRequestSeqRef.current++;
            lastRouteKeyRef.current = '';
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

    // Realtime route refresh: refetch the OSRM line once either endpoint has moved
    // ~110m, throttled so a streaming GPS fix can't hammer the routing service.
    useEffect(() => {
        if (!isOpen || !mapInstanceRef.current) return;

        const key = `${custLat.toFixed(3)},${custLng.toFixed(3)}|${mechLat.toFixed(3)},${mechLng.toFixed(3)}`;
        if (key === lastRouteKeyRef.current) return;
        lastRouteKeyRef.current = key;

        const sinceLastFetch = Date.now() - lastRouteFetchAtRef.current;
        const delay = Math.max(1200, 8000 - sinceLastFetch);

        const timer = setTimeout(() => {
            fetchAndDrawRoute([mechLat, mechLng], [custLat, custLng], false);
        }, delay);

        return () => clearTimeout(timer);
    }, [isOpen, custLat, custLng, mechLat, mechLng, fetchAndDrawRoute]);

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
            map.fitBounds(bounds, { padding: [70, 70], animate: true });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
            <div className="relative flex flex-col w-full sm:max-w-2xl h-full sm:h-[94vh] sm:max-h-[800px] bg-[#121217] border-0 sm:border border-white/10 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 bg-[#181820]/95 backdrop-blur-md border-b border-white/10 z-20 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/20 flex-shrink-0">
                            <Navigation size={16} className="animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate whitespace-nowrap">
                                {title}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-0.5 flex items-center gap-1 truncate whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                                <span className="truncate">Realtime Live Dispatch Route</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95 flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Map Body */}
                <div className="relative flex-1 w-full bg-[#0a0a0e] overflow-hidden">
                    <div ref={mapContainerRef} className="w-full h-full" />

                    {/* Top Controls Bar: Compact Telemetry HUD (Left) & Segmented View Switcher (Right) */}
                    <div className="absolute top-2.5 inset-x-2.5 z-[400] flex items-start justify-between gap-2 pointer-events-none">
                        {/* Compact Route Telemetry HUD Card */}
                        <div className="bg-[#141419]/95 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl pointer-events-auto flex flex-col gap-1 max-w-[170px] sm:max-w-[200px]">
                            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/10">
                                <div className="flex items-center gap-1 text-[9px] font-black text-[#FE7803] uppercase tracking-wider">
                                    <Clock size={10} />
                                    <span>{eta ? 'ETA' : 'Travel'}</span>
                                </div>
                                {isLoadingRoute ? (
                                    <span className="text-[8px] text-gray-400 animate-pulse">...</span>
                                ) : (
                                    <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
                                        {eta || `~${routeInfo?.durationMin ?? 1}m`}
                                    </span>
                                )}
                            </div>

                            {etaNote && (
                                <p className="text-[8px] text-yellow-300 font-medium italic truncate">
                                    "{etaNote}"
                                </p>
                            )}

                            <div className="flex items-center justify-between gap-1 text-[9px] pt-0.5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[8px] text-gray-400 uppercase font-bold">Dist:</span>
                                    <span className="text-white font-black text-[10px]">
                                        {routeInfo?.distanceKm ? `${routeInfo.distanceKm}km` : '2.4km'}
                                    </span>
                                </div>
                                <span className="text-emerald-400 font-bold text-[8px] flex items-center gap-0.5">
                                    <ShieldCheck size={9} /> Optimal
                                </span>
                            </div>
                        </div>

                        {/* Quick View Segmented Control (Icon-only) */}
                        <div className="bg-[#141419]/95 backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-1">
                            <button
                                onClick={() => handleFocusView('both')}
                                title="Full Route"
                                aria-label="Full Route"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    activeView === 'both' 
                                        ? 'bg-[#FE7803] text-white shadow-md shadow-[#FE7803]/30 scale-105' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Route size={16} strokeWidth={2.4} />
                            </button>
                            <button
                                onClick={() => handleFocusView('mechanic')}
                                title={trackingType === 'order' ? 'Store Hub' : 'Mechanic Location'}
                                aria-label={trackingType === 'order' ? 'Store Hub' : 'Mechanic Location'}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    activeView === 'mechanic' 
                                        ? 'bg-[#FE7803] text-white shadow-md shadow-[#FE7803]/30 scale-105' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {trackingType === 'order' ? (
                                    <Store size={16} strokeWidth={2.4} />
                                ) : (
                                    <Wrench size={16} strokeWidth={2.4} />
                                )}
                            </button>
                            <button
                                onClick={() => handleFocusView('customer')}
                                title={trackingType === 'order' ? 'Client Delivery Area' : 'Customer Location'}
                                aria-label={trackingType === 'order' ? 'Client Delivery Area' : 'Customer Location'}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    activeView === 'customer' 
                                        ? 'bg-[#FE7803] text-white shadow-md shadow-[#FE7803]/30 scale-105' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <User size={16} strokeWidth={2.4} />
                            </button>
                        </div>
                    </div>

                    {/* Floating Communication & Map Controls (Bottom Right of Map) */}
                    <div className="absolute bottom-4 right-2.5 z-[400] flex flex-col gap-1.5 items-center">
                        {/* Call Button (Above Zoom) */}
                        {(onCallCustomer || onCallMechanic) && (
                            <button
                                onClick={onCallCustomer || onCallMechanic}
                                className="w-8 h-8 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white backdrop-blur-md border border-emerald-400/30 flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl"
                                title={
                                    trackingType === 'order'
                                        ? 'Call the Store Hub'
                                        : viewMode === 'mechanic'
                                            ? 'Call Customer'
                                            : 'Call Mechanic'
                                }
                                aria-label={
                                    trackingType === 'order'
                                        ? 'Call the Store Hub'
                                        : viewMode === 'mechanic'
                                            ? 'Call Customer'
                                            : 'Call Mechanic'
                                }
                            >
                                <Phone size={14} className="animate-pulse" />
                            </button>
                        )}

                        {/* Message Button (Above Zoom) */}
                        {(onChatCustomer || onChatMechanic) && (
                            <button
                                onClick={onChatCustomer || onChatMechanic}
                                className="w-8 h-8 rounded-lg bg-[#FE7803]/90 hover:bg-[#FE7803] text-white backdrop-blur-md border border-[#FE7803]/40 flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl mb-1"
                                title={
                                    trackingType === 'order'
                                        ? 'Message the Store Hub'
                                        : viewMode === 'mechanic'
                                            ? 'Message Customer'
                                            : 'Message Mechanic'
                                }
                                aria-label={
                                    trackingType === 'order'
                                        ? 'Message the Store Hub'
                                        : viewMode === 'mechanic'
                                            ? 'Message Customer'
                                            : 'Message Mechanic'
                                }
                            >
                                <MessageSquare size={14} />
                            </button>
                        )}

                        {/* Map Zoom Controls */}
                        <button
                            onClick={() => mapInstanceRef.current?.zoomIn()}
                            title="Zoom In"
                            aria-label="Zoom In"
                            className="w-8 h-8 rounded-lg bg-[#141419]/95 backdrop-blur-md border border-white/10 text-white font-black text-sm flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                        >
                            +
                        </button>
                        <button
                            onClick={() => mapInstanceRef.current?.zoomOut()}
                            title="Zoom Out"
                            aria-label="Zoom Out"
                            className="w-8 h-8 rounded-lg bg-[#141419]/95 backdrop-blur-md border border-white/10 text-white font-black text-sm flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                        >
                            −
                        </button>
                    </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="p-3 sm:p-4 bg-[#181820] border-t border-white/10 z-20">
                    <div className="flex items-center justify-between gap-2.5">
                        {trackingType === 'order' ? (
                            /* Store & Courier Profile Snippet (Order View) */
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-10 h-10 rounded-xl bg-[#22222B] border border-[#FE7803]/40 p-1 flex-shrink-0 overflow-hidden shadow-md flex items-center justify-center">
                                    <img
                                        src={appLogoUrl || '/ridersbud_logo.png'}
                                        alt="RidersBUD Store"
                                        className="w-full h-full object-contain rounded-md"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.png'; }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                            RidersBUD Parts & Tools Store
                                        </h4>
                                        <span className="bg-[#FE7803]/10 text-[#FE7803] border border-[#FE7803]/20 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                            Dispatch Hub
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-300 truncate mt-0.5 flex items-center gap-1 font-medium">
                                        <span className="text-[#FE7803] font-bold">📍 Origin: Carmona Hub</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-emerald-400 font-bold truncate">Dest: {destinationAddress || customerAddress || 'Client Location'}</span>
                                    </p>
                                </div>
                            </div>
                        ) : viewMode === 'mechanic' ? (
                            /* Customer Profile Snippet (Mechanic View) */
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-10 h-10 rounded-xl bg-[#22222B] border border-emerald-500/40 p-0.5 flex-shrink-0 overflow-hidden shadow-md">
                                    {customerImageUrl ? (
                                        <img
                                            src={customerImageUrl}
                                            alt={customerName || 'Customer'}
                                            className="w-full h-full object-cover rounded-lg"
                                            onError={(e) => { (e.target as HTMLImageElement).src = appLogoUrl; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center font-black text-sm">
                                            👤
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                            {customerName || 'Customer Destination'}
                                        </h4>
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                            Client
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-300 truncate mt-0.5 flex items-center gap-1 font-medium">
                                        {customerVehicle && (
                                            <span className="text-[#FE7803] font-bold flex items-center gap-0.5">
                                                <Car size={11} /> {customerVehicle}
                                            </span>
                                        )}
                                        {customerVehicle && customerAddress && <span className="text-gray-500">•</span>}
                                        <span className="text-gray-400 truncate">{customerAddress || (customerLocation?.address) || 'Customer Location'}</span>
                                    </p>
                                </div>
                            </div>
                        ) : (!isMechanicAssigned && isHqOriginService) ? (
                            /* HQ Dispatch Hub Snippet (For HQ-origin services like Car Rental, Towing, Driver Hire, Liaison) */
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-10 h-10 rounded-xl bg-[#22222B] border border-[#FE7803]/40 p-1 flex-shrink-0 overflow-hidden shadow-md flex items-center justify-center">
                                    <img
                                        src={appLogoUrl || '/ridersbud_logo.png'}
                                        alt="RidersBUD Central HQ"
                                        className="w-full h-full object-contain rounded-md"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.png'; }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                            {defaultHqName}
                                        </h4>
                                        <span className="bg-[#FE7803]/10 text-[#FE7803] border border-[#FE7803]/20 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                            {serviceType || 'Dispatch HQ'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-300 truncate mt-0.5 flex items-center gap-1 font-medium">
                                        <span className="text-[#FE7803] font-bold">📍 HQ: {defaultHqAddress.split(',')[0]}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-emerald-400 font-bold truncate">Client: {destinationAddress || customerAddress || 'Customer Address'}</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Mechanic Profile Snippet (Customer View) */
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-10 h-10 rounded-xl bg-[#22222B] border border-[#FE7803]/40 p-0.5 flex-shrink-0 overflow-hidden shadow-md">
                                    <img
                                        src={mechanic?.imageUrl || appLogoUrl}
                                        alt={mechanic?.name || 'Mechanic'}
                                        className="w-full h-full object-cover rounded-lg"
                                        onError={(e) => { (e.target as HTMLImageElement).src = appLogoUrl; }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                            {mechanic?.name || 'Assigned Specialist'}
                                        </h4>
                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                            Verified Pro
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                        {mechanic?.specializations?.join(', ') || 'Automotive Specialist'}
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default LiveRouteMapModal;

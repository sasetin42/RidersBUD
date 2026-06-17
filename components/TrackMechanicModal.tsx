import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';

declare const L: any;

// Haversine distance formula to calculate distance between two lat/lng points
const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Function to generate a more realistic, winding route
const generateSimulatedRoute = (start: [number, number], end: [number, number], numPoints: number = 20): [number, number][] => {
    const route: [number, number][] = [start];
    const [startLat, startLng] = start;
    const [endLat, endLng] = end;
    const latDiff = endLat - startLat;
    const lngDiff = endLng - startLng;
    const totalDistance = getDistanceInKm(startLat, startLng, endLat, endLng);
    const wobbleFactor = Math.min(totalDistance * 0.1, 0.005);

    for (let i = 1; i < numPoints; i++) {
        const progress = i / numPoints;
        const interpLat = startLat + latDiff * progress;
        const interpLng = startLng + lngDiff * progress;
        const offsetX = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);
        const offsetY = (Math.random() - 0.5) * wobbleFactor * (Math.random() > 0.5 ? 1 : -1);
        route.push([interpLat + offsetX, interpLng + offsetY]);
    }
    route.push(end);
    return route;
};

const calculateRemainingDistance = (route: [number, number][], currentIndex: number): number => {
    let dist = 0;
    for (let i = currentIndex; i < route.length - 1; i++) {
        dist += getDistanceInKm(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    }
    return dist;
};

interface TrackMechanicModalProps {
    booking: Booking;
    onClose: () => void;
    onShare: () => void;
    customerLocation: { lat: number; lng: number } | null
}

const TrackMechanicModal: React.FC<TrackMechanicModalProps> = ({ booking, onClose, onShare, customerLocation }) => {
    const { db } = useDatabase();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);

    // Get live mechanic data from the database
    const liveMechanic = useMemo(() => {
        if (!db?.mechanics || !booking.mechanic?.id) return booking.mechanic;
        return db.mechanics.find(m => m.id === booking.mechanic?.id) || booking.mechanic;
    }, [db?.mechanics, booking.mechanic?.id]);

    const destination = customerLocation;

    const routeInfo = useMemo(() => {
        if (!liveMechanic || !destination) return { distance: '---', eta: '---' };

        const dist = getDistanceInKm(liveMechanic.lat, liveMechanic.lng, destination.lat, destination.lng);
        // Estimate ETA assuming 30km/h city traffic
        const etaMins = Math.ceil((dist / 30) * 60);

        return {
            distance: dist < 0.1 ? 'Arrived' : `${dist.toFixed(1)} km`,
            eta: dist < 0.1 ? 'Now' : `${etaMins} min`
        };
    }, [liveMechanic?.lat, liveMechanic?.lng, destination]);

    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];
    const currentStatusIndex = useMemo(() => {
        const historyStatuses = booking.statusHistory?.map(h => h.status) || [];
        const allStatuses = [...historyStatuses, booking.status];

        let highestIndex = -1;
        allStatuses.forEach(status => {
            const indexInTimeline = timelineSteps.indexOf(status as BookingStatus);
            if (indexInTimeline > highestIndex) {
                highestIndex = indexInTimeline;
            }
        });
        return highestIndex;
    }, [booking.status, booking.statusHistory]);

    // Initialize Map
    useEffect(() => {
        if (!mapRef.current || !liveMechanic || !destination || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([liveMechanic.lat, liveMechanic.lng], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);

        // Home / Customer destination marker
        const homeIcon = L.divIcon({
            html: `<div class="rb-home-wrapper">
                <div class="rb-home-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;color:#1a1a1a;" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                </div>
                <div class="rb-home-stem"></div>
                <div class="rb-home-dot"></div>
            </div>`,
            className: 'rb-leaflet-icon',
            iconSize: [56, 70],
            iconAnchor: [28, 70],
        });
        L.marker([destination.lat, destination.lng], { icon: homeIcon }).addTo(mapInstanceRef.current);

        // Mechanic / vehicle marker
        const mechanicIcon = L.divIcon({
            html: `<div class="rb-mechanic-wrapper">
                <div class="rb-mechanic-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;color:#fff;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                    </svg>
                </div>
                <div class="rb-mechanic-stem"></div>
                <div class="rb-mechanic-dot"></div>
            </div>`,
            className: 'rb-leaflet-icon',
            iconSize: [60, 76],
            iconAnchor: [30, 76],
        });
        mechanicMarkerRef.current = L.marker([liveMechanic.lat, liveMechanic.lng], { icon: mechanicIcon }).addTo(mapInstanceRef.current);

        // Initial route line
        polylineRef.current = L.polyline([[liveMechanic.lat, liveMechanic.lng], [destination.lat, destination.lng]], {
            color: '#FE7803',
            weight: 3,
            opacity: 0.5,
            dashArray: '10, 10'
        }).addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update Marker position when liveMechanic updates
    useEffect(() => {
        if (mapInstanceRef.current && liveMechanic && destination && mechanicMarkerRef.current) {
            const newPos = [liveMechanic.lat, liveMechanic.lng];
            mechanicMarkerRef.current.setLatLng(newPos);

            if (polylineRef.current) {
                polylineRef.current.setLatLngs([newPos, [destination.lat, destination.lng]]);
            }

            // Smoothly pan map to center both points if distance is small, or follow mechanic
            const bounds = L.latLngBounds([newPos, [destination.lat, destination.lng]]);
            mapInstanceRef.current.flyToBounds(bounds.pad(0.3), { duration: 2, easeLinearity: 0.25 });
        }
    }, [liveMechanic?.lat, liveMechanic?.lng]);


    if (!liveMechanic) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex flex-col z-[100] animate-fadeIn" role="dialog" aria-modal="true">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-6 sm:px-8 flex-shrink-0">
                <h2 className="text-2xl font-black text-white  tracking-tighter">Track Mechanic</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 text-white transition-all rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </header>

            <main className="flex-grow flex flex-col px-4 sm:px-6 pb-6 space-y-4 overflow-y-auto scrollbar-hide">
                {/* 1. Status Timeline Card (Vertical like image) */}
                <div className="bg-[#1A2230] p-8 rounded-[2rem] border border-white/5 shadow-2xl animate-slideUp">
                    <div className="space-y-6">
                        {timelineSteps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isActive = index === currentStatusIndex;
                            const historyEntry = booking.statusHistory?.find(h => h.status === step);

                            return (
                                <div key={step} className="relative flex gap-6">
                                    {/* Vertical Line */}
                                    {index < timelineSteps.length - 1 && (
                                        <div className={`absolute left-2.5 top-6 w-[2px] h-full ${index < currentStatusIndex ? 'bg-primary' : 'bg-white/5'
                                            }`}></div>
                                    )}

                                    {/* Dot */}
                                    <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-700 ${isActive ? 'bg-primary ring-4 ring-primary/20 scale-110' : isCompleted ? 'bg-primary' : 'bg-white/10'
                                        }`}>
                                        {isCompleted && !isActive && (
                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        )}
                                        {isActive && (
                                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className="-mt-1">
                                        <h3 className={`text-sm font-black  tracking-tight ${isCompleted ? 'text-white' : 'text-gray-600'
                                            }`}>{step}</h3>
                                        <p className={`text-[10px] font-bold  tracking-widest mt-1 ${isActive ? 'text-primary' : 'text-gray-500 font-medium'
                                            }`}>
                                            {historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Map Section */}
                <div className="relative h-[280px] min-h-[280px] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden animate-slideUp delay-100">
                    <div ref={mapRef} className="absolute inset-0 z-0" />
                    <div className="absolute top-4 left-4 z-10">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-white  tracking-widest">Live View</span>
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10">
                        <button onClick={() => mapInstanceRef.current?.flyTo([liveMechanic.lat, liveMechanic.lng], 16)} className="p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-2xl border border-white/10 shadow-2xl transition-all active:scale-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>

                {/* 3. Stats & Mechanic Profile Footer Overlay-style */}
                <div className="bg-[#1A2230] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl animate-slideUp delay-200">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-500  tracking-widest mb-2 opacity-60 px-1">ETA</p>
                            <p className="text-3xl font-black text-primary tracking-tighter leading-none">{routeInfo.eta}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-500  tracking-widest mb-2 opacity-60 px-1">Distance</p>
                            <p className="text-3xl font-black text-white tracking-tighter leading-none">{routeInfo.distance}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                        <div className="relative">
                            <img 
                                src={liveMechanic.imageUrl || '/riders-logo.png'} 
                                alt={liveMechanic.name} 
                                className="w-14 h-14 rounded-2xl object-cover" 
                                onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#1A2230] rounded-full"></div>
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">{liveMechanic.name}</h3>
                            <p className="text-[10px] font-black text-gray-500  tracking-[0.2em] mb-3">Professional Technician</p>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                    <span className="text-[7px] font-black text-green-400  tracking-widest">Verified Safety</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                    <span className="text-[7px] font-black text-blue-400  tracking-widest">Full Coverage</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 self-start">
                            <a href={`tel:${liveMechanic.phone}`} className="p-4 bg-white/5 hover:bg-primary/20 text-white hover:text-primary rounded-2xl border border-white/5 transition-all shadow-xl active:scale-90">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C11.5 18 2 8.5 2 3z" /></svg>
                            </a>
                            <button onClick={onShare} className="p-4 bg-white/5 hover:bg-primary/20 text-white hover:text-primary rounded-2xl border border-white/5 transition-all shadow-xl active:scale-90">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrackMechanicModal;

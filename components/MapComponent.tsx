

import React, { useEffect, useRef, ReactNode } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getLeafletTileConfig } from '../utils/mapTileProviders';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

export interface MapMarker {
    id: string; // Unique ID for each marker to enable efficient updates
    position: [number, number];
    popupContent?: string | ReactNode;
    icon?: any; // Leaflet icon (L.Icon or L.DivIcon)
}

export interface MapPolyline {
    id: string;
    positions: [number, number][];
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    lineCap?: string;
    lineJoin?: string;
}

interface MapComponentProps {
    center: [number, number];
    zoom: number;
    markers?: MapMarker[];
    polylines?: MapPolyline[];
    bounds?: any; // Optional Leaflet bounds object to fit the view
    className?: string;
    style?: React.CSSProperties;
    onMapClick?: (event: { latlng: { lat: number, lng: number } }) => void;
    disableScrollZoom?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
    center,
    zoom,
    markers = [],
    polylines = [],
    bounds,
    className = '',
    style = {},
    onMapClick,
    disableScrollZoom = false,
}) => {
    const { db } = useDatabase();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({}); // Store marker instances by id

    const [leafletLoaded, setLeafletLoaded] = React.useState(typeof window !== 'undefined' && !!(window as any).L);
    const [mapReadyVersion, setMapReadyVersion] = React.useState(0);

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

    // Initialize map on component mount
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || typeof L === 'undefined') {
            return;
        }

        mapInstanceRef.current = L.map(mapRef.current, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            scrollWheelZoom: !disableScrollZoom,
        });

        const tileConfig = getLeafletTileConfig(db?.settings);
        tileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(mapInstanceRef.current);

        // Reset tracking references for new map instance
        markersRef.current = {};
        polylinesRef.current = {};
        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        polylinesLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

        // Trigger reactive marker and polyline placement
        setMapReadyVersion(v => v + 1);

        if (onMapClick) {
            mapInstanceRef.current.on('click', onMapClick);
        }

        // Invalidate size after initialization to fix gray tiles in modals immediately
        const timer1 = setTimeout(() => {
            if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 100);
        const timer2 = setTimeout(() => {
            if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 300);
        const timer3 = setTimeout(() => {
            if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 600);

        // Cleanup function to remove map instance on unmount
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            if (markersLayerRef.current) {
                try { markersLayerRef.current.clearLayers(); } catch (e) {}
                markersLayerRef.current = null;
            }
            if (polylinesLayerRef.current) {
                try { polylinesLayerRef.current.clearLayers(); } catch (e) {}
                polylinesLayerRef.current = null;
            }
            markersRef.current = {};
            polylinesRef.current = {};
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [leafletLoaded]); // Re-run when leaflet finishes loading

    // Update map view when center or zoom props change
    useEffect(() => {
        if (mapInstanceRef.current && !bounds) { // Only set view if not fitting to bounds
            mapInstanceRef.current.setView(center, zoom);
        }
    }, [center, zoom, bounds]);

    // Fit map to bounds when provided
    useEffect(() => {
        if (mapInstanceRef.current && bounds) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
            // Invalidate after fitting bounds to ensure proper rendering
            setTimeout(() => {
                if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
            }, 200);
        }
    }, [bounds]);

    // Fallback default icon for markers that don't provide one
    const defaultIconRef = useRef<any>(null);
    const getDefaultIcon = () => {
        if (!defaultIconRef.current && typeof L !== 'undefined') {
            defaultIconRef.current = L.divIcon({
                html: '<div style="background:#FE7803;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
                className: 'bg-transparent border-0',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
        }
        return defaultIconRef.current;
    };

    // Sync markers with the `markers` prop efficiently
    useEffect(() => {
        if (!markersLayerRef.current || typeof L === 'undefined') return;

        const currentMarkerIds = new Set(Object.keys(markersRef.current));
        const newMarkerIds = new Set(markers.map(m => m.id));

        // Remove old markers that are no longer in the props
        for (const id of currentMarkerIds) {
            if (!newMarkerIds.has(id)) {
                try {
                    markersLayerRef.current.removeLayer(markersRef.current[id]);
                } catch (e) {
                    // Marker may not have been properly initialized
                }
                delete markersRef.current[id];
            }
        }

        // Add or update markers
        markers.forEach(markerData => {
            if (!markerData || !markerData.position || isNaN(markerData.position[0]) || isNaN(markerData.position[1])) {
                return;
            }

            if (markersRef.current[markerData.id]) {
                // Marker exists, update its position and icon
                const marker = markersRef.current[markerData.id];
                try {
                    marker.setLatLng(markerData.position);
                    if (markerData.icon) marker.setIcon(markerData.icon);
                    if (markerData.popupContent) marker.setPopupContent(markerData.popupContent);
                    // Ensure marker is attached to current layer
                    if (!markersLayerRef.current.hasLayer(marker)) {
                        markersLayerRef.current.addLayer(marker);
                    }
                } catch (e) {
                    // Marker may be in a bad state, remove and recreate
                    try { markersLayerRef.current.removeLayer(marker); } catch (e2) {}
                    delete markersRef.current[markerData.id];
                    const newMarker = L.marker(markerData.position, { icon: markerData.icon || getDefaultIcon() });
                    if (markerData.popupContent) newMarker.bindPopup(markerData.popupContent);
                    markersLayerRef.current.addLayer(newMarker);
                    markersRef.current[markerData.id] = newMarker;
                }
            } else {
                // New marker, create and add it
                const marker = L.marker(markerData.position, { icon: markerData.icon || getDefaultIcon() });
                if (markerData.popupContent) marker.bindPopup(markerData.popupContent);
                markersLayerRef.current.addLayer(marker);
                markersRef.current[markerData.id] = marker;
            }
        });
    }, [markers, mapReadyVersion]); // Re-run whenever markers or mapReadyVersion change

    // Polylines layer
    const polylinesLayerRef = useRef<any>(null);
    const polylinesRef = useRef<Record<string, any>>({});

    useEffect(() => {
        if (!mapInstanceRef.current || typeof L === 'undefined') return;
        if (!polylinesLayerRef.current) {
            polylinesLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        }

        const currentPolylineIds = new Set(Object.keys(polylinesRef.current));
        const newPolylineIds = new Set(polylines.map(p => p.id));

        for (const id of currentPolylineIds) {
            if (!newPolylineIds.has(id)) {
                try {
                    polylinesLayerRef.current.removeLayer(polylinesRef.current[id]);
                } catch (e) {}
                delete polylinesRef.current[id];
            }
        }

        polylines.forEach(p => {
            if (!p.positions || p.positions.length < 2) return;
            if (polylinesRef.current[p.id]) {
                const poly = polylinesRef.current[p.id];
                try {
                    poly.setLatLngs(p.positions);
                    poly.setStyle({
                        color: p.color || '#FE7803',
                        weight: p.weight || 4,
                        opacity: p.opacity || 0.8,
                        dashArray: p.dashArray,
                        lineCap: p.lineCap || 'round',
                        lineJoin: p.lineJoin || 'round'
                    });
                    if (!polylinesLayerRef.current.hasLayer(poly)) {
                        polylinesLayerRef.current.addLayer(poly);
                    }
                } catch (e) {
                    try { polylinesLayerRef.current.removeLayer(poly); } catch (e2) {}
                    delete polylinesRef.current[p.id];
                    const newPoly = L.polyline(p.positions, {
                        color: p.color || '#FE7803',
                        weight: p.weight || 4,
                        opacity: p.opacity || 0.8,
                        dashArray: p.dashArray,
                        lineCap: p.lineCap || 'round',
                        lineJoin: p.lineJoin || 'round'
                    }).addTo(polylinesLayerRef.current);
                    polylinesRef.current[p.id] = newPoly;
                }
            } else {
                const newPoly = L.polyline(p.positions, {
                    color: p.color || '#FE7803',
                    weight: p.weight || 4,
                    opacity: p.opacity || 0.8,
                    dashArray: p.dashArray,
                    lineCap: p.lineCap || 'round',
                    lineJoin: p.lineJoin || 'round'
                }).addTo(polylinesLayerRef.current);
                polylinesRef.current[p.id] = newPoly;
            }
        });
    }, [polylines, mapReadyVersion]);

    return <div ref={mapRef} className={className} style={{ height: '100%', width: '100%', zIndex: 0, ...style }} />;
};

export default MapComponent;

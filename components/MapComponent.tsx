

import React, { useEffect, useRef, ReactNode } from 'react';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

export interface MapMarker {
    id: string; // Unique ID for each marker to enable efficient updates
    position: [number, number];
    popupContent?: string | ReactNode;
    icon?: any; // Leaflet icon (L.Icon or L.DivIcon)
}

interface MapComponentProps {
    center: [number, number];
    zoom: number;
    markers?: MapMarker[];
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
    bounds,
    className = '',
    style = {},
    onMapClick,
    disableScrollZoom = false,
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({}); // Store marker instances by id

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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(mapInstanceRef.current);

        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        
        if (onMapClick) {
            mapInstanceRef.current.on('click', onMapClick);
        }

        // Cleanup function to remove map instance on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once

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
        }
    }, [bounds]);

    // Sync markers with the `markers` prop efficiently
    useEffect(() => {
        if (!markersLayerRef.current) return;

        const currentMarkerIds = new Set(Object.keys(markersRef.current));
        const newMarkerIds = new Set(markers.map(m => m.id));

        // Remove old markers that are no longer in the props
        for (const id of currentMarkerIds) {
            if (!newMarkerIds.has(id)) {
                markersLayerRef.current.removeLayer(markersRef.current[id]);
                delete markersRef.current[id];
            }
        }

        // Add or update markers
        markers.forEach(markerData => {
            if (markersRef.current[markerData.id]) {
                // Marker exists, update its position and icon
                const marker = markersRef.current[markerData.id];
                marker.setLatLng(markerData.position);
                if (markerData.icon) marker.setIcon(markerData.icon);
                if (markerData.popupContent) marker.setPopupContent(markerData.popupContent);
            } else {
                // New marker, create and add it
                const marker = L.marker(markerData.position, { icon: markerData.icon });
                if (markerData.popupContent) marker.bindPopup(markerData.popupContent);
                markersLayerRef.current.addLayer(marker);
                markersRef.current[markerData.id] = marker;
            }
        });
    }, [markers]); // Re-run whenever markers change

    return <div ref={mapRef} className={className} style={{ height: '100%', width: '100%', ...style }} />;
};

export default MapComponent;
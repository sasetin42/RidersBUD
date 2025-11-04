
import React, { useEffect, useRef, ReactNode } from 'react';

// Declare L to satisfy TypeScript since it's loaded from the CDN in index.html
declare const L: any;

export interface MapMarker {
    position: [number, number];
    popupContent?: string | ReactNode;
    icon?: any; // Leaflet icon (L.Icon or L.DivIcon)
}

interface MapComponentProps {
    center: [number, number];
    zoom: number;
    markers?: MapMarker[];
    className?: string;
    style?: React.CSSProperties;
    onMapClick?: (event: { latlng: { lat: number, lng: number } }) => void;
    disableScrollZoom?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
    center,
    zoom,
    markers = [],
    className = '',
    style = {},
    onMapClick,
    disableScrollZoom = false,
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);

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
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(center, zoom);
        }
    }, [center, zoom]);


    // Sync markers with the `markers` prop
    useEffect(() => {
        if (!markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        markers.forEach(markerData => {
            const marker = L.marker(markerData.position, { icon: markerData.icon });
            
            if (markerData.popupContent && typeof markerData.popupContent === 'string') {
                marker.bindPopup(markerData.popupContent);
            }
            
            markersLayerRef.current.addLayer(marker);
        });

    }, [markers]); // Re-run whenever markers change

    return <div ref={mapRef} className={className} style={{ height: '100%', width: '100%', ...style }} />;
};

export default MapComponent;

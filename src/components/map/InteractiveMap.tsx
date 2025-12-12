import React from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useDatabase } from '../../context/DatabaseContext';

interface InteractiveMapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    markers?: MapMarkerData[];
    onMarkerClick?: (marker: MapMarkerData) => void;
    onMapClick?: (location: { lat: number; lng: number }) => void;
    showUserLocation?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export interface MapMarkerData {
    id: string;
    position: { lat: number; lng: number };
    type: 'mechanic' | 'customer' | 'user';
    title?: string;
    subtitle?: string;
    icon?: string;
    data?: any;
}

const defaultCenter = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines
const defaultZoom = 13;

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        }
    ]
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
    center = defaultCenter,
    zoom = defaultZoom,
    markers = [],
    onMarkerClick,
    onMapClick,
    showUserLocation = false,
    className = '',
    children
}) => {
    const { db } = useDatabase();
    const [selectedMarker, setSelectedMarker] = React.useState<MapMarkerData | null>(null);
    const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);

    const apiKey = db?.settings?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    // Get user location
    React.useEffect(() => {
        if (showUserLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Error getting user location:', error);
                }
            );
        }
    }, [showUserLocation]);

    const handleMarkerClick = (marker: MapMarkerData) => {
        setSelectedMarker(marker);
        onMarkerClick?.(marker);
    };

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        setSelectedMarker(null);
        if (e.latLng) {
            onMapClick?.({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            });
        }
    };

    if (!apiKey) {
        return (
            <div className={`flex items-center justify-center bg-gray-800 text-white ${className}`}>
                <div className="text-center p-8">
                    <p className="text-lg font-bold mb-2">Google Maps Not Configured</p>
                    <p className="text-sm text-gray-400">
                        Please add your Google Maps API key in Settings
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <LoadScript googleMapsApiKey={apiKey}>
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={zoom}
                    options={mapOptions}
                    onClick={handleMapClick}
                >
                    {/* User location marker */}
                    {showUserLocation && userLocation && (
                        <Marker
                            position={userLocation}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2
                            }}
                        />
                    )}

                    {/* Custom markers */}
                    {markers.map((marker) => (
                        <Marker
                            key={marker.id}
                            position={marker.position}
                            onClick={() => handleMarkerClick(marker)}
                            icon={marker.icon}
                        />
                    ))}

                    {/* Info window for selected marker */}
                    {selectedMarker && (
                        <InfoWindow
                            position={selectedMarker.position}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div className="p-2">
                                <h3 className="font-bold text-gray-900">{selectedMarker.title}</h3>
                                {selectedMarker.subtitle && (
                                    <p className="text-sm text-gray-600">{selectedMarker.subtitle}</p>
                                )}
                            </div>
                        </InfoWindow>
                    )}

                    {/* Additional children (routes, polygons, etc) */}
                    {children}
                </GoogleMap>
            </LoadScript>
        </div>
    );
};

export default InteractiveMap;

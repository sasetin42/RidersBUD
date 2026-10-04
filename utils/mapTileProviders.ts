import { Settings } from '../types';

export interface TileProviderOption {
    id: 'osm-dark' | 'osm' | 'esri-dark' | 'esri-satellite' | 'esri-streets' | 'cyclosm' | 'custom';
    name: string;
    description: string;
    badge: string;
    url: string;
    attribution: string;
    maxZoom: number;
    subdomains?: string;
}

export const LEAFLET_TILE_PROVIDERS: Record<string, TileProviderOption> = {
    'osm-dark': {
        id: 'osm-dark',
        name: 'OpenStreetMap Night (Dark Mode)',
        description: 'High-contrast dark night mode styled for RidersBUD without watermark.',
        badge: 'Recommended Dark',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: 'abc'
    },
    'osm': {
        id: 'osm',
        name: 'OpenStreetMap Standard',
        description: 'Classic open community street map tiles with full global road coverage.',
        badge: 'Standard OSM',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: 'abc'
    },
    'esri-dark': {
        id: 'esri-dark',
        name: 'ESRI Dark Gray Canvas',
        description: 'Clean, professional slate dark gray map base with clear roads.',
        badge: 'Slate Dark',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin',
        maxZoom: 16
    },
    'esri-satellite': {
        id: 'esri-satellite',
        name: 'ESRI World Satellite Imagery',
        description: 'High-resolution global satellite and aerial photography with zero watermarks.',
        badge: 'Satellite HD',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
        maxZoom: 19
    },
    'esri-streets': {
        id: 'esri-streets',
        name: 'ESRI World Street Map',
        description: 'Detailed commercial grade highway, turnpike, and city road network tiles.',
        badge: 'Highway & Streets',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS',
        maxZoom: 19
    },
    'cyclosm': {
        id: 'cyclosm',
        name: 'CyclOSM Live Transport',
        description: 'Specialized bike, motorcycle and transit routes with elevation contours.',
        badge: 'Transport & Routes',
        url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.cyclosm.org/">CyclOSM</a> &copy; OpenStreetMap',
        maxZoom: 18,
        subdomains: 'abc'
    },
    'custom': {
        id: 'custom',
        name: 'Custom Tile Server URL',
        description: 'Provide your own Mapbox, MapTiler, or self-hosted Tile Server endpoint.',
        badge: 'Custom Endpoint',
        url: '',
        attribution: '&copy; Custom Map Data',
        maxZoom: 20
    }
};

/**
 * Resolves active Leaflet tile layer configuration from app settings
 */
export const getLeafletTileConfig = (settings?: Settings | null) => {
    const providerId = settings?.leafletTileProvider || 'osm-dark';
    const provider = LEAFLET_TILE_PROVIDERS[providerId] || LEAFLET_TILE_PROVIDERS['osm-dark'];

    if (providerId === 'custom' && settings?.leafletCustomTileUrl) {
        return {
            providerId,
            url: settings.leafletCustomTileUrl,
            options: {
                attribution: settings.leafletCustomAttribution || '&copy; Custom Map Data',
                maxZoom: 20
            }
        };
    }

    return {
        providerId: provider.id,
        url: provider.url,
        options: {
            attribution: provider.attribution,
            maxZoom: provider.maxZoom,
            subdomains: provider.subdomains || 'abc'
        }
    };
};

/**
 * Calculates bearing angle in degrees between two GPS coordinates (0 = North, 90 = East)
 */
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLambda = toRad(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const theta = Math.atan2(y, x);

    return (toDeg(theta) + 360) % 360;
};

/**
 * Haversine formula to compute distance in kilometers
 */
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// utils/fallbackImages.ts

// Curated high-resolution Unsplash images for common automotive services
const FALLBACK_IMAGES: Record<string, string> = {
    'Oil Change': 'https://images.unsplash.com/photo-1599540679758-00d86bd4fa9a?q=80&w=800&auto=format&fit=crop', // Mechanic pouring oil
    'Brakes': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop', // Close up of car wheel/brakes
    'Diagnostics': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop', // Person looking at engine with device
    'Tires': 'https://images.unsplash.com/photo-1601002361667-0c1fc998d363?q=80&w=800&auto=format&fit=crop', // Stack of tires
    'Battery': 'https://images.unsplash.com/photo-1635393166946-b25b6a71e06d?q=80&w=800&auto=format&fit=crop', // Car battery / engine bay
    'Wash': 'https://images.unsplash.com/photo-1520340356584-f9917d1e5114?q=80&w=800&auto=format&fit=crop', // Car wash / wet car
    'Detailing': 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop', // Polishing car
    'Engine': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop', // Engine bay
    'Transmission': 'https://images.unsplash.com/photo-1530906358829-e84b27691b1d?q=80&w=800&auto=format&fit=crop', // Gears/mechanical
    'Suspension': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop',
    'Air Conditioning': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
    'General': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop', // Premium general mechanic shot
};

/**
 * Returns a fallback premium image URL based on the category of the service.
 * If the category is not specifically mapped, returns a generic premium automotive image.
 */
export const getFallbackImageForCategory = (category?: string): string => {
    if (!category) return FALLBACK_IMAGES['General'];
    
    // Attempt exact match or substring match
    const keys = Object.keys(FALLBACK_IMAGES);
    for (const key of keys) {
        if (category.toLowerCase().includes(key.toLowerCase())) {
            return FALLBACK_IMAGES[key];
        }
    }
    
    return FALLBACK_IMAGES['General'];
};

/**
 * Normalizes service image URLs to prevent relative path routing issues and CORB blocks.
 * If the image name is a known missing asset, falls back to a curated Unsplash image.
 */
export const normalizeServiceImage = (url?: string, category?: string): string => {
    if (!url) return getFallbackImageForCategory(category);
    
    // If it's already an absolute or external URL, leave it as is (add cache buster for Firebase Storage)
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
        if (url.includes('firebasestorage.googleapis.com') && !url.includes('_cb=')) {
            return url + (url.includes('?') ? '&' : '?') + '_cb=1';
        }
        return url;
    }
    
    // Map missing local image names directly to high-quality Unsplash fallbacks
    const urlLower = url.toLowerCase();
    if (urlLower.includes('diagnostics')) {
        return FALLBACK_IMAGES['Diagnostics'];
    }
    if (urlLower.includes('body_repair') || urlLower.includes('body-repair') || urlLower.includes('bodywork') || urlLower.includes('body work')) {
        return FALLBACK_IMAGES['Detailing'];
    }
    
    // For local assets (e.g. service_brakes.png), prefix with a leading slash to route correctly from the root
    return `/${url}`;
};


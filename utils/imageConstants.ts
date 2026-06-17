/**
 * Premium Image Constants
 * Using high-quality fallbacks for a premium look
 */

export const MOCKUPS = {
    LOGO_PREMIUM: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&w=200&q=80', // Motorcycle silhouette
    DEFAULT_AVATAR: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    CAR_PLACEHOLDER: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    MOTORCYCLE_PLACEHOLDER: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&w=800&q=80',
    PARTS_PLACEHOLDER: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=800&q=80',
    MAINTENANCE_BANNER: 'https://images.unsplash.com/photo-1530046339160-ce3e5b0c7a2f?auto=format&fit=crop&w=1200&q=80',
    MECHANIC_BANNER: 'https://images.unsplash.com/photo-1530046339160-ce3e5b0c7a2f?auto=format&fit=crop&w=1200&q=80',
    PARTS_STORE_BANNER: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80',
    GENUINE_PARTS_TEXTURE: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=800&q=80',
    PREMIUM_SERVICE_BANNER: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
    TURBO_PART: '/images/mockups/brembo_brake_disc.png',
};

/**
 * Helper to get a profile image URL with a fallback to premium avatar or ui-avatars
 */
export const getProfileImage = (url?: string, name?: string) => {
    if (url && url.trim() !== '' && !url.includes('placeholder') && !url.startsWith('blob:') && !url.startsWith('file:') && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) return url;
    return '/riders-logo.png';
};

/**
 * Helper to get a vehicle image URL with a fallback based on type
 */
export const getVehicleImage = (input?: string[] | string, type: 'Car' | 'Motorcycle' = 'Car') => {
    if (!input) {
        return type === 'Motorcycle' ? MOCKUPS.MOTORCYCLE_PLACEHOLDER : MOCKUPS.CAR_PLACEHOLDER;
    }
    
    // Handle single string signature
    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed !== '' && !trimmed.includes('placeholder') && trimmed.length > 1) {
            return trimmed;
        }
    }
    
    // Handle array of strings signature
    if (Array.isArray(input) && input.length > 0) {
        const first = input[0];
        if (first && typeof first === 'string') {
            const trimmed = first.trim();
            if (trimmed !== '' && !trimmed.includes('placeholder') && trimmed.length > 1) {
                return trimmed;
            }
        }
    }
    
    return type === 'Motorcycle' ? MOCKUPS.MOTORCYCLE_PLACEHOLDER : MOCKUPS.CAR_PLACEHOLDER;
};

/**
 * Helper to get a product/part image URL
 */
export const getProductImage = (url?: string) => {
    if (url && url.trim() !== '' && !url.includes('placeholder')) return url;
    return MOCKUPS.PARTS_PLACEHOLDER;
};

/**
 * Common storage paths for different asset types
 */
export const STORAGE_PATHS = {
    AVATARS: (uid: string) => `users/${uid}/avatar_${Date.now()}.jpg`,
    MECHANICS: (uid: string) => `mechanics/${uid}/profile_${Date.now()}.jpg`,
    VEHICLES: (uid: string, vehicleId: string) => `users/${uid}/vehicles/${vehicleId}/image_${Date.now()}.jpg`,
    PORTFOLIO: (uid: string) => `mechanics/${uid}/portfolio/work_${Date.now()}.jpg`,
    VERIFICATION: (uid: string, type: string) => `mechanics/${uid}/verification/${type}_${Date.now()}.jpg`,
};


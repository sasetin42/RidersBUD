// utils/fallbackImages.ts

// Curated high-resolution Unsplash images for common automotive services
const FALLBACK_IMAGES: Record<string, string> = {
    'Oil Change': 'https://images.unsplash.com/photo-1599540679758-00d86bd4fa9a?q=80&w=800&auto=format&fit=crop',
    'Change Oil': 'https://images.unsplash.com/photo-1599540679758-00d86bd4fa9a?q=80&w=800&auto=format&fit=crop',
    'Diagnostics': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'Engine Diagnostics': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'PMS': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
    'Tune-up': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    'Engine Tune-up': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    'Engine Tune-Up': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    'Body Repair': 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop',
    'Aircon': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
    'Air Conditioning': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
    'Brakes': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',
    'Tires': 'https://images.unsplash.com/photo-1601002361667-0c1fc998d363?q=80&w=800&auto=format&fit=crop',
    'Battery': 'https://images.unsplash.com/photo-1635393166946-b25b6a71e06d?q=80&w=800&auto=format&fit=crop',
    'Wash': 'https://images.unsplash.com/photo-1520340356584-f9917d1e5114?q=80&w=800&auto=format&fit=crop',
    'Detailing': 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop',
    'Engine': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    'Transmission': 'https://images.unsplash.com/photo-1530906358829-e84b27691b1d?q=80&w=800&auto=format&fit=crop',
    'Suspension': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop',
    'General': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
};

/**
 * Returns a fallback premium image URL based on the category or service name.
 * If the category is not specifically mapped, returns a generic premium automotive image.
 */
export const getFallbackImageForCategory = (category?: string, serviceName?: string): string => {
    if (serviceName) {
        const nameLower = serviceName.toLowerCase();
        for (const [key, val] of Object.entries(FALLBACK_IMAGES)) {
            if (nameLower.includes(key.toLowerCase())) {
                return val;
            }
        }
    }
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
export const normalizeServiceImage = (url?: string, category?: string, serviceName?: string): string => {
    if (!url || url.includes('placehold.co')) return getFallbackImageForCategory(category, serviceName);
    
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
    if (urlLower.includes('pms')) {
        return FALLBACK_IMAGES['PMS'];
    }
    if (urlLower.includes('tune')) {
        return FALLBACK_IMAGES['Tune-up'];
    }
    if (urlLower.includes('oil')) {
        return FALLBACK_IMAGES['Change Oil'];
    }
    if (urlLower.includes('aircon')) {
        return FALLBACK_IMAGES['Aircon'];
    }
    
    // For local assets (e.g. service_brakes.png), prefix with a leading slash to route correctly from the root
    return `/${url}`;
};

/**
 * Curated real automotive images for car parts, tools, and accessories
 */
export const PART_FALLBACK_IMAGES: Record<string, string> = {
    // Engine & Fluids
    'oil': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop', // Engine oil & mechanics
    'synthetic engine oil': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    'motor oil': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    'air filter': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop', // Pleated air filter assembly
    'engine air filter': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
    'oil filter': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
    'spark plug': 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop',
    'coolant': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',

    // Brakes
    'brake': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop', // Brembo disc brake pad & rotor
    'brake pads': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',
    'ceramic brake pads': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',
    'brake fluid': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',
    'rotor': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',

    // Exterior & Vision
    'wiper': 'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop', // Sleek car windshield & wipers in rain
    'wiper blades': 'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop',
    'wiper blades (set of 2)': 'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop',
    'headlight': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    'mirror': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',

    // Electrical & Battery
    'battery': 'https://images.unsplash.com/photo-1635393166946-b25b6a71e06d?q=80&w=800&auto=format&fit=crop',
    'alternator': 'https://images.unsplash.com/photo-1530906358829-e84b27691b1d?q=80&w=800&auto=format&fit=crop',

    // Tires & Wheels
    'tire': 'https://images.unsplash.com/photo-1601002361667-0c1fc998d363?q=80&w=800&auto=format&fit=crop',
    'wheel': 'https://images.unsplash.com/photo-1601002361667-0c1fc998d363?q=80&w=800&auto=format&fit=crop',

    // Tools & Equipment
    'tool': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=800&auto=format&fit=crop', // Professional wrench & automotive hand tools
    'wrench': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=800&auto=format&fit=crop',
    'socket set': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'scanner': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'diagnostic': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'jack': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',

    // Category Level Fallbacks
    'category_engine': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    'category_brakes': 'https://images.unsplash.com/photo-1506015391300-4802dc7bbde2?q=80&w=800&auto=format&fit=crop',
    'category_exterior': 'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop',
    'category_tools': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=800&auto=format&fit=crop',
    'category_electrical': 'https://images.unsplash.com/photo-1635393166946-b25b6a71e06d?q=80&w=800&auto=format&fit=crop',
    'general': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop'
};

/**
 * Returns a high-resolution, contextually accurate automotive image for any Part or Tool.
 * Automatically overrides placeholder/unrelated URLs (like ocean/waves/skateboards/garlic)
 * with authentic automotive photography.
 */
export const getPartImage = (part?: any): string => {
    if (!part) return PART_FALLBACK_IMAGES['general'];

    const name = (part.name || '').toLowerCase();
    const category = (part.category || '').toLowerCase();
    const firstUrl = Array.isArray(part.imageUrls) && part.imageUrls.length > 0 ? part.imageUrls[0] : (part.imageUrl || '');

    // List of known unrelated/broken stock image URLs from older fixtures (ocean, skateboard, road blur, vegetable/garlic)
    const isUnrelatedUrl = !firstUrl ||
        firstUrl.includes('placehold.co') ||
        firstUrl.includes('placeholder.svg') ||
        firstUrl.includes('photo-1600790142055-619df03207e6') || // Unsplash garlic/produce leaf
        firstUrl.includes('photo-1615906655593-ad0386982a0f') || // ocean/sea rocks
        firstUrl.includes('photo-1492144534655-ae79c964c9d7') || // generic car lights
        firstUrl.includes('photo-1599540679758-00d86bd4fa9a');   // ocean shore

    // Specific exact product matches first
    if (name.includes('synthetic engine oil') || name.includes('engine oil') || (name.includes('oil') && category.includes('engine'))) {
        return PART_FALLBACK_IMAGES['synthetic engine oil'];
    }
    if (name.includes('brake pad') || (name.includes('pad') && category.includes('brake'))) {
        return PART_FALLBACK_IMAGES['ceramic brake pads'];
    }
    if (name.includes('air filter') || (name.includes('filter') && category.includes('engine'))) {
        return PART_FALLBACK_IMAGES['engine air filter'];
    }
    if (name.includes('wiper') || name.includes('blade')) {
        return PART_FALLBACK_IMAGES['wiper blades'];
    }
    if (name.includes('tool') || name.includes('wrench') || name.includes('socket') || category.includes('tool')) {
        return PART_FALLBACK_IMAGES['tool'];
    }

    // If the item has a valid, non-unrelated custom image provided by admin/user, keep it
    if (firstUrl && !isUnrelatedUrl) {
        return firstUrl;
    }

    // Category-based fallback
    if (category.includes('engine')) return PART_FALLBACK_IMAGES['category_engine'];
    if (category.includes('brake')) return PART_FALLBACK_IMAGES['category_brakes'];
    if (category.includes('exterior')) return PART_FALLBACK_IMAGES['category_exterior'];
    if (category.includes('tool')) return PART_FALLBACK_IMAGES['category_tools'];
    if (category.includes('electr')) return PART_FALLBACK_IMAGES['category_electrical'];

    return PART_FALLBACK_IMAGES['general'];
};



import { MOCKUP_ASSETS, UI_IMAGES } from '../constants/imageConstants';

/**
 * Returns a fallback image based on the vehicle type.
 */
export const getVehicleFallbackImage = (type?: string): string => {
  if (!type) return MOCKUP_ASSETS.CAR_FALLBACK;
  
  const lowerType = type.toLowerCase();
  if (lowerType.includes('motorcycle') || lowerType.includes('bike')) return MOCKUP_ASSETS.MOTORCYCLE_FALLBACK;
  if (lowerType.includes('suv')) return MOCKUP_ASSETS.SUV_FALLBACK;
  if (lowerType.includes('truck') || lowerType.includes('van')) return MOCKUP_ASSETS.TRUCK_FALLBACK;
  
  return MOCKUP_ASSETS.CAR_FALLBACK;
};

/**
 * Returns a profile image with a fallback to UI Avatars.
 */
export const getProfileImage = (photoURL?: string | null, name?: string | null): string => {
  if (photoURL && !photoURL.startsWith('blob:') && !photoURL.startsWith('file:')) return photoURL;
  return '/riders-logo.png';
};

import { Settings } from '../types';

export type SpecialServiceKey = 'carRental' | 'driverHire' | 'liaison' | 'towing';

export interface SpecialServiceStatus {
    enabled: boolean;
    bannerMessage?: string;
}

/**
 * Checks whether a specialized service (Car Rental, Driver for Hire, Liaison, Towing)
 * is currently enabled in the System Settings.
 *
 * Checks both:
 * 1. Operational Modules (`settings.modules`)
 * 2. Specialized Services Customizations (`settings.serviceCustomizations`)
 *
 * If either source marks the service as disabled (`enabled: false`), this function returns `false`.
 */
export function isSpecialServiceEnabled(
    serviceKey: SpecialServiceKey,
    settings?: Settings | null
): boolean {
    if (!settings) return true;

    // 1. Check Operational Modules in settings.modules
    const moduleIdMap: Record<SpecialServiceKey, string> = {
        carRental: 'rent-a-car',
        driverHire: 'driver-for-hire',
        liaison: 'liaison-assistance',
        towing: 'towing'
    };
    const targetModuleId = moduleIdMap[serviceKey];
    if (settings.modules && Array.isArray(settings.modules)) {
        const mod = settings.modules.find(m => m.id === targetModuleId);
        if (mod && mod.enabled === false) {
            return false;
        }
    }

    // 2. Check Service Customizations in settings.serviceCustomizations
    const customizations = settings.serviceCustomizations;
    if (customizations && customizations[serviceKey]) {
        if (customizations[serviceKey]?.enabled === false) {
            return false;
        }
    }

    return true;
}

/**
 * Helper to determine special service key by string match (name, slug, or category)
 */
export function matchSpecialServiceKey(text: string): SpecialServiceKey | null {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    if (
        lower.includes('rent-a-car') ||
        lower.includes('rent a car') ||
        lower.includes('car rental') ||
        lower.includes('rental')
    ) {
        return 'carRental';
    }

    if (
        lower.includes('driver-for-hire') ||
        lower.includes('driver for hire') ||
        lower.includes('hire a driver') ||
        lower.includes('driver hire')
    ) {
        return 'driverHire';
    }

    if (
        lower.includes('liaison') ||
        lower.includes('registration-assistance') ||
        lower.includes('registration assistance') ||
        lower.includes('lto')
    ) {
        return 'liaison';
    }

    if (
        lower.includes('towing') ||
        lower.includes('tow truck') ||
        lower.includes('roadside towing')
    ) {
        return 'towing';
    }

    return null;
}

/**
 * Returns whether any special service slug or name is enabled
 */
export function isSpecialServiceSlugOrNameEnabled(
    slugOrName: string,
    settings?: Settings | null
): boolean {
    const key = matchSpecialServiceKey(slugOrName);
    if (!key) return true; // Not a special service, not restricted
    return isSpecialServiceEnabled(key, settings);
}

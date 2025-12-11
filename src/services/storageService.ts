import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Service for uploading files to Supabase Storage
 */
export class StorageService {
    /**
     * Upload a file to a specific bucket
     */
    static async uploadFile(
        bucket: string,
        path: string,
        file: File,
        options?: {
            cacheControl?: string;
            upsert?: boolean;
        }
    ): Promise<{ url: string | null; error: Error | null }> {
        if (!isSupabaseConfigured()) {
            return {
                url: null,
                error: new Error('Supabase not configured'),
            };
        }

        try {
            const { data, error } = await supabase!.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: options?.cacheControl || '3600',
                    upsert: options?.upsert || false,
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase!.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return { url: publicUrl, error: null };
        } catch (error) {
            console.error('[Storage] Upload error:', error);
            return { url: null, error: error as Error };
        }
    }

    /**
     * Upload multiple files
     */
    static async uploadMultiple(
        bucket: string,
        files: { path: string; file: File }[]
    ): Promise<{ urls: string[]; errors: Error[] }> {
        const results = await Promise.all(
            files.map((f) => this.uploadFile(bucket, f.path, f.file))
        );

        const urls = results
            .filter((r) => r.url !== null)
            .map((r) => r.url!);

        const errors = results
            .filter((r) => r.error !== null)
            .map((r) => r.error!);

        return { urls, errors };
    }

    /**
     * Delete a file from storage
     */
    static async deleteFile(
        bucket: string,
        path: string
    ): Promise<{ success: boolean; error: Error | null }> {
        if (!isSupabaseConfigured()) {
            return {
                success: false,
                error: new Error('Supabase not configured'),
            };
        }

        try {
            const { error } = await supabase!.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                throw error;
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('[Storage] Delete error:', error);
            return { success: false, error: error as Error };
        }
    }

    /**
     * Get public URL for a file
     */
    static getPublicUrl(bucket: string, path: string): string | null {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const { data } = supabase!.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    /**
     * List files in a bucket
     */
    static async listFiles(
        bucket: string,
        path?: string
    ): Promise<{ files: any[]; error: Error | null }> {
        if (!isSupabaseConfigured()) {
            return {
                files: [],
                error: new Error('Supabase not configured'),
            };
        }

        try {
            const { data, error } = await supabase!.storage
                .from(bucket)
                .list(path);

            if (error) {
                throw error;
            }

            return { files: data || [], error: null };
        } catch (error) {
            console.error('[Storage] List error:', error);
            return { files: [], error: error as Error };
        }
    }
}

/**
 * Bucket names
 */
export const STORAGE_BUCKETS = {
    AVATARS: 'avatars',
    VEHICLES: 'vehicles',
    PORTFOLIOS: 'portfolios',
    BOOKINGS: 'bookings',
    PARTS: 'parts',
    BANNERS: 'banners',
} as const;

/**
 * Helper function to generate unique file path
 */
export function generateFilePath(
    userId: string,
    filename: string,
    prefix?: string
): string {
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const parts = [userId, timestamp, cleanFilename];

    if (prefix) {
        parts.unshift(prefix);
    }

    return parts.join('/');
}

/**
 * Helper to validate file type
 */
export function validateFileType(
    file: File,
    allowedTypes: string[]
): boolean {
    return allowedTypes.some((type) => {
        if (type.endsWith('/*')) {
            const category = type.split('/')[0];
            return file.type.startsWith(category + '/');
        }
        return file.type === type;
    });
}

/**
 * Helper to validate file size
 */
export function validateFileSize(
    file: File,
    maxSizeMB: number
): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

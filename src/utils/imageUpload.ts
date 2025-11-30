import { supabase } from '../lib/supabase';

// File validation constants
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_BOOKING_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates image file
 */
const validateImage = (file: File, maxSize: number): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' };
    }

    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit.` };
    }

    return { valid: true };
};

/**
 * Generates unique filename
 */
const generateFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${randomString}.${extension}`;
};

/**
 * Upload avatar image to Supabase Storage
 * @param file - Image file to upload
 * @param userId - User ID for folder organization
 * @returns Public URL of uploaded image
 */
export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
    // Validate file
    const validation = validateImage(file, MAX_AVATAR_SIZE);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Generate unique filename
    const fileName = generateFileName(file.name);
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Avatar upload error:', error);
        throw new Error(`Failed to upload avatar: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return publicUrl;
};

/**
 * Upload booking image to Supabase Storage
 * @param file - Image file to upload
 * @param bookingId - Booking ID for folder organization
 * @param type - 'before' or 'after'
 * @returns URL of uploaded image
 */
export const uploadBookingImage = async (
    file: File,
    bookingId: string,
    type: 'before' | 'after'
): Promise<string> => {
    // Validate file
    const validation = validateImage(file, MAX_BOOKING_IMAGE_SIZE);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Generate unique filename
    const fileName = generateFileName(file.name);
    const filePath = `${bookingId}/${type}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('booking-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Booking image upload error:', error);
        throw new Error(`Failed to upload booking image: ${error.message}`);
    }

    // Get authenticated URL (private bucket)
    const { data: { publicUrl } } = supabase.storage
        .from('booking-images')
        .getPublicUrl(filePath);

    return publicUrl;
};

/**
 * Delete image from Supabase Storage
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path to the file in the bucket
 */
export const deleteImage = async (bucketName: string, filePath: string): Promise<void> => {
    const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

    if (error) {
        console.error('Image deletion error:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
    }
};

/**
 * Delete old avatar when uploading new one
 * @param oldAvatarUrl - URL of the old avatar to delete
 * @param userId - User ID
 */
export const deleteOldAvatar = async (oldAvatarUrl: string, userId: string): Promise<void> => {
    if (!oldAvatarUrl) return;

    try {
        // Extract file path from URL
        const urlParts = oldAvatarUrl.split('/avatars/');
        if (urlParts.length === 2) {
            const filePath = urlParts[1];
            await deleteImage('avatars', filePath);
        }
    } catch (error) {
        console.error('Failed to delete old avatar:', error);
        // Don't throw - this is not critical
    }
};

/**
 * Upload multiple booking images
 * @param files - Array of image files
 * @param bookingId - Booking ID
 * @param type - 'before' or 'after'
 * @returns Array of uploaded image URLs
 */
export const uploadMultipleBookingImages = async (
    files: File[],
    bookingId: string,
    type: 'before' | 'after'
): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadBookingImage(file, bookingId, type));
    return Promise.all(uploadPromises);
};

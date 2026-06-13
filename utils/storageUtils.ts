import { storageService } from '../services/StorageService';

/**
 * Utility to upload an image to Firebase Storage and return the download URL.
 * Wraps storageService.uploadFile for easier use in components.
 * 
 * @param file The file to upload
 * @param path The storage path (e.g., 'profiles/user_id')
 * @returns Promise resolving to the download URL
 */
export const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    return await storageService.uploadFile(path, file);
};

/**
 * Utility to upload multiple files and return their download URLs
 */
export const uploadMultipleImagesToStorage = async (files: File[], basePath: string): Promise<string[]> => {
    const promises = files.map((file, index) => {
        const path = `${basePath}_${index}_${Date.now()}`;
        return storageService.uploadFile(path, file);
    });
    return await Promise.all(promises);
};

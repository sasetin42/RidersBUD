import { useState, useCallback } from 'react';
import { pickImages, pickSingleImage, PickedImage } from '../utils/imagePicker';
import { storageService } from '../services/StorageService';

export interface UseImagePickerOptions {
    multiple?: boolean;
    accept?: string;
    compress?: boolean;
    onPick?: (images: PickedImage[]) => void;
    onError?: (error: Error) => void;
}

export interface UseImagePickerReturn {
    isPicking: boolean;
    pick: () => Promise<PickedImage[]>;
    pickSingle: () => Promise<PickedImage | null>;
    pickAndUpload: (storagePath: string) => Promise<string | null>;
    pickMultipleAndUpload: (baseStoragePath: string) => Promise<string[]>;
}

/**
 * React hook for image picking with Android Photo Picker support.
 * Automatically uses the system photo picker on Android 13+ (no permission needed).
 * Falls back to <input type="file"> on web and iOS.
 */
export function useImagePicker(options: UseImagePickerOptions = {}): UseImagePickerReturn {
    const { multiple = false, accept = 'image/*', compress = true, onPick, onError } = options;
    const [isPicking, setIsPicking] = useState(false);

    const pick = useCallback(async (): Promise<PickedImage[]> => {
        setIsPicking(true);
        try {
            const images = await pickImages({ multiple, accept });
            onPick?.(images);
            return images;
        } catch (err) {
            onError?.(err as Error);
            return [];
        } finally {
            setIsPicking(false);
        }
    }, [multiple, accept, onPick, onError]);

    const pickSingleFn = useCallback(async (): Promise<PickedImage | null> => {
        setIsPicking(true);
        try {
            const image = await pickSingleImage(accept);
            if (image) onPick?.([image]);
            return image;
        } catch (err) {
            onError?.(err as Error);
            return null;
        } finally {
            setIsPicking(false);
        }
    }, [accept, onPick, onError]);

    const pickAndUpload = useCallback(async (storagePath: string): Promise<string | null> => {
        const image = await pickSingleFn();
        if (!image) return null;
        return storageService.uploadFile(storagePath, image.file, compress);
    }, [pickSingleFn, compress]);

    const pickMultipleAndUpload = useCallback(async (baseStoragePath: string): Promise<string[]> => {
        const images = await pick();
        if (!images.length) return [];
        return Promise.all(
            images.map((img, i) =>
                storageService.uploadFile(`${baseStoragePath}_${i}_${Date.now()}`, img.file, compress)
            )
        );
    }, [pick, compress]);

    return { isPicking, pick, pickSingle: pickSingleFn, pickAndUpload, pickMultipleAndUpload };
}

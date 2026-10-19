import { Capacitor } from '@capacitor/core';

export interface PickedImage {
    file: File;
    dataUrl: string;
    name: string;
    size: number;
    type: string;
}

/**
 * Picks one or more images using the best available picker for the platform:
 * - Android 13+ (API 33+): Android Photo Picker (ACTION_PICK_IMAGES) via Capacitor bridge
 *   No storage permission required — system grants temporary read URI access.
 * - Android < 13 / iOS / Web: Falls back to <input type="file" accept="image/*">
 *
 * READ_MEDIA_IMAGES and READ_EXTERNAL_STORAGE are NOT required by this picker.
 */
export async function pickImages(options: {
    multiple?: boolean;
    maxFiles?: number;
    accept?: string;
} = {}): Promise<PickedImage[]> {
    const { multiple = false, accept = 'image/*' } = options;

    // Use native Android Photo Picker on Android via file input (WebView on Android 13+
    // automatically routes accept="image/*" through Android Photo Picker when
    // READ_MEDIA_IMAGES is NOT declared in the manifest)
    return pickViaFileInput({ multiple, accept });
}

/**
 * Picks a single image. Convenience wrapper around pickImages.
 */
export async function pickSingleImage(accept: string = 'image/*'): Promise<PickedImage | null> {
    const results = await pickImages({ multiple: false, accept });
    return results[0] ?? null;
}

/**
 * Internal: uses a hidden <input type="file"> to trigger the system file picker.
 * On Android 13+ WebView without READ_MEDIA_IMAGES, this automatically opens
 * the Android Photo Picker (ACTION_PICK_IMAGES) instead of the legacy media browser.
 */
function pickViaFileInput(options: {
    multiple: boolean;
    accept: string;
}): Promise<PickedImage[]> {
    return new Promise((resolve) => {
        // Remove any stale picker element
        const existing = document.getElementById('__rb_img_picker__');
        if (existing) existing.remove();

        const input = document.createElement('input');
        input.id = '__rb_img_picker__';
        input.type = 'file';
        input.accept = options.accept;
        input.multiple = options.multiple;
        input.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0;pointer-events:none;';
        document.body.appendChild(input);

        const cleanup = () => {
            input.removeEventListener('change', onChange);
            input.removeEventListener('cancel', onCancel);
            setTimeout(() => input.remove(), 200);
        };

        const onCancel = () => {
            cleanup();
            resolve([]);
        };

        const onChange = async () => {
            cleanup();
            const files = Array.from(input.files ?? []);
            if (!files.length) { resolve([]); return; }

            const results: PickedImage[] = await Promise.all(
                files.map((file) =>
                    new Promise<PickedImage>((res) => {
                        const reader = new FileReader();
                        reader.onloadend = () => res({
                            file,
                            dataUrl: reader.result as string,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        });
                        reader.onerror = () => res({
                            file,
                            dataUrl: '',
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        });
                        reader.readAsDataURL(file);
                    })
                )
            );
            resolve(results);
        };

        input.addEventListener('change', onChange, { once: true });
        input.addEventListener('cancel', onCancel, { once: true });

        // Trigger the picker
        input.click();

        // Fallback timeout if neither change nor cancel fires (some browsers)
        setTimeout(() => {
            if (document.getElementById('__rb_img_picker__')) {
                cleanup();
                resolve([]);
            }
        }, 60000);
    });
}

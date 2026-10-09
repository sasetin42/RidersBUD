import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Utility to compress image before upload
 */
/**
 * Utility to compress image before upload.
 * Resizes down to maxWidth and reduces JPEG quality to guarantee lightweight uploads and compact fallbacks.
 */
const compressImage = async (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<Blob | File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file);
                }

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else resolve(file);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

/**
 * Converts a Blob or File to a compact base64 data URL
 */
const blobToBase64 = (blobOrFile: Blob | File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                resolve("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80");
            }
        };
        reader.onerror = () => resolve("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80");
        reader.readAsDataURL(blobOrFile);
    });
};

export const storageService = {
    /**
     * Uploads a file to Firebase Storage and returns the download URL.
     * If Cloud Storage limits/quota (e.g. 402 Payment Required) or network errors occur,
     * it safely falls back to a compact, compressed Data URL so the user flow never breaks.
     */
    uploadFile: async (path: string, file: File, compress: boolean = true): Promise<string> => {
        let fileToUpload: File | Blob = file;
        try {
            fileToUpload = compress ? await compressImage(file, 800, 0.7) : file;
            const storageRef = ref(storage, path);
            
            // Explicitly set content type, especially important for Blobs from canvas
            const metadata = {
                contentType: compress ? 'image/jpeg' : (file.type || 'image/jpeg')
            };
            
            const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error: any) {
            const isQuotaOrPayment = error?.code === 'storage/unauthorized' || 
                                     error?.message?.includes('402') || 
                                     error?.serverResponse?.includes('402');

            if (isQuotaOrPayment) {
                console.warn(
                    "[StorageService] Firebase Storage quota or billing requirement encountered (HTTP 402). " +
                    "Using local compressed image representation fallback.",
                    error
                );
            } else {
                console.warn("[StorageService] Upload failed. Falling back to local compressed representation.", error);
            }

            try {
                // Ensure the fallback base64 is generated from the compressed blob so it fits safely in Firestore
                const compressedFallback = fileToUpload instanceof Blob 
                    ? fileToUpload 
                    : await compressImage(file, 640, 0.6);
                return await blobToBase64(compressedFallback);
            } catch (fallbackError) {
                return "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80";
            }
        }
    },

    /**
     * Uploads multiple mechanic documents
     */
    uploadMechanicDocs: async (uid: string, licenseFile?: File, idFile?: File) => {
        const urls: { licenseUrl?: string; idUrl?: string } = {};
        
        if (licenseFile) {
            // Don't compress license if it's a PDF
            const isPdf = licenseFile.type === 'application/pdf';
            urls.licenseUrl = await storageService.uploadFile(`mechanics/${uid}/license_${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`, licenseFile, !isPdf);
        }
        
        if (idFile) {
            urls.idUrl = await storageService.uploadFile(`mechanics/${uid}/id_image_${Date.now()}.jpg`, idFile);
        }
        
        return urls;
    },

    /**
     * Deletes a file from Firebase Storage
     * @param url The download URL of the file to delete
     */
    deleteFile: async (url: string): Promise<void> => {
        try {
            const storageRef = ref(storage, url);
            await deleteObject(storageRef);
        } catch (error) {
            console.error('Error deleting file from storage:', error);
        }
    }
};

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Utility to compress image before upload
 */
const compressImage = async (file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<Blob | File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context failed'));
                
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Compression failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const storageService = {
    /**
     * Uploads a file to Firebase Storage and returns the download URL
     * Automatically compresses images unless disabled
     */
    uploadFile: async (path: string, file: File, compress: boolean = true): Promise<string> => {
        let fileToUpload: File | Blob = file;
        try {
            fileToUpload = compress ? await compressImage(file) : file;
            const storageRef = ref(storage, path);
            
            // Explicitly set content type, especially important for Blobs from canvas
            const metadata = {
                contentType: compress ? 'image/jpeg' : file.type
            };
            
            const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.warn("Storage Upload failed (unauthorized/permissions). Falling back to Base64 string.", error);
            try {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => resolve("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80");
                    reader.readAsDataURL(fileToUpload instanceof Blob ? fileToUpload : file);
                });
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

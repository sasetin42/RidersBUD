// FIX: Add and export fileToBase64 function for generic file encoding.
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const compressAndEncodeImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    // If it's not an image (e.g., a PDF for a certification), just encode it without compression.
    if (!file.type.startsWith('image/')) {
        // FIX: Use the new fileToBase64 function for non-image files.
        return fileToBase64(file);
    }

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

                // Calculate the new dimensions to maintain aspect ratio
                if (width > maxWidth) {
                    const scaleFactor = maxWidth / width;
                    height = height * scaleFactor;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export as JPEG for high compression
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

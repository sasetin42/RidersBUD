import React, { ReactNode } from 'react';
import { cardAspectRatios, cardImageStyles, cardAnimations } from '../../styles/cardDesignTokens';

interface UnifiedProductCardProps {
    imageUrl: string;
    alt: string;
    fallbackImageUrl?: string;
    children?: ReactNode; // For overlays, badges, etc.
    aspectRatio?: 'square' | 'threeFourths' | 'sixteenNine';
    className?: string;
    onImageError?: () => void;
}

/**
 * UnifiedProductCard - Consistent image container for Services and Parts cards
 * Provides standardized 4:3 aspect ratio with object-cover behavior
 */
const UnifiedProductCard: React.FC<UnifiedProductCardProps> = React.memo(({
    imageUrl,
    alt,
    fallbackImageUrl,
    children,
    aspectRatio = 'threeFourths',
    className = '',
    onImageError,
}) => {
    const aspectRatioValue = cardAspectRatios[aspectRatio];
    const paddingBottom = ((1 / aspectRatioValue) * 100).toFixed(2);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (fallbackImageUrl) {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImageUrl;
        }
        onImageError?.();
    };

    return (
        <div
            className={`relative w-full overflow-hidden ${className}`}
            style={{
                paddingBottom: `${paddingBottom}%`,
            }}
        >
            {/* Image Container */}
            <img
                src={imageUrl}
                alt={alt}
                className={`absolute inset-0 w-full h-full ${cardImageStyles.objectFit} ${cardAnimations.imageScale} ${cardAnimations.transition} group-hover:scale-110`}
                loading="lazy"
                onError={handleImageError}
            />

            {/* Children (overlays, badges, etc.) */}
            {children && (
                <div className="absolute inset-0 pointer-events-none">
                    {children}
                </div>
            )}
        </div>
    );
});

UnifiedProductCard.displayName = 'UnifiedProductCard';

export default UnifiedProductCard;

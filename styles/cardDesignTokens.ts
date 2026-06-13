// Unified Card Design System Tokens

// Aspect Ratio Constants
export const cardAspectRatios = {
    square: 1,        // 1:1 (100%)
    threeFourths: 1.333, // 4:3 (133.3%)
    sixteenNine: 1.777,  // 16:9 (177.7%)
};

// Unified Image Container Styles
export const cardImageStyles = {
    aspectRatio: cardAspectRatios.threeFourths, // 4:3
    objectFit: 'cover',
    backgroundColor: '#252525',
    borderRadius: '0.75rem', // 12px
};

// Card Container Base Styles
export const cardContainerStyles = {
    borderRadius: '0.75rem', // 12px (rounded-xl)
    border: 'border border-white/5',
    backgroundColor: '#1E1E1E',
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// Shadow States
export const cardShadows = {
    rest: 'shadow-md',
    hover: 'shadow-lg',
    active: 'shadow-xl',
};

// Hover States
export const cardHoverStyles = {
    scaleImage: 'group-hover:scale-110',
    borderColor: 'hover:border-primary/50',
    shadow: 'hover:shadow-lg hover:shadow-primary/5',
    duration: 'duration-300',
};

// Animation Timing
export const cardAnimations = {
    hover: 'duration-300', // 300ms for all hover effects
    imageScale: 'duration-500', // 500ms for image zoom
    transition: 'transition-all',
    transitionFast: 'transition-all duration-300',
};

// Responsive Grid Configuration
export const responsiveGridConfig = {
    mobile: 'grid-cols-2',      // 2 columns on mobile (<640px)
    tablet: 'sm:grid-cols-2',   // 2 columns on tablet (640px-1024px)
    desktop: 'lg:grid-cols-3',  // 3 columns on desktop (>1024px)
    gap: 'gap-3 sm:gap-4',
};

// Badge & Overlay Styles
export const cardBadgeStyles = {
    position: 'absolute top-3 left-3',
    backdropBlur: 'backdrop-blur-md',
    padding: 'px-2 py-1',
    borderRadius: 'rounded',
};

// Image Placeholder styles for blur-up effect
export const imagePlaceholderStyles = {
    backgroundColor: '#1a1a1a',
    blurRadius: 'blur-sm',
    opacity: 'opacity-50',
};

// Card spacing
export const cardPadding = {
    image: 'p-0',        // No padding on image container
    content: 'p-3',      // 12px padding on content
    contentLarge: 'p-4', // 16px padding for larger sections
};

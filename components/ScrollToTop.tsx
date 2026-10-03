import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Disable browser default scroll restoration if supported
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        // Only reset scroll when the route pathname actually changes (not query params)
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;

        // Reset primary scroll containers
        const scrollContainers = document.querySelectorAll('main, [data-scrollable="true"], .overflow-y-auto');
        scrollContainers.forEach((el) => {
            (el as HTMLElement).scrollTop = 0;
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop;

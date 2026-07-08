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
        const resetScroll = () => {
            // 1. Reset main window scroll
            window.scrollTo(0, 0);
            if (document.documentElement) document.documentElement.scrollTo(0, 0);
            if (document.body) document.body.scrollTo(0, 0);

            // 2. Find and reset all custom scrollable containers in the DOM
            const allElements = document.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                if (el.scrollTop > 0) {
                    el.scrollTop = 0;
                }
                if (el.scrollLeft > 0) {
                    el.scrollLeft = 0;
                }
            }
        };

        // Reset immediately
        resetScroll();

        // Use requestAnimationFrame to catch lazy-loaded/delayed content renders
        const frame1 = requestAnimationFrame(() => {
            resetScroll();
            const frame2 = requestAnimationFrame(resetScroll);
            return () => {
                cancelAnimationFrame(frame2);
            };
        });

        return () => {
            cancelAnimationFrame(frame1);
        };
    }, [pathname, search]);

    return null;
};

export default ScrollToTop;

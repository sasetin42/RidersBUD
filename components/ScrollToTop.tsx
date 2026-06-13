import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname, search, hash } = useLocation();

    useLayoutEffect(() => {
        const resetScroll = () => {
            window.scrollTo(0, 0);
            if (document.documentElement) {
                document.documentElement.scrollTop = 0;
            }
            if (document.body) {
                document.body.scrollTop = 0;
            }
            const scrollContainers = document.querySelectorAll(
                '.overflow-y-auto, .overflow-y-scroll, .overflow-auto, [data-scroll-container]'
            );
            scrollContainers.forEach(el => {
                if (el.scrollTop !== 0) {
                    el.scrollTop = 0;
                }
            });
        };

        // Reset scroll position immediately
        resetScroll();

        // 1. Set up an animation frame loop for the active transition window (1s duration)
        let rafId: number;
        const startTime = performance.now();
        const DURATION = 1000;

        const tick = () => {
            resetScroll();
            const elapsed = performance.now() - startTime;
            if (elapsed < DURATION) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);

        // 2. Set up multiple timers for discrete lazy-loaded page checkpoints
        const timers: ReturnType<typeof setTimeout>[] = [];
        const intervals = [50, 150, 300, 600, 800];
        intervals.forEach(delay => {
            const timer = setTimeout(() => {
                resetScroll();
            }, delay);
            timers.push(timer);
        });

        // 3. Set up a MutationObserver to watch DOM tree changes and catch new scrollable elements
        const observer = new MutationObserver((mutations) => {
            let hasNewScrollable = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            if (
                                node.matches('.overflow-y-auto, .overflow-y-scroll, .overflow-auto, [data-scroll-container]') ||
                                node.querySelector('.overflow-y-auto, .overflow-y-scroll, .overflow-auto, [data-scroll-container]')
                            ) {
                                hasNewScrollable = true;
                            }
                        }
                    });
                }
            }
            if (hasNewScrollable) {
                resetScroll();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 4. Cleanup mutation observers, timers, and animation frame on route change or unmount
        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            timers.forEach(clearTimeout);
            observer.disconnect();
        };
    }, [pathname, search, hash]);

    return null;
};

export default ScrollToTop;


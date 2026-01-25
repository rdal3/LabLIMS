import { useState, useEffect } from 'react';

// Helper function to get initial values (runs once)
const getInitialMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
};

const getInitialScreenSize = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
    if (typeof window === 'undefined') return 'lg';
    const width = window.innerWidth;
    if (width < 480) return 'xs';
    if (width < 640) return 'sm';
    if (width < 768) return 'md';
    if (width < 1024) return 'lg';
    return 'xl';
};

export function useIsMobile() {
    // Initialize with actual window size to prevent layout flash
    const [isMobile, setIsMobile] = useState(getInitialMobile);
    const [screenSize, setScreenSize] = useState(getInitialScreenSize);

    useEffect(() => {
        const checkDevice = () => {
            if (typeof window === 'undefined') return;

            const width = window.innerWidth;
            setIsMobile(width < 768);

            if (width < 480) setScreenSize('xs');
            else if (width < 640) setScreenSize('sm');
            else if (width < 768) setScreenSize('md');
            else if (width < 1024) setScreenSize('lg');
            else setScreenSize('xl');
        };

        // Re-check on mount to ensure accuracy
        checkDevice();
        window.addEventListener('resize', checkDevice);
        window.addEventListener('orientationchange', checkDevice);

        return () => {
            window.removeEventListener('resize', checkDevice);
            window.removeEventListener('orientationchange', checkDevice);
        };
    }, []);

    return { isMobile, screenSize };
}


export function useIsLandscape() {
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            if (typeof window !== 'undefined') {
                setIsLandscape(window.innerWidth > window.innerHeight);
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    return isLandscape;
}

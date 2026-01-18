import { useState, useEffect } from 'react';

export function useIsMobile() {
    // Revertendo para inicialização segura para evitar erros de runtime
    const [isMobile, setIsMobile] = useState(false);
    const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('lg');

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

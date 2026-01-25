import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const QRScannerPage: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);
    const initRef = useRef(false);
    const processingRef = useRef(false);

    const [status, setStatus] = useState<'init' | 'scanning' | 'success' | 'error' | 'loading'>('init');
    const [foundSample, setFoundSample] = useState<{ id: number; codigo: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Cleanup function that safely stops scanner and clears container
    const cleanupScanner = useCallback(async () => {
        try {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                try {
                    scannerRef.current.clear();
                } catch {
                    // clear() can throw if already cleared
                }
                scannerRef.current = null;
            }
        } catch {
            // Ignore cleanup errors
        }

        // Manually clear the container to prevent React DOM conflicts
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
    }, []);

    const processQRCode = useCallback(async (decodedText: string) => {
        if (processingRef.current || !mountedRef.current) return;
        processingRef.current = true;

        setStatus('loading');

        try {
            let sampleId = null;
            if (decodedText.includes('_')) {
                const parts = decodedText.split('_');
                const lastPart = parts[parts.length - 1];
                if (!isNaN(parseInt(lastPart))) sampleId = parseInt(lastPart);
            }

            const url = sampleId
                ? `${API_BASE_URL}/amostras/${sampleId}`
                : `${API_BASE_URL}/amostras?busca=${encodeURIComponent(decodedText)}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Erro');

            const data = await res.json();
            const sample = Array.isArray(data) ? data[0] : data;

            if (sample?.id && mountedRef.current) {
                // FIRST: Stop and cleanup scanner BEFORE changing React state
                await cleanupScanner();

                // THEN: Update state (safe now, container is empty)
                setFoundSample({ id: sample.id, codigo: sample.codigo });
                setStatus('success');
            } else {
                throw new Error('Não encontrada');
            }
        } catch (e: unknown) {
            if (mountedRef.current) {
                const errorMessage = e instanceof Error ? e.message : 'Erro';
                setErrorMsg(errorMessage);
                setStatus('error');
                setTimeout(() => {
                    if (mountedRef.current) {
                        processingRef.current = false;
                        setStatus('scanning');
                    }
                }, 2000);
            }
        }
    }, [token, cleanupScanner]);

    useEffect(() => {
        mountedRef.current = true;
        if (initRef.current) return;
        initRef.current = true;

        const startScanner = async () => {
            await cleanupScanner();
            if (!mountedRef.current || !containerRef.current) return;

            try {
                const scanner = new Html5Qrcode(containerRef.current.id);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 15,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1
                    },
                    processQRCode,
                    () => { }
                );

                if (mountedRef.current) {
                    setStatus('scanning');
                }
            } catch {
                if (mountedRef.current) {
                    setErrorMsg('Permita acesso à câmera');
                    setStatus('error');
                }
            }
        };

        // Small delay to ensure DOM is ready
        setTimeout(startScanner, 100);

        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [processQRCode, cleanupScanner]);

    const goToSample = () => {
        if (foundSample) {
            navigate('/amostras', { state: { selectedSampleId: foundSample.id, openEditor: true } });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0f172a',
            display: 'flex', flexDirection: 'column',
            paddingTop: 'max(env(safe-area-inset-top), 56px)',
            paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#1e293b' }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>📷 Scanner</span>
                <button onClick={() => navigate('/amostras')} style={{ background: '#334155', border: 'none', borderRadius: '4px', padding: '6px' }}>
                    <X size={18} color="white" />
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>

                {/* Camera Layout - Hidden when success, but always in DOM */}
                <div style={{
                    display: status === 'success' ? 'none' : 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
                        {/* Scanner container - NO React children inside! html5-qrcode manages this */}
                        <div
                            ref={containerRef}
                            id="qr-scanner-container"
                            style={{
                                width: '280px',
                                height: '280px',
                                backgroundColor: 'black',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: '2px solid #3b82f6'
                            }}
                        />

                        {/* Loading overlay - OUTSIDE the scanner container to avoid conflicts */}
                        {(status === 'loading' || status === 'init') && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                borderRadius: '16px',
                                pointerEvents: 'none'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    border: '2px solid transparent',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    {status === 'scanning' && <p style={{ color: '#94a3b8' }}>Aponte para o QR Code</p>}

                    {status === 'error' && (
                        <div style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Success Layout */}
                {status === 'success' && foundSample && (
                    <div style={{
                        width: '100%', maxWidth: '300px',
                        backgroundColor: '#10b981',
                        borderRadius: '24px',
                        padding: '32px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                            <CheckCircle size={48} color="white" />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Encontrada!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', marginBottom: '24px', fontFamily: 'monospace' }}>{foundSample.codigo}</p>

                        <button
                            onClick={goToSample}
                            style={{
                                width: '100%',
                                backgroundColor: 'white',
                                color: '#047857',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '16px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            Abrir Amostra <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default QRScannerPage;

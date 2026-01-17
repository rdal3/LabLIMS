import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const QRScannerPage: React.FC = () => {
    const navigate = useNavigate();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scanning, setScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
    const [message, setMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);

    useEffect(() => {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                setStatus('loading');
                setMessage('Iniciando câmera...');

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await scanner.start(
                    { facingMode: 'environment' },
                    config,
                    handleScan,
                    handleError
                );

                setCameraReady(true);
                setScanning(true);
                setStatus('idle');
                setMessage('');
            } catch (err: any) {
                console.error('Erro ao iniciar scanner:', err);
                setStatus('error');
                setMessage('Erro ao acessar câmera. Verifique as permissões no navegador.');
            }
        };

        startScanner();

        return () => {
            if (scanner.isScanning) {
                scanner.stop().catch(console.error);
            }
        };
    }, []);

    const handleScan = async (decodedText: string) => {
        if (!scanning || decodedText === lastScanned) return;

        setLastScanned(decodedText);
        setScanning(false);

        try {
            setStatus('loading');
            setMessage('Buscando amostra...');

            // Buscar amostra pelo código ou UUID
            const response = await fetch(`http://localhost:3001/amostras?busca=${encodeURIComponent(decodedText)}`);
            const samples = await response.json();

            if (samples && samples.length > 0) {
                const sample = samples[0];
                setStatus('success');
                setMessage(`Amostra encontrada: ${sample.codigo}`);

                // Aguarda um pouco antes de navegar
                setTimeout(() => {
                    // Para o scanner antes de navegar
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.stop().catch(console.error);
                    }
                    navigate('/amostras', { state: { selectedSampleId: sample.id, openEditor: true } });
                }, 1500);
            } else {
                setStatus('error');
                setMessage('Amostra não encontrada no sistema');
                setTimeout(() => {
                    setStatus('idle');
                    setScanning(true);
                    setLastScanned('');
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao buscar amostra:', error);
            setStatus('error');
            setMessage('Erro ao buscar amostra');
            setTimeout(() => {
                setStatus('idle');
                setScanning(true);
                setLastScanned('');
            }, 2000);
        }
    };

    const handleError = (errorMessage: string) => {
        // Ignora erros de "No QR code found" que são normais
        if (errorMessage.includes('NotFoundException')) {
            return;
        }
        console.error('Scanner error:', errorMessage);
    };

    const handleClose = () => {
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(console.error);
        }
        navigate('/amostras');
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4">
            {/* Header */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Camera size={36} className="text-blue-400" />
                        Scanner QR Code
                    </h1>
                    <button
                        onClick={handleClose}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                <p className="text-slate-400 mt-2">
                    Aponte a câmera para o QR Code da etiqueta
                </p>
            </div>

            {/* Scanner Container */}
            <div className="max-w-2xl mx-auto">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500 bg-black">
                    <div id="qr-reader" className="w-full"></div>

                    {/* Overlay quando está carregando */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <div className="text-center text-white">
                                <Loader size={48} className="animate-spin mx-auto mb-4" />
                                <p className="font-bold">{message}</p>
                            </div>
                        </div>
                    )}

                    {/* Overlay de guia quando pronto */}
                    {cameraReady && scanning && status === 'idle' && (
                        <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
                            <p className="text-white text-lg font-bold bg-black/60 px-4 py-2 rounded-full inline-block">
                                Posicione o QR Code dentro do quadrado
                            </p>
                        </div>
                    )}
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="mt-6 bg-emerald-600 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse">
                        <CheckCircle size={24} />
                        <div>
                            <p className="font-bold">✅ Sucesso!</p>
                            <p className="text-sm">{message}</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-6 bg-red-600 text-white p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle size={24} />
                        <div>
                            <p className="font-bold">❌ Erro</p>
                            <p className="text-sm">{message}</p>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-6 bg-slate-800 p-6 rounded-xl text-slate-300">
                    <h3 className="font-bold text-white mb-3">💡 Dicas para melhor leitura:</h3>
                    <ul className="space-y-2 text-sm">
                        <li>• Mantenha a câmera estável</li>
                        <li>• Garanta boa iluminação</li>
                        <li>• Posicione o QR Code dentro do quadrado verde</li>
                        <li>• Evite reflexos na etiqueta</li>
                        <li>• Mantenha distância de ~20-30cm</li>
                    </ul>
                </div>

                {/* Permissions Help */}
                {status === 'error' && message.includes('câmera') && (
                    <div className="mt-4 bg-amber-900 border-2 border-amber-600 p-4 rounded-xl text-amber-100 text-sm">
                        <p className="font-bold mb-2">🔒 Permissão de Câmera Necessária</p>
                        <p>Para usar o scanner, você precisa permitir o acesso à câmera:</p>
                        <ol className="mt-2 ml-4 space-y-1 list-decimal">
                            <li>Clique no ícone de cadeado/câmera na barra de endereço</li>
                            <li>Selecione "Permitir" para câmera</li>
                            <li>Recarregue a página</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScannerPage;

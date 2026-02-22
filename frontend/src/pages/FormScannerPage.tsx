import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, ArrowLeft, Loader2, Upload, FileText } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function FormScannerPage() {
    const navigate = useNavigate();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState<'scan_qr' | 'upload_photo' | 'processing' | 'error'>('scan_qr');
    const [qrData, setQrData] = useState<{ s: number[], a: string[] } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);

    const cleanupScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) { }
            scannerRef.current = null;
        }
        if (containerRef.current) containerRef.current.innerHTML = '';
    }, []);

    useEffect(() => {
        if (status !== 'scan_qr' || !containerRef.current) return;

        const startScanner = async () => {
            await cleanupScanner();
            try {
                const scanner = new Html5Qrcode('form-qr-scanner');
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
                    async (decodedText) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (data.s && data.a) {
                                await cleanupScanner();
                                setQrData(data);
                                setStatus('upload_photo');
                            }
                        } catch (e) {
                            // Ignora QR codes inválidos
                        }
                    },
                    () => { }
                );
            } catch (e) {
                setErrorMsg('Permita o acesso à câmera e tente novamente.');
                setStatus('error');
            }
        };

        setTimeout(startScanner, 100);

        return () => { cleanupScanner(); };
    }, [status, cleanupScanner]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !qrData) return;

        setStatus('processing');
        setProgress(0);

        try {
            const result = await Tesseract.recognize(file, 'por', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                }
            });

            // Very naive extraction: Find all numbers (including decimals/commas)
            const text = result.data.text;
            // Regex for numbers like 12, 12.3, 12,3, <0.1
            const numberMatches = text.match(/(?:<|>)?\s*\d+(?:[.,]\d+)?/g) || [];
            const cleanNumbers = numberMatches.map(n => n.replace(/\s/g, ''));

            // Map to results object
            const prefilledResults: Record<number, Record<string, string>> = {};
            let numIndex = 0;

            qrData.s.forEach(sampleId => {
                prefilledResults[sampleId] = {};
                qrData.a.forEach(analysisId => {
                    // Try to assign the next found number
                    if (numIndex < cleanNumbers.length) {
                        prefilledResults[sampleId][analysisId] = cleanNumbers[numIndex];
                        numIndex++;
                    }
                });
            });

            // Pass to Worksheet page for review
            navigate('/worksheet', {
                state: {
                    fromScanner: true,
                    sampleIds: qrData.s,
                    analysisIds: qrData.a,
                    results: prefilledResults
                }
            });

        } catch (e) {
            setErrorMsg('Erro ao processar imagem. Tente novamente com uma foto mais nítida.');
            setStatus('error');
        }
    };

    return (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-indigo-500 rounded"><ArrowLeft size={20} /></button>
                    <h2 className="font-bold text-lg flex items-center gap-2"><FileText size={20} /> Escanear Formulário</h2>
                </div>

                <div className="p-6">
                    {status === 'scan_qr' && (
                        <div className="flex flex-col items-center">
                            <p className="text-center text-slate-600 mb-6 font-medium">1. Escaneie o QR Code no topo da Ficha de Anotação.</p>
                            <div id="form-qr-scanner" ref={containerRef} className="w-full max-w-[280px] h-[280px] bg-black rounded-xl overflow-hidden shadow-inner border-2 border-indigo-400" />
                        </div>
                    )}

                    {status === 'upload_photo' && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <FileText size={32} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-xl mb-2">QR Code Lido!</h3>
                            <p className="text-slate-500 mb-6">Agora tire uma foto bem nítida da tabela preenchida com os resultados.</p>

                            <label className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                <Camera size={24} />
                                <span>Tirar Foto da Tabela</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>

                            <label className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                <Upload size={18} />
                                <span>Enviar da Galeria</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="flex flex-col items-center text-center py-8">
                            <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
                            <h3 className="font-bold text-slate-800 text-lg mb-2">A Mágica Acontecendo...</h3>
                            <p className="text-slate-500 mb-6">A Inteligência Artificial está lendo sua caligrafia. Isso pode levar alguns segundos.</p>

                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs font-bold text-indigo-600 mt-2">{progress}% Concluído</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center text-center">
                            <AlertCircle size={48} className="text-red-500 mb-4" />
                            <h3 className="font-bold text-slate-800 mb-2">Ops, algo deu errado.</h3>
                            <p className="text-slate-500 mb-6">{errorMsg}</p>
                            <button
                                onClick={() => setStatus('scan_qr')}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

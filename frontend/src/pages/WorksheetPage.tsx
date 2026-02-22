import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { endpoints } from '../services/api';
import { LAB_PARAMS, type LabParam } from '../config/labConfig';
import type { Amostra } from '../components/DatabaseList';
import {
    Layers, Search, CheckCircle2, ChevronRight, GripVertical,
    Play, Save, ArrowLeft, Loader2, AlertCircle, ListTodo, Table as TableIcon, CheckSquare, Square, Printer
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item for Vertical Drag and Drop (Samples) ---
function SortableSampleRow({ sample }: { sample: Amostra }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sample.id.toString() });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 mb-2 rounded-xl border transition-colors ${isDragging ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
        >
            <button {...attributes} {...listeners} className="p-1 text-slate-400 hover:text-blue-600 cursor-grab active:cursor-grabbing">
                <GripVertical size={20} />
            </button>
            <div className="flex-1">
                <div className="font-bold text-slate-800">{sample.codigo}</div>
                <div className="text-xs text-slate-500">{sample.cliente || 'Sem cliente'}</div>
            </div>
            <div className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {sample.matriz || 'N/A'}
            </div>
        </div>
    );
}

// --- Sortable Item for Horizontal Drag and Drop (Analyses) ---
function SortableAnalysisCard({ analysis }: { analysis: LabParam }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: analysis.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors ${isDragging ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200'
                }`}
        >
            <button {...attributes} {...listeners} className="text-slate-400 hover:text-blue-600 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </button>
            {analysis.label}
        </div>
    );
}


export default function WorksheetPage() {
    const { token } = useAuth();
    const location = useLocation();

    // Mode
    const [mode, setMode] = useState<'SETUP' | 'EXECUTION'>('SETUP');

    // Setup state
    const [pendingSamples, setPendingSamples] = useState<Amostra[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);

    // Selections
    const [selectedSampleIds, setSelectedSampleIds] = useState<number[]>([]);
    const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);

    // Ordered lists for execution
    const [orderedSamples, setOrderedSamples] = useState<Amostra[]>([]);
    const [orderedAnalyses, setOrderedAnalyses] = useState<LabParam[]>([]);

    // Execution state (results map: sampleId -> analysisId -> value)
    const [results, setResults] = useState<Record<number, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // NEW: Execution UI state
    const [executionView, setExecutionView] = useState<'QUEUE' | 'TABLE'>('QUEUE');
    const [activeAnalysisIds, setActiveAnalysisIds] = useState<string[]>([]);
    const [activeSampleIndex, setActiveSampleIndex] = useState(0);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchPendingSamples();
    }, []);

    useEffect(() => {
        if (location.state?.fromScanner && pendingSamples.length > 0) {
            const state = location.state;
            const sIds = state.sampleIds;
            const aIds = state.analysisIds;
            const prefilledResults = state.results;

            setSelectedSampleIds(sIds);
            setSelectedAnalysisIds(aIds);

            const samplesToRun = pendingSamples.filter(s => sIds.includes(s.id));
            const analysesToRun = LAB_PARAMS.filter(p => aIds.includes(p.id));

            setOrderedSamples(samplesToRun);
            setOrderedAnalyses(analysesToRun);
            setResults(prefilledResults);

            if (analysesToRun.length > 0) {
                setActiveAnalysisIds([analysesToRun[0].id]);
            }
            setActiveSampleIndex(0);
            setExecutionView('TABLE');
            setMode('EXECUTION');

            // Clear state so it doesn't trigger again on reload
            window.history.replaceState({}, document.title);
        }
    }, [location.state, pendingSamples]);

    const fetchPendingSamples = async () => {
        setIsLoadingSamples(true);
        try {
            // Pega todas, depois filtramos. Num lab real, poderíamos ter paginate ou query `status != Concluído`
            const res = await fetch(`${endpoints.amostras}?ordem=DESC`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                let data: Amostra[] = await res.json();
                // Filtra para pegar tudo que não está Concluído (ou que seja em análise e aguardando)
                data = data.filter(d => d.status !== 'Concluído');
                setPendingSamples(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingSamples(false);
        }
    };

    const toggleSample = (sample: Amostra) => {
        setSelectedSampleIds(prev =>
            prev.includes(sample.id)
                ? prev.filter(id => id !== sample.id)
                : [...prev, sample.id]
        );
    };

    const toggleAnalysis = (analysisId: string) => {
        setSelectedAnalysisIds(prev =>
            prev.includes(analysisId)
                ? prev.filter(id => id !== analysisId)
                : [...prev, analysisId]
        );
    };

    const startExecution = () => {
        if (selectedSampleIds.length === 0 || selectedAnalysisIds.length === 0) {
            alert("Selecione pelo menos uma amostra e uma análise para iniciar o Mapa de Trabalho.");
            return;
        }

        // Set ordered initial state based on selections
        const samplesToRun = pendingSamples.filter(s => selectedSampleIds.includes(s.id));
        const analysesToRun = LAB_PARAMS.filter(p => selectedAnalysisIds.includes(p.id));

        setOrderedSamples(samplesToRun);
        setOrderedAnalyses(analysesToRun);

        // Setup initial active analyses (just the first one by default)
        if (analysesToRun.length > 0) {
            setActiveAnalysisIds([analysesToRun[0].id]);
        }
        setActiveSampleIndex(0);
        setExecutionView('QUEUE');

        // Initialize results map with current values from db
        const initialResults: Record<number, Record<string, string>> = {};
        samplesToRun.forEach(sample => {
            initialResults[sample.id] = {};
            analysesToRun.forEach(analysis => {
                // Handle params or direct columns
                let val = '';
                if (sample.params && sample.params[analysis.id]) {
                    val = sample.params[analysis.id];
                } else if (sample[analysis.id]) {
                    val = sample[analysis.id];
                }
                initialResults[sample.id][analysis.id] = val || '';
            });
        });
        setResults(initialResults);

        setMode('EXECUTION');
    };

    const handleDragEndSamples = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setOrderedSamples((items) => {
                const oldIndex = items.findIndex((i) => i.id.toString() === active.id);
                const newIndex = items.findIndex((i) => i.id.toString() === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragEndAnalyses = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setOrderedAnalyses((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleActiveAnalysis = (analysisId: string) => {
        setActiveAnalysisIds(prev =>
            prev.includes(analysisId)
                ? prev.filter(id => id !== analysisId)
                : [...prev, analysisId]
        );
    };

    const nextSample = () => {
        if (activeSampleIndex < orderedSamples.length - 1) {
            setActiveSampleIndex(activeSampleIndex + 1);
        }
    };

    const prevSample = () => {
        if (activeSampleIndex > 0) {
            setActiveSampleIndex(activeSampleIndex - 1);
        }
    };

    const isAnalysisPlanned = (sample: Amostra, analysisId: string) => {
        if (!sample.analysesPlanned || sample.analysesPlanned.length === 0) return true; // Default allow if array missing/empty
        return sample.analysesPlanned.includes(analysisId);
    };

    const handleResultChange = (sampleId: number, analysisId: string, value: string) => {
        setResults(prev => ({
            ...prev,
            [sampleId]: {
                ...prev[sampleId],
                [analysisId]: value
            }
        }));
    };

    const saveBatch = async () => {
        setIsSaving(true);
        let successCount = 0;
        let errorCount = 0;

        for (const sample of orderedSamples) {
            const updates = results[sample.id];
            // Build PATCH payload. Only include fields that have been changed/filled.
            const payload: any = { ...updates };

            // We also might want to update analysesCompleted, but the backend handles it partially
            // or we can just send the direct fields.
            // Since 'updates' contains the direct keys (e.g., 'ph': '7.2'), we just send them.

            try {
                const res = await fetch(`${endpoints.amostras}/${sample.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (e) {
                errorCount++;
            }
        }

        setIsSaving(false);
        if (errorCount > 0) {
            alert(`Lote salvo com ${errorCount} erro(s) e ${successCount} sucesso(s).`);
        } else {
            alert(`Todas as ${successCount} amostras foram atualizadas com sucesso!`);
            // Voltar para tela de setup
            setMode('SETUP');
            fetchPendingSamples(); // refresh
            setSelectedSampleIds([]);
            setSelectedAnalysisIds([]);
        }
    };

    const printWorksheetForm = () => {
        if (selectedSampleIds.length === 0 || selectedAnalysisIds.length === 0) {
            alert("Selecione pelo menos uma amostra e uma análise para imprimir o formulário.");
            return;
        }

        const samplesToPrint = pendingSamples.filter(s => selectedSampleIds.includes(s.id));
        const analysesToPrint = LAB_PARAMS.filter(p => selectedAnalysisIds.includes(p.id));

        const qrData = JSON.stringify({
            s: selectedSampleIds,
            a: selectedAnalysisIds
        });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

        const rowsHtml = samplesToPrint.map(sample => `
            <tr>
                <td style="padding: 10px; border: 1px solid #000; font-weight: bold;">
                    ${sample.codigo}
                    <div style="font-size: 10px; font-weight: normal; color: #475569;">${sample.cliente || ''}</div>
                </td>
                ${analysesToPrint.map(analysis => {
            const planned = isAnalysisPlanned(sample, analysis.id);
            if (!planned) {
                return '<td style="padding: 10px; border: 1px solid #000; background-color: #f1f5f9; text-align: center; color: #94a3b8;">--</td>';
            }
            return '<td style="padding: 10px; border: 1px solid #000; height: 40px;"></td>';
        }).join('')}
            </tr>
        `).join('');

        const colsHtml = analysesToPrint.map(analysis => `
            <th style="padding: 10px; border: 1px solid #000; background-color: #f8fafc; text-align: left; font-size: 12px;">
                ${analysis.label} ${analysis.unit ? `(${analysis.unit})` : ''}
            </th>
        `).join('');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Laboratório - Mapa de Trabalho Físico</title>
                    <style>
                        @page { size: A4 landscape; margin: 15mm; }
                        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                        .qr-container { display: flex; flex-direction: column; align-items: flex-end; }
                        .qr-container img { width: 120px; height: 120px; border: 2px solid #000; padding: 5px; }
                        .qr-container p { font-size: 10px; color: #64748b; margin-top: 5px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                        th, td { border: 1px solid #000; word-wrap: break-word; }
                        .instructions { font-size: 12px; color: #475569; margin-bottom: 10px; max-width: 70%; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Mapa de Trabalho (Ficha de Anotação)</h1>
                            <p style="margin: 0; color: #475569; font-weight: bold;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
                            <p class="instructions">
                                <strong>Instruções:</strong> Preencha os campos em branco utilizando caneta escura com números bem legíveis. 
                                Utilize a opção "Escanear Formulário" no LIMS para extrair os dados desta folha via Inteligência Artificial.
                            </p>
                        </div>
                        <div class="qr-container">
                            <img src="${qrUrl}" alt="QR Code" />
                            <p>QR CODE DO LOTE</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="padding: 10px; border: 1px solid #000; background-color: #f8fafc; text-align: left; width: 160px; font-size: 14px;">Amostra</th>
                                ${colsHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                            }, 800);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const selectAllSamples = () => {
        if (selectedSampleIds.length === pendingSamples.length) {
            // deselect all
            setSelectedSampleIds([]);
        } else {
            setSelectedSampleIds(pendingSamples.map(s => s.id));
        }
    };

    if (mode === 'SETUP') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Layers size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mapa de Trabalho</h1>
                        <p className="text-slate-500 font-medium text-sm">Crie lotes e processe análises em massa</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Col 1: Seleção de Análises */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[70vh]">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                            <span>1. Quais análises serão feitas?</span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs">
                                {selectedAnalysisIds.length} selecionadas
                            </span>
                        </h2>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            {['fisicoq', 'micro', 'metais', 'btex'].map(cat => {
                                const params = LAB_PARAMS.filter(p => p.category === cat);
                                if (params.length === 0) return null;
                                const catName = cat === 'fisicoq' ? 'Físico-Químico' : cat === 'micro' ? 'Microbiologia' : cat === 'metais' ? 'Metais' : 'BTEX';

                                return (
                                    <div key={cat} className="mb-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">{catName}</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {params.map(param => (
                                                <button
                                                    key={param.id}
                                                    onClick={() => toggleAnalysis(param.id)}
                                                    className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${selectedAnalysisIds.includes(param.id)
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedAnalysisIds.includes(param.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                                                        }`}>
                                                        {selectedAnalysisIds.includes(param.id) && <CheckCircle2 size={12} />}
                                                    </div>
                                                    <span className="truncate">{param.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Col 2: Seleção de Amostras */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[70vh]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800">
                                2. Seleção de Amostras pendentes
                            </h2>
                            <button
                                onClick={selectAllSamples}
                                className="text-sm text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {selectedSampleIds.length === pendingSamples.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </button>
                        </div>

                        {isLoadingSamples ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="animate-spin text-slate-400" size={32} />
                            </div>
                        ) : pendingSamples.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                <Search size={48} className="text-slate-300 mb-4" />
                                <p>Nenhuma amostra pendente encontrada.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                {pendingSamples.map(sample => (
                                    <button
                                        key={sample.id}
                                        onClick={() => toggleSample(sample)}
                                        className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${selectedSampleIds.includes(sample.id)
                                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selectedSampleIds.includes(sample.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                                            }`}>
                                            {selectedSampleIds.includes(sample.id) && <CheckCircle2 size={14} />}
                                        </div>
                                        <div>
                                            <div className={`font-bold ${selectedSampleIds.includes(sample.id) ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                {sample.codigo}
                                            </div>
                                            <div className="text-xs text-slate-500">{sample.cliente || 'Sem cliente'}</div>
                                        </div>
                                        <div className="ml-auto flex items-center gap-2 text-xs">
                                            {sample.matriz && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                    {sample.matriz}
                                                </span>
                                            )}

                                            {/* Show if it has planned analyses that match our selection */}
                                            {(() => {
                                                const planned = sample.analysesPlanned || [];
                                                const matches = selectedAnalysisIds.filter(id => planned.includes(id));
                                                if (selectedAnalysisIds.length > 0 && matches.length > 0) {
                                                    return (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
                                                            {matches.length} análises planejadas
                                                        </span>
                                                    )
                                                } else if (selectedAnalysisIds.length > 0 && planned.length > 0) {
                                                    return (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1">
                                                            <AlertCircle size={12} />
                                                            Não planejado
                                                        </span>
                                                    )
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Start Button */}
                        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={printWorksheetForm}
                                disabled={selectedSampleIds.length === 0 || selectedAnalysisIds.length === 0}
                                className="sm:flex-1 bg-white border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 text-slate-700 font-bold py-3 sm:py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                            >
                                <Printer size={20} />
                                Imprimir Ficha
                            </button>

                            <button
                                onClick={startExecution}
                                disabled={selectedSampleIds.length === 0 || selectedAnalysisIds.length === 0}
                                className="sm:flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg shadow-indigo-200 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
                            >
                                Ir para Execução Digital
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className="text-center text-xs text-slate-500 mt-3 font-bold">
                            {selectedSampleIds.length} amostra(s) e {selectedAnalysisIds.length} análise(s) selecionadas
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // EXECUTION MODE
    const currentSample = orderedSamples[activeSampleIndex];

    return (
        <div className="max-w-screen-2xl mx-auto px-4 py-8">

            {/* Header Execução */}
            <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('SETUP')}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Voltar ao Setup"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Play className="text-indigo-600" size={24} />
                            Execução do Lote
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Insira os resultados para as {orderedSamples.length} amostras
                        </p>
                    </div>
                </div>

                <button
                    onClick={saveBatch}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all disabled:opacity-75"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Dados do Lote
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Organizador */}
                <div className="lg:col-span-1 space-y-6">

                    {/* NEW: View Toggle */}
                    <div className="bg-slate-100 p-1.5 rounded-xl flex">
                        <button
                            onClick={() => setExecutionView('QUEUE')}
                            className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 rounded-lg font-bold text-sm transition-all text-slate-600 ${executionView === 'QUEUE' ? 'bg-white shadow-sm text-indigo-700' : 'hover:bg-slate-200'
                                }`}
                        >
                            <ListTodo size={16} /> Fila
                        </button>
                        <button
                            onClick={() => setExecutionView('TABLE')}
                            className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 rounded-lg font-bold text-sm transition-all text-slate-600 ${executionView === 'TABLE' ? 'bg-white shadow-sm text-indigo-700' : 'hover:bg-slate-200'
                                }`}
                        >
                            <TableIcon size={16} /> Tabela
                        </button>
                    </div>

                    {executionView === 'QUEUE' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <ListTodo size={18} className="text-indigo-500" />
                                Estação de Análise (Agrupar)
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Selecione quais análises você está digitando agora para esta fila:</p>
                            <div className="flex flex-col gap-2">
                                {orderedAnalyses.map(analysis => (
                                    <button
                                        key={analysis.id}
                                        onClick={() => toggleActiveAnalysis(analysis.id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg border text-sm transition-colors text-left ${activeAnalysisIds.includes(analysis.id)
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {activeAnalysisIds.includes(analysis.id) ? (
                                            <CheckSquare className="text-indigo-600" size={18} />
                                        ) : (
                                            <Square className="text-slate-400" size={18} />
                                        )}
                                        {analysis.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <GripVertical size={18} className="text-slate-400" />
                            Ordem das Amostras
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">Arraste para ajustar a fila física.</p>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSamples}>
                            <SortableContext items={orderedSamples.map(s => s.id.toString())} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto pr-2">
                                    {orderedSamples.map((sample, idx) => (
                                        <div key={sample.id} className="relative group">
                                            {executionView === 'QUEUE' && idx === activeSampleIndex && (
                                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full" />
                                            )}
                                            <SortableSampleRow sample={sample} />
                                        </div>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    {executionView === 'TABLE' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <GripVertical size={18} className="text-slate-400" />
                                Ordem das Colunas (Análises)
                            </h3>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndAnalyses}>
                                <SortableContext items={orderedAnalyses.map(a => a.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2">
                                        {orderedAnalyses.map(analysis => (
                                            <SortableAnalysisCard key={analysis.id} analysis={analysis} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </div>

                {/* Main Input Area */}
                <div className="lg:col-span-3">
                    {executionView === 'QUEUE' ? (
                        // QUEUE VIEW
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full border-t-4 border-t-indigo-500">
                            {/* Queue Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                                <div>
                                    <div className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">
                                        Fila de Digitação • Amostra {activeSampleIndex + 1} de {orderedSamples.length}
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">{currentSample?.codigo}</h2>
                                    <p className="text-slate-500">{currentSample?.cliente || 'Sem cliente associado'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block bg-slate-200 text-slate-700 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                                        {currentSample?.matriz || 'Matriz N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Inputs Area */}
                            <div className="p-8 flex-1">
                                {activeAnalysisIds.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <AlertCircle size={48} className="mb-4 text-slate-300" />
                                        <p>Selecione ao menos uma análise na Estação de Análise ao lado.</p>
                                    </div>
                                ) : (
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        {activeAnalysisIds.map(analysisId => {
                                            const analysis = orderedAnalyses.find(a => a.id === analysisId);
                                            if (!analysis || !currentSample) return null;

                                            const planned = isAnalysisPlanned(currentSample, analysisId);

                                            return (
                                                <div key={analysisId} className={`p-5 rounded-xl border-2 transition-colors ${planned ? 'border-indigo-100 bg-white shadow-sm' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                            {analysis.label}
                                                            {!planned && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-bold">Não Planejada</span>}
                                                        </label>
                                                        {analysis.unit && <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{analysis.unit}</span>}
                                                    </div>

                                                    {!planned ? (
                                                        <div className="text-sm text-slate-500 p-3 bg-slate-100 rounded-lg italic">
                                                            Amostra não programada para {analysis.label}.
                                                        </div>
                                                    ) : (
                                                        analysis.options ? (
                                                            <select
                                                                value={results[currentSample.id]?.[analysis.id] || ''}
                                                                onChange={(e) => handleResultChange(currentSample.id, analysis.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-lg border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white shadow-sm transition-all text-slate-800 font-medium"
                                                            >
                                                                <option value=""></option>
                                                                {analysis.options.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                placeholder="Digite o resultado..."
                                                                value={results[currentSample.id]?.[analysis.id] || ''}
                                                                onChange={(e) => handleResultChange(currentSample.id, analysis.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-lg border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white shadow-sm transition-all text-slate-800 font-medium"
                                                                autoFocus
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Queue Footer (Navigation) */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
                                <button
                                    onClick={prevSample}
                                    disabled={activeSampleIndex === 0}
                                    className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-30 flex items-center gap-2"
                                >
                                    <ArrowLeft size={18} /> Anterior
                                </button>

                                <div className="flex gap-1">
                                    {orderedSamples.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === activeSampleIndex ? 'bg-indigo-600 scale-125' : idx < activeSampleIndex ? 'bg-indigo-200' : 'bg-slate-200'}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={nextSample}
                                    disabled={activeSampleIndex === orderedSamples.length - 1}
                                    className="px-6 py-3 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl transition-colors disabled:opacity-30 disabled:shadow-none flex items-center gap-2"
                                >
                                    Próxima <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        // TABLE VIEW
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                                <TableIcon size={20} className="text-slate-500" />
                                <div>
                                    <h3 className="font-bold text-slate-800">Visão Geral Macro</h3>
                                    <p className="text-xs text-slate-500">Vizualize e edite resultados. Campos não planejados estão bloqueados.</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left align-middle border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-r bg-slate-50 sticky left-0 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Amostra</th>
                                            {orderedAnalyses.map(analysis => (
                                                <th key={analysis.id} className="px-6 py-4 border-b whitespace-nowrap min-w-[150px]">
                                                    {analysis.label} {analysis.unit && <span className="text-slate-400 normal-case ml-1">({analysis.unit})</span>}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orderedSamples.map(sample => (
                                            <tr key={sample.id} className="hover:bg-indigo-50/20 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-slate-800 border-r bg-white sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {sample.codigo}
                                                    <div className="text-xs font-normal text-slate-400 truncate w-32" title={sample.cliente}>
                                                        {sample.cliente}
                                                    </div>
                                                </td>

                                                {orderedAnalyses.map(analysis => {
                                                    const planned = isAnalysisPlanned(sample, analysis.id);

                                                    return (
                                                        <td key={analysis.id} className={`px-4 py-3 ${!planned ? 'bg-slate-50' : ''}`}>
                                                            {!planned ? (
                                                                <div className="text-center text-slate-300 text-xs py-2 select-none" title="Análise não planejada">
                                                                    —
                                                                </div>
                                                            ) : analysis.options ? (
                                                                <select
                                                                    value={results[sample.id]?.[analysis.id] || ''}
                                                                    onChange={(e) => handleResultChange(sample.id, analysis.id, e.target.value)}
                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white shadow-sm transition-all"
                                                                >
                                                                    <option value=""></option>
                                                                    {analysis.options.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    placeholder="--"
                                                                    value={results[sample.id]?.[analysis.id] || ''}
                                                                    onChange={(e) => handleResultChange(sample.id, analysis.id, e.target.value)}
                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white shadow-sm transition-all"
                                                                />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

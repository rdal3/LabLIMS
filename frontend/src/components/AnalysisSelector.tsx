import React, { useState } from 'react';
import { X, Check, Filter } from 'lucide-react';
import { LAB_PARAMS, type AnalyticalMatrix } from '@/config/labConfig';

interface AnalysisSelectorProps {
    isOpen: boolean;
    selectedMatrix: AnalyticalMatrix | null;
    currentAnalyses: string[]; // IDs das análises já selecionadas
    onClose: () => void;
    onSave: (selectedAnalyses: string[]) => void;
}

const AnalysisSelector: React.FC<AnalysisSelectorProps> = ({
    isOpen,
    selectedMatrix,
    currentAnalyses,
    onClose,
    onSave
}) => {
    const [selected, setSelected] = useState<string[]>(currentAnalyses);

    if (!isOpen) return null;

    const handleToggle = (paramId: string) => {
        setSelected(prev =>
            prev.includes(paramId)
                ? prev.filter(id => id !== paramId)
                : [...prev, paramId]
        );
    };

    const handleSave = () => {
        onSave(selected);
        onClose();
    };

    // Agrupa parâmetros por categoria
    const grouped = {
        fisicoq: LAB_PARAMS.filter(p => p.category === 'fisicoq'),
        micro: LAB_PARAMS.filter(p => p.category === 'micro'),
        metais: LAB_PARAMS.filter(p => p.category === 'metais'),
        btex: LAB_PARAMS.filter(p => p.category === 'btex')
    };

    const categoryLabels = {
        fisicoq: 'Físico-Químicos',
        micro: 'Microbiologia',
        metais: 'Metais',
        btex: 'BTEX'
    };

    const categoryColors = {
        fisicoq: 'blue',
        micro: 'purple',
        metais: 'amber',
        btex: 'red'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Filter size={20} />
                            <h2 className="text-xl font-bold">Selecionar Análises</h2>
                        </div>
                        {selectedMatrix && (
                            <p className="text-blue-100 text-sm">
                                Matriz: {selectedMatrix.name}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {selectedMatrix && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-900">
                                <strong>Preset Padrão:</strong> {selectedMatrix.description}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                {selectedMatrix.analyses.length} análises incluídas por padrão. Você pode adicionar ou remover conforme necessário.
                            </p>
                        </div>
                    )}

                    {Object.entries(grouped).map(([category, params]) => {
                        if (params.length === 0) return null;

                        const color = categoryColors[category as keyof typeof categoryColors];
                        const label = categoryLabels[category as keyof typeof categoryLabels];

                        return (
                            <div key={category} className="bg-slate-50 rounded-lg p-5">
                                <h3 className={`text-${color}-700 font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2`}>
                                    <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
                                    {label}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {params.map(param => {
                                        const isSelected = selected.includes(param.id);
                                        const isFromMatrix = selectedMatrix?.analyses.includes(param.id);

                                        return (
                                            <label
                                                key={param.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                                        ? `bg-${color}-100 border-2 border-${color}-400`
                                                        : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggle(param.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900 text-sm">
                                                        {param.label}
                                                        {isFromMatrix && (
                                                            <span className={`ml-2 text-xs px-1.5 py-0.5 bg-${color}-200 text-${color}-800 rounded`}>
                                                                preset
                                                            </span>
                                                        )}
                                                    </div>
                                                    {param.unit && (
                                                        <div className="text-xs text-slate-500">{param.unit}</div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <Check size={16} className={`text-${color}-600 shrink-0`} />
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="text-sm text-slate-600">
                        <strong className="text-slate-900">{selected.length}</strong> análises selecionadas
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all"
                        >
                            Salvar Seleção
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisSelector;

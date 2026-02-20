import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, BookOpen, Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';
import type { ReferenceStandard, ReferenceStandardRule } from '../../utils/referenceValidator';
import { LAB_PARAMS } from '../../config/labConfig';

const ReferenceStandardsPanel: React.FC = () => {
    const { token } = useAuth();
    const [standards, setStandards] = useState<ReferenceStandard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStandard, setSelectedStandard] = useState<ReferenceStandard | null>(null);

    // Form states
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', category: '', is_active: 1 });

    // Rules Editor State
    const [editingRules, setEditingRules] = useState<ReferenceStandardRule[]>([]);

    useEffect(() => {
        fetchStandards();
    }, []);

    const fetchStandards = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/reference-standards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStandards(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStandardDetails = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/reference-standards/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedStandard(data);
                setEditingRules(data.rules || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateStandard = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reference-standards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsCreating(false);
                setFormData({ name: '', description: '', category: '', is_active: 1 });
                fetchStandards();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteStandard = async (id: number) => {
        if (!window.confirm('Excluir esta norma? Isto removerá todas as regras associadas.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/reference-standards/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                if (selectedStandard?.id === id) setSelectedStandard(null);
                fetchStandards();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveRules = async () => {
        if (!selectedStandard) return;
        try {
            const res = await fetch(`${API_BASE_URL}/reference-standards/${selectedStandard.id}/rules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rules: editingRules })
            });
            if (res.ok) {
                alert('Regras salvas com sucesso!');
                fetchStandardDetails(selectedStandard.id);
            } else {
                alert('Erro ao salvar regras.');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const addEmptyRule = () => {
        setEditingRules([...editingRules, {
            parameter_key: '',
            condition_type: 'MAX',
            display_reference: ''
        } as ReferenceStandardRule]);
    };

    const updateRule = (index: number, field: keyof ReferenceStandardRule, value: any) => {
        const newRules = [...editingRules];
        newRules[index] = { ...newRules[index], [field]: value };
        setEditingRules(newRules);
    };

    const autoFillDisplayReference = (index: number) => {
        const rule = editingRules[index];
        let autoText = '';

        if (rule.condition_type === 'ABSENCE') {
            autoText = 'Ausência';
        } else if (rule.condition_type === 'EXACT_TEXT') {
            autoText = rule.expected_text || 'Conforme';
        } else if (rule.condition_type === 'MAX' && rule.max_value !== null && rule.max_value !== undefined) {
            autoText = `≤ ${rule.max_value}`;
        } else if (rule.condition_type === 'MIN' && rule.min_value !== null && rule.min_value !== undefined) {
            autoText = `≥ ${rule.min_value}`;
        } else if (rule.condition_type === 'RANGE' && rule.min_value !== null && rule.min_value !== undefined && rule.max_value !== null && rule.max_value !== undefined) {
            autoText = `${rule.min_value} a ${rule.max_value}`;
        }

        if (autoText) {
            updateRule(index, 'display_reference', autoText);
        }
    };

    const removeRule = (index: number) => {
        setEditingRules(editingRules.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Carregando normas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-violet-600" />
                        Normas de Referência
                    </h2>
                    <p className="text-slate-500">Gerencie portarias, resoluções e limites de aceitação</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
                    >
                        <Plus size={20} />
                        Nova Norma
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of Standards */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {isCreating && (
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold mb-3">Cadastrar Nova Norma</h3>
                            <div className="space-y-3">
                                <input
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Nome (ex: Portaria 888)"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <input
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Descrição (opcional)"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                                <input
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Categoria (ex: Água Tratada)"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleCreateStandard} className="bg-emerald-600 text-white px-3 py-1.5 rounded flex-1">Salvar</button>
                                    <button onClick={() => setIsCreating(false)} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded flex-1">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {standards.map(std => (
                            <div
                                key={std.id}
                                className={`p-4 cursor-pointer hover:bg-violet-50 transition-colors ${selectedStandard?.id === std.id ? 'bg-violet-50 border-l-4 border-violet-600' : 'border-l-4 border-transparent'}`}
                                onClick={() => fetchStandardDetails(std.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-slate-900">{std.name}</div>
                                        {std.category && <div className="text-xs text-violet-600 font-medium mt-1">{std.category}</div>}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStandard(std.id); }} className="text-slate-400 hover:text-red-600 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {standards.length === 0 && !isCreating && (
                            <div className="p-8 text-center text-slate-500">Nenhuma norma cadastrada</div>
                        )}
                    </div>
                </div>

                {/* Rules Editor */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
                    {selectedStandard ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{selectedStandard.name}</h3>
                                    <p className="text-sm text-slate-500">Configuração de Limites e Regras de Validação</p>
                                </div>
                                <button onClick={handleSaveRules} className="bg-violet-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-violet-700">
                                    <Save size={18} />
                                    Salvar Regras
                                </button>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto max-h-[600px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs uppercase text-slate-500 border-b-2 font-bold">
                                            <th className="pb-2 w-1/4">Parâmetro (Chave)</th>
                                            <th className="pb-2 w-1/5">Tipo de Regra</th>
                                            <th className="pb-2 text-center">Valores (Min/Max/Texto)</th>
                                            <th className="pb-2 text-center w-1/4">Ref Exibição (V.Ref)</th>
                                            <th className="pb-2 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {editingRules.map((rule, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-2 pr-2">
                                                    <input
                                                        list="lab-params-list"
                                                        className="w-full border rounded px-2 py-1 text-sm bg-white"
                                                        placeholder="ex: turbidez"
                                                        value={rule.parameter_key}
                                                        onChange={(e) => updateRule(idx, 'parameter_key', e.target.value)}
                                                    />
                                                    <datalist id="lab-params-list">
                                                        {LAB_PARAMS.map(param => (
                                                            <option key={param.id} value={param.id}>
                                                                {param.label}
                                                            </option>
                                                        ))}
                                                    </datalist>
                                                </td>
                                                <td className="py-2 pr-2">
                                                    <select
                                                        className="w-full border rounded px-2 py-1 text-sm bg-white"
                                                        value={rule.condition_type}
                                                        onChange={(e) => updateRule(idx, 'condition_type', e.target.value)}
                                                    >
                                                        <option value="MAX">Máximo (≤)</option>
                                                        <option value="MIN">Mínimo (≥)</option>
                                                        <option value="RANGE">Intervalo (-)</option>
                                                        <option value="ABSENCE">Ausência</option>
                                                        <option value="EXACT_TEXT">Texto Exato</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 pr-2 align-top">
                                                    {rule.condition_type === 'RANGE' ? (
                                                        <div className="flex gap-1">
                                                            <input type="number" step="any" placeholder="Min" className="w-1/2 border rounded px-2 py-1 text-sm bg-white"
                                                                value={rule.min_value ?? ''} onChange={e => updateRule(idx, 'min_value', e.target.value ? parseFloat(e.target.value) : null)} />
                                                            <input type="number" step="any" placeholder="Max" className="w-1/2 border rounded px-2 py-1 text-sm bg-white"
                                                                value={rule.max_value ?? ''} onChange={e => updateRule(idx, 'max_value', e.target.value ? parseFloat(e.target.value) : null)} />
                                                        </div>
                                                    ) : (rule.condition_type === 'MAX' || rule.condition_type === 'MIN') ? (
                                                        <input type="number" step="any" placeholder={rule.condition_type === 'MAX' ? 'Max...' : 'Min...'} className="w-full border rounded px-2 py-1 text-sm bg-white"
                                                            value={rule.condition_type === 'MAX' ? (rule.max_value ?? '') : (rule.min_value ?? '')}
                                                            onChange={e => updateRule(idx, rule.condition_type === 'MAX' ? 'max_value' : 'min_value', e.target.value ? parseFloat(e.target.value) : null)} />
                                                    ) : (
                                                        <input type="text" placeholder="Texto esperado..." className="w-full border rounded px-2 py-1 text-sm bg-white"
                                                            value={rule.expected_text || ''} onChange={e => updateRule(idx, 'expected_text', e.target.value)} />
                                                    )}
                                                </td>
                                                <td className="py-2 pr-2">
                                                    <div className="flex bg-white rounded border focus-within:ring-2 focus-within:ring-violet-500 overflow-hidden">
                                                        <input
                                                            className="w-full px-2 py-1 text-sm outline-none"
                                                            placeholder={`Ex: "Ausência"`}
                                                            value={rule.display_reference || ''}
                                                            onChange={(e) => updateRule(idx, 'display_reference', e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => autoFillDisplayReference(idx)}
                                                            title="Preencher Automático"
                                                            className="bg-violet-100 hover:bg-violet-200 text-violet-600 px-2 flex items-center justify-center transition-colors"
                                                        >
                                                            <Wand2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-2 text-right">
                                                    <button onClick={() => removeRule(idx)} className="text-slate-400 hover:text-red-600 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <button onClick={addEmptyRule} className="mt-4 flex items-center gap-2 text-violet-600 hover:text-violet-800 text-sm font-bold border border-dashed border-violet-300 w-full py-2 justify-center rounded bg-violet-50">
                                    <Plus size={16} />
                                    Adicionar Regra
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                            <BookOpen size={48} className="mb-4 opacity-50" />
                            <p>Selecione uma norma na lista para editar suas regras</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferenceStandardsPanel;

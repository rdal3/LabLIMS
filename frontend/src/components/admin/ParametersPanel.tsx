import React, { useEffect, useState } from 'react';
import {
    Beaker, Plus, Edit2, Trash2, Save, X, RefreshCw,
    ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface Parameter {
    id: string;
    label: string;
    category: 'fisicoq' | 'micro' | 'metais' | 'btex' | 'outros';
    unit: string | null;
    options: string[] | null;
    is_column: number;
    display_order: number;
    active: number;
    created_at: string;
}

const CATEGORIES = [
    { id: 'fisicoq', name: 'Físico-Químicos', color: 'blue' },
    { id: 'micro', name: 'Microbiológicos', color: 'emerald' },
    { id: 'metais', name: 'Metais', color: 'amber' },
    { id: 'btex', name: 'BTEX', color: 'violet' },
    { id: 'outros', name: 'Outros', color: 'slate' }
];

const ParametersPanel: React.FC = () => {
    const { token } = useAuth();
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingParam, setEditingParam] = useState<Parameter | null>(null);
    const [formData, setFormData] = useState({
        id: '',
        label: '',
        category: 'fisicoq' as Parameter['category'],
        unit: '',
        options: '',
        isColumn: false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchParameters();
    }, []);

    const fetchParameters = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/parameters`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setParameters(data);
            }
        } catch (error) {
            console.error('Erro ao buscar parâmetros:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const payload = {
                ...formData,
                options: formData.options ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : null
            };

            const url = editingParam
                ? `${API_BASE_URL}/admin/parameters/${editingParam.id}`
                : `${API_BASE_URL}/admin/parameters`;

            const res = await fetch(url, {
                method: editingParam ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowForm(false);
                setEditingParam(null);
                resetForm();
                fetchParameters();
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao salvar parâmetro');
            }
        } catch (error) {
            setError('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (param: Parameter) => {
        setEditingParam(param);
        setFormData({
            id: param.id,
            label: param.label,
            category: param.category,
            unit: param.unit || '',
            options: param.options ? param.options.join(', ') : '',
            isColumn: !!param.is_column
        });
        setShowForm(true);
    };

    const handleToggleActive = async (param: Parameter) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/parameters/${param.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: !param.active })
            });

            if (res.ok) {
                fetchParameters();
            }
        } catch (error) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const handleDelete = async (paramId: string) => {
        if (!confirm('Tem certeza que deseja desativar este parâmetro?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/parameters/${paramId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchParameters();
            }
        } catch (error) {
            console.error('Erro ao remover parâmetro:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            label: '',
            category: 'fisicoq',
            unit: '',
            options: '',
            isColumn: false
        });
    };

    const groupedParams = CATEGORIES.map(cat => ({
        ...cat,
        params: parameters.filter(p => p.category === cat.id)
    }));

    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            fisicoq: 'bg-blue-100 text-blue-700 border-blue-200',
            micro: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            metais: 'bg-amber-100 text-amber-700 border-amber-200',
            btex: 'bg-violet-100 text-violet-700 border-violet-200',
            outros: 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return colors[cat] || colors.outros;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Beaker size={24} className="text-violet-600" />
                    Parâmetros Customizados
                    <span className="ml-2 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                        {parameters.length}
                    </span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={fetchParameters}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setEditingParam(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all"
                    >
                        <Plus size={16} />
                        Novo Parâmetro
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="font-bold text-blue-800">Sobre Parâmetros Customizados</p>
                        <p className="text-sm text-blue-600">
                            Parâmetros criados aqui são armazenados dinamicamente no banco de dados.
                            Para adicionar como coluna dedicada no banco, edite o arquivo <code className="bg-blue-100 px-1 rounded">labConfig.ts</code>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="bg-violet-600 px-6 py-4 text-white flex justify-between items-center rounded-t-xl">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {editingParam ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingParam ? 'Editar Parâmetro' : 'Novo Parâmetro'}
                            </h3>
                            <button onClick={() => { setShowForm(false); setEditingParam(null); }} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ID do Parâmetro*</label>
                                <input
                                    type="text"
                                    value={formData.id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                    disabled={!!editingParam}
                                    placeholder="ex: novoParametro"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Use camelCase ou snake_case. Não pode ser alterado depois.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nome de Exibição*</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="ex: Novo Parâmetro"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Categoria*</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Parameter['category'] }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Unidade</label>
                                    <input
                                        type="text"
                                        value={formData.unit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                        placeholder="ex: mg/L"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Opções (para select)</label>
                                <input
                                    type="text"
                                    value={formData.options}
                                    onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                                    placeholder="ex: Ausente, Presente, N/A"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Separe por vírgula. Deixe em branco para campo de texto livre.</p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingParam(null); }}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                                >
                                    <Save size={16} />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Parameters List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
            ) : parameters.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Beaker size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 mb-4">Nenhum parâmetro customizado criado ainda</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                    >
                        Criar Primeiro Parâmetro
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedParams.filter(g => g.params.length > 0).map(group => (
                        <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className={`px-6 py-3 border-b ${getCategoryColor(group.id)}`}>
                                <h3 className="font-bold">{group.name}</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {group.params.map(param => (
                                    <div
                                        key={param.id}
                                        className={`px-6 py-4 flex items-center justify-between ${!param.active ? 'opacity-50 bg-slate-50' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    {param.label}
                                                    {param.unit && (
                                                        <span className="text-xs text-slate-500 font-normal">({param.unit})</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">{param.id}</div>
                                            </div>
                                            {param.options && param.options.length > 0 && (
                                                <div className="flex gap-1">
                                                    {param.options.slice(0, 3).map((opt, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                            {opt}
                                                        </span>
                                                    ))}
                                                    {param.options.length > 3 && (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                            +{param.options.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleActive(param)}
                                                className={`p-2 rounded-lg transition-all ${param.active
                                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                                    : 'text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                title={param.active ? 'Desativar' : 'Ativar'}
                                            >
                                                {param.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(param)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(param.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remover"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParametersPanel;

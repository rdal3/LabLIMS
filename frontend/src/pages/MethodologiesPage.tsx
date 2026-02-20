import React, { useState, useEffect } from 'react';
import { Settings, Save, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import { LAB_PARAMS } from '../config/labConfig'; // Para saber quais parâmetros existem

interface MethodConfig {
    id?: number;
    parameter_key: string;
    method_name: string;
    ld: string;
    lq: string;
    equipment: string;
}

const MethodologiesPage: React.FC = () => {
    const { token, hasRole } = useAuth();
    const [configs, setConfigs] = useState<Record<string, MethodConfig>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // parameter_key que está salvando
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/parameter-methods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data: MethodConfig[] = await response.json();

            // Converter array em map para fácil acesso
            const configMap: Record<string, MethodConfig> = {};
            data.forEach(item => {
                configMap[item.parameter_key] = item;
            });

            setConfigs(configMap);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            setMessage({ type: 'error', text: 'Não foi possível carregar as configurações locais.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (paramKey: string, method_name: string, ld: string, lq: string, equipment: string) => {
        setSaving(paramKey);
        setMessage(null);

        try {
            const payload = { method_name, ld, lq, equipment };

            const response = await fetch(`${API_BASE_URL}/parameter-methods/${paramKey}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            // Atualiza o estado local para refletir a mudança
            setConfigs(prev => ({
                ...prev,
                [paramKey]: {
                    ...prev[paramKey],
                    parameter_key: paramKey,
                    ...payload
                }
            }));

            setMessage({ type: 'success', text: `Configuração para "${LAB_PARAMS.find(p => p.id === paramKey)?.label}" salva com sucesso!` });

            // Apaga a mensagem após 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(null);
        }
    };

    const filteredParams = LAB_PARAMS.filter(p =>
        p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar por categoria
    const categories: Record<string, typeof LAB_PARAMS> = {
        'Físico-Química': filteredParams.filter(p => p.category === 'fisicoq'),
        'Microbiologia': filteredParams.filter(p => p.category === 'micro'),
        'Metais': filteredParams.filter(p => p.category === 'metais'),
        'BTEX': filteredParams.filter(p => p.category === 'btex')
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
                        <Settings size={40} className="text-blue-600" />
                        Metodologias Analíticas
                    </h1>
                    <p className="text-slate-600 mt-2">Configurar Referências, LD, LQ e Equipamento por parâmetro (Laudo Técnico)</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar parâmetro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                    />
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium transition-all ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <RefreshCw size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="space-y-8">
                {Object.entries(categories).map(([categoryName, params]) => params.length > 0 && (
                    <div key={categoryName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800">{categoryName}</h2>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {params.map(param => {
                                const localConfig = configs[param.id] || { method_name: '', ld: '', lq: '', equipment: '' };

                                // Usar um estado local puramente para o form renderizar sem ficar recriando hooks em loop,
                                // Vamos extrair para um subcomponente para gerenciar o estado do formulário de cada linha individualmente.
                                return (
                                    <ConfigRow
                                        key={param.id}
                                        param={param}
                                        initialConfig={localConfig}
                                        onSave={(name, ld, lq, equip) => handleSaveConfig(param.id, name, ld, lq, equip)}
                                        isSaving={saving === param.id}
                                        hasRole={hasRole}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

                {filteredParams.length === 0 && (
                    <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Settings size={48} className="mx-auto text-slate-400 mb-4 opacity-50" />
                        <p className="text-lg">Nenhum parâmetro encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ConfigRowProps {
    param: any;
    initialConfig: Omit<MethodConfig, 'parameter_key'>;
    onSave: (method_name: string, ld: string, lq: string, equipment: string) => void;
    isSaving: boolean;
    hasRole: (...roles: string[]) => boolean;
}

const ConfigRow: React.FC<ConfigRowProps> = ({ param, initialConfig, onSave, isSaving, hasRole }) => {
    // Estado local para os inputs
    const [methodName, setMethodName] = useState(initialConfig.method_name || '');
    const [ld, setLd] = useState(initialConfig.ld || '');
    const [lq, setLq] = useState(initialConfig.lq || '');
    const [equipment, setEquipment] = useState(initialConfig.equipment || '');

    // Detectar se mudou em relação ao q veio do servidor
    const hasChanges = methodName !== (initialConfig.method_name || '') ||
        ld !== (initialConfig.ld || '') ||
        lq !== (initialConfig.lq || '') ||
        equipment !== (initialConfig.equipment || '');

    // Reset se initialConfig mudar (devido a um fetch)
    useEffect(() => {
        setMethodName(initialConfig.method_name || '');
        setLd(initialConfig.ld || '');
        setLq(initialConfig.lq || '');
        setEquipment(initialConfig.equipment || '');
    }, [initialConfig]);

    const handleSave = () => {
        onSave(methodName, ld, lq, equipment);
    };

    return (
        <div className="px-6 py-5 hover:bg-slate-50 transition-colors flex flex-col xl:flex-row gap-6 items-start xl:items-center">
            <div className="w-full xl:w-1/4">
                <h3 className="font-bold text-slate-900">{param.label}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">{param.id}</p>
                {param.unit && (
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs mt-2 font-medium">
                        Unidade: {param.unit}
                    </span>
                )}
            </div>

            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Metodologia</label>
                    <input
                        type="text"
                        value={methodName}
                        onChange={(e) => setMethodName(e.target.value)}
                        placeholder="Ex: SM 2550 B"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        disabled={!hasRole('ADMIN', 'PROFESSOR')}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Equipamento</label>
                    <input
                        type="text"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        placeholder="Ex: Espectrofotômetro"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        disabled={!hasRole('ADMIN', 'PROFESSOR')}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Limite de Detecção (LD)</label>
                    <input
                        type="text"
                        value={ld}
                        onChange={(e) => setLd(e.target.value)}
                        placeholder="Ex: 0,01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        disabled={!hasRole('ADMIN', 'PROFESSOR')}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Lim. de Quantificação (LQ)</label>
                    <input
                        type="text"
                        value={lq}
                        onChange={(e) => setLq(e.target.value)}
                        placeholder="Ex: 0,05"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        disabled={!hasRole('ADMIN', 'PROFESSOR')}
                    />
                </div>
            </div>

            {hasRole('ADMIN', 'PROFESSOR') && (
                <div className="w-full xl:w-auto mt-4 xl:mt-0 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${hasChanges && !isSaving
                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                    >
                        {isSaving ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        <span className="hidden xl:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
                        <span className="xl:hidden">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MethodologiesPage;

import React, { useEffect, useState } from 'react';
import {
    FileEdit, Filter, ChevronLeft, ChevronRight,
    Calendar, User, RefreshCw, ArrowRight, Beaker
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface SampleModification {
    id: number;
    sample_id: number;
    sample_codigo: string;
    user_id: number;
    user_email: string;
    user_name: string;
    field_name: string;
    field_label: string;
    old_value: string | null;
    new_value: string | null;
    modification_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
    timestamp: string;
    ip_address: string | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const SampleModificationsPanel: React.FC = () => {
    const { token } = useAuth();
    const [modifications, setModifications] = useState<SampleModification[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filterSampleId, setFilterSampleId] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterField, setFilterField] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchModifications();
    }, [pagination.page]);

    const fetchModifications = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            if (filterSampleId) params.append('sampleId', filterSampleId);
            if (filterUser) params.append('userId', filterUser);
            if (filterField) params.append('fieldName', filterField);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_BASE_URL}/amostras/modifications/all?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setModifications(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Erro ao buscar modificações:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchModifications();
    };

    const clearFilters = () => {
        setFilterSampleId('');
        setFilterUser('');
        setFilterField('');
        setStartDate('');
        setEndDate('');
        setPagination(prev => ({ ...prev, page: 1 }));
        setTimeout(fetchModifications, 0);
    };

    const getModificationTypeBadge = (type: string) => {
        switch (type) {
            case 'STATUS_CHANGE':
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Status</span>;
            case 'CREATE':
                return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Criação</span>;
            case 'DELETE':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">Exclusão</span>;
            default:
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Edição</span>;
        }
    };

    const formatFieldName = (fieldName: string) => {
        // Converte camelCase para texto legível
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileEdit size={24} className="text-violet-600" />
                    Histórico de Modificações
                    {pagination.total > 0 && (
                        <span className="ml-2 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                            {pagination.total.toLocaleString('pt-BR')}
                        </span>
                    )}
                </h2>
                <button
                    onClick={fetchModifications}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Filter size={16} />
                    <span className="font-medium">Filtros</span>
                </div>

                <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="relative">
                        <Beaker size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ID Amostra"
                            value={filterSampleId}
                            onChange={(e) => setFilterSampleId(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ID Usuário"
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Campo/Parâmetro"
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                    />

                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400 flex-shrink-0" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">até</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                        >
                            Limpar
                        </button>
                    </div>
                </form>
            </div>

            {/* Modifications Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                ) : modifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <FileEdit size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhuma modificação encontrada</p>
                        <p className="text-sm mt-2">As modificações serão registradas quando amostras forem editadas</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Data/Hora</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Amostra</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Usuário</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Campo</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Tipo</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Valor Anterior</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600"></th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Novo Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {modifications.map((mod) => (
                                    <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm">
                                            <div className="text-slate-900">
                                                {new Date(mod.timestamp).toLocaleDateString('pt-BR')}
                                            </div>
                                            <div className="text-slate-400 text-xs">
                                                {new Date(mod.timestamp).toLocaleTimeString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-violet-700">
                                                #{mod.sample_id}
                                            </div>
                                            {mod.sample_codigo && (
                                                <div className="text-xs text-slate-400">{mod.sample_codigo}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-slate-900">{mod.user_name}</div>
                                            <div className="text-xs text-slate-400">{mod.user_email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-slate-700">
                                                {formatFieldName(mod.field_name)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getModificationTypeBadge(mod.modification_type)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {mod.old_value ? (
                                                <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                                                    {mod.old_value.length > 30 ? mod.old_value.substring(0, 30) + '...' : mod.old_value}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">vazio</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ArrowRight size={16} className="text-slate-400 mx-auto" />
                                        </td>
                                        <td className="px-4 py-3">
                                            {mod.new_value ? (
                                                <span className="text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                    {mod.new_value.length > 30 ? mod.new_value.substring(0, 30) + '...' : mod.new_value}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">vazio</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <span className="text-sm text-slate-600">
                            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-medium text-slate-600">
                                Página {pagination.page} de {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SampleModificationsPanel;

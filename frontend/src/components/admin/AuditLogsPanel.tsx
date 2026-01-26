import React, { useEffect, useState } from 'react';
import {
    History, Search, Download, Filter, ChevronLeft, ChevronRight,
    AlertTriangle, AlertCircle, Info, Eye, X, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface AuditLog {
    id: number;
    timestamp: string;
    user_id: number | null;
    user_email: string;
    user_name: string | null;
    user_role: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    state_before: any;
    state_after: any;
    ip_address: string | null;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    metadata: any;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const AuditLogsPanel: React.FC = () => {
    const { token } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actions, setActions] = useState<string[]>([]);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchActions();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filterAction, filterSeverity, startDate, endDate]);

    const fetchActions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/audit-logs/actions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActions(data);
            }
        } catch (error) {
            console.error('Erro ao buscar ações:', error);
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            if (search) params.append('search', search);
            if (filterAction) params.append('action', filterAction);
            if (filterSeverity) params.append('severity', filterSeverity);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchLogs();
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_BASE_URL}/admin/audit-logs/export?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
                return (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        <AlertTriangle size={12} /> CRÍTICO
                    </span>
                );
            case 'WARNING':
                return (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        <AlertCircle size={12} /> AVISO
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        <Info size={12} /> INFO
                    </span>
                );
        }
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <History size={24} className="text-violet-600" />
                    Logs de Auditoria
                </h2>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Filter size={16} />
                    <span className="font-medium">Filtros</span>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    >
                        <option value="">Todas as ações</option>
                        {actions.map(action => (
                            <option key={action} value={action}>{formatAction(action)}</option>
                        ))}
                    </select>

                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    >
                        <option value="">Todas as severidades</option>
                        <option value="INFO">Info</option>
                        <option value="WARNING">Aviso</option>
                        <option value="CRITICAL">Crítico</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
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
                        <button
                            type="submit"
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all"
                        >
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <History size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum log encontrado com os filtros selecionados</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Data/Hora</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Usuário</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Ação</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Entidade</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Severidade</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">IP</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm">
                                            <div className="text-slate-900">
                                                {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                                            </div>
                                            <div className="text-slate-400 text-xs">
                                                {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-slate-900">
                                                {log.user_name || log.user_email}
                                            </div>
                                            {log.user_role && (
                                                <div className="text-xs text-slate-400">{log.user_role}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-slate-700">
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {log.entity_type && (
                                                <span>
                                                    {log.entity_type}
                                                    {log.entity_id && <span className="text-slate-400"> #{log.entity_id}</span>}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getSeverityBadge(log.severity)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
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

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="bg-violet-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Eye size={20} />
                                Detalhes do Log #{selectedLog.id}
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Data/Hora</label>
                                    <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Severidade</label>
                                    <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Usuário</label>
                                    <p className="font-medium">{selectedLog.user_name || selectedLog.user_email}</p>
                                    {selectedLog.user_role && <p className="text-sm text-slate-500">{selectedLog.user_role}</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">IP</label>
                                    <p className="font-medium font-mono">{selectedLog.ip_address || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Ação</label>
                                    <p className="font-medium text-violet-700">{formatAction(selectedLog.action)}</p>
                                </div>
                                {selectedLog.entity_type && (
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-500 uppercase tracking-wider">Entidade</label>
                                        <p className="font-medium">{selectedLog.entity_type} #{selectedLog.entity_id}</p>
                                    </div>
                                )}
                            </div>

                            {selectedLog.metadata && (
                                <div className="mb-6">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">Metadata</label>
                                    <pre className="bg-slate-100 p-3 rounded-lg text-sm overflow-x-auto">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.state_before && (
                                <div className="mb-6">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">Estado Anterior</label>
                                    <pre className="bg-red-50 p-3 rounded-lg text-sm overflow-x-auto text-red-700">
                                        {JSON.stringify(selectedLog.state_before, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.state_after && (
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">Estado Posterior</label>
                                    <pre className="bg-emerald-50 p-3 rounded-lg text-sm overflow-x-auto text-emerald-700">
                                        {JSON.stringify(selectedLog.state_after, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogsPanel;

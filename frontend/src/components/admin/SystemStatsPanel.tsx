import React, { useEffect, useState } from 'react';
import {
    TrendingUp, BarChart3, Users, Beaker, Activity, RefreshCw,
    Calendar, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface SystemStats {
    users: { total: number; active: number; inactive: number };
    usersByRole: { role: string; count: number }[];
    samples: { total: number; aguardando: number; emAnalise: number; concluido: number };
    activeSessions: number;
    auditStats: { total: number; critical: number; warning: number; today: number };
    activityLast7Days: { date: string; count: number }[];
    topActions: { action: string; count: number }[];
    topUsers: { user_email: string; actions: number }[];
    samplesByMonth: { month: string; count: number }[];
    serverTime: string;
}

const SystemStatsPanel: React.FC = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dbInfo, setDbInfo] = useState<{ tables: any[]; sizeMB: string } | null>(null);

    useEffect(() => {
        fetchStats();
        fetchDbInfo();
    }, []);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDbInfo = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/database-info`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDbInfo(data);
            }
        } catch (error) {
            console.error('Erro ao buscar info do banco:', error);
        }
    };

    const formatAction = (action: string) => {
        return action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Auth ', '🔐 ')
            .replace('Admin ', '👑 ')
            .replace('User ', '👤 ')
            .replace('Sample ', '🧪 ');
    };

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
    };

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp size={24} className="text-violet-600" />
                    Estatísticas do Sistema
                </h2>
                <button
                    onClick={() => { fetchStats(); fetchDbInfo(); }}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {stats && (
                <>
                    {/* Activity Chart - Last 7 Days */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-violet-600" />
                            Atividade dos Últimos 7 Dias
                        </h3>
                        {stats.activityLast7Days.length > 0 ? (
                            <div className="h-48 flex items-end gap-2">
                                {stats.activityLast7Days.map((day) => {
                                    const maxCount = Math.max(...stats.activityLast7Days.map(d => d.count));
                                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                                    const date = new Date(day.date);
                                    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                                    const dayNum = date.getDate();

                                    return (
                                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                            <span className="text-xs font-bold text-slate-600">{day.count}</span>
                                            <div
                                                className="w-full bg-gradient-to-t from-violet-500 to-violet-400 rounded-t-lg transition-all hover:from-violet-600 hover:to-violet-500"
                                                style={{ height: `${Math.max(height, 5)}%` }}
                                            />
                                            <div className="text-center">
                                                <div className="text-xs text-slate-500">{dayName}</div>
                                                <div className="text-sm font-bold text-slate-700">{dayNum}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Sem atividade nos últimos 7 dias</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Samples by Month */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-blue-600" />
                                Amostras por Mês
                            </h3>
                            {stats.samplesByMonth.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.samplesByMonth.map((month, index) => {
                                        const maxCount = Math.max(...stats.samplesByMonth.map(m => m.count));
                                        const width = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
                                        const prevMonth = index > 0 ? stats.samplesByMonth[index - 1] : null;
                                        const trend = prevMonth ? month.count - prevMonth.count : 0;

                                        return (
                                            <div key={month.month} className="flex items-center gap-3">
                                                <span className="w-16 text-sm font-medium text-slate-600">
                                                    {formatMonth(month.month)}
                                                </span>
                                                <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-end pr-2"
                                                        style={{ width: `${Math.max(width, 10)}%` }}
                                                    >
                                                        <span className="text-xs font-bold text-white">{month.count}</span>
                                                    </div>
                                                </div>
                                                {trend !== 0 && (
                                                    <span className={`flex items-center text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                                        {Math.abs(trend)}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-slate-400">Sem dados de amostras</p>
                            )}
                        </div>

                        {/* Top Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <BarChart3 size={20} className="text-amber-600" />
                                Ações Mais Frequentes (30 dias)
                            </h3>
                            {stats.topActions.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.topActions.slice(0, 8).map((action, index) => (
                                        <div key={action.action} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm text-slate-700">{formatAction(action.action)}</span>
                                            </div>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                                {action.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-slate-400">Sem dados de ações</p>
                            )}
                        </div>

                        {/* Top Users */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-emerald-600" />
                                Usuários Mais Ativos (30 dias)
                            </h3>
                            {stats.topUsers.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topUsers.map((user, index) => {
                                        const maxActions = Math.max(...stats.topUsers.map(u => u.actions));
                                        const width = maxActions > 0 ? (user.actions / maxActions) * 100 : 0;

                                        return (
                                            <div key={user.user_email} className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-slate-700 mb-1 truncate">
                                                        {user.user_email}
                                                    </div>
                                                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-slate-600 min-w-[60px] text-right">
                                                    {user.actions} ações
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-slate-400">Sem dados de usuários</p>
                            )}
                        </div>

                        {/* Database Info */}
                        {dbInfo && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Beaker size={20} className="text-violet-600" />
                                    Informações do Banco de Dados
                                </h3>
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-600">Tamanho do Banco</span>
                                        <span className="font-bold text-violet-700">{dbInfo.sizeMB} MB</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm font-bold text-slate-700 mb-2">Tabelas:</div>
                                    {dbInfo.tables.map(table => (
                                        <div key={table.name} className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded-lg">
                                            <span className="text-sm text-slate-600 font-mono">{table.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">{table.columns} cols</span>
                                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
                                                    {table.rows.toLocaleString('pt-BR')} rows
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SystemStatsPanel;

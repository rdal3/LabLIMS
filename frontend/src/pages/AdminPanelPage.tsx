import React, { useEffect, useState } from 'react';
import {
    Shield, Activity, Users, Beaker, Database,
    History, LogOut, AlertTriangle, CheckCircle, Clock,
    TrendingUp, BarChart3, RefreshCw, ChevronRight, X, FileEdit, BookOpen, Settings, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import AuditLogsPanel from '../components/admin/AuditLogsPanel';
import SessionsPanel from '../components/admin/SessionsPanel';
import UsersManagementPanel from '../components/admin/UsersManagementPanel';
import ParametersPanel from '../components/admin/ParametersPanel';
import SystemStatsPanel from '../components/admin/SystemStatsPanel';
import SampleModificationsPanel from '../components/admin/SampleModificationsPanel';
import ReferenceStandardsPanel from '../components/admin/ReferenceStandardsPanel';
import MethodologiesPage from './MethodologiesPage';
import ClientsPage from './ClientsPage';

type TabType = 'overview' | 'audit' | 'modifications' | 'sessions' | 'users' | 'parameters' | 'stats' | 'standards' | 'methodologies' | 'clients';

interface SystemStats {
    users: { total: number; active: number; inactive: number };
    samples: { total: number; aguardando: number; emAnalise: number; concluido: number };
    activeSessions: number;
    auditStats: { total: number; critical: number; warning: number; today: number };
    serverTime: string;
}

const AdminPanelPage: React.FC = () => {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchStats();
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
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'overview' as TabType, label: 'Visão Geral', icon: BarChart3 },
        { id: 'audit' as TabType, label: 'Logs de Auditoria', icon: History },
        { id: 'modifications' as TabType, label: 'Modificações Amostras', icon: FileEdit },
        { id: 'sessions' as TabType, label: 'Sessões Ativas', icon: LogOut },
        { id: 'users' as TabType, label: 'Usuários', icon: Users },
        { id: 'clients' as TabType, label: 'Clientes', icon: Building2 },
        { id: 'standards' as TabType, label: 'Normas e Limites', icon: BookOpen },
        { id: 'parameters' as TabType, label: 'Parâmetros', icon: Beaker },
        { id: 'methodologies' as TabType, label: 'Metodologias (Laudos)', icon: Settings },
        { id: 'stats' as TabType, label: 'Estatísticas', icon: TrendingUp },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewPanel stats={stats} isLoading={isLoading} onRefresh={fetchStats} lastUpdated={lastUpdated} />;
            case 'audit':
                return <AuditLogsPanel />;
            case 'modifications':
                return <SampleModificationsPanel />;
            case 'sessions':
                return <SessionsPanel />;
            case 'users':
                return <UsersManagementPanel />;
            case 'clients':
                return <ClientsPage />;
            case 'parameters':
                return <ParametersPanel />;
            case 'methodologies':
                return <MethodologiesPage />;
            case 'standards':
                return <ReferenceStandardsPanel />;
            case 'stats':
                return <SystemStatsPanel />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold">Painel de Administração</h1>
                            <p className="text-violet-200 mt-1">
                                Bem-vindo, {user?.full_name} • Acesso total ao sistema
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isActive
                                            ? 'bg-violet-50 text-violet-700 border-l-4 border-violet-600'
                                            : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="font-medium">{tab.label}</span>
                                        {isActive && <ChevronRight size={16} className="ml-auto" />}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Quick Info Card */}
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                                <Database size={16} />
                                Status do Sistema
                            </div>
                            {stats && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Sessões ativas</span>
                                        <span className="font-bold text-emerald-600">{stats.activeSessions}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Eventos hoje</span>
                                        <span className="font-bold text-blue-600">{stats.auditStats.today}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Alertas críticos</span>
                                        <span className={`font-bold ${stats.auditStats.critical > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {stats.auditStats.critical}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Overview Panel Component
interface OverviewPanelProps {
    stats: SystemStats | null;
    isLoading: boolean;
    onRefresh: () => void;
    lastUpdated: Date | null;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ stats, isLoading, onRefresh, lastUpdated }) => {
    // Estado para controlar quando o alerta foi dismissado
    // Armazena a contagem de críticos quando foi fechado
    const [dismissedCriticalCount, setDismissedCriticalCount] = useState<number | null>(null);

    // O alerta só aparece se:
    // 1. Há eventos críticos E
    // 2. O usuário não dismissou OU há MAIS eventos críticos do que quando dismissou
    const shouldShowAlert = stats &&
        stats.auditStats.critical > 0 &&
        (dismissedCriticalCount === null || stats.auditStats.critical > dismissedCriticalCount);

    const handleDismissAlert = () => {
        if (stats) {
            // Salva a contagem atual para só reexibir se houver NOVOS eventos
            setDismissedCriticalCount(stats.auditStats.critical);
        }
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
            {/* Header with Refresh */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Visão Geral do Sistema</h2>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-sm text-slate-500">
                            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
                        </span>
                    )}
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Usuários Ativos"
                            value={stats.users.active}
                            subtitle={`${stats.users.inactive} inativos`}
                            icon={Users}
                            color="blue"
                        />
                        <StatCard
                            title="Sessões Ativas"
                            value={stats.activeSessions}
                            subtitle="conexões agora"
                            icon={Activity}
                            color="emerald"
                        />
                        <StatCard
                            title="Total de Amostras"
                            value={stats.samples.total}
                            subtitle={`${stats.samples.concluido} concluídas`}
                            icon={Beaker}
                            color="violet"
                        />
                        <StatCard
                            title="Eventos de Auditoria"
                            value={stats.auditStats.total}
                            subtitle={`${stats.auditStats.today} hoje`}
                            icon={History}
                            color="amber"
                        />
                    </div>

                    {/* Alerts Section */}
                    {shouldShowAlert && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
                                    <div>
                                        <h3 className="font-bold text-red-800">Atenção Necessária</h3>
                                        <p className="text-red-600 text-sm">
                                            {stats.auditStats.critical} eventos críticos registrados.
                                            Revise os logs de auditoria.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismissAlert}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all flex-shrink-0"
                                    title="Dispensar alerta"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Beaker size={20} className="text-violet-600" />
                                Status das Amostras
                            </h3>
                            <div className="space-y-3">
                                <ProgressBar
                                    label="Aguardando"
                                    value={stats.samples.aguardando}
                                    total={stats.samples.total}
                                    color="slate"
                                />
                                <ProgressBar
                                    label="Em Análise"
                                    value={stats.samples.emAnalise}
                                    total={stats.samples.total}
                                    color="amber"
                                />
                                <ProgressBar
                                    label="Concluídas"
                                    value={stats.samples.concluido}
                                    total={stats.samples.total}
                                    color="emerald"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Usuários por Papel
                            </h3>
                            <div className="space-y-2">
                                {['ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'].map(role => {
                                    const roleData = (stats as any).usersByRole?.find((r: any) => r.role === role);
                                    return (
                                        <div key={role} className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">{role}</span>
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded ${role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                                                role === 'PROFESSOR' ? 'bg-blue-100 text-blue-700' :
                                                    role === 'TÉCNICO' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {roleData?.count || 0}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-emerald-600" />
                                Sistema
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-emerald-500" size={20} />
                                    <span className="text-sm text-slate-600">Backend Online</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-emerald-500" size={20} />
                                    <span className="text-sm text-slate-600">Banco de Dados OK</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="text-slate-400" size={20} />
                                    <span className="text-sm text-slate-600">
                                        Servidor: {stats.serverTime ? new Date(stats.serverTime).toLocaleTimeString('pt-BR') : '--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Reusable Stat Card
interface StatCardProps {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ElementType;
    color: 'blue' | 'emerald' | 'violet' | 'amber' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        violet: 'bg-violet-50 text-violet-600 border-violet-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        red: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <div className={`rounded-xl border-2 p-5 ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <Icon size={24} />
                <span className="text-3xl font-extrabold">{value.toLocaleString('pt-BR')}</span>
            </div>
            <div className="font-bold">{title}</div>
            <div className="text-sm opacity-70">{subtitle}</div>
        </div>
    );
};

// Progress Bar Component
interface ProgressBarProps {
    label: string;
    value: number;
    total: number;
    color: 'slate' | 'amber' | 'emerald';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    const colorMap = {
        slate: 'bg-slate-400',
        amber: 'bg-amber-500',
        emerald: 'bg-emerald-500',
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold">{value} ({percentage}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                    className={`h-full rounded-full transition-all ${colorMap[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default AdminPanelPage;

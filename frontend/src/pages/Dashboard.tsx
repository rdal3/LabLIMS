import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, CheckCircle, Clock, BarChart3, ArrowRight, Calendar, Beaker, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { endpoints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
    total: number;
    aguardando: number;
    emAnalise: number;
    concluido: number;
}

interface MatrixData {
    matriz: string;
    total: number;
    concluidas: number;
    emAnalise: number;
    percentComplete: number;
}

interface RecentSample {
    id: number;
    codigo: string;
    cliente: string;
    matriz: string;
    status: string;
    dataColeta: string;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [matrixData, setMatrixData] = useState<MatrixData[]>([]);
    const [recentSamples, setRecentSamples] = useState<RecentSample[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        // Auto-refresh a cada 30 segundos
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch stats
            const statsRes = await fetch(`${endpoints.amostras.replace('/amostras', '')}/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch matrix data
            const matrixRes = await fetch(`${endpoints.amostras.replace('/amostras', '')}/dashboard/by-matrix`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const matrixDataRes = await matrixRes.json();
            setMatrixData(matrixDataRes);

            // Fetch recent samples (últimas 5)
            const samplesRes = await fetch(`${endpoints.amostras}?ordem=DESC&limite=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const samplesData = await samplesRes.json();
            setRecentSamples(samplesData.slice ? samplesData.slice(0, 5) : []);

        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Concluído':
                return 'bg-emerald-100 text-emerald-700';
            case 'Em Análise':
                return 'bg-amber-100 text-amber-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    const completionRate = stats ? Math.round((stats.concluido / (stats.total || 1)) * 100) : 0;
    const inProgressRate = stats ? Math.round((stats.emAnalise / (stats.total || 1)) * 100) : 0;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            {/* Header com Auto-refresh indicator */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
                        <BarChart3 size={40} className="text-blue-600" />
                        Dashboard
                    </h1>
                    <p className="text-slate-600 mt-2">Visão geral em tempo real do laboratório</p>
                </div>
                {isLoading && stats && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Atualizando...
                    </div>
                )}
            </div>

            {/* Stats Cards - agora clicáveis */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div onClick={() => navigate('/amostras')} className="cursor-pointer transform hover:scale-105 transition-transform">
                        <StatCard
                            title="Total de Amostras"
                            value={stats.total}
                            icon={Activity}
                            color="blue"
                        />
                    </div>
                    <div onClick={() => navigate('/amostras?status=Aguardando')} className="cursor-pointer transform hover:scale-105 transition-transform">
                        <StatCard
                            title="Aguardando"
                            value={stats.aguardando}
                            icon={Clock}
                            color="slate"
                        />
                    </div>
                    <div onClick={() => navigate('/amostras?status=Em%20Análise')} className="cursor-pointer transform hover:scale-105 transition-transform">
                        <StatCard
                            title="Em Análise"
                            value={stats.emAnalise}
                            icon={TrendingUp}
                            color="amber"
                        />
                    </div>
                    <div onClick={() => navigate('/amostras?status=Concluído')} className="cursor-pointer transform hover:scale-105 transition-transform">
                        <StatCard
                            title="Concluídas"
                            value={stats.concluido}
                            icon={CheckCircle}
                            color="emerald"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Overview - 2 colunas */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Taxa de Progresso Geral */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600" />
                                Progresso Geral
                            </span>
                            <span className="text-2xl font-extrabold text-blue-600">{completionRate}%</span>
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Concluídas</span>
                                    <span className="font-bold text-emerald-600">{stats?.concluido} ({completionRate}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                                        style={{ width: `${completionRate}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Em Análise</span>
                                    <span className="font-bold text-amber-600">{stats?.emAnalise} ({inProgressRate}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700"
                                        style={{ width: `${inProgressRate}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Progress */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Beaker size={20} className="text-blue-600" />
                            Progresso por Matriz
                        </h2>

                        {matrixData.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Nenhuma amostra com matriz definida ainda.</p>
                                <button
                                    onClick={() => navigate('/amostras')}
                                    className="mt-4 text-blue-600 hover:text-blue-700 font-bold"
                                >
                                    Criar primeira amostra →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {matrixData.map((matrix) => (
                                    <div
                                        key={matrix.matriz}
                                        className="space-y-2 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/amostras?matriz=${matrix.matriz}`)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">{matrix.matriz}</span>
                                            <span className="text-sm text-slate-500">
                                                {matrix.concluidas}/{matrix.total} ({matrix.percentComplete}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${matrix.percentComplete === 100
                                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                    : matrix.percentComplete > 50
                                                        ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                                        : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                                    }`}
                                                style={{ width: `${matrix.percentComplete}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Amostras Recentes - 1 coluna */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-600" />
                            Amostras Recentes
                        </h2>

                        {recentSamples.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p className="text-sm">Nenhuma amostra registrada</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentSamples.map((sample) => (
                                    <div
                                        key={sample.id}
                                        onClick={() => navigate('/amostras')}
                                        className="p-4 rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-900">{sample.codigo}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(sample.status)}`}>
                                                {sample.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 truncate">{sample.cliente}</p>
                                        <p className="text-xs text-slate-400 mt-1">{sample.matriz}</p>
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-xs text-slate-500">
                                                {new Date(sample.dataColeta).toLocaleDateString('pt-BR')}
                                            </span>
                                            <ArrowRight size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => navigate('/amostras')}
                                    className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    Ver todas as amostras
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ações Rápidas - Agora funcionais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => navigate('/amostras')}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 p-6 rounded-2xl hover:from-blue-100 hover:to-blue-200 transition-all text-left group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-blue-900 text-lg mb-2">Registrar Amostras</h3>
                            <p className="text-blue-700 text-sm">Criar novas entradas no sistema</p>
                        </div>
                        <ArrowRight className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/amostras?status=Em%20Análise')}
                    className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 p-6 rounded-2xl hover:from-amber-100 hover:to-amber-200 transition-all text-left group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-amber-900 text-lg mb-2">Análises Pendentes</h3>
                            <p className="text-amber-700 text-sm">{stats?.emAnalise || 0} em andamento</p>
                        </div>
                        <ArrowRight className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/amostras?status=Aguardando')}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 p-6 rounded-2xl hover:from-slate-100 hover:to-slate-200 transition-all text-left group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg mb-2">Aguardando Início</h3>
                            <p className="text-slate-700 text-sm">{stats?.aguardando || 0} amostras</p>
                        </div>
                        <ArrowRight className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;

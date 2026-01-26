import React, { useEffect, useState } from 'react';
import {
    LogOut, Monitor, Globe, Clock, Trash2, RefreshCw, User, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface Session {
    id: string;
    user_id: number;
    user_email: string;
    user_name: string;
    user_role: string;
    ip_address: string;
    user_agent: string;
    expires_at: string;
    created_at: string;
}

const SessionsPanel: React.FC = () => {
    const { token, user: currentUser } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (error) {
            console.error('Erro ao buscar sessões:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const revokeSession = async (sessionId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                setConfirmRevoke(null);
            }
        } catch (error) {
            console.error('Erro ao revogar sessão:', error);
        }
    };

    const revokeAllUserSessions = async (userId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/sessions/user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setSessions(prev => prev.filter(s => s.user_id !== userId));
            }
        } catch (error) {
            console.error('Erro ao revogar sessões:', error);
        }
    };

    const cleanupExpiredSessions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cleanup-sessions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const result = await res.json();
                alert(`${result.removed} sessões expiradas removidas`);
                fetchSessions();
            }
        } catch (error) {
            console.error('Erro ao limpar sessões:', error);
        }
    };

    const parseUserAgent = (ua: string | null) => {
        if (!ua) return { browser: 'Desconhecido', os: '' };

        let browser = 'Navegador';
        let os = '';

        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return { browser, os };
    };

    const getTimeRemaining = (expiresAt: string) => {
        const remaining = new Date(expiresAt).getTime() - Date.now();
        if (remaining <= 0) return 'Expirada';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return `${hours}h ${minutes}m`;
    };

    // Group sessions by user
    const sessionsByUser = sessions.reduce((acc, session) => {
        if (!acc[session.user_id]) {
            acc[session.user_id] = {
                userId: session.user_id,
                email: session.user_email,
                name: session.user_name,
                role: session.user_role,
                sessions: []
            };
        }
        acc[session.user_id].sessions.push(session);
        return acc;
    }, {} as Record<number, { userId: number; email: string; name: string; role: string; sessions: Session[] }>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <LogOut size={24} className="text-violet-600" />
                    Sessões Ativas
                    <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {sessions.length}
                    </span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={cleanupExpiredSessions}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all"
                    >
                        <Trash2 size={16} />
                        Limpar Expiradas
                    </button>
                    <button
                        onClick={fetchSessions}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Sessions List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <LogOut size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">Nenhuma sessão ativa no momento</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.values(sessionsByUser).map((userGroup) => (
                        <div key={userGroup.userId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* User Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                                        <User size={20} className="text-violet-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{userGroup.name}</div>
                                        <div className="text-sm text-slate-500">{userGroup.email}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${userGroup.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                                        userGroup.role === 'PROFESSOR' ? 'bg-blue-100 text-blue-700' :
                                            userGroup.role === 'TÉCNICO' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {userGroup.role}
                                    </span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                                        {userGroup.sessions.length} sessão(ões)
                                    </span>
                                </div>
                                {userGroup.userId !== currentUser?.id && userGroup.sessions.length > 1 && (
                                    <button
                                        onClick={() => revokeAllUserSessions(userGroup.userId)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm"
                                    >
                                        <AlertTriangle size={14} />
                                        Revogar Todas
                                    </button>
                                )}
                            </div>

                            {/* Sessions */}
                            <div className="divide-y divide-slate-100">
                                {userGroup.sessions.map((session) => {
                                    const { browser, os } = parseUserAgent(session.user_agent);
                                    const isCurrentSession = session.user_id === currentUser?.id;

                                    return (
                                        <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Monitor size={16} />
                                                    <span className="text-sm">{browser}</span>
                                                    {os && <span className="text-slate-400 text-sm">• {os}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Globe size={14} />
                                                    <span className="font-mono">{session.ip_address || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Clock size={14} />
                                                    <span>Expira em {getTimeRemaining(session.expires_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isCurrentSession && (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                                        Sessão Atual
                                                    </span>
                                                )}
                                                {!isCurrentSession && (
                                                    confirmRevoke === session.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-slate-500">Confirmar?</span>
                                                            <button
                                                                onClick={() => revokeSession(session.id)}
                                                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                                            >
                                                                Sim
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmRevoke(null)}
                                                                className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
                                                            >
                                                                Não
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmRevoke(session.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm"
                                                        >
                                                            <LogOut size={14} />
                                                            Revogar
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SessionsPanel;

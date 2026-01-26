import React, { useEffect, useState } from 'react';
import {
    Users, Trash2, Key, Unlock, Shield, RefreshCw, AlertTriangle,
    CheckCircle, XCircle, MoreVertical, X, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface User {
    id: number;
    email: string;
    role: 'ADMIN' | 'PROFESSOR' | 'TÉCNICO' | 'VOLUNTÁRIO';
    full_name: string;
    active: number;
    must_change_password: number;
    failed_login_attempts: number;
    created_at: string;
    created_by: number | null;
    created_by_name: string | null;
    active_sessions: number;
}

const UsersManagementPanel: React.FC = () => {
    const { token, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [actionMenu, setActionMenu] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete' | 'reset' | 'unlock';
        userId: number;
        userName: string;
    } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const permanentDelete = async (userId: number) => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/permanent`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                setConfirmAction(null);
            } else {
                const error = await res.json();
                alert(error.error || 'Erro ao excluir usuário');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const resetPassword = async (userId: number) => {
        if (newPassword.length < 8) {
            alert('A nova senha deve ter no mínimo 8 caracteres');
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newPassword })
            });

            if (res.ok) {
                setConfirmAction(null);
                setNewPassword('');
                alert('Senha resetada com sucesso! O usuário precisará alterar no próximo login.');
                fetchUsers();
            } else {
                const error = await res.json();
                alert(error.error || 'Erro ao resetar senha');
            }
        } catch (error) {
            console.error('Erro ao resetar senha:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const unlockAccount = async (userId: number) => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/unlock`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setConfirmAction(null);
                fetchUsers();
            }
        } catch (error) {
            console.error('Erro ao desbloquear conta:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleUserActive = async (userId: number, currentActive: boolean) => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: !currentActive })
            });

            if (res.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && user.active) ||
            (filterStatus === 'inactive' && !user.active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            'ADMIN': 'bg-violet-100 text-violet-700 border-violet-200',
            'PROFESSOR': 'bg-blue-100 text-blue-700 border-blue-200',
            'TÉCNICO': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'VOLUNTÁRIO': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[role] || colors['VOLUNTÁRIO']}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Users size={24} className="text-violet-600" />
                    Gerenciamento de Usuários
                    <span className="ml-2 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                        {users.length}
                    </span>
                </h2>
                <button
                    onClick={fetchUsers}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                        <option value="">Todos os papéis</option>
                        <option value="ADMIN">Admin</option>
                        <option value="PROFESSOR">Professor</option>
                        <option value="TÉCNICO">Técnico</option>
                        <option value="VOLUNTÁRIO">Voluntário</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                        <option value="all">Todos os status</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>
                </div>
            </div>

            {/* Users List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Usuário</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Papel</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600">Status</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600">Sessões</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600">Tentativas</th>
                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">Criado</th>
                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-600">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.active ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-violet-100' : 'bg-slate-100'
                                                    }`}>
                                                    {user.role === 'ADMIN' ? (
                                                        <Shield size={18} className="text-violet-600" />
                                                    ) : (
                                                        <Users size={18} className="text-slate-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 flex items-center gap-2">
                                                        {user.full_name}
                                                        {user.id === currentUser?.id && (
                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                                                                Você
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.active ? (
                                                <span className="flex items-center justify-center gap-1 text-emerald-600 text-sm">
                                                    <CheckCircle size={14} /> Ativo
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-1 text-red-600 text-sm">
                                                    <XCircle size={14} /> Inativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.active_sessions > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {user.active_sessions}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.failed_login_attempts > 5 ? 'bg-red-100 text-red-700' :
                                                user.failed_login_attempts > 0 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                {user.failed_login_attempts}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-600">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                            {user.created_by_name && (
                                                <div className="text-xs text-slate-400">por {user.created_by_name}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center relative">
                                            {user.id !== currentUser?.id && (
                                                <>
                                                    <button
                                                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {actionMenu === user.id && (
                                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                                                            <button
                                                                onClick={() => {
                                                                    toggleUserActive(user.id, !!user.active);
                                                                    setActionMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                                            >
                                                                {user.active ? (
                                                                    <>
                                                                        <XCircle size={14} className="text-amber-500" />
                                                                        Desativar
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle size={14} className="text-emerald-500" />
                                                                        Ativar
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmAction({ type: 'reset', userId: user.id, userName: user.full_name });
                                                                    setActionMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                                            >
                                                                <Key size={14} className="text-blue-500" />
                                                                Resetar Senha
                                                            </button>
                                                            {user.failed_login_attempts > 0 && (
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmAction({ type: 'unlock', userId: user.id, userName: user.full_name });
                                                                        setActionMenu(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                                                                >
                                                                    <Unlock size={14} className="text-amber-500" />
                                                                    Desbloquear
                                                                </button>
                                                            )}
                                                            <hr className="my-1 border-slate-200" />
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmAction({ type: 'delete', userId: user.id, userName: user.full_name });
                                                                    setActionMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                                            >
                                                                <Trash2 size={14} />
                                                                Excluir Permanente
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Click outside to close menu */}
            {actionMenu && (
                <div className="fixed inset-0 z-0" onClick={() => setActionMenu(null)} />
            )}

            {/* Confirmation Modals */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className={`px-6 py-4 flex justify-between items-center rounded-t-xl ${confirmAction.type === 'delete' ? 'bg-red-600' :
                            confirmAction.type === 'reset' ? 'bg-blue-600' : 'bg-amber-500'
                            } text-white`}>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {confirmAction.type === 'delete' && <><Trash2 size={20} /> Excluir Permanentemente</>}
                                {confirmAction.type === 'reset' && <><Key size={20} /> Resetar Senha</>}
                                {confirmAction.type === 'unlock' && <><Unlock size={20} /> Desbloquear Conta</>}
                            </h3>
                            <button onClick={() => setConfirmAction(null)} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {confirmAction.type === 'delete' && (
                                <>
                                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-4">
                                        <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
                                        <div>
                                            <p className="font-bold text-red-800">Ação irreversível!</p>
                                            <p className="text-sm text-red-600">
                                                O usuário <strong>{confirmAction.userName}</strong> será excluído permanentemente do sistema.
                                                Esta ação não pode ser desfeita.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setConfirmAction(null)}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                            disabled={actionLoading}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => permanentDelete(confirmAction.userId)}
                                            disabled={actionLoading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
                                        >
                                            {actionLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {confirmAction.type === 'reset' && (
                                <>
                                    <p className="text-slate-600 mb-4">
                                        Definir nova senha para <strong>{confirmAction.userName}</strong>.
                                        O usuário precisará alterar a senha no próximo login.
                                    </p>
                                    <input
                                        type="password"
                                        placeholder="Nova senha (mín. 8 caracteres)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                        minLength={8}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setConfirmAction(null); setNewPassword(''); }}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                            disabled={actionLoading}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => resetPassword(confirmAction.userId)}
                                            disabled={actionLoading || newPassword.length < 8}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
                                        >
                                            {actionLoading ? 'Resetando...' : 'Resetar Senha'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {confirmAction.type === 'unlock' && (
                                <>
                                    <p className="text-slate-600 mb-4">
                                        Desbloquear a conta de <strong>{confirmAction.userName}</strong>?
                                        As tentativas de login serão zeradas.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setConfirmAction(null)}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                            disabled={actionLoading}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => unlockAccount(confirmAction.userId)}
                                            disabled={actionLoading}
                                            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
                                        >
                                            {actionLoading ? 'Desbloqueando...' : 'Desbloquear'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManagementPanel;

import React, { useState, useEffect } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { endpoints } from '../services/api';

interface User {
    id: number;
    email: string;
    role: string;
    full_name: string;
    active: number;
    created_at: string;
}

const UsersPage: React.FC = () => {
    const { token, hasRole } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'TÉCNICO',
        full_name: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(endpoints.users, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setDeleting(true);
        setError('');

        try {
            const response = await fetch(`${endpoints.users}/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            await fetchUsers();
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCreating(true);

        try {
            const response = await fetch(endpoints.users, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            await fetchUsers();
            setShowModal(false);
            setFormData({ email: '', password: '', role: 'TÉCNICO', full_name: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
                        <Users size={40} className="text-blue-600" />
                        Usuários
                    </h1>
                    <p className="text-slate-600 mt-2">Gerenciar contas de acesso ao sistema</p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Novo Usuário
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Nome</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Email</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Papel</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Criado em</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-semibold text-slate-900">{user.full_name}</td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                        user.role === 'PROFESSOR' ? 'bg-orange-100 text-orange-700' :
                                            user.role === 'TÉCNICO' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {user.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleDeleteUser(user)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                        title="Deletar usuário"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Criação */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center rounded-t-xl">
                            <h2 className="text-xl font-bold">Novo Usuário</h2>
                            <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Senha Inicial</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    minLength={8}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Papel</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {hasRole('ADMIN') && <option value="ADMIN">Admin</option>}
                                    <option value="PROFESSOR">Professor</option>
                                    <option value="TÉCNICO">Técnico</option>
                                    <option value="VOLUNTÁRIO">Voluntário</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
                                >
                                    {creating ? 'Criando...' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="bg-red-600 px-6 py-4 text-white flex justify-between items-center rounded-t-xl">
                            <h2 className="text-xl font-bold">⚠️ Confirmar Exclusão</h2>
                            <button onClick={() => setShowDeleteModal(false)} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <p className="text-slate-700">
                                Tem certeza que deseja deletar o usuário <strong>{userToDelete.full_name}</strong> ({userToDelete.email})?
                            </p>

                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                                <p>⚠️ Esta ação irá desativar a conta do usuário.</p>
                                <p className="mt-1">A ação será registrada nos logs de auditoria.</p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
                                >
                                    {deleting ? 'Deletando...' : 'Confirmar Exclusão'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;

import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';

interface Client {
    id: number;
    name: string;
    cnpj_cpf: string;
    contact_name: string;
    phone: string;
    email: string;
    address: string;
    created_at: string;
}

const ClientsPage: React.FC = () => {
    const { token, hasRole } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const emptyForm = {
        name: '',
        cnpj_cpf: '',
        contact_name: '',
        phone: '',
        email: '',
        address: ''
    };

    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setClients(data);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            cnpj_cpf: client.cnpj_cpf || '',
            contact_name: client.contact_name || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || ''
        });
        setShowModal(true);
    };

    const handleDeleteClient = (client: Client) => {
        setClientToDelete(client);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!clientToDelete) return;
        setDeleting(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/clients/${clientToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            await fetchClients();
            setShowDeleteModal(false);
            setClientToDelete(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        const url = editingClient
            ? `${API_BASE_URL}/clients/${editingClient.id}`
            : `${API_BASE_URL}/clients`;

        const method = editingClient ? 'PATCH' : 'POST';

        try {
            const response = await fetch(url, {
                method,
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

            await fetchClients();
            closeModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClient(null);
        setFormData(emptyForm);
        setError('');
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cnpj_cpf && c.cnpj_cpf.includes(searchTerm))
    );

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
                        <Building2 size={40} className="text-blue-600" />
                        Clientes
                    </h1>
                    <p className="text-slate-600 mt-2">Gerenciamento da base de clientes e contatos</p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>

                {hasRole('ADMIN', 'PROFESSOR', 'TÉCNICO') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm w-full md:w-auto justify-center"
                    >
                        <Plus size={20} />
                        Novo Cliente
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-slate-900 break-words pr-8">{client.name}</h3>

                            {hasRole('ADMIN', 'PROFESSOR', 'TÉCNICO') && (
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white/90 p-1 rounded-lg backdrop-blur-sm">
                                    <button
                                        onClick={() => handleEditClient(client)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClient(client)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 text-sm text-slate-600">
                            {client.cnpj_cpf && (
                                <p><span className="font-semibold">CNPJ/CPF:</span> {client.cnpj_cpf}</p>
                            )}
                            {client.contact_name && (
                                <p><span className="font-semibold">Contato:</span> {client.contact_name}</p>
                            )}
                            {client.phone && (
                                <p><span className="font-semibold">Telefone:</span> {client.phone}</p>
                            )}
                            {client.email && (
                                <p><span className="font-semibold">Email:</span> {client.email}</p>
                            )}
                        </div>
                    </div>
                ))}

                {filteredClients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Building2 size={48} className="mx-auto text-slate-400 mb-4 opacity-50" />
                        <p className="text-lg">Nenhum cliente encontrado.</p>
                    </div>
                )}
            </div>

            {/* Modal de Criação / Edição */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center rounded-t-2xl sticky top-0 z-10">
                            <h2 className="text-xl font-bold">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <button onClick={closeModal} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Razão Social / Nome <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ / CPF</label>
                                    <input
                                        type="text"
                                        value={formData.cnpj_cpf}
                                        onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Contato</label>
                                    <input
                                        type="text"
                                        value={formData.contact_name}
                                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Completo</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors min-h-[100px]"
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-colors disabled:bg-blue-400"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Exclusão */}
            {showDeleteModal && clientToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-red-600 px-6 py-4 text-white flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-xl font-bold">Excluir Cliente</h2>
                            <button onClick={() => setShowDeleteModal(false)} className="hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700 mb-6 font-medium text-lg">
                                Tem certeza que deseja excluir o cliente <strong>{clientToDelete.name}</strong>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold disabled:bg-red-400"
                                >
                                    {deleting ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsPage;

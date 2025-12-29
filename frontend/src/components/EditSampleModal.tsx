import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
// AQUI ESTÁ A CORREÇÃO MÁGICA:
// Usamos 'import type' para o Vite saber que isso é só tipagem e não buscar no JS
import type { Amostra } from './DatabaseList'; 

interface EditSampleModalProps {
  isOpen: boolean;
  amostra: Amostra;
  onClose: () => void;
  onUpdate: () => void;
}

const EditSampleModal: React.FC<EditSampleModalProps> = ({ isOpen, amostra, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<Amostra>(amostra);
  const [isSaving, setIsSaving] = useState(false);

  // Atualiza o formulário se a amostra mudar
  useEffect(() => {
    setFormData(amostra);
  }, [amostra]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Exemplo de PUT para atualizar
      await fetch(`http://localhost:3000/amostras/${amostra.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      onUpdate(); // Avisa o pai que atualizou
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Editar Amostra: {amostra.codigo}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
              <input
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ponto de Coleta</label>
              <input
                name="pontoColeta"
                value={formData.pontoColeta}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Matriz</label>
              <select
                name="matriz"
                value={formData.matriz}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Água Bruta">Água Bruta</option>
                <option value="Água Tratada">Água Tratada</option>
                <option value="Efluente">Efluente</option>
                <option value="Solo">Solo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Data da Coleta</label>
              <input
                type="date"
                name="dataColeta"
                // Ajuste simples para formato YYYY-MM-DD se necessário, assumindo ISO string direta aqui
                value={formData.dataColeta ? formData.dataColeta.split('T')[0] : ''} 
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
              <div className="flex gap-4">
                {['Aguardando', 'Em Análise', 'Concluído'].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-slate-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
              <textarea
                name="observacoes"
                value={formData.observacoes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSampleModal;
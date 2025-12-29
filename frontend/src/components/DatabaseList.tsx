import React from 'react';
import { Pencil, Trash2, FileText, Loader2 } from 'lucide-react';

// --- AQUI ESTÁ A CORREÇÃO ---
// Adicionamos a palavra 'export' antes de 'interface'
// Agora outros arquivos (como EditSampleModal e AmostrasPage) podem importar { Amostra }
export interface Amostra {
  id: number;
  codigo: string;       // Ex: LAB-2023-001
  cliente: string;      // Ex: Indústria XYZ
  pontoColeta: string;  // Ex: Poço Artesiano 01
  matriz: string;       // Ex: Água Subterrânea
  dataColeta: string;   // ISO String ou Formatada
  status: 'Aguardando' | 'Em Análise' | 'Concluído';
  observacoes?: string;
}

interface DatabaseListProps {
  amostras: Amostra[];
  isLoading: boolean;
  onEdit: (amostra: Amostra) => void;
  // onDelete poderia ser adicionado aqui futuramente
}

const DatabaseList: React.FC<DatabaseListProps> = ({ amostras, isLoading, onEdit }) => {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p>Carregando banco de dados...</p>
      </div>
    );
  }

  if (amostras.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="text-slate-300" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-700">Nenhuma amostra encontrada</h3>
        <p className="text-slate-500">O banco de dados está vazio no momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Cliente / Ponto</th>
              <th className="px-6 py-4">Matriz</th>
              <th className="px-6 py-4">Data Coleta</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {amostras.map((amostra) => (
              <tr key={amostra.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {amostra.codigo}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{amostra.cliente}</div>
                  <div className="text-slate-500 text-xs">{amostra.pontoColeta}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {amostra.matriz}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {/* Formatação simples de data */}
                  {new Date(amostra.dataColeta).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    amostra.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    amostra.status === 'Em Análise' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {amostra.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onEdit(amostra)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar Amostra"
                  >
                    <Pencil size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatabaseList;
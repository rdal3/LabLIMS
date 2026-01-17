import React, { useState } from 'react';
import { Pencil, Trash2, FileText, Loader2, Printer } from 'lucide-react';
import SimplePrintModal from './ReprintModal';

// --- A CORREÇÃO ESTÁ AQUI ---
export interface Amostra {
  id: number;
  codigo: string;
  cliente: string;
  pontoColeta?: string;
  matriz?: string;
  dataColeta?: string;
  status: string;
  observacoes?: string;
  analysesPlanned?: string[];
  analysesCompleted?: string[];

  // 👇 ESSA LINHA É OBRIGATÓRIA PARA CORRIGIR O ERRO "Element implicitly has any type"
  [key: string]: any;
}

interface DatabaseListProps {
  amostras: Amostra[];
  isLoading: boolean;
  onEdit: (amostra: Amostra) => void;
  onDelete: (id: number, codigo: string) => void;
}

const DatabaseList: React.FC<DatabaseListProps> = ({ amostras, isLoading, onEdit, onDelete }) => {
  const [reprintingSample, setReprintingSample] = useState<Amostra | null>(null);
  // ... (O resto do código permanece igual ao que te mandei antes) ...
  // Vou omitir o corpo para economizar espaço, mas mantenha o return e lógica igual.
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
        <p className="text-slate-500">O banco de dados está vazio ou a busca não retornou resultados.</p>
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
              <th className="px-6 py-4">Progresso</th>
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
                  <div className="font-medium text-slate-800">{amostra.cliente || '-'}</div>
                  <div className="text-slate-500 text-xs">{amostra.pontoColeta || '-'}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {amostra.matriz || '-'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {amostra.dataColeta
                    ? new Date(amostra.dataColeta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '-'}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const planned = amostra.analysesPlanned?.length || 0;
                    const completed = amostra.analysesCompleted?.length || 0;
                    const percentage = planned > 0 ? Math.round((completed / planned) * 100) : 0;

                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 w-20">
                          <div
                            className={`h-full rounded-full transition-all ${percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 tabular-nums">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${amostra.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    amostra.status === 'Em Análise' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {amostra.status || 'Aguardando'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(amostra)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar Amostra"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() => setReprintingSample(amostra)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Reimprimir Etiqueta"
                    >
                      <Printer size={18} />
                    </button>

                    <button
                      onClick={() => onDelete(amostra.id, amostra.codigo)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir Amostra"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Reimpressão */}
      {reprintingSample && (
        <SimplePrintModal
          isOpen={!!reprintingSample}
          amostra={reprintingSample}
          onClose={() => setReprintingSample(null)}
        />
      )}
    </div>
  );
};

export default DatabaseList;
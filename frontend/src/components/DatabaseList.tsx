import React, { useState } from 'react';
import { Pencil, Trash2, FileText, Loader2, Printer, ChevronRight, ClipboardList } from 'lucide-react';
import SimplePrintModal from './ReprintModal';
import ReportModal from './ReportModal';
import { useIsMobile } from '../hooks/useIsMobile';

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
  [key: string]: any;
}

interface DatabaseListProps {
  amostras: Amostra[];
  isLoading: boolean;
  onEdit: (amostra: Amostra) => void;
  onDelete: (id: number, codigo: string) => void;
}

const DatabaseList: React.FC<DatabaseListProps> = ({ amostras, isLoading, onEdit, onDelete }) => {
  const { isMobile } = useIsMobile();
  const [reprintingSample, setReprintingSample] = useState<Amostra | null>(null);
  const [reportSample, setReportSample] = useState<Amostra | null>(null);

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
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <FileText className="text-slate-300 mx-auto mb-4" size={32} />
        <h3 className="text-lg font-bold text-slate-700">Nenhuma amostra</h3>
        <p className="text-slate-500 text-sm">A busca não retornou resultados.</p>
      </div>
    );
  }

  const getProgress = (amostra: Amostra) => {
    const planned = amostra.analysesPlanned?.length || 0;
    const completed = amostra.analysesCompleted?.length || 0;
    return planned > 0 ? Math.round((completed / planned) * 100) : 0;
  };

  const getStatusStyle = (status: string) => {
    if (status === 'Concluído') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Em Análise') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  // === MOBILE: Card Layout ===
  if (isMobile) {
    return (
      <div className="space-y-3">
        {amostras.map((amostra) => {
          const progress = getProgress(amostra);
          return (
            <div key={amostra.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div onClick={() => onEdit(amostra)} className="p-4 active:bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{amostra.codigo}</h3>
                    <p className="text-slate-500 text-sm">{amostra.cliente || 'Sem cliente'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusStyle(amostra.status)}`}>
                      {amostra.status || 'Aguardando'}
                    </span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </div>

                <div className="flex gap-2 text-xs text-slate-500 mb-3">
                  {amostra.matriz && <span className="bg-slate-100 px-2 py-0.5 rounded">{amostra.matriz}</span>}
                  {amostra.dataColeta && <span>{new Date(amostra.dataColeta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{progress}%</span>
                </div>
              </div>

              <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                <button onClick={() => onEdit(amostra)} className="flex-1 py-3 text-blue-600 text-sm font-medium flex items-center justify-center gap-1">
                  <Pencil size={14} /> Editar
                </button>
                <button onClick={() => setReprintingSample(amostra)} className="flex-1 py-3 text-green-600 text-sm font-medium flex items-center justify-center gap-1">
                  <Printer size={14} /> Etiqueta
                </button>
                <button onClick={() => setReportSample(amostra)} className="flex-1 py-3 text-violet-600 text-sm font-medium flex items-center justify-center gap-1">
                  <ClipboardList size={14} /> Relatório
                </button>
                <button onClick={() => onDelete(amostra.id, amostra.codigo)} className="flex-1 py-3 text-red-600 text-sm font-medium flex items-center justify-center gap-1">
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          );
        })}

        {reprintingSample && (
          <SimplePrintModal isOpen={!!reprintingSample} amostra={reprintingSample} onClose={() => setReprintingSample(null)} />
        )}
        {reportSample && (
          <ReportModal
            isOpen={!!reportSample}
            sample={reportSample}
            allSamples={amostras}
            onClose={() => setReportSample(null)}
          />
        )}
      </div>
    );
  }

  // === DESKTOP: Table Layout ===
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Cliente / Ponto</th>
              <th className="px-6 py-4">Matriz</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Progresso</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {amostras.map((amostra) => {
              const progress = getProgress(amostra);
              return (
                <tr key={amostra.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{amostra.codigo}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{amostra.cliente || '-'}</div>
                    <div className="text-slate-500 text-xs">{amostra.pontoColeta || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{amostra.matriz || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {amostra.dataColeta ? new Date(amostra.dataColeta).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 rounded-full h-2 w-20">
                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-bold">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(amostra.status)}`}>
                      {amostra.status || 'Aguardando'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onEdit(amostra)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Pencil size={18} /></button>
                      <button onClick={() => setReprintingSample(amostra)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Reimprimir Etiqueta"><Printer size={18} /></button>
                      <button onClick={() => setReportSample(amostra)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Gerar Relatório"><ClipboardList size={18} /></button>
                      <button onClick={() => onDelete(amostra.id, amostra.codigo)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {reprintingSample && (
        <SimplePrintModal isOpen={!!reprintingSample} amostra={reprintingSample} onClose={() => setReprintingSample(null)} />
      )}
      {reportSample && (
        <ReportModal
          isOpen={!!reportSample}
          sample={reportSample}
          allSamples={amostras}
          onClose={() => setReportSample(null)}
        />
      )}
    </div>
  );
};

export default DatabaseList;
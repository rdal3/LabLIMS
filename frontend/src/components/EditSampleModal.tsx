import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, TestTube2, Microscope, AlertCircle, CheckCircle2, Edit3, Atom, BookOpen } from 'lucide-react';
import type { Amostra } from './DatabaseList';
import { endpoints, API_BASE_URL } from '../services/api';
import type { ReferenceStandard } from '../utils/referenceValidator';
import { evaluateRule } from '../utils/referenceValidator';
import { LAB_PARAMS } from '@/config/labConfig';
import AnalysisSelector from './AnalysisSelector';
import { useAuth } from '../contexts/AuthContext';

interface EditSampleModalProps {
  isOpen: boolean;
  amostra: Amostra;
  onClose: () => void;
  onUpdate: () => void;
}

const EditSampleModal: React.FC<EditSampleModalProps> = ({ isOpen, amostra, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState<Amostra>(amostra);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [standards, setStandards] = useState<ReferenceStandard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<ReferenceStandard | null>(null);

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reference-standards`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setStandards(await res.json());
      } catch (e) { console.error(e); }
    };
    if (isOpen) fetchStandards();
  }, [token, isOpen]);

  useEffect(() => {
    if (formData.reference_standard_id) {
      const fetchRules = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/reference-standards/${formData.reference_standard_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setSelectedStandard(await res.json());
        } catch (e) { console.error(e); }
      };
      fetchRules();
    } else {
      setSelectedStandard(null);
    }
  }, [formData.reference_standard_id, token]);

  const getValidationState = (fieldId: string) => {
    if (!selectedStandard?.rules) return null;
    const rule = selectedStandard.rules.find(r => r.parameter_key === fieldId);
    if (!rule) return null;
    const val = formData[fieldId as keyof Amostra];
    if (val === undefined || val === null || val === '') return null;
    return evaluateRule(val, rule);
  };

  // --- SAFE DATA HANDLING ---
  // Tenta pegar dataColeta (padrão novo) ou data_coleta (legado)
  const safeDate = formData.dataColeta || formData.data_coleta || new Date().toISOString();

  // Normaliza o status visual
  const currentStatus = formData.status === 'Pendente' ? 'Aguardando' : formData.status;

  useEffect(() => {
    // 1. Clona os dados iniciais
    const initialData = { ...amostra };

    // 2. SUPORTE A LEGADO: Se por acaso vier um JSON antigo com 'params' aninhado,
    // a gente "explode" ele para a raiz (flatten) para o formulário entender.
    if (amostra.params && typeof amostra.params === 'object') {
      Object.assign(initialData, amostra.params);
    }
    if (amostra.micro && typeof amostra.micro === 'object') {
      Object.assign(initialData, amostra.micro);
    }

    setFormData(initialData);
  }, [amostra]);

  // --- LÓGICA DE CÁLCULO DE STATUS E PROGRESSO BASEADO NAS ANÁLISES PLANEJADAS ---
  useEffect(() => {
    const planned = formData.analysesPlanned || [];
    if (planned.length === 0) return; // Se não tem análises planejadas, não calcula

    // Conta quantas análises planejadas estão preenchidas
    const filledCount = planned.filter(paramId => {
      const value = formData[paramId];
      return value && String(value).trim() !== '';
    }).length;

    const percentage = Math.round((filledCount / planned.length) * 100);
    setProgress(percentage);

    // Define status sugerido baseado no preenchimento
    let newStatus = 'Aguardando';
    if (filledCount > 0 && filledCount < planned.length) {
      newStatus = 'Em Análise';
    } else if (filledCount === planned.length) {
      newStatus = 'Concluído';
    }

    const currentFormStatus = formData.status === 'Pendente' ? 'Aguardando' : formData.status;
    if (currentFormStatus !== newStatus) {
      setFormData(prev => ({ ...prev, status: newStatus }));
    }
  }, [
    // Monitora mudanças em todos os parâmetros possíveis
    ...LAB_PARAMS.map(p => formData[p.id]),
    formData.status,
    formData.analysesPlanned
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const url = `${endpoints.amostras}/${amostra.id}`;

    try {
      // Separa o que é coluna do que pode ser dinâmico
      const payload: any = { ...formData };

      // Atualiza analysesCompleted baseado nos campos preenchidos
      const planned = formData.analysesPlanned || [];
      const completed = planned.filter(paramId => {
        const value = formData[paramId];
        return value && String(value).trim() !== '';
      });

      payload.analysesCompleted = JSON.stringify(completed);

      // Se analysesPlanned foi modificado, serializa
      if (payload.analysesPlanned) {
        payload.analysesPlanned = JSON.stringify(payload.analysesPlanned);
      }

      // Envia o objeto preparado
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      console.log("✅ Salvo com sucesso!");
      onUpdate(); // Atualiza a lista pai
    } catch (error) {
      console.error("❌ ERRO AO SALVAR:", error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao salvar: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* --- HEADER --- */}
        <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
              <span className="bg-blue-500/30 px-2 py-0.5 rounded border border-blue-400/30 uppercase text-xs tracking-wide">
                Bancada Digital
              </span>
              <span>•</span>
              <span>Coleta: {new Date(safeDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {formData.matriz && (
                <>
                  <span>•</span>
                  <span className="font-mono">{formData.matriz}</span>
                </>
              )}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-mono">{amostra.codigo}</h2>
            <p className="text-blue-100/80 text-sm mt-1 max-w-md truncate">
              {amostra.cliente || 'Cliente não identificado'} — {amostra.pontoColeta || 'Ponto não identificado'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
              <X size={20} />
            </button>

            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm transition-colors duration-300 ${currentStatus === 'Concluído' ? 'bg-emerald-500 text-white border-emerald-400' :
              currentStatus === 'Em Análise' ? 'bg-amber-400 text-amber-950 border-amber-300' :
                'bg-blue-800 text-blue-200 border-blue-700'
              }`}>
              {currentStatus === 'Concluído' ? <CheckCircle2 size={12} /> :
                currentStatus === 'Em Análise' ? <Loader2 size={12} className="animate-spin" /> :
                  <AlertCircle size={12} />}
              {String(currentStatus).toUpperCase()}
            </div>
          </div>
        </div>

        {/* --- PROGRESS BAR --- */}
        <div className="h-1.5 w-full bg-slate-100 shrink-0">
          <div
            className={`h-full transition-all duration-500 ease-out ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* --- FORM BODY --- */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">

          {/* Botão Gerenciar Análises */}
          <button
            type="button"
            onClick={() => setShowAnalysisModal(true)}
            className="w-full bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300 text-blue-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Edit3 size={18} />
            Gerenciar Análises ({formData.analysesPlanned?.length || 0} planejadas)
          </button>

          {/* Seleção de Norma de Referência */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-violet-100 text-violet-600 p-2 rounded-lg shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Norma de Referência
              </label>
              <select
                name="reference_standard_id"
                value={formData.reference_standard_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="">Nenhuma norma selecionada (Sem validação)</option>
                {standards.map(std => (
                  <option key={std.id} value={std.id}>{std.name} {std.category ? `(${std.category})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const planned = formData.analysesPlanned || [];
            if (planned.length === 0) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <p className="text-amber-800 font-medium">
                    Nenhuma análise planejada. Clique em "Gerenciar Análises" para selecionar.
                  </p>
                </div>
              );
            }

            // Filtra parâmetros apenas das análises planejadas
            const plannedParams = LAB_PARAMS.filter(p => planned.includes(p.id));

            // Agrupa por categoria
            const grouped = {
              fisicoq: plannedParams.filter(p => p.category === 'fisicoq'),
              micro: plannedParams.filter(p => p.category === 'micro'),
              metais: plannedParams.filter(p => p.category === 'metais'),
              btex: plannedParams.filter(p => p.category === 'btex')
            };

            return (
              <>
                {/* Físico-Químico */}
                {grouped.fisicoq.length > 0 && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <TestTube2 size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Parâmetros Físico-Químicos</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-6">
                      {grouped.fisicoq.map((field) => {
                        const isValid = getValidationState(field.id);
                        const inputClasses = `w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 outline-none transition-all ${isValid === true ? 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50 text-emerald-900' :
                          isValid === false ? 'border-red-400 focus:ring-red-500 bg-red-50 text-red-900' :
                            'border-slate-200 focus:ring-blue-500'
                          }`;

                        return (
                          <div key={field.id}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between">
                              <span>{field.label}</span>
                              {isValid === false && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> FORA DO PADRÃO</span>}
                              {isValid === true && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>}
                            </label>
                            <div className="relative group">
                              <input
                                type="number"
                                step="0.01"
                                name={field.id}
                                value={(formData as any)[field.id] || ''}
                                onChange={handleChange}
                                placeholder="--"
                                className={inputClasses}
                              />
                              {field.unit && (
                                <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {field.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Microbiologia */}
                {grouped.micro.length > 0 && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                      <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                        <Microscope size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Microbiologia</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {grouped.micro.map((field) => {
                        const isValid = getValidationState(field.id);
                        const inputClasses = `w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 outline-none transition-all appearance-none cursor-pointer ${isValid === true ? 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50 text-emerald-900' :
                          isValid === false ? 'border-red-400 focus:ring-red-500 bg-red-50 text-red-900' :
                            'border-slate-200 focus:ring-purple-500'
                          }`;

                        return (
                          <div key={field.id}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between">
                              <span>{field.label}</span>
                              {isValid === false && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> FORA DO PADRÃO</span>}
                              {isValid === true && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>}
                            </label>
                            <div className="relative">
                              <select
                                name={field.id}
                                value={(formData as any)[field.id] || ''}
                                onChange={handleChange}
                                className={inputClasses}
                              >
                                <option value="">Selecione...</option>
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Metais */}
                {grouped.metais.length > 0 && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                      <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                        <Atom size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Metais</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-6">
                      {grouped.metais.map((field) => {
                        const isValid = getValidationState(field.id);
                        const inputClasses = `w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 outline-none transition-all ${isValid === true ? 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50 text-emerald-900' :
                          isValid === false ? 'border-red-400 focus:ring-red-500 bg-red-50 text-red-900' :
                            'border-slate-200 focus:ring-amber-500'
                          }`;

                        return (
                          <div key={field.id}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between">
                              <span>{field.label}</span>
                              {isValid === false && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> FORA DO PADRÃO</span>}
                              {isValid === true && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>}
                            </label>
                            <div className="relative group">
                              <input
                                type="number"
                                step="0.001"
                                name={field.id}
                                value={(formData as any)[field.id] || ''}
                                onChange={handleChange}
                                placeholder="--"
                                className={inputClasses}
                              />
                              {field.unit && (
                                <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {field.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* BTEX */}
                {grouped.btex.length > 0 && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                      <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                        <TestTube2 size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">BTEX</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-6">
                      {grouped.btex.map((field) => {
                        const isValid = getValidationState(field.id);
                        const inputClasses = `w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 outline-none transition-all ${isValid === true ? 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50 text-emerald-900' :
                          isValid === false ? 'border-red-400 focus:ring-red-500 bg-red-50 text-red-900' :
                            'border-slate-200 focus:ring-red-500'
                          }`;

                        return (
                          <div key={field.id}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between">
                              <span>{field.label}</span>
                              {isValid === false && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> FORA DO PADRÃO</span>}
                              {isValid === true && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>}
                            </label>
                            <div className="relative group">
                              <input
                                type="number"
                                step="0.001"
                                name={field.id}
                                value={(formData as any)[field.id] || ''}
                                onChange={handleChange}
                                placeholder="--"
                                className={inputClasses}
                              />
                              {field.unit && (
                                <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {field.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </form>

        {/* --- FOOTER --- */}
        <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <div className="text-sm text-slate-500">
            {(() => {
              const planned = formData.analysesPlanned?.length || 0;
              const completed = formData.analysesPlanned?.filter(paramId => {
                const value = formData[paramId];
                return value && String(value).trim() !== '';
              }).length || 0;

              return (
                <>
                  <strong className="text-slate-900">{completed}/{planned}</strong> análises concluídas ({progress}%)
                </>
              );
            })()}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className={`px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-lg transition-all flex items-center gap-2 ${progress === 100
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {progress === 100 ? 'Finalizar e Salvar' : 'Salvar Parcialmente'}
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Gerenciamento de Análises */}
      <AnalysisSelector
        isOpen={showAnalysisModal}
        selectedMatrix={null}
        currentAnalyses={formData.analysesPlanned || []}
        onClose={() => setShowAnalysisModal(false)}
        onSave={(analyses) => {
          setFormData(prev => ({ ...prev, analysesPlanned: analyses }));
        }}
      />
    </div>
  );
};

export default EditSampleModal;
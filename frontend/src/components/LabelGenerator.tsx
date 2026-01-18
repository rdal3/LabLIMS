import React, { useState } from 'react';
import { Plus, Printer, LayoutGrid, Type, Calendar, FlaskConical, Edit3 } from 'lucide-react';
import LabelTemplate from './LabelTemplate';
import AnalysisSelector from './AnalysisSelector';
import { ANALYTICAL_MATRICES } from '@/config/labConfig';
import { useAuth } from '../contexts/AuthContext';
import { endpoints } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';

interface LabelGeneratorProps {
  onSamplesCreated: () => void; // Avisa o pai para atualizar a lista
}

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ onSamplesCreated }) => {
  const { token } = useAuth();
  const { isMobile } = useIsMobile();
  // Estado do Formulário
  const [formData, setFormData] = useState({
    matrizId: '', // ID da matriz selecionada
    pontoColeta: '', // Apenas o identificador do ponto
    cliente: '',
    startNum: 1,
    endNum: 10,
    copies: 1,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Estado de análises selecionadas
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Estado de Configuração Visual
  const [config, setConfig] = useState({
    columns: 3,
    showBorder: true,
    fontSize: 'normal' as 'small' | 'normal' | 'large'
  });

  // Estado das etiquetas geradas (para preview e impressão)
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca matriz selecionada
  const selectedMatrix = ANALYTICAL_MATRICES.find(m => m.id === formData.matrizId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Se mudou a matriz, atualiza as análises padrão
    if (name === 'matrizId') {
      const matrix = ANALYTICAL_MATRICES.find(m => m.id === value);
      if (matrix) {
        setSelectedAnalyses(matrix.analyses);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: (name === 'startNum' || name === 'endNum' || name === 'copies') ? parseInt(value) || 0 : value
    }));
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.matrizId) {
      return alert('Por favor, selecione uma matriz analítica.');
    }

    if (formData.endNum < formData.startNum) {
      return alert('O número final deve ser maior que o inicial.');
    }

    if (!selectedMatrix) return;

    setIsSubmitting(true);
    const newLabels = [];

    try {
      // Loop para criar cada amostra no backend
      for (let i = formData.startNum; i <= formData.endNum; i++) {
        // Monta código com prefixo da matriz + ponto + número
        const codigoVisivel = `${selectedMatrix.prefix}${formData.pontoColeta}-${String(i).padStart(2, '0')}`;

        // 1. Cria no Banco (POST)
        const response = await fetch(`${endpoints.amostras}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            codigo: codigoVisivel,
            cliente: formData.cliente,
            pontoColeta: formData.pontoColeta,
            matriz: selectedMatrix.name,
            dataColeta: formData.date,
            analysesPlanned: selectedAnalyses
          })
        });

        if (!response.ok) throw new Error(`Falha ao criar ${codigoVisivel}`);

        const data = await response.json(); // O backend devolve o ID gerado (ex: 1, 2, 3)

        // 2. Prepara objeto para impressão (Usando ID do banco para o UUID)
        // UUID será uma combinação robusta: CODIGO + ID_BANCO
        const uuidReal = `${codigoVisivel}_${data.id}`;

        for (let c = 0; c < formData.copies; c++) {
          newLabels.push({
            uuid: uuidReal,
            idVisible: codigoVisivel,
            date: formData.date,
            description: formData.cliente || formData.pontoColeta || ''
          });
        }
      }

      setGeneratedLabels(newLabels);
      onSamplesCreated(); // Atualiza a contagem no pai
      alert('Lote registrado com sucesso no banco!');

    } catch (error) {
      console.error(error);
      alert('Erro ao processar o lote. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (generatedLabels.length === 0) {
      alert('Gere as etiquetas primeiro!');
      return;
    }

    // Gera HTML das etiquetas
    const labelsHtml = generatedLabels.map(label => `
      <div style="
        display: flex;
        align-items: stretch;
        border: ${config.showBorder ? '2px solid black' : '1px dashed #ccc'};
        background: white;
        width: 100%;
        min-height: 90px;
        page-break-inside: avoid;
        position: relative;
        padding: 8px;
      ">
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-right: 8px;">
          <div style="font-size: 7px; font-weight: bold; color: #333; margin-bottom: 4px;">
            ${new Date(label.date).toLocaleDateString('pt-BR')}
          </div>
          <div style="font-family: 'Courier New', monospace; font-size: ${config.fontSize === 'small' ? '16px' : config.fontSize === 'large' ? '24px' : '20px'}; font-weight: bold; text-align: center; line-height: 1.2;">
            ${label.idVisible}
          </div>
          ${label.description ? `
            <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; border-top: 1px solid black; padding-top: 3px; margin-top: 6px; width: 90%; text-align: center; color: #222;">
              ${label.description}
            </div>
          ` : ''}
        </div>
        <div style="width: 75px; border-left: 1px solid black; padding-left: 6px; display: flex; align-items: center; justify-content: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(label.uuid)}" style="width: 70px; height: 70px;" alt="QR" />
        </div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Etiquetas</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 15px; font-family: Arial, sans-serif; }
            .labels-container {
              display: grid;
              grid-template-columns: repeat(${config.columns}, 1fr);
              gap: 8px;
            }
            @media print {
              body { padding: 5mm; }
              .labels-container { gap: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getGridClass = () => {
    switch (config.columns) {
      case 2: return 'grid-cols-2';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-3';
    }
  };

  return (
    <div className={isMobile ? 'space-y-4' : 'grid lg:grid-cols-12 gap-8'}>

      {/* --- ESTILOS DE IMPRESSAO --- */}
      {!isMobile && (
        <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          
          /* Esconde tudo exceto a área de impressão */
          body > *:not(#root) { 
            display: none !important; 
          }
          
          #root > *:not(.print-container) {
            display: none !important;
          }
          
          /* Mostra apenas a área de impressão */
          .print-container {
            display: block !important;
          }
          
          #print-area {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          
          .print-grid { 
            display: grid !important; 
            gap: 4mm !important; 
            grid-template-columns: repeat(${config.columns}, 1fr) !important;
            page-break-inside: avoid !important;
          }
          
          /* Garante que etiquetas sejam visíveis */
          .label-item {
            page-break-inside: avoid !important;
            display: block !important;
          }
        }
      `}</style>
      )}

      {/* FORMULARIO - full width em mobile */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${isMobile ? 'p-3' : 'lg:col-span-4 p-6 h-fit'} ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        <h2 className={`font-bold flex items-center gap-2 text-slate-700 ${isMobile ? 'text-sm' : 'text-lg'}`}>
          <Plus size={isMobile ? 16 : 20} className="text-blue-600" /> Nova Sequência
        </h2>

        <form onSubmit={handleGenerateBatch} className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {/* Seletor de Matriz */}
          <div>
            <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Matriz Analítica</label>
            <div className="relative">
              <select
                name="matrizId"
                value={formData.matrizId}
                onChange={handleInputChange}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${isMobile ? 'p-2 text-sm' : 'p-3 rounded-xl'}`}
              >
                <option value="">Selecione uma matriz...</option>
                {ANALYTICAL_MATRICES.map(matrix => (
                  <option key={matrix.id} value={matrix.id}>
                    {matrix.name}
                  </option>
                ))}
              </select>
              <FlaskConical size={18} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
            {selectedMatrix && (
              <p className="text-xs text-slate-500 mt-1.5">
                Prefixo: <span className="font-mono font-bold text-blue-600">{selectedMatrix.prefix}</span> | {selectedMatrix.analyses.length} análises
              </p>
            )}
          </div>

          {/* Botão de Editar Análises */}
          {selectedMatrix && (
            <button
              type="button"
              onClick={() => setShowAnalysisModal(true)}
              className={`w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isMobile ? 'py-2 text-xs' : 'py-2.5 rounded-xl border-2'}`}
            >
              <Edit3 size={14} />
              {isMobile ? `Análises (${selectedAnalyses.length})` : `Personalizar Análises (${selectedAnalyses.length})`}
            </button>
          )}

          {/* Cliente */}
          <div>
            <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Cliente</label>
            <input
              type="text"
              name="cliente"
              value={formData.cliente}
              onChange={handleInputChange}
              placeholder="Ex: CDP"
              className={`w-full bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'p-2 text-sm' : 'p-3 rounded-xl'}`}
            />
          </div>

          {/* Ponto de Coleta */}
          <div>
            <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Ponto de Coleta</label>
            <div className="flex items-center gap-2">
              {selectedMatrix && (
                <div className={`bg-slate-200 text-slate-600 font-mono font-bold rounded-lg ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-3 text-sm'}`}>
                  {selectedMatrix.prefix}
                </div>
              )}
              <input
                type="text"
                name="pontoColeta"
                value={formData.pontoColeta}
                onChange={handleInputChange}
                placeholder="Ex: TPqm"
                className={`flex-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono ${isMobile ? 'p-2 text-sm' : 'p-3 rounded-xl'}`}
              />
            </div>
            {selectedMatrix && formData.pontoColeta && (
              <p className="text-xs text-slate-500 mt-1.5">
                Códigos gerados: <span className="font-mono font-bold">{selectedMatrix.prefix}{formData.pontoColeta}-01</span>, <span className="font-mono font-bold">{selectedMatrix.prefix}{formData.pontoColeta}-02</span>...
              </p>
            )}
          </div>

          <div>
            <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Data de Coleta</label>
            <div className="relative">
              <input type="date" name="date" value={formData.date} onChange={handleInputChange}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'p-2 text-sm' : 'p-3 rounded-xl'}`} />
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Início</label>
              <input type="number" name="startNum" value={formData.startNum} onChange={handleInputChange}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg ${isMobile ? 'p-2 text-sm' : 'p-3'}`} />
            </div>
            <div>
              <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Fim</label>
              <input type="number" name="endNum" value={formData.endNum} onChange={handleInputChange}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg ${isMobile ? 'p-2 text-sm' : 'p-3'}`} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || !selectedMatrix}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'py-3 text-sm' : 'py-3.5'}`}>
            {isSubmitting ? 'Registrando...' : 'Gerar Lote'}
          </button>
        </form>
      </div>

      {/* COLUNA DIREITA: PREVIEW & TOOLS - escondida em mobile */}
      {!isMobile && (
        <div className="lg:col-span-8 space-y-6">

          {/* Toolbar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase flex gap-1"><LayoutGrid size={14} /> Colunas</span>
                <select value={config.columns} onChange={(e) => setConfig({ ...config, columns: parseInt(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg p-1">
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase flex gap-1"><Type size={14} /> Fonte</span>
                <select value={config.fontSize} onChange={(e: any) => setConfig({ ...config, fontSize: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg p-1">
                  <option value="small">Pequena</option>
                  <option value="normal">Média</option>
                  <option value="large">Grande</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" checked={config.showBorder} onChange={(e) => setConfig({ ...config, showBorder: e.target.checked })} />
                <span className="text-sm font-bold text-slate-600">Bordas</span>
              </div>
            </div>

            <button onClick={handlePrint} disabled={generatedLabels.length === 0}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-30">
              <Printer size={18} /> Imprimir
            </button>
          </div>

          {/* Área de Preview (e Impressão Invisível) */}
          <div id="print-area" className="bg-slate-200 p-8 rounded-2xl overflow-auto flex justify-center shadow-inner min-h-[500px]">
            <div className={`bg-white shadow-2xl p-8 min-h-[297mm] w-[210mm] grid content-start gap-4 ${getGridClass()} print-grid`}>
              {generatedLabels.length > 0 ? generatedLabels.map((lbl, idx) => (
                <LabelTemplate
                  key={idx}
                  data={lbl}
                  showBorder={config.showBorder}
                  fontSize={config.fontSize}
                  isPrintMode={true}
                />
              )) : (
                <div className="col-span-full h-[300px] flex items-center justify-center text-slate-400 italic">
                  Preencha o formulário e clique em gerar para ver as etiquetas.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Mobile: Mensagem de sucesso após gerar */}
      {isMobile && generatedLabels.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-700 font-bold">✅ {generatedLabels.length} etiqueta(s) gerada(s)!</p>
          <p className="text-emerald-600 text-sm">Para imprimir, acesse pelo computador.</p>
        </div>
      )}

      {/* Modal de Seleção de Análises */}
      <AnalysisSelector
        isOpen={showAnalysisModal}
        selectedMatrix={selectedMatrix || null}
        currentAnalyses={selectedAnalyses}
        onClose={() => setShowAnalysisModal(false)}
        onSave={(analyses) => setSelectedAnalyses(analyses)}
      />
    </div>
  );
};

export default LabelGenerator;
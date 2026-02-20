import React, { useState } from 'react';
import { Plus, Printer, LayoutGrid, Type, Calendar, FlaskConical, Edit3, X, Copy, FileText, Tag } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import LabelTemplate from './LabelTemplate';
import AnalysisSelector from './AnalysisSelector';
import { ANALYTICAL_MATRICES } from '@/config/labConfig';
import { useAuth } from '../contexts/AuthContext';
import { endpoints } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';

interface LabelGeneratorProps {
  onSamplesCreated: () => void;
}

type PrintType = 'a4' | 'label30x60';

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ onSamplesCreated }) => {
  const { token } = useAuth();
  const { isMobile } = useIsMobile();

  // Estado do Formulário
  const [formData, setFormData] = useState({
    matrizId: '',
    pontoColeta: '',
    cliente: '',
    startNum: '',
    endNum: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Estado de análises selecionadas
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Estado de configuração visual
  const [config, setConfig] = useState({
    columns: 3,
    showBorder: true,
    fontSize: 'normal' as 'small' | 'normal' | 'large'
  });

  // Estado das etiquetas geradas
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clientes do DB
  const [dbClients, setDbClients] = useState<{ id: number, name: string }[]>([]);

  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/clients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDbClients(data);
        }
      } catch (err) {
        console.error('Erro ao buscar clientes', err);
      }
    };
    fetchClients();
  }, [token]);

  // Modal de impressão
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printConfig, setPrintConfig] = useState({
    copies: 1,
    printType: 'a4' as PrintType
  });

  const selectedMatrix = ANALYTICAL_MATRICES.find(m => m.id === formData.matrizId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'matrizId') {
      const matrix = ANALYTICAL_MATRICES.find(m => m.id === value);
      if (matrix) {
        setSelectedAnalyses(matrix.analyses);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.matrizId) {
      return alert('Por favor, selecione uma matriz analítica.');
    }

    const start = parseInt(formData.startNum) || 0;
    const end = parseInt(formData.endNum) || 0;

    if (!start || !end) {
      return alert('Por favor, preencha os números de início e fim.');
    }

    if (end < start) {
      return alert('O número final deve ser maior que o inicial.');
    }

    if (!selectedMatrix) return;

    setIsSubmitting(true);
    const newLabels = [];

    try {
      for (let i = start; i <= end; i++) {
        const codigoVisivel = `${selectedMatrix.prefix}${formData.pontoColeta}-${String(i).padStart(2, '0')}`;

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

        const data = await response.json();
        const uuidReal = `${codigoVisivel}_${data.id}`;

        newLabels.push({
          uuid: uuidReal,
          idVisible: codigoVisivel,
          date: formData.date,
          description: formData.cliente || formData.pontoColeta || '',
          matriz: selectedMatrix.name
        });
      }

      setGeneratedLabels(newLabels);
      onSamplesCreated();
      alert('Lote registrado com sucesso no banco!');

    } catch (error) {
      console.error(error);
      alert('Erro ao processar o lote. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPrintModal = () => {
    if (generatedLabels.length === 0) {
      alert('Gere as etiquetas primeiro!');
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    // Gera etiquetas com cópias
    const labelsWithCopies: any[] = [];
    generatedLabels.forEach(label => {
      for (let i = 0; i < printConfig.copies; i++) {
        labelsWithCopies.push(label);
      }
    });

    const isLabelPrinter = printConfig.printType === 'label30x60';

    // Estilos diferentes para A4 vs Etiquetadora
    const labelStyle = isLabelPrinter ? `
      width: 60mm;
      height: 30mm;
      display: flex;
      align-items: center;
      padding: 2mm;
      border: 0.5mm solid #000;
      background: white;
      page-break-inside: avoid;
      box-sizing: border-box;
    ` : `
      display: flex;
      align-items: center;
      border: 1.5px solid #000;
      background: white;
      width: 100%;
      min-height: 28mm;
      padding: 3mm;
      page-break-inside: avoid;
      border-radius: 2mm;
    `;

    const codeStyle = isLabelPrinter ? `
      font-size: 11pt;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      letter-spacing: -0.5px;
    ` : `
      font-size: 14pt;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      letter-spacing: 0;
    `;

    const qrSize = isLabelPrinter ? '22mm' : '20mm';

    const labelsHtml = labelsWithCopies.map(label => `
      <div style="${labelStyle}">
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-right: 2mm;">
          <div style="font-size: 8pt; font-weight: bold; color: #333; margin-bottom: 1mm; display: flex; gap: 3mm;">
            <span>${new Date(label.date).toLocaleDateString('pt-BR')}</span>
            ${label.matriz ? `<span style="color: #0066cc;">${label.matriz}</span>` : ''}
          </div>
          <div style="${codeStyle}">
            ${label.idVisible}
          </div>
          ${label.description ? `
            <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase; border-top: 0.5mm solid #333; padding-top: 1mm; margin-top: 1.5mm; width: 95%; text-align: center; color: #222; letter-spacing: 0.5px;">
              ${label.description}
            </div>
          ` : ''}
        </div>
        <div style="border-left: 0.5mm solid #000; padding-left: 2mm; display: flex; align-items: center; justify-content: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(label.uuid)}" 
               style="width: ${qrSize}; height: ${qrSize};" alt="QR" />
        </div>
      </div>
    `).join('');

    const pageSize = isLabelPrinter ? '62mm 30mm' : 'A4';
    const gridCols = isLabelPrinter ? 1 : config.columns;
    const gap = isLabelPrinter ? '0' : '3mm';
    const margin = isLabelPrinter ? '0' : '8mm';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Etiquetas</title>
          <style>
            @page { 
              size: ${pageSize}; 
              margin: ${margin}; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif;
              ${isLabelPrinter ? '' : 'padding: 5mm;'}
            }
            .labels-container {
              display: grid;
              grid-template-columns: repeat(${gridCols}, 1fr);
              gap: ${gap};
              ${isLabelPrinter ? 'width: 60mm;' : ''}
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
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

    setShowPrintModal(false);
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

      {/* Estilos de impressão */}
      {!isMobile && (
        <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body > *:not(#root) { display: none !important; }
          #root > *:not(.print-container) { display: none !important; }
          .print-container { display: block !important; }
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
          .label-item {
            page-break-inside: avoid !important;
            display: block !important;
          }
        }
      `}</style>
      )}

      {/* FORMULÁRIO */}
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
            <select
              name="cliente"
              value={formData.cliente}
              onChange={handleInputChange}
              className={`w-full bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${isMobile ? 'p-2 text-sm' : 'p-3 rounded-xl'}`}
              required
            >
              <option value="">Selecione um cliente...</option>
              {dbClients.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            {dbClients.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">Nenhum cliente cadastrado. Cadastre no painel de Administração.</p>
            )}
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
                Códigos: <span className="font-mono font-bold">{selectedMatrix.prefix}{formData.pontoColeta}-01</span>, <span className="font-mono font-bold">{selectedMatrix.prefix}{formData.pontoColeta}-02</span>...
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
              <input
                type="number"
                name="startNum"
                value={formData.startNum}
                onChange={handleInputChange}
                placeholder="Ex: 1"
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
              />
            </div>
            <div>
              <label className={`block font-bold text-slate-400 mb-1 uppercase tracking-wider ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Fim</label>
              <input
                type="number"
                name="endNum"
                value={formData.endNum}
                onChange={handleInputChange}
                placeholder="Ex: 10"
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || !selectedMatrix}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'py-3 text-sm' : 'py-3.5'}`}>
            {isSubmitting ? 'Registrando...' : 'Gerar Lote'}
          </button>
        </form>
      </div>

      {/* COLUNA DIREITA: PREVIEW & TOOLS */}
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

            <button onClick={openPrintModal} disabled={generatedLabels.length === 0}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-30">
              <Printer size={18} /> Imprimir
            </button>
          </div>

          {/* Área de Preview */}
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

      {/* Mobile: Mensagem de sucesso */}
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

      {/* Modal de Configuração de Impressão */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Printer size={20} />
                Configurar Impressão
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Resumo */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">{generatedLabels.length} amostra(s) no lote</p>
                    <p className="text-sm text-blue-600">
                      Total a imprimir: {generatedLabels.length * printConfig.copies} etiqueta(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Cópias */}
              <div>
                <label className="block font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Copy size={16} className="text-slate-500" />
                  Cópias por amostra
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={printConfig.copies}
                    onChange={(e) => setPrintConfig(prev => ({ ...prev, copies: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-24 px-4 py-3 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setPrintConfig(prev => ({ ...prev, copies: n }))}
                        className={`px-3 py-2 rounded-lg font-bold transition-all ${printConfig.copies === n
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tipo de Impressão */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Tipo de Impressão
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintConfig(prev => ({ ...prev, printType: 'a4' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${printConfig.printType === 'a4'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <FileText size={28} className={printConfig.printType === 'a4' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`font-bold ${printConfig.printType === 'a4' ? 'text-blue-700' : 'text-slate-600'}`}>
                      Papel A4
                    </span>
                    <span className="text-xs text-slate-500">Múltiplas etiquetas</span>
                  </button>

                  <button
                    onClick={() => setPrintConfig(prev => ({ ...prev, printType: 'label30x60' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${printConfig.printType === 'label30x60'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <Tag size={28} className={printConfig.printType === 'label30x60' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`font-bold ${printConfig.printType === 'label30x60' ? 'text-blue-700' : 'text-slate-600'}`}>
                      Etiquetadora
                    </span>
                    <span className="text-xs text-slate-500">30mm × 60mm</span>
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Printer size={18} />
                  Imprimir {generatedLabels.length * printConfig.copies}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelGenerator;
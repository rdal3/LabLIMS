import React, { useState } from 'react';
import { Plus, Printer, LayoutGrid, Type, Calendar } from 'lucide-react';
import LabelTemplate from './LabelTemplate';

interface LabelGeneratorProps {
  onSamplesCreated: () => void; // Avisa o pai para atualizar a lista
}

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ onSamplesCreated }) => {
  // Estado do Formulário
  const [formData, setFormData] = useState({
    prefix: 'AS-TPqm',
    startNum: 1,
    endNum: 10,
    copies: 1,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Estado de Configuração Visual
  const [config, setConfig] = useState({
    columns: 3,
    showBorder: true,
    fontSize: 'normal' as 'small' | 'normal' | 'large'
  });

  // Estado das etiquetas geradas (para preview e impressão)
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'startNum' || name === 'endNum' || name === 'copies') ? parseInt(value) || 0 : value
    }));
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.endNum < formData.startNum) return alert('O número final deve ser maior que o inicial');

    setIsSubmitting(true);
    const newLabels = [];

    try {
      // Loop para criar cada amostra no backend
      for (let i = formData.startNum; i <= formData.endNum; i++) {
        const codigoVisivel = `${formData.prefix}-${i}`;
        
        // 1. Cria no Banco (POST)
        const response = await fetch('http://localhost:3000/amostras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo: codigoVisivel, // Nome visível
                data_coleta: formData.date,
                status: 'Pendente',
                params: {}, 
                micro: {}
            })
        });

        if(!response.ok) throw new Error(`Falha ao criar ${codigoVisivel}`);
        
        const data = await response.json(); // O backend devolve o ID gerado (ex: 1, 2, 3)

        // 2. Prepara objeto para impressão (Usando ID do banco para o UUID)
        // UUID será uma combinação robusta: CODIGO + ID_BANCO
        const uuidReal = `${codigoVisivel}_${data.id}`;

        for (let c = 0; c < formData.copies; c++) {
            newLabels.push({
                uuid: uuidReal, 
                idVisible: codigoVisivel,
                date: formData.date,
                description: formData.description
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

  const handlePrint = () => window.print();

  const getGridClass = () => {
    switch (config.columns) {
      case 2: return 'grid-cols-2';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-3';
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      
      {/* --- ESTILOS DE IMPRESSÃO --- */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-grid { display: grid; gap: 0.5rem; grid-template-columns: repeat(${config.columns}, 1fr); }
        }
      `}</style>

      {/* COLUNA ESQUERDA: FORMULÁRIO */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-6">
        <h2 className="font-bold text-lg flex items-center gap-2 text-slate-700">
          <Plus size={20} className="text-blue-600" /> Nova Sequência
        </h2>

        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Prefixo</label>
            <input type="text" name="prefix" value={formData.prefix} onChange={handleInputChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data</label>
            <div className="relative">
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500" />
              <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Início</label>
               <input type="number" name="startNum" value={formData.startNum} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Fim</label>
               <input type="number" name="endNum" value={formData.endNum} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Rodapé (Opcional)</label>
             <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" placeholder="Ex: Setor A"/>
          </div>

          <button type="submit" disabled={isSubmitting} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Gerar Lote & Registrar'}
          </button>
        </form>
      </div>

      {/* COLUNA DIREITA: PREVIEW & TOOLS */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Toolbar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-center justify-between">
           <div className="flex gap-4 items-center">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase flex gap-1"><LayoutGrid size={14}/> Colunas</span>
                <select value={config.columns} onChange={(e) => setConfig({ ...config, columns: parseInt(e.target.value) })} 
                  className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg p-1">
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase flex gap-1"><Type size={14}/> Fonte</span>
                <select value={config.fontSize} onChange={(e:any) => setConfig({ ...config, fontSize: e.target.value })} 
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
                    isPrintMode={true} // Força o modo de impressão para alta qualidade
                />
              )) : (
                <div className="col-span-full h-[300px] flex items-center justify-center text-slate-400 italic">
                   Preencha o formulário e clique em gerar para ver as etiquetas.
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default LabelGenerator;
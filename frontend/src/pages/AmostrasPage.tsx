import React, { useEffect, useState } from 'react';
import { FlaskConical, Ticket, Database } from 'lucide-react';
import LabelGenerator from '../components/LabelGenerator';
import DatabaseList from '../components/DatabaseList';
import type { Amostra } from '../components/DatabaseList';
import EditSampleModal from '../components/EditSampleModal'; // Use o que criamos anteriormente

const AmostrasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generator' | 'database'>('generator');
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Controle do Modal
  const [editingSample, setEditingSample] = useState<Amostra | null>(null);

  const fetchAmostras = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/amostras');
      const data = await res.json();
      setAmostras(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carrega dados se entrar na aba database
    if (activeTab === 'database') fetchAmostras();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* CABEÇALHO IGUAL AO PROTÓTIPO */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
                <FlaskConical size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Labágua LIMS</h1>
                <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Sistema de Gestão</p>
              </div>
            </div>

            {/* ABAS */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'generator' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                <Ticket size={16} /> Gerador
              </button>
              <button onClick={() => setActiveTab('database')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'database' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                <Database size={16} /> Banco de Dados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="print:hidden p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        
        {activeTab === 'generator' && (
          <LabelGenerator onSamplesCreated={() => {
             // Opcional: mostrar um toast de sucesso
             console.log("Amostras criadas!"); 
          }} />
        )}

        {activeTab === 'database' && (
          <DatabaseList 
            amostras={amostras} 
            isLoading={isLoading} 
            onEdit={(amostra) => setEditingSample(amostra)}
          />
        )}
      </div>

      {/* MODAL (Fora do fluxo das abas) */}
      {editingSample && (
        <EditSampleModal 
          isOpen={!!editingSample}
          amostra={editingSample}
          onClose={() => setEditingSample(null)}
          onUpdate={() => {
            setEditingSample(null);
            fetchAmostras();
          }}
        />
      )}
    </div>
  );
};

export default AmostrasPage;
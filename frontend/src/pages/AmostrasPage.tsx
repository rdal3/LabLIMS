import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FlaskConical, Ticket, Database, Search, ArrowUpDown } from 'lucide-react';
import LabelGenerator from '../components/LabelGenerator';

import DatabaseList from '../components/DatabaseList';
import type { Amostra } from '../components/DatabaseList';

import EditSampleModal from '../components/EditSampleModal';
import { endpoints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

// 🗑️ REMOVI A INTERFACE 'Amostra' DAQUI PARA NÃO DAR CONFLITO.
// Agora o código usa a que foi importada na linha 7.

const AmostrasPage: React.FC = () => {
  const location = useLocation();
  const { token } = useAuth();
  const { isMobile } = useIsMobile();
  const [activeTab, setActiveTab] = useState<'generator' | 'database'>('generator');
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Controle do Modal
  const [editingSample, setEditingSample] = useState<Amostra | null>(null);

  // Estados de busca
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("DESC"); // 'DESC' (Recentes) ou 'ASC' (Antigas)

  // Handler para navegação do QR Scanner - abrir amostra automaticamente
  useEffect(() => {
    const state = location.state as { selectedSampleId?: number; openEditor?: boolean } | null;
    if (state?.selectedSampleId && state?.openEditor) {
      // Muda para aba de banco de dados e busca a amostra
      setActiveTab('database');

      // Busca a amostra específica pelo ID
      const fetchSampleById = async () => {
        try {
          const response = await fetch(`${endpoints.amostras}/${state.selectedSampleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const sample = await response.json();
            setEditingSample(sample);
          }
        } catch (error) {
          console.error('Erro ao buscar amostra do QR code:', error);
        }
      };

      fetchSampleById();

      // Limpa o state da navegação para não reabrir ao navegar
      window.history.replaceState({}, document.title);
    }
  }, [location.state, token]);

  // --- FUNÇÃO DE BUSCA ATUALIZADA ---
  const fetchAmostras = async () => {
    setIsLoading(true);
    try {
      // Cria a URL com parâmetros (Usando URLSearchParams para suportar path relativo)
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      params.append('ordem', ordem);

      const queryString = params.toString();
      const url = queryString ? `${endpoints.amostras}?${queryString}` : endpoints.amostras;

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Erro API: ${res.status}`);
      }

      const data = await res.json();
      setAmostras(data);
    } catch (e) {
      console.error("Erro ao buscar amostras:", e);
      alert("Erro ao conectar com o servidor. Verifique se o backend está rodando na porta 3001.");
    } finally {
      setIsLoading(false);
    }
  };

  // Recarrega ao mudar aba ou ordem
  useEffect(() => {
    if (activeTab === 'database') {
      fetchAmostras();
    }
  }, [activeTab, ordem]);

  // --- DELETE ATUALIZADO ---
  const handleDelete = async (id: number, codigo: string) => {
    // 1. Pergunta de segurança
    const confirmacao = window.prompt(`⚠️ EXCLUSÃO SEGURA\n\nPara deletar a amostra ${codigo} permanentemente, digite o CÓDIGO dela abaixo:`);

    // 2. Validação
    if (confirmacao !== codigo) {
      if (confirmacao !== null) alert("Código incorreto. Ação cancelada.");
      return;
    }

    // 3. Deleta no Backend
    try {
      setIsLoading(true);
      const res = await fetch(`${endpoints.amostras}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert("Amostra deletada com sucesso!");
        fetchAmostras(); // Recarrega a lista
      } else {
        const erro = await res.json();
        alert(`Erro ao deletar: ${erro.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro de conexão ao tentar deletar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* CABEÇALHO - escondido em mobile pois já tem o header do App */}
      {!isMobile && (
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

              {/* ABAS Desktop */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setActiveTab('generator')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'generator' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Ticket size={16} /> Gerador
                </button>
                <button onClick={() => setActiveTab('database')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'database' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Database size={16} /> Banco de Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABAS Mobile - fixo no topo abaixo do header */}
      {isMobile && (
        <div className="bg-white border-b border-slate-200 px-4 py-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('generator')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'generator' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
              <Ticket size={16} /> Gerador
            </button>
            <button onClick={() => setActiveTab('database')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'database' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
              <Database size={16} /> Banco
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO */}
      <div className={`print:hidden ${isMobile ? 'p-3' : 'p-4 md:p-8'} max-w-6xl mx-auto space-y-4`}>

        {activeTab === 'generator' && (
          <LabelGenerator onSamplesCreated={() => {
            console.log("Amostras criadas!");
            // Opcional: Mudar para a aba de banco de dados automaticamente
            // setActiveTab('database');
          }} />
        )}

        {activeTab === 'database' && (
          <div className="space-y-6">

            {/* --- BARRA DE BUSCA E FILTROS --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">

              {/* Campo de Busca */}
              <div className="relative w-full md:max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por código, cliente..."
                  className="pl-10 w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAmostras()}
                />
              </div>

              {/* Botão Pesquisar + Ordenação */}
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={fetchAmostras}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm px-4 py-2.5 transition-colors"
                >
                  Pesquisar
                </button>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <ArrowUpDown size={16} className="text-slate-500" />
                  </div>
                  <select
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value)}
                    className="pl-8 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none cursor-pointer"
                  >
                    <option value="DESC">Mais Recentes</option>
                    <option value="ASC">Mais Antigas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista */}
            <DatabaseList
              amostras={amostras}
              isLoading={isLoading}
              onEdit={(amostra) => setEditingSample(amostra)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* MODAL */}
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
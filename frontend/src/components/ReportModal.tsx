import React, { useState } from 'react';
import { X, Printer, FileText, Beaker, Loader2 } from 'lucide-react';
import { LAB_PARAMS } from '../config/labConfig';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import type { ReferenceStandard } from '../utils/referenceValidator';
import { evaluateRule } from '../utils/referenceValidator';

interface Sample {
    id: number;
    uuid?: string;
    codigo: string;
    cliente?: string;
    pontoColeta?: string;
    matriz?: string;
    dataColeta?: string;
    status: string;
    analysesPlanned?: string[];
    analysesCompleted?: string[];
    params?: Record<string, any>;
    [key: string]: any;
}

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    sample: Sample | null;
    allSamples: Sample[];
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, sample, allSamples }) => {
    const { token } = useAuth();
    const [reportType, setReportType] = useState<'single' | 'batch'>('single');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !sample) return null;

    // Encontra amostras do mesmo lote (prefixo igual)
    const getSamplePrefix = (codigo: string) => {
        // Remove o número final (ex: AS-TPqm-01 -> AS-TPqm)
        const parts = codigo.split('-');
        if (parts.length >= 2) {
            parts.pop();
            return parts.join('-');
        }
        return codigo;
    };

    const currentPrefix = getSamplePrefix(sample.codigo);
    const batchSamples = allSamples.filter(s => getSamplePrefix(s.codigo) === currentPrefix);

    const samplesToReport = reportType === 'single' ? [sample] : batchSamples;

    const getParamInfo = (paramId: string) => {
        return LAB_PARAMS.find(p => p.id === paramId);
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'fisicoq': return 'Físico-Químicos';
            case 'micro': return 'Microbiológicos';
            case 'metais': return 'Metais';
            case 'btex': return 'BTEX';
            default: return 'Outros';
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            // Fetch standards for all samples in the report
            const standardIds = [...new Set(samplesToReport.map(s => s.reference_standard_id).filter(Boolean))];
            const standardsMap: Record<number, ReferenceStandard> = {};

            for (const id of standardIds) {
                const res = await fetch(`${API_BASE_URL}/reference-standards/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    standardsMap[id as number] = await res.json();
                }
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("Por favor, permita pop-ups para imprimir o relatório.");
                setIsGenerating(false);
                return;
            }

            const reportHtml = samplesToReport.map((s, idx) => {
                const standard = s.reference_standard_id ? standardsMap[s.reference_standard_id] : null;

                const planned = s.analysesPlanned || [];
                const completed = s.analysesCompleted || [];
                const params = s.params || {};

                // Agrupar parâmetros por categoria
                const paramsByCategory: Record<string, { param: any; value: any; planned: boolean; completed: boolean; rule?: any; passed?: boolean | null }[]> = {};

                let conformityFailCount = 0;
                let evaluatedCount = 0;

                planned.forEach(paramId => {
                    const paramInfo = getParamInfo(paramId);
                    if (paramInfo) {
                        const category = paramInfo.category;
                        if (!paramsByCategory[category]) paramsByCategory[category] = [];

                        let value = params[paramId] ?? s[paramId];
                        const isCompleted = completed.includes(paramId) || (value !== undefined && value !== null && value !== '');

                        // Validação contra norma
                        const rule = standard?.rules?.find(r => r.parameter_key === paramId);
                        let passed: boolean | null = null;
                        if (isCompleted && rule) {
                            passed = evaluateRule(value, rule);
                            evaluatedCount++;
                            if (passed === false) conformityFailCount++;
                        }

                        paramsByCategory[category].push({
                            param: paramInfo,
                            value: value,
                            planned: true,
                            completed: isCompleted,
                            rule: rule,
                            passed: passed
                        });
                    }
                });

                const totalPlanned = planned.length;
                const totalCompleted = Object.values(paramsByCategory).flat().filter(p => p.completed).length;
                const progressPercent = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

                return `
                <div class="sample-report ${idx > 0 ? 'page-break' : ''}">
                    <!-- Cabeçalho -->
                    <div class="header">
                        <div class="header-left">
                            <h1>Relatório de Análise</h1>
                            <p class="subtitle">Laboratório de Análises Ambientais</p>
                        </div>
                        <div class="header-right">
                            <div class="sample-code">${s.codigo}</div>
                            <div class="status ${s.status === 'Concluído' ? 'status-done' : s.status === 'Em Análise' ? 'status-progress' : 'status-pending'}">
                                ${s.status}
                            </div>
                        </div>
                    </div>

                    <!-- Informações da Amostra -->
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-label">Matriz</div>
                            <div class="info-value">${s.matriz || '-'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Cliente</div>
                            <div class="info-value">${s.cliente || '-'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Ponto de Coleta</div>
                            <div class="info-value">${s.pontoColeta || '-'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Data de Coleta</div>
                            <div class="info-value">${formatDate(s.dataColeta)}</div>
                        </div>
                    </div>

                    <!-- Progresso -->
                    <div class="progress-section">
                        <div class="progress-header">
                            <span>Progresso das Análises</span>
                            <span class="progress-text">${totalCompleted} de ${totalPlanned} (${progressPercent}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    
                    ${standard ? `
                    <div class="conformity-section ${conformityFailCount === 0 && evaluatedCount > 0 ? 'conformity-pass' : conformityFailCount > 0 ? 'conformity-fail' : ''}">
                        <h3>Conclusão de Conformidade</h3>
                        <p>Amostra avaliada segundo os limites da norma: <strong>${standard.name}</strong></p>
                        ${evaluatedCount === 0 ? '<p>Nenhum parâmetro avaliado ainda.</p>' :
                            conformityFailCount === 0 ? '<p class="pass-msg">Amostra <strong>EM CONFORMIDADE</strong> com a norma de referência para os parâmetros analisados.</p>' :
                                `<p class="fail-msg">Amostra <strong>FORA DOS PADRÕES</strong> (Reprovada em ${conformityFailCount} parâmetro(s)).</p>`
                        }
                    </div>
                    ` : ''}

                    <!-- Resultados por Categoria -->
                    ${Object.entries(paramsByCategory).map(([category, items]) => `
                        <div class="category-section">
                            <h2 class="category-title">${getCategoryLabel(category)}</h2>
                            <table class="results-table">
                                <thead>
                                    <tr>
                                        <th>Parâmetro</th>
                                        <th>Valor Obtido</th>
                                        <th>Unidade</th>
                                        ${standard ? '<th>V.M.P (Referência)</th>' : ''}
                                        <th>Status do Laudo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map(item => `
                                        <tr class="${item.completed ? '' : 'pending'}">
                                            <td>${item.param.label}</td>
                                            <td class="value ${item.passed === false ? 'fail-value' : ''}">${item.value !== undefined && item.value !== null && item.value !== '' ? item.value : '<span class="no-value">-</span>'}</td>
                                            <td class="unit">${item.param.unit || '-'}</td>
                                            ${standard ? `<td class="reference-val">${item.rule?.display_reference || item.rule?.expected_text || (item.rule?.condition_type === 'MAX' ? 'Máx ' + item.rule.max_value : item.rule?.condition_type === 'MIN' ? 'Mín ' + item.rule.min_value : item.rule?.condition_type === 'RANGE' ? item.rule.min_value + ' - ' + item.rule.max_value : '-')}</td>` : ''}
                                            <td class="status-cell">
                                                ${item.completed
                                ? (item.passed === false ? '<span class="status-badge fail">Fora do Padrão</span>' : '<span class="status-badge done">✓ OK</span>')
                                : '<span class="status-badge pending">⏳ Pendente</span>'
                            }
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}

                    <!-- Rodapé -->
                    <div class="footer">
                        <div class="footer-left">
                            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                            <p>ID: ${s.uuid || s.id}</p>
                        </div>
                        <div class="footer-right">
                            ${idx + 1} de ${samplesToReport.length}
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Análises</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        font-size: 11pt;
                        color: #1e293b;
                        line-height: 1.4;
                    }
                    .sample-report {
                        padding: 10mm 0;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    
                    /* Header */
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 3px solid #3b82f6;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        font-size: 20pt;
                        font-weight: 800;
                        color: #1e40af;
                    }
                    .subtitle {
                        font-size: 10pt;
                        color: #64748b;
                        margin-top: 3px;
                    }
                    .sample-code {
                        font-size: 16pt;
                        font-weight: 900;
                        font-family: 'Courier New', monospace;
                        color: #0f172a;
                        text-align: right;
                    }
                    .status {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 9pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        margin-top: 5px;
                    }
                    .status-done { background: #dcfce7; color: #166534; }
                    .status-progress { background: #fef3c7; color: #92400e; }
                    .status-pending { background: #f1f5f9; color: #475569; }

                    /* Info Grid */
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    .info-card {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 10px 12px;
                    }
                    .info-label {
                        font-size: 8pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 3px;
                    }
                    .info-value {
                        font-size: 11pt;
                        font-weight: 600;
                        color: #0f172a;
                    }

                    /* Progress */
                    .progress-section {
                        margin-bottom: 25px;
                    }
                    .progress-header {
                        display: flex;
                        justify-content: space-between;
                        font-size: 10pt;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    .progress-text {
                        color: #3b82f6;
                    }
                    .progress-bar {
                        height: 10px;
                        background: #e2e8f0;
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                        border-radius: 5px;
                        transition: width 0.3s;
                    }

                    /* Category Section */
                    .category-section {
                        margin-bottom: 20px;
                    }
                    .category-title {
                        font-size: 12pt;
                        font-weight: 700;
                        color: #1e40af;
                        padding: 8px 0;
                        border-bottom: 2px solid #dbeafe;
                        margin-bottom: 10px;
                    }

                    /* Results Table */
                    .results-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .results-table th {
                        background: #f1f5f9;
                        font-size: 9pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #475569;
                        padding: 8px 10px;
                        text-align: left;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    .results-table td {
                        padding: 8px 10px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 10pt;
                    }
                    .results-table tr.pending {
                        background: #fffbeb;
                    }
                    .results-table .value {
                        font-weight: 700;
                        font-family: 'Courier New', monospace;
                    }
                    .results-table .unit {
                        color: #64748b;
                        font-size: 9pt;
                    }
                    .no-value {
                        color: #cbd5e1;
                    }
                    .status-cell {
                        width: 100px;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 8pt;
                        font-weight: 600;
                    }
                    .status-badge.done {
                        background: #dcfce7;
                        color: #166534;
                    }
                    .status-badge.fail {
                        background: #fee2e2;
                        color: #b91c1c;
                    }
                    .status-badge.pending {
                        background: #fef3c7;
                        color: #92400e;
                    }
                    .fail-value {
                        color: #b91c1c;
                        background: #fee2e2;
                        padding: 2px 6px;
                        border-radius: 4px;
                    }
                    .reference-val {
                        font-size: 9pt;
                        color: #64748b;
                    }

                    /* Conformity Section */
                    .conformity-section {
                        margin-bottom: 25px;
                        padding: 15px;
                        border-radius: 8px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                    }
                    .conformity-section h3 {
                        font-size: 11pt;
                        margin-bottom: 5px;
                    }
                    .conformity-pass {
                        background: #ecfdf5;
                        border-color: #a7f3d0;
                    }
                    .conformity-fail {
                        background: #fef2f2;
                        border-color: #fecaca;
                    }
                    .pass-msg { color: #059669; }
                    .fail-msg { color: #dc2626; }

                    /* Footer */
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 1px solid #e2e8f0;
                        font-size: 9pt;
                        color: #64748b;
                    }
                    .footer-right {
                        font-weight: 700;
                        color: #3b82f6;
                    }

                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${reportHtml}
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = function() { window.close(); };
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `);
            printWindow.document.close();
        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            alert("Falha ao gerar o relatório. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-white flex justify-between items-center rounded-t-2xl">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} />
                        Gerar Relatório
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amostra selecionada */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Beaker size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{sample.codigo}</p>
                                <p className="text-sm text-slate-500">{sample.matriz} • {sample.cliente || sample.pontoColeta}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tipo de relatório */}
                    <div>
                        <label className="block font-bold text-slate-700 mb-3">
                            Tipo de Relatório
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setReportType('single')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${reportType === 'single'
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <FileText size={28} className={reportType === 'single' ? 'text-blue-600' : 'text-slate-400'} />
                                <span className={`font-bold ${reportType === 'single' ? 'text-blue-700' : 'text-slate-600'}`}>
                                    Amostra Única
                                </span>
                                <span className="text-xs text-slate-500">1 página</span>
                            </button>

                            <button
                                onClick={() => setReportType('batch')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${reportType === 'batch'
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex -space-x-2">
                                    <FileText size={24} className={reportType === 'batch' ? 'text-blue-600' : 'text-slate-400'} />
                                    <FileText size={24} className={reportType === 'batch' ? 'text-blue-500' : 'text-slate-300'} />
                                </div>
                                <span className={`font-bold ${reportType === 'batch' ? 'text-blue-700' : 'text-slate-600'}`}>
                                    Lote Completo
                                </span>
                                <span className="text-xs text-slate-500">{batchSamples.length} páginas</span>
                            </button>
                        </div>
                    </div>

                    {/* Lista de amostras do lote (se batch) */}
                    {reportType === 'batch' && batchSamples.length > 1 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                            <p className="text-sm font-bold text-slate-600 mb-2">
                                Amostras no lote ({batchSamples.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {batchSamples.map(s => (
                                    <span key={s.id} className={`text-xs px-2 py-1 rounded-full font-mono ${s.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                                        s.status === 'Em Análise' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-200 text-slate-600'
                                        }`}>
                                        {s.codigo}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Botões */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={isGenerating}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                            {isGenerating ? 'Gerando...' : `Imprimir ${samplesToReport.length > 1 ? `(${samplesToReport.length})` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;

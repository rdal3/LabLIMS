import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';

interface SimplePrintModalProps {
  isOpen: boolean;
  amostra: {
    id: number;
    codigo: string;
    cliente?: string;
    dataColeta?: string;
  };
  onClose: () => void;
}

const SimplePrintModal: React.FC<SimplePrintModalProps> = ({ isOpen, amostra, onClose }) => {
  const [copies, setCopies] = useState(1);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Cria HTML simples para impressão
    const labels = Array.from({ length: copies }, () => {
      const labelData = {
        uuid: `${amostra.codigo}_${amostra.id}`,
        idVisible: amostra.codigo,
        date: amostra.dataColeta || new Date().toISOString().split('T')[0],
        description: amostra.cliente || ''
      };

      return `
        <div style="
          display: flex;
          align-items: stretch;
          border: 2px solid black;
          background: white;
          width: 100%;
          min-height: 90px;
          page-break-inside: avoid;
          position: relative;
          padding: 8px;
        ">
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-right: 8px;">
            <div style="font-size: 7px; font-weight: bold; color: #333; margin-bottom: 4px;">
              ${new Date(labelData.date).toLocaleDateString('pt-BR')}
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-align: center; line-height: 1.2;">
              ${labelData.idVisible}
            </div>
            ${labelData.description ? `
              <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; border-top: 1px solid black; padding-top: 3px; margin-top: 6px; width: 90%; text-align: center; color: #222;">
                ${labelData.description}
              </div>
            ` : ''}
          </div>
          <div style="width: 75px; border-left: 1px solid black; padding-left: 6px; display: flex; align-items: center; justify-content: center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(labelData.uuid)}" style="width: 70px; height: 70px;" alt="QR Code" />
          </div>
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Etiquetas - ${amostra.codigo}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 15px; font-family: Arial, sans-serif; }
            .labels-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
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
            ${labels}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Reimprimir Etiqueta</h2>
            <p className="text-blue-100 text-sm">{amostra.codigo}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Código:</strong> {amostra.codigo}<br />
              {amostra.cliente && <><strong>Cliente:</strong> {amostra.cliente}<br /></>}
              {amostra.dataColeta && <><strong>Data:</strong> {new Date(amostra.dataColeta).toLocaleDateString('pt-BR')}</>}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="font-bold text-slate-700">Número de cópias:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Dica:</strong> As etiquetas serão abertas em uma nova janela e impressas automaticamente.
              Se a impressão não iniciar, use Ctrl+P na janela que abrir.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Printer size={18} />
            Imprimir {copies > 1 && `(${copies} cópias)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplePrintModal;

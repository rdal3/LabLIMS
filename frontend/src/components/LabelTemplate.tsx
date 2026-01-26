import React from 'react';
import QRCode from 'react-qr-code';

interface LabelData {
  uuid: string;      // O que o QR Code lê (ID único do banco)
  idVisible: string; // O que o humano lê (Ex: AS-TPqm-1)
  date: string;
  description?: string;
}

interface LabelTemplateProps {
  data: LabelData;
  showBorder?: boolean;
  fontSize?: 'small' | 'normal' | 'large';
  isPrintMode?: boolean;
}

const LabelTemplate: React.FC<LabelTemplateProps> = ({
  data,
  showBorder = true,
  fontSize = 'normal',
  isPrintMode = false
}) => {

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-2xl';
      default: return 'text-xl';
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={`
      flex flex-row items-center justify-between p-2 px-4 text-center 
      aspect-[3/1.2] overflow-hidden relative bg-white
      ${showBorder ? 'border-[1.5px] border-black' : 'border border-dashed border-slate-300'}
      ${isPrintMode ? 'break-inside-avoid' : 'shadow-sm hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all'}
    `}>
      <div className="flex-1 flex flex-col items-center justify-center text-left">
        <span className="absolute top-1 left-2 text-[10px] font-bold text-black">
          {formatDateDisplay(data.date)}
        </span>

        <span className={`font-bold font-mono text-black leading-none tracking-tight mt-2 ${getFontSizeClass()}`}>
          {data.idVisible}
        </span>

        {data.description && (
          <span className="text-[9px] text-black mt-1 uppercase font-bold tracking-widest border-t border-black pt-0.5 w-full text-center">
            {data.description}
          </span>
        )}
      </div>

      <div className="h-[80%] aspect-square flex items-center justify-center border-l border-black pl-2 ml-2">
        <div style={{ height: "auto", margin: "0 auto", maxWidth: "100%", width: "100%" }}>
          <QRCode
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={data.uuid} // O QR Code leva o UUID real do banco
            viewBox={`0 0 256 256`}
          />
        </div>
      </div>
    </div>
  );
};

export default LabelTemplate;
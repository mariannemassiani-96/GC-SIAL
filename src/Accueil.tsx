import { Building2, Layout } from 'lucide-react';

export type AppId = 'garde-corps' | 'atelier';

interface AccueilProps {
  onSelect: (app: AppId) => void;
}

export function Accueil({ onSelect }: AccueilProps) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-100">SIAL</h1>
          <p className="text-sm text-gray-500 mt-2">Choisissez un outil</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            icon={<Building2 size={28} />}
            title="Configurateur garde-corps"
            description="Kawneer 1800 Kadence — devis, travées, nomenclature"
            onClick={() => onSelect('garde-corps')}
            color="#3b82f6"
          />
          <Card
            icon={<Layout size={28} />}
            title="Agencement atelier"
            description="Plan à l'échelle — machines, postes, flux, stocks, bureaux"
            onClick={() => onSelect('atelier')}
            color="#10b981"
          />
        </div>

        <p className="text-center text-xs text-gray-600 mt-10">
          Les données sont enregistrées localement dans votre navigateur.
        </p>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[#181c25] border border-[#252830] rounded-lg p-6 text-left hover:border-[#353840] hover:bg-[#1d2130] transition-all group"
    >
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <h2 className="text-base font-semibold text-gray-100 mb-1 group-hover:text-white">{title}</h2>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </button>
  );
}

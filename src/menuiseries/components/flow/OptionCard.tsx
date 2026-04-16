import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  badgeColor?: 'green' | 'blue' | 'amber';
  priceDiff?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OptionCard({ selected, onClick, label, description, icon, badge, badgeColor = 'green', priceDiff, size = 'md' }: OptionCardProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const badgeColors = {
    green: 'bg-green-600/20 text-green-400 border-green-500/30',
    blue: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border-2 transition-all duration-150 hover:scale-[1.01] w-full ${sizeClasses[size]}
        ${selected
          ? 'border-blue-500 bg-blue-600/8 shadow-lg shadow-blue-500/5'
          : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550] hover:bg-[#252830]/50'
        }`}
    >
      {/* Check */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <span className={`absolute top-2.5 ${selected ? 'right-10' : 'right-2.5'} text-[9px] px-1.5 py-0.5 rounded font-bold border ${badgeColors[badgeColor]}`}>
          {badge}
        </span>
      )}

      {/* Icône / Schéma */}
      {icon && (
        <div className={`mb-3 ${selected ? 'opacity-100' : 'opacity-70'}`}>
          {icon}
        </div>
      )}

      {/* Label */}
      <p className={`font-semibold text-sm ${selected ? 'text-blue-400' : 'text-white'}`}>
        {label}
      </p>

      {/* Description */}
      {description && (
        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{description}</p>
      )}

      {/* Prix */}
      {priceDiff && (
        <p className="text-[10px] text-gray-600 mt-1.5 font-mono">{priceDiff}</p>
      )}
    </button>
  );
}

// ── Carte couleur avec pastille ──────────────────────────────────────

interface ColorCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  hex: string;
  priceDiff?: string;
}

export function ColorCard({ selected, onClick, label, hex, priceDiff }: ColorCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-[1.02]
        ${selected ? 'border-blue-500 bg-blue-600/8' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
    >
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
      <div
        className="w-10 h-10 rounded-lg border-2 shadow-inner"
        style={{ backgroundColor: hex, borderColor: selected ? '#60a5fa' : '#353840' }}
      />
      <p className={`text-[10px] font-medium text-center leading-tight ${selected ? 'text-blue-400' : 'text-gray-300'}`}>
        {label}
      </p>
      {priceDiff && <p className="text-[9px] text-gray-600">{priceDiff}</p>}
    </button>
  );
}

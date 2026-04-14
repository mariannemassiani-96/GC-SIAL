import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { Alerte } from '../../types';

const iconMap = {
  bloquant: AlertCircle,
  attention: AlertTriangle,
  info: Info,
};

const styleMap = {
  bloquant: 'bg-red-500/10 border-red-500/30 text-red-400',
  attention: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export function AlertBanner({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertes.map((a, i) => {
        const Icon = iconMap[a.niveau];
        return (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${styleMap[a.niveau]}`}>
            <Icon size={16} className="shrink-0" />
            <span>{a.message}</span>
          </div>
        );
      })}
    </div>
  );
}

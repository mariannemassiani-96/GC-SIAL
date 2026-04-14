import { FileDown, FileText, Wrench } from 'lucide-react';
import type { Affaire } from '../types';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { FIXATIONS } from '../constants/fixations';
import { Button } from './ui/Button';

interface SidebarProps {
  affaire: Affaire;
  onChange: (updates: Partial<Affaire>) => void;
  onExportXML: () => void;
  onExportPDF: () => void;
  onExportBC: () => void;
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', suffix }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function Sidebar({ affaire, onChange, onExportXML, onExportPDF, onExportBC }: SidebarProps) {
  return (
    <aside className="w-[280px] shrink-0 bg-[#14161d] border-r border-[#252830] overflow-y-auto flex flex-col">
      <div className="p-4 space-y-3 flex-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Wrench size={14} /> Configuration
        </h3>

        <SelectField
          label="Type de garde-corps"
          value={affaire.typeGC}
          onChange={(v) => onChange({ typeGC: v as Affaire['typeGC'] })}
          options={Object.entries(TYPES_GC).map(([id, def]) => ({ value: id, label: def.label }))}
        />

        <SelectField
          label="Type de pose"
          value={affaire.pose}
          onChange={(v) => onChange({ pose: v as Affaire['pose'] })}
          options={Object.entries(POSE_DATA).map(([id, def]) => ({ value: id, label: def.label }))}
        />

        <SelectField
          label="Main courante"
          value={affaire.mc}
          onChange={(v) => onChange({ mc: v as Affaire['mc'] })}
          options={Object.entries(TYPES_MC).map(([id, def]) => ({ value: id, label: def.label }))}
        />

        <SelectField
          label="Lieu"
          value={affaire.lieu}
          onChange={(v) => onChange({ lieu: v as Affaire['lieu'] })}
          options={[
            { value: 'prive', label: 'Privé' },
            { value: 'public', label: 'Public' },
          ]}
        />

        <InputField
          label="Hauteur (mm)"
          value={affaire.hauteur}
          onChange={(v) => onChange({ hauteur: parseInt(v) || 0 })}
          type="number"
          suffix="mm"
        />

        <div className="flex items-center gap-2">
          <label className="block text-xs text-gray-500">Rampant</label>
          <input
            type="checkbox"
            checked={affaire.rampant}
            onChange={(e) => onChange({ rampant: e.target.checked })}
            className="accent-blue-500"
          />
        </div>

        {affaire.rampant && (
          <SelectField
            label="Angle rampant"
            value={String(affaire.angle)}
            onChange={(v) => onChange({ angle: parseInt(v) as Affaire['angle'] })}
            options={[
              { value: '0', label: '0°' },
              { value: '10', label: '10°' },
              { value: '20', label: '20°' },
              { value: '30', label: '30°' },
            ]}
          />
        )}

        <SelectField
          label="Fixation gauche"
          value={affaire.fixG}
          onChange={(v) => onChange({ fixG: v as Affaire['fixG'] })}
          options={Object.entries(FIXATIONS).map(([id, def]) => ({ value: id, label: def.label }))}
        />

        <SelectField
          label="Fixation droite"
          value={affaire.fixD}
          onChange={(v) => onChange({ fixD: v as Affaire['fixD'] })}
          options={Object.entries(FIXATIONS).map(([id, def]) => ({ value: id, label: def.label }))}
        />

        <InputField
          label="Coloris"
          value={affaire.coloris}
          onChange={(v) => onChange({ coloris: v })}
        />

        <SelectField
          label="Statut"
          value={affaire.statut}
          onChange={(v) => onChange({ statut: v as Affaire['statut'] })}
          options={[
            { value: 'brouillon', label: 'Brouillon' },
            { value: 'a_valider', label: 'À valider' },
            { value: 'validee', label: 'Validée' },
          ]}
        />
      </div>

      <div className="p-4 border-t border-[#252830] space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exports</h3>
        <Button variant="secondary" size="sm" className="w-full justify-center" onClick={onExportPDF} icon={<FileText size={14} />}>
          Fiche fabrication PDF
        </Button>
        <Button variant="secondary" size="sm" className="w-full justify-center" onClick={onExportXML} icon={<FileDown size={14} />}>
          Fichier machine XML
        </Button>
        <Button variant="secondary" size="sm" className="w-full justify-center" onClick={onExportBC} icon={<FileText size={14} />}>
          Bon de commande PDF
        </Button>
      </div>
    </aside>
  );
}

import type { Affaire, TraveeConfig } from '../types';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';

interface SectionProjetProps {
  affaire: Affaire;
  onChange: (updates: Partial<Affaire>) => void;
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1e2028] border border-[#353840] rounded px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
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

export function SectionProjet({ affaire, onChange }: SectionProjetProps) {
  const d = affaire.defaults;
  const updateDefaults = (updates: Partial<TraveeConfig>) => {
    onChange({ defaults: { ...d, ...updates } });
  };

  return (
    <div className="space-y-3">
      {/* Info projet */}
      <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Projet</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Field label="Client" value={affaire.client} onChange={(v) => onChange({ client: v })} />
          <Field label="Chantier" value={affaire.chantier} onChange={(v) => onChange({ chantier: v })} />
          <Field label="Référence" value={affaire.ref} onChange={(v) => onChange({ ref: v })} />
          <Field label="Date" value={affaire.date} onChange={(v) => onChange({ date: v })} type="date" />
          <Field label="Coloris" value={affaire.coloris} onChange={(v) => onChange({ coloris: v })} />
          <Select label="Statut" value={affaire.statut} onChange={(v) => onChange({ statut: v as Affaire['statut'] })}
            options={[{ value: 'brouillon', label: 'Brouillon' }, { value: 'a_valider', label: 'À valider' }, { value: 'validee', label: 'Validée' }]} />
        </div>
      </div>

      {/* Défauts nouvelles travées */}
      <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Défauts nouvelles travées</h2>
        <p className="text-[10px] text-gray-600 mb-3">Ces valeurs pré-remplissent chaque travée ajoutée. Modifiable ensuite par travée.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select label="Type GC" value={d.typeGC} onChange={(v) => updateDefaults({ typeGC: v as TraveeConfig['typeGC'] })}
            options={Object.entries(TYPES_GC).map(([id, def]) => ({ value: id, label: def.label }))} />
          <Select label="Pose" value={d.pose} onChange={(v) => updateDefaults({ pose: v as TraveeConfig['pose'] })}
            options={Object.entries(POSE_DATA).map(([id, def]) => ({ value: id, label: def.label }))} />
          <Select label="Main courante" value={d.mc} onChange={(v) => updateDefaults({ mc: v as TraveeConfig['mc'] })}
            options={Object.entries(TYPES_MC).map(([id, def]) => ({ value: id, label: def.label }))} />
          <Select label="Lieu" value={d.lieu} onChange={(v) => updateDefaults({ lieu: v as TraveeConfig['lieu'] })}
            options={[{ value: 'prive', label: 'Privé' }, { value: 'public', label: 'Public' }]} />
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Hauteur (mm)</label>
            <input type="number" value={d.hauteur}
              onChange={(e) => updateDefaults({ hauteur: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#1e2028] border border-[#353840] rounded px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

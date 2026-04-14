import type { Affaire } from '../types';

interface SectionProjetProps {
  affaire: Affaire;
  onChange: (updates: Partial<Affaire>) => void;
}

function Field({ label, value, onChange, type = 'text', className = '' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1e2028] border border-[#353840] rounded px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

export function SectionProjet({ affaire, onChange }: SectionProjetProps) {
  return (
    <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Projet</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Client" value={affaire.client} onChange={(v) => onChange({ client: v })} />
        <Field label="Chantier" value={affaire.chantier} onChange={(v) => onChange({ chantier: v })} />
        <Field label="Référence" value={affaire.ref} onChange={(v) => onChange({ ref: v })} />
        <Field label="Date" value={affaire.date} onChange={(v) => onChange({ date: v })} type="date" />
        <Field label="Coloris" value={affaire.coloris} onChange={(v) => onChange({ coloris: v })} />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Trash2, Save, RotateCw, Plus, ArrowRight, Link2 } from 'lucide-react';
import type { Plan, Objet, ContrainteType } from './types';
import { CATALOG, TYPES_ORDERED } from './catalog';
import type { Preset } from './presets';

interface InspectorProps {
  plan: Plan;
  objet: Objet | null;
  onUpdate: (patch: Partial<Objet>) => void;
  onDelete: () => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onSaveAsPreset: (p: Preset) => void;
  onAddFlux: (from: string, to: string, debit: number) => void;
  onDeleteFlux: (id: string) => void;
  onAddContrainte: (type: ContrainteType, a: string, b: string, valeur?: number) => void;
  onDeleteContrainte: (id: string) => void;
}

export function Inspector(props: InspectorProps) {
  const { plan, objet, onUpdate, onDelete, onRotate, onDuplicate, onSaveAsPreset,
          onAddFlux, onDeleteFlux, onAddContrainte, onDeleteContrainte } = props;

  if (!objet) {
    return (
      <div className="h-full bg-[#14161d] border-l border-[#252830] flex items-center justify-center p-6 text-center">
        <p className="text-xs text-gray-600 leading-relaxed">
          Sélectionnez un objet<br />pour modifier ses propriétés.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#14161d] border-l border-[#252830] overflow-y-auto">
      <div className="p-3 border-b border-[#252830] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Objet</h2>
          <p className="text-xs text-gray-500 mt-0.5">{CATALOG[objet.type].label}</p>
        </div>
        <div className="flex gap-1">
          <IconBtn title="Rotation 90°" onClick={onRotate}><RotateCw size={14} /></IconBtn>
          <IconBtn title="Dupliquer" onClick={onDuplicate}><Plus size={14} /></IconBtn>
          <IconBtn title="Supprimer" onClick={onDelete} danger><Trash2 size={14} /></IconBtn>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <Field label="Nom">
          <input
            value={objet.nom}
            onChange={(e) => onUpdate({ nom: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Type">
          <select
            value={objet.type}
            onChange={(e) => onUpdate({ type: e.target.value as Objet['type'] })}
            className="input"
          >
            {TYPES_ORDERED.map((t) => (
              <option key={t} value={t}>{CATALOG[t].label}</option>
            ))}
          </select>
        </Field>

        <Field label="Niveau">
          <select
            value={objet.niveau}
            onChange={(e) => onUpdate({ niveau: e.target.value })}
            className="input"
          >
            {plan.niveaux.sort((a, b) => a.ordre - b.ordre).map((n) => (
              <option key={n.id} value={n.id}>{n.nom}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Largeur (m)">
            <InputMeters
              valueCm={objet.largeur}
              onChangeCm={(cm) => onUpdate({ largeur: cm })}
            />
          </Field>
          <Field label="Profondeur (m)">
            <InputMeters
              valueCm={objet.hauteur}
              onChangeCm={(cm) => onUpdate({ hauteur: cm })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="X (m)">
            <InputMeters
              valueCm={objet.x}
              onChangeCm={(cm) => onUpdate({ x: cm })}
            />
          </Field>
          <Field label="Y (m)">
            <InputMeters
              valueCm={objet.y}
              onChangeCm={(cm) => onUpdate({ y: cm })}
            />
          </Field>
        </div>

        <Field label="Rotation">
          <select
            value={objet.rotation}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) as 0 | 90 | 180 | 270 })}
            className="input"
          >
            <option value={0}>0°</option>
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </Field>

        <Field label="Couleur">
          <input
            type="color"
            value={objet.couleur ?? CATALOG[objet.type].couleur}
            onChange={(e) => onUpdate({ couleur: e.target.value })}
            className="w-full h-8 bg-[#0f1117] border border-[#252830] rounded cursor-pointer"
          />
        </Field>

        <OperateursField
          operateurs={objet.operateurs}
          onChange={(ops) => onUpdate({ operateurs: ops })}
        />

        {(objet.type === 'stock' || objet.type === 'stock_tampon') && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Capacité">
              <input
                type="number"
                value={objet.capacite ?? ''}
                onChange={(e) => onUpdate({ capacite: e.target.value ? Number(e.target.value) : undefined })}
                className="input"
                min={0}
              />
            </Field>
            <Field label="Stock actuel">
              <input
                type="number"
                value={objet.stockActuel ?? ''}
                onChange={(e) => onUpdate({ stockActuel: e.target.value ? Number(e.target.value) : undefined })}
                className="input"
                min={0}
              />
            </Field>
          </div>
        )}

        {(objet.type === 'machine' || objet.type === 'poste') && (
          <Field label="Temps cycle (s)">
            <input
              type="number"
              value={objet.tempsCycle ?? ''}
              onChange={(e) => onUpdate({ tempsCycle: e.target.value ? Number(e.target.value) : undefined })}
              className="input"
              min={0}
            />
          </Field>
        )}

        <Field label="Notes">
          <textarea
            value={objet.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            className="input min-h-[50px] resize-y"
          />
        </Field>

        <button
          onClick={() =>
            onSaveAsPreset({
              nom: objet.nom,
              type: objet.type,
              largeur: objet.largeur,
              hauteur: objet.hauteur,
              couleur: objet.couleur,
              capacite: objet.capacite,
              notes: objet.notes,
            })
          }
          className="w-full flex items-center justify-center gap-2 bg-[#252830] hover:bg-[#2e3139] border border-[#353840] text-gray-200 text-xs rounded py-2"
        >
          <Save size={13} /> Enregistrer comme préréglage
        </button>
      </div>

      <FluxSection plan={plan} selectedId={objet.id} onAdd={onAddFlux} onDelete={onDeleteFlux} />
      <ContraintesSection plan={plan} selectedId={objet.id} onAdd={onAddContrainte} onDelete={onDeleteContrainte} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded border ${danger ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-[#353840] text-gray-400 hover:bg-[#252830]'}`}
    >
      {children}
    </button>
  );
}

function InputMeters({ valueCm, onChangeCm }: { valueCm: number; onChangeCm: (cm: number) => void }) {
  const [local, setLocal] = useState((valueCm / 100).toFixed(2));
  // sync when external value changes
  const vStr = (valueCm / 100).toFixed(2);
  if (local !== vStr && document.activeElement?.tagName !== 'INPUT') {
    // not currently editing: accept external value
  }
  return (
    <input
      type="number"
      step={0.01}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local.replace(',', '.'));
        if (!isNaN(n)) onChangeCm(Math.round(n * 100));
        else setLocal((valueCm / 100).toFixed(2));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      onFocus={() => setLocal((valueCm / 100).toFixed(2))}
      className="input"
    />
  );
}

function OperateursField({ operateurs, onChange }: { operateurs: string[]; onChange: (ops: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Opérateurs</span>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {operateurs.map((op) => (
          <span key={op} className="inline-flex items-center gap-1 bg-[#252830] text-gray-200 text-[11px] rounded px-2 py-0.5">
            {op}
            <button
              onClick={() => onChange(operateurs.filter((x) => x !== op))}
              className="text-gray-500 hover:text-red-400"
            >×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange([...operateurs, draft.trim()]);
              setDraft('');
            }
          }}
          placeholder="Ajouter un opérateur…"
          className="input flex-1"
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onChange([...operateurs, draft.trim()]);
              setDraft('');
            }
          }}
          className="px-2 bg-[#252830] hover:bg-[#2e3139] border border-[#353840] rounded text-gray-400"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// --- Section flux ---

interface FluxSectionProps {
  plan: Plan;
  selectedId: string;
  onAdd: (from: string, to: string, debit: number) => void;
  onDelete: (id: string) => void;
}

function FluxSection({ plan, selectedId, onAdd, onDelete }: FluxSectionProps) {
  const [toId, setToId] = useState('');
  const [debit, setDebit] = useState(100);
  const relatedFlux = plan.flux.filter((f) => f.from === selectedId || f.to === selectedId);

  return (
    <div className="border-t border-[#252830] p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        <ArrowRight size={12} /> Flux
      </h3>
      <div className="space-y-1 mb-2">
        {relatedFlux.map((f) => {
          const other = plan.objets.find((o) => o.id === (f.from === selectedId ? f.to : f.from));
          const direction = f.from === selectedId ? '→' : '←';
          return (
            <div key={f.id} className="flex items-center gap-1.5 text-xs bg-[#181c25] rounded px-2 py-1">
              <span className="text-yellow-400">{direction}</span>
              <span className="flex-1 truncate">{other?.nom ?? '?'}</span>
              <span className="text-gray-500 text-[10px]">{f.debit}/h</span>
              <button onClick={() => onDelete(f.id)} className="text-gray-600 hover:text-red-400">
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[1fr_60px_auto] gap-1">
        <select value={toId} onChange={(e) => setToId(e.target.value)} className="input text-[11px]">
          <option value="">Vers…</option>
          {plan.objets.filter((o) => o.id !== selectedId).map((o) => (
            <option key={o.id} value={o.id}>{o.nom}</option>
          ))}
        </select>
        <input
          type="number"
          value={debit}
          onChange={(e) => setDebit(Number(e.target.value))}
          min={0}
          className="input text-[11px]"
          title="Débit (unités/heure)"
        />
        <button
          onClick={() => {
            if (toId) {
              onAdd(selectedId, toId, debit);
              setToId('');
            }
          }}
          disabled={!toId}
          className="px-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded disabled:opacity-40"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// --- Section contraintes ---

interface ContraintesSectionProps {
  plan: Plan;
  selectedId: string;
  onAdd: (type: ContrainteType, a: string, b: string, valeur?: number) => void;
  onDelete: (id: string) => void;
}

function ContraintesSection({ plan, selectedId, onAdd, onDelete }: ContraintesSectionProps) {
  const [type, setType] = useState<ContrainteType>('distance_min');
  const [otherId, setOtherId] = useState('');
  const [valeurM, setValeurM] = useState(1);

  const related = plan.contraintes.filter(
    (c) => c.objetA === selectedId || c.objetB === selectedId
  );

  return (
    <div className="border-t border-[#252830] p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        <Link2 size={12} /> Contraintes
      </h3>
      <div className="space-y-1 mb-2">
        {related.map((c) => {
          const other = plan.objets.find((o) => o.id === (c.objetA === selectedId ? c.objetB : c.objetA));
          return (
            <div key={c.id} className="flex items-center gap-1.5 text-xs bg-[#181c25] rounded px-2 py-1">
              <span className="text-blue-400 text-[10px]">{labelContrainte(c.type)}</span>
              <span className="flex-1 truncate">{other?.nom ?? '?'}</span>
              {c.valeur !== undefined && (
                <span className="text-gray-500 text-[10px]">{(c.valeur / 100).toFixed(2)} m</span>
              )}
              <button onClick={() => onDelete(c.id)} className="text-gray-600 hover:text-red-400">
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        <select value={type} onChange={(e) => setType(e.target.value as ContrainteType)} className="input text-[11px]">
          <option value="distance_min">Distance min</option>
          <option value="distance_max">Distance max</option>
          <option value="adjacent">Adjacent</option>
          <option value="alignement_x">Aligné verticalement</option>
          <option value="alignement_y">Aligné horizontalement</option>
        </select>
        <select value={otherId} onChange={(e) => setOtherId(e.target.value)} className="input text-[11px]">
          <option value="">Avec…</option>
          {plan.objets.filter((o) => o.id !== selectedId).map((o) => (
            <option key={o.id} value={o.id}>{o.nom}</option>
          ))}
        </select>
        {(type === 'distance_min' || type === 'distance_max') && (
          <input
            type="number"
            step={0.1}
            value={valeurM}
            onChange={(e) => setValeurM(Number(e.target.value))}
            placeholder="m"
            className="input text-[11px]"
          />
        )}
        <button
          onClick={() => {
            if (otherId) {
              const val = (type === 'distance_min' || type === 'distance_max') ? Math.round(valeurM * 100) : undefined;
              onAdd(type, selectedId, otherId, val);
              setOtherId('');
            }
          }}
          disabled={!otherId}
          className="w-full px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded text-[11px] disabled:opacity-40"
        >
          Ajouter la contrainte
        </button>
      </div>
    </div>
  );
}

function labelContrainte(t: ContrainteType): string {
  switch (t) {
    case 'distance_min': return 'DIST-MIN';
    case 'distance_max': return 'DIST-MAX';
    case 'adjacent': return 'ADJ';
    case 'alignement_x': return 'ALIGN-V';
    case 'alignement_y': return 'ALIGN-H';
  }
}

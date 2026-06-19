import { useState } from 'react';
import { Plus, Trash2, Search, PackagePlus } from 'lucide-react';
import type { Preset } from './presets';
import { PRESET_PACKS } from './presets';
import { CATALOG, TYPES_ORDERED } from './catalog';
import type { ObjetType } from './types';

interface LibraryProps {
  customs: Preset[];
  onAddCustom: (p: Preset) => void;
  onRemoveCustom: (nom: string) => void;
  /** Ajouter l'objet au centre du viewport */
  onAddPreset: (p: Preset) => void;
  /** Début d'un drag & drop */
  onDragStart: (p: Preset, e: React.DragEvent) => void;
}

export function Library({ customs, onAddCustom, onRemoveCustom, onAddPreset, onDragStart }: LibraryProps) {
  const [query, setQuery] = useState('');
  const [openPack, setOpenPack] = useState<string>('menuiserie_alu');
  const [creating, setCreating] = useState(false);

  const filter = (list: Preset[]) =>
    query.trim() === ''
      ? list
      : list.filter((p) => p.nom.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-[#14161d] border-r border-[#252830]">
      <div className="p-3 border-b border-[#252830]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bibliothèque</h2>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
            title="Créer un nouvel article"
          >
            <PackagePlus size={12} /> Nouvel article
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-[#0f1117] border border-[#252830] rounded pl-7 pr-2 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {creating && (
        <NewItemForm
          onSave={(p) => { onAddCustom(p); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {customs.length > 0 && (
          <Section
            label="Mes préréglages"
            presets={filter(customs)}
            open={openPack === '__custom'}
            onToggle={() => setOpenPack(openPack === '__custom' ? '' : '__custom')}
            onAdd={onAddPreset}
            onDragStart={onDragStart}
            onRemove={onRemoveCustom}
          />
        )}
        {PRESET_PACKS.map((pack) => (
          <Section
            key={pack.id}
            label={pack.label}
            presets={filter(pack.presets)}
            open={openPack === pack.id}
            onToggle={() => setOpenPack(openPack === pack.id ? '' : pack.id)}
            onAdd={onAddPreset}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      <div className="p-2 border-t border-[#252830] text-[10px] text-gray-500 leading-relaxed">
        Glissez un élément sur le plan, ou cliquez + pour l'ajouter au centre.
      </div>
    </div>
  );
}

interface SectionProps {
  label: string;
  presets: Preset[];
  open: boolean;
  onToggle: () => void;
  onAdd: (p: Preset) => void;
  onDragStart: (p: Preset, e: React.DragEvent) => void;
  onRemove?: (nom: string) => void;
}

function NewItemForm({ onSave, onCancel }: { onSave: (p: Preset) => void; onCancel: () => void }) {
  const [nom, setNom] = useState('');
  const [type, setType] = useState<ObjetType>('machine');
  const [largeurM, setLargeurM] = useState(2);
  const [hauteurM, setHauteurM] = useState(1);
  const [couleur, setCouleur] = useState(CATALOG.machine.couleur);
  const [capacite, setCapacite] = useState<string>('');
  const [notes, setNotes] = useState('');

  return (
    <div className="p-3 border-b border-[#252830] bg-[#181c25] space-y-2">
      <input
        autoFocus
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom de l'article"
        className="input"
      />
      <select
        value={type}
        onChange={(e) => {
          const t = e.target.value as ObjetType;
          setType(t);
          setCouleur(CATALOG[t].couleur);
          setLargeurM(CATALOG[t].defaultLargeur / 100);
          setHauteurM(CATALOG[t].defaultHauteur / 100);
        }}
        className="input"
      >
        {TYPES_ORDERED.map((t) => (
          <option key={t} value={t}>{CATALOG[t].label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[10px] text-gray-500 mb-0.5">Largeur (m)</span>
          <input
            type="number"
            step={0.05}
            value={largeurM}
            onChange={(e) => setLargeurM(Number(e.target.value))}
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] text-gray-500 mb-0.5">Profondeur (m)</span>
          <input
            type="number"
            step={0.05}
            value={hauteurM}
            onChange={(e) => setHauteurM(Number(e.target.value))}
            className="input"
          />
        </label>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="w-10 h-7 bg-[#0f1117] border border-[#252830] rounded cursor-pointer"
        />
        <input
          value={capacite}
          onChange={(e) => setCapacite(e.target.value)}
          placeholder="Capacité (facultatif)"
          className="input"
          type="number"
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (facultatif)"
        className="input min-h-[40px] resize-y"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!nom.trim()) return;
            onSave({
              nom: nom.trim(),
              type,
              largeur: Math.round(largeurM * 100),
              hauteur: Math.round(hauteurM * 100),
              couleur,
              capacite: capacite ? Number(capacite) : undefined,
              notes: notes || undefined,
            });
          }}
          disabled={!nom.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded py-1.5"
        >
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-[#252830] hover:bg-[#2e3139] text-gray-300 text-xs rounded py-1.5"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function Section({ label, presets, open, onToggle, onAdd, onDragStart, onRemove }: SectionProps) {
  return (
    <div className="border-b border-[#1e2029]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-[#181c25]"
      >
        <span>{label}</span>
        <span className="text-gray-600 text-[10px]">{presets.length}</span>
      </button>
      {open && (
        <div className="pb-2">
          {presets.map((p) => (
            <div
              key={p.nom}
              draggable
              onDragStart={(e) => onDragStart(p, e)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-[#181c25] group cursor-grab active:cursor-grabbing"
              title={`${(p.largeur / 100).toFixed(2)} × ${(p.hauteur / 100).toFixed(2)} m — ${CATALOG[p.type].label}`}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: p.couleur ?? CATALOG[p.type].couleur }}
              />
              <div className="flex-1 min-w-0 truncate">{p.nom}</div>
              <span className="text-[10px] text-gray-600 font-mono shrink-0">
                {(p.largeur / 100).toFixed(1)}×{(p.hauteur / 100).toFixed(1)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(p); }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-200"
                title="Ajouter au centre"
              >
                <Plus size={13} />
              </button>
              {onRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(p.nom); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                  title="Supprimer ce préréglage"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

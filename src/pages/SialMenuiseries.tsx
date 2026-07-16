import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TracaMenuiserie } from '../atelier/components/TracaMenuiserie';
import { PosteCoupe } from '../atelier/components/PosteCoupe';

type Poste = '' | 'coupe' | 'soudure' | 'montage' | 'vitrage' | 'controle' | 'fiches';

const POSTES: { id: Poste; label: string; sub: string; ct: string; color: string }[] = [
  { id: 'coupe', label: 'PREPARATION & COUPE', sub: 'Debit profiles, preparation barres, coupe', ct: 'CT-01', color: 'bg-red-700 hover:bg-red-600' },
  { id: 'soudure', label: 'SOUDURE PVC', sub: 'Temperature, pression, test destructif', ct: 'CT-03', color: 'bg-blue-700 hover:bg-blue-600' },
  { id: 'montage', label: 'MONTAGE', sub: 'Assemblage dormants, ferrage, quincaillerie', ct: 'CT-02 + CT-04', color: 'bg-amber-700 hover:bg-amber-600' },
  { id: 'vitrage', label: 'VITRAGE', sub: 'Pose vitrage, calage DTU, lien CEKAL', ct: 'CT-05', color: 'bg-purple-700 hover:bg-purple-600' },
  { id: 'controle', label: 'CONTROLE FINAL', sub: 'Dimensions, etiquette CE, Window IT, liberation', ct: 'CT-06', color: 'bg-green-700 hover:bg-green-600' },
  { id: 'fiches', label: 'TOUTES LES FICHES', sub: 'Vue d\'ensemble des fiches tracabilite', ct: '', color: 'bg-gray-700 hover:bg-gray-600' },
];

export function SialMenuiseries({ onBack }: { onBack: () => void }) {
  const [poste, setPoste] = useState<Poste>('');

  if (poste === 'fiches') {
    return <TracaMenuiserie onBack={() => setPoste('')} />;
  }

  if (poste === 'coupe') {
    return (
      <div className="min-h-screen bg-[#0f1117]">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setPoste('')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
            <span className="text-sm font-bold text-red-400">CT-01 — PREPARATION & COUPE</span>
          </div>
        </header>
        <PosteCoupe onBack={() => setPoste('')} />
      </div>
    );
  }

  if (poste === 'soudure' || poste === 'montage' || poste === 'vitrage' || poste === 'controle') {
    const tabMap: Record<string, string> = { soudure: 'ct03', montage: 'ct02', vitrage: 'ct05', controle: 'ct06' };
    const labelMap: Record<string, string> = {
      soudure: 'CT-03 — SOUDURE PVC',
      montage: 'CT-02/04 — MONTAGE',
      vitrage: 'CT-05 — VITRAGE',
      controle: 'CT-06 — CONTROLE FINAL',
    };
    return (
      <PosteTracaView
        poste={poste}
        label={labelMap[poste]}
        defaultTab={tabMap[poste]}
        onBack={() => setPoste('')}
      />
    );
  }

  // Menu principal postes
  return (
    <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
      <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-lg px-3 py-2"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-black text-white">SIAL MENUISERIES</h1>
          <p className="text-sm text-gray-500">Aluminium & PVC — Choisissez votre poste</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 gap-4 w-full max-w-lg px-8">
          {POSTES.map(p => (
            <button key={p.id} onClick={() => setPoste(p.id)}
              className={`${p.color} text-white py-6 px-8 rounded-2xl transition-colors shadow-lg active:scale-95 text-left`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{p.label}</div>
                  <div className="text-sm text-white/70 mt-1">{p.sub}</div>
                </div>
                {p.ct && <span className="text-xs bg-white/10 px-2 py-1 rounded">{p.ct}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Vue par poste avec tracabilite integree
function PosteTracaView({ poste, label, defaultTab, onBack }: {
  poste: string; label: string; defaultTab: string; onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-red-400">{label}</span>
          <span className="text-xs text-gray-500">Tracabilite integree</span>
        </div>
      </header>
      <PosteTracaContent poste={poste} defaultTab={defaultTab} />
    </div>
  );
}

// Contenu : liste des fiches filtrees par etat du poste + formulaire traca
function PosteTracaContent(_props: { poste: string; defaultTab: string }) {
  // Pour l'instant on redirige vers TracaMenuiserie avec le bon onglet par defaut
  // A terme on pourrait filtrer les fiches par etat (ex: montage = fiches avec ct01 valide mais ct02 non valide)
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
        <p className="text-amber-400 text-sm">
          Ce poste affiche les fiches menuiserie a traiter. Chaque fiche inclut la checklist tracabilite du poste.
          Utilisez "TOUTES LES FICHES" pour la vue complete avec tous les onglets CT-01 a CT-06.
        </p>
      </div>
      <TracaMenuiserie onBack={() => {}} />
    </div>
  );
}

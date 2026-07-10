import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const THEMES = [
  { id: 'livraison', label: 'Livraison & Installation', desc: '11 etapes — du devis a la livraison signee', color: 'bg-amber-600' },
  { id: 'facturation', label: 'Facturation & Comptabilite', desc: '9 etapes — de la commande a la facture soldee', color: 'bg-blue-600' },
  { id: 'contacts', label: 'Contacts & Fournisseurs', desc: '6 fiches — creer et qualifier un res.partner', color: 'bg-green-600' },
  { id: 'equipe', label: 'Equipe & Attributions', desc: '7 roles — qui fait quoi chez VISTA', color: 'bg-violet-600' },
  { id: 'achats', label: 'Achats Fournisseurs', desc: '33 etapes — du besoin au paiement SEPA', color: 'bg-red-600' },
  { id: 'fabrication', label: 'Lancement en Fabrication', desc: '25 etapes — du dossier fab a la mise a dispo', color: 'bg-cyan-600' },
  { id: 'sav', label: 'SAV', desc: '6 etapes — de la demande client a la cloture', color: 'bg-orange-600' },
  { id: 'reporting', label: 'Reporting & Tresorerie', desc: '9 flux — pilotage financier consolide', color: 'bg-indigo-600' },
  { id: 'paie', label: 'Paie & Personnel', desc: '8 etapes — du pointage a la DSN', color: 'bg-pink-600' },
];

export function FormationOdoo({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    const theme = THEMES.find(t => t.id === selected);
    const idx = THEMES.findIndex(t => t.id === selected);
    return (
      <div className="fixed inset-0 bg-[#0f1117] flex flex-col z-50">
        <div className="flex items-center gap-4 px-4 py-2 bg-[#181a20] border-b border-[#2a2d35] shrink-0">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-bold text-teal-400">{theme?.label}</span>
          <span className="text-xs text-gray-500">{theme?.desc}</span>
        </div>
        <iframe
          src={`/workflows-vista.html#theme=${idx}`}
          className="flex-1 w-full border-0"
          title={theme?.label}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-teal-400">Formation Odoo & Flux de travail</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-black text-white mb-2">Workflows VISTA</h1>
        <p className="text-gray-400 mb-8">Tutoriels complets pour chaque processus dans Odoo 18. Cliquez sur un theme pour ouvrir le guide interactif.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className="text-left p-5 bg-[#181a20] rounded-xl border border-[#2a2d35] hover:border-teal-500/50 transition-colors active:scale-[0.98]">
              <div className={`w-10 h-10 ${t.color} rounded-lg flex items-center justify-center text-white text-lg font-bold mb-3`}>
                {t.label[0]}
              </div>
              <div className="text-white font-semibold text-sm">{t.label}</div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-8 bg-[#181a20] rounded-xl border border-[#2a2d35] p-5">
          <h3 className="text-sm font-bold text-amber-400 mb-2">Acces direct</h3>
          <p className="text-xs text-gray-400 mb-3">
            Le guide complet est aussi accessible en dehors de l'application :
          </p>
          <a href="/workflows-vista.html" target="_blank" rel="noopener"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-lg transition-colors">
            Ouvrir dans un nouvel onglet
          </a>
        </div>
      </div>
    </div>
  );
}

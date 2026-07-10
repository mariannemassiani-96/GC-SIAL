import { ArrowLeft } from 'lucide-react';

export function FormationOdoo({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-teal-400">Formation Odoo & Flux de travail</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="text-6xl mb-6">🎓</div>
        <h1 className="text-2xl font-black text-white mb-4">Formation Odoo & Flux de travail</h1>
        <p className="text-gray-400 text-lg">Contenu en cours de preparation.</p>
        <p className="text-gray-600 text-sm mt-2">Tutoriels, videos, flux de travail SIAL dans Odoo 18.</p>
      </div>
    </div>
  );
}

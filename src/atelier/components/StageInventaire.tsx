import { useState, useCallback } from 'react';
import { categoriserArticle, CATEGORIES } from '../categorisation';
import { DEMO_VITRAGES, type VitrageFacture } from '../vitrageAnalyse';
import { ArrowLeft, FileText, ClipboardList, CheckSquare, BarChart3, TrendingUp, Layers, AlertTriangle, ClipboardCheck, MessageCircle, Upload, Download, Plus, Search, Trash2, Sparkles, X, Send } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface LigneFacture {
  ref: string;
  designation: string;
  coloris: string;
  conditionnement: string;
  qte: number;
  prixUnitaireHT: number;
  totalLigneHT: number;
}

interface Facture {
  id: string;
  fournisseur: string;
  dateFacture: string;
  numFacture: string;
  lignes: LigneFacture[];
}

interface RefConsolidee {
  ref: string;
  fournisseur: string;
  designation: string;
  coloris: string;
  conditionnement: string;
  nbCommandes: number;
  qteTotale: number;
  dernierPrixHT: number;
  dateDerniereCommande: string;
  recommandation: string;
}

interface ArticleTerrain {
  id: string;
  ref: string;
  designation: string;
  famille: string;
  sousFamille: string;
  fournisseur: string;
  emplacement: string;
  qte: number;
  unite: string;
  note: string;
  zone5S: string;
  emplacementOdoo: string;
  decisionStock: string;
  seuilMin: number;
  qteReappro: number;
  noteDecision: string;
  statut: string;
  dateCreation: string;
  suggestionIA?: string;
}

interface Props { onBack: () => void; }

type Tab = 'factures' | 'recensement' | 'decisions' | 'statistiques' | 'vitrage' | 'averifier' | 'inventaire' | 'dashboard';

const FAMILLES = ['VISSERIE', 'QUINCAILLERIE', 'JOINT', 'ACCESSOIRE', 'CONSOMMABLE', 'AUTRE'];
const UNITES = ['piece', 'boite', 'kg', 'metre', 'rouleau'];
const ZONES_5S = ['Zone A Visserie', 'Zone B Quincaillerie', 'Zone C Joints', 'Zone D Consommables', 'Zone E Accessoires'];
const DECISIONS_STOCK = ['Stock permanent', 'Stock securite', 'Commande a la demande', 'A eliminer'];
const STATUTS = ['A traiter', 'En cours', 'Valide', 'Importe dans Odoo'];

const STORAGE_FACTURES = 'sial_factures';
const STORAGE_ARTICLES = 'sial_articles';

// ── Données démo ─────────────────────────────────────────────────────

const DEMO_FACTURES: Facture[] = [
  {
    id: 'F1', fournisseur: 'Wurth', dateFacture: '2025-09-15', numFacture: 'WU-2025-4521',
    lignes: [
      { ref: 'VA6338Z', designation: 'Vis autoforeuse 6.3x38 zinguee', coloris: 'Zinc', conditionnement: 'Boite de 200', qte: 5, prixUnitaireHT: 18.50, totalLigneHT: 92.50 },
      { ref: 'CH850PVC', designation: 'Cheville PVC 8x50', coloris: '', conditionnement: 'Boite de 100', qte: 10, prixUnitaireHT: 8.20, totalLigneHT: 82.00 },
      { ref: 'VA4825I', designation: 'Vis autoperceuse 4.8x25 inox', coloris: 'Inox A2', conditionnement: 'Boite de 500', qte: 3, prixUnitaireHT: 32.00, totalLigneHT: 96.00 },
      { ref: 'EC-EPDM-10', designation: 'Equerre EPDM 10mm', coloris: 'Noir', conditionnement: 'Piece', qte: 50, prixUnitaireHT: 0.85, totalLigneHT: 42.50 },
      { ref: 'RP-ALU-BL', designation: 'Rivet pop alu 4x10 blanc', coloris: 'Blanc RAL9016', conditionnement: 'Boite de 500', qte: 4, prixUnitaireHT: 12.60, totalLigneHT: 50.40 },
    ],
  },
  {
    id: 'F2', fournisseur: 'Ferco', dateFacture: '2025-11-03', numFacture: 'FC-2025-8834',
    lignes: [
      { ref: 'CR3P-ALU-BL', designation: 'Cremone 3 points ALU blanc', coloris: 'Blanc', conditionnement: 'Piece', qte: 20, prixUnitaireHT: 45.00, totalLigneHT: 900.00 },
      { ref: 'G-22158-00', designation: 'Cremone OB F7.5 L1440', coloris: 'GRZ', conditionnement: 'Piece', qte: 15, prixUnitaireHT: 38.50, totalLigneHT: 577.50 },
      { ref: 'E-19736-00', designation: 'Gache galet dormant 43mm', coloris: 'BRUT', conditionnement: 'Piece', qte: 100, prixUnitaireHT: 2.80, totalLigneHT: 280.00 },
      { ref: '6-39148-20', designation: 'Compas OF axe 13mm', coloris: 'BRUT', conditionnement: 'Piece', qte: 40, prixUnitaireHT: 8.50, totalLigneHT: 340.00 },
      { ref: 'VA6338Z', designation: 'Vis autoforeuse 6.3x38 zinguee', coloris: 'Zinc', conditionnement: 'Boite de 200', qte: 3, prixUnitaireHT: 18.50, totalLigneHT: 55.50 },
    ],
  },
  {
    id: 'F3', fournisseur: 'Rehau', dateFacture: '2026-01-20', numFacture: 'RH-2026-0112',
    lignes: [
      { ref: 'JB08GR', designation: 'Joint brosse gris 8mm', coloris: 'Gris', conditionnement: 'Rouleau 200m', qte: 2, prixUnitaireHT: 45.00, totalLigneHT: 90.00 },
      { ref: 'JC-EPDM-BL', designation: 'Joint central EPDM blanc', coloris: 'Blanc', conditionnement: 'Rouleau 100m', qte: 3, prixUnitaireHT: 28.00, totalLigneHT: 84.00 },
      { ref: 'CR3P-ALU-BL', designation: 'Cremone 3 points ALU blanc', coloris: 'Blanc', conditionnement: 'Piece', qte: 10, prixUnitaireHT: 44.00, totalLigneHT: 440.00 },
      { ref: 'PO-ALU-AN', designation: 'Poignee olive ALU anodise naturel', coloris: 'Anodise', conditionnement: 'Piece', qte: 30, prixUnitaireHT: 12.50, totalLigneHT: 375.00 },
      { ref: 'VA6338Z', designation: 'Vis autoforeuse 6.3x38 zinguee', coloris: 'Zinc', conditionnement: 'Boite de 200', qte: 2, prixUnitaireHT: 19.00, totalLigneHT: 38.00 },
    ],
  },
];

const DEMO_ARTICLES: ArticleTerrain[] = [
  { id: 'A1', ref: 'VA6338Z', designation: 'Vis autoforeuse 6.3x38 zinguee', famille: 'VISSERIE', sousFamille: 'Vis autoforeuse', fournisseur: 'Wurth', emplacement: 'Etagere 1 gauche', qte: 1200, unite: 'piece', note: 'Tres utilise, reappro frequent', zone5S: 'Zone A Visserie', emplacementOdoo: 'MAG/A/01/A', decisionStock: 'Stock permanent', seuilMin: 500, qteReappro: 1000, noteDecision: 'Kanban 2 boites', statut: 'Valide', dateCreation: '2026-03-15' },
  { id: 'A2', ref: 'CR3P-ALU-BL', designation: 'Cremone 3 points ALU blanc', famille: 'QUINCAILLERIE', sousFamille: 'Cremone', fournisseur: 'Ferco', emplacement: 'Armoire 2', qte: 8, unite: 'piece', note: '', zone5S: 'Zone B Quincaillerie', emplacementOdoo: 'MAG/B/02/A', decisionStock: 'Stock securite', seuilMin: 5, qteReappro: 20, noteDecision: '', statut: 'Valide', dateCreation: '2026-03-15' },
  { id: 'A3', ref: 'JB08GR', designation: 'Joint brosse gris 8mm', famille: 'JOINT', sousFamille: 'Joint brosse', fournisseur: 'Rehau', emplacement: 'Etagere 3', qte: 150, unite: 'metre', note: 'Mesure approximative', zone5S: 'Zone C Joints', emplacementOdoo: 'MAG/C/03/A', decisionStock: 'Stock permanent', seuilMin: 50, qteReappro: 200, noteDecision: '', statut: 'En cours', dateCreation: '2026-03-16' },
  { id: 'A4', ref: 'CH850PVC', designation: 'Cheville PVC 8x50', famille: 'VISSERIE', sousFamille: 'Cheville', fournisseur: 'Wurth', emplacement: 'Etagere 1 droite', qte: 450, unite: 'piece', note: '', zone5S: 'Zone A Visserie', emplacementOdoo: 'MAG/A/01/B', decisionStock: 'Stock securite', seuilMin: 200, qteReappro: 500, noteDecision: '', statut: 'A traiter', dateCreation: '2026-03-17' },
  { id: 'A5', ref: 'PO-ALU-AN', designation: 'Poignee olive ALU anodise', famille: 'ACCESSOIRE', sousFamille: 'Poignee', fournisseur: 'Hoppe', emplacement: 'Vitrine 1', qte: 15, unite: 'piece', note: 'Differentes tailles melangees', zone5S: 'Zone E Accessoires', emplacementOdoo: 'MAG/E/01/A', decisionStock: 'Commande a la demande', seuilMin: 0, qteReappro: 0, noteDecision: 'Commander par chantier', statut: 'A traiter', dateCreation: '2026-03-18' },
  { id: 'A6', ref: 'E-19736-00', designation: 'Gache galet dormant 43mm', famille: 'QUINCAILLERIE', sousFamille: 'Gache', fournisseur: 'Ferco', emplacement: 'Bac 5', qte: 85, unite: 'piece', note: '', zone5S: 'Zone B Quincaillerie', emplacementOdoo: 'MAG/B/05/A', decisionStock: 'Stock permanent', seuilMin: 30, qteReappro: 100, noteDecision: '', statut: 'En cours', dateCreation: '2026-03-18' },
  { id: 'A7', ref: '6-39148-20', designation: 'Compas OF axe 13mm', famille: 'QUINCAILLERIE', sousFamille: 'Compas', fournisseur: 'Ferco', emplacement: 'Casier 3', qte: 22, unite: 'piece', note: '', zone5S: 'Zone B Quincaillerie', emplacementOdoo: 'MAG/B/03/B', decisionStock: 'Stock securite', seuilMin: 10, qteReappro: 40, noteDecision: '', statut: 'A traiter', dateCreation: '2026-03-19' },
  { id: 'A8', ref: 'EC-EPDM-10', designation: 'Equerre EPDM 10mm', famille: 'CONSOMMABLE', sousFamille: 'Equerre', fournisseur: 'Wurth', emplacement: 'Tiroir 7', qte: 0, unite: 'piece', note: 'Stock vide a verifier', zone5S: 'Zone D Consommables', emplacementOdoo: 'MAG/D/07/A', decisionStock: '', seuilMin: 0, qteReappro: 0, noteDecision: '', statut: 'A traiter', dateCreation: '2026-03-20' },
];

// ── Helpers ───────────────────────────────────────────────────────────

function loadData<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveData<T>(key: string, data: T) { localStorage.setItem(key, JSON.stringify(data)); }

function consoliderFactures(factures: Facture[]): RefConsolidee[] {
  const map = new Map<string, { lignes: (LigneFacture & { date: string; fournisseur: string })[] }>();
  for (const f of factures) {
    for (const l of f.lignes) {
      const existing = map.get(l.ref) ?? { lignes: [] };
      existing.lignes.push({ ...l, date: f.dateFacture, fournisseur: f.fournisseur });
      map.set(l.ref, existing);
    }
  }
  const result: RefConsolidee[] = [];
  for (const [ref, { lignes }] of map) {
    lignes.sort((a, b) => b.date.localeCompare(a.date));
    const derniere = lignes[0];
    const nb = lignes.length;
    const qteTotale = lignes.reduce((s, l) => s + l.qte, 0);
    let reco = 'Commande a la demande';
    if (nb >= 6) reco = 'STOCK PERMANENT — reappro Kanban recommande';
    else if (nb >= 3) reco = 'STOCK DE SECURITE — prevoir 1 commande d\'avance';
    else if (nb === 1 && lignes[0].qte > 50) reco = 'VERIFIER — usage ponctuel ou chantier specifique ?';
    result.push({ ref, fournisseur: derniere.fournisseur, designation: derniere.designation, coloris: derniere.coloris, conditionnement: derniere.conditionnement, nbCommandes: nb, qteTotale, dernierPrixHT: derniere.prixUnitaireHT, dateDerniereCommande: derniere.date, recommandation: reco });
  }
  return result.sort((a, b) => b.nbCommandes - a.nbCommandes);
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ── Composant principal ──────────────────────────────────────────────

export function StageInventaire({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('factures');
  const [factures, setFactures] = useState<Facture[]>(() => loadData(STORAGE_FACTURES, DEMO_FACTURES));
  const [articles, setArticles] = useState<ArticleTerrain[]>(() => loadData(STORAGE_ARTICLES, DEMO_ARTICLES));
  const [vitrages] = useState<VitrageFacture[]>(() => loadData('sial_vitrages', DEMO_VITRAGES));
  const [corrections, setCorrections] = useState<Record<string, string>>(() => loadData("sial_corrections", {}));
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const consolidated = consoliderFactures(factures);


  const updateArticles = useCallback((next: ArticleTerrain[]) => {
    setArticles(next);
    saveData(STORAGE_ARTICLES, next);
  }, []);

  const updateFactures = useCallback((next: Facture[]) => {
    setFactures(next);
    saveData(STORAGE_FACTURES, next);
  }, []);

  const learnCategorie = useCallback((ref: string, categorie: string) => {
    const next = { ...corrections, [ref]: categorie };
    setCorrections(next);
    saveData('sial_corrections', next);
  }, [corrections]);

  // ── Chat IA ──
  const sendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMsgs = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newMsgs);
    // Placeholder response (API Anthropic requires key)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `[Mode demo] Pour utiliser l'IA, configurez votre cle API Anthropic. En attendant, voici quelques conseils :\n\n- Zone A = Visserie (MAG/A/xx/x)\n- Zone B = Quincaillerie chassis (MAG/B/xx/x)\n- Zone C = Joints (MAG/C/xx/x)\n- Zone D = Consommables (MAG/D/xx/x)\n- Zone E = Accessoires (MAG/E/xx/x)\n\nVotre question etait : "${userMsg}"`
      }]);
    }, 500);
  }, [chatInput, chatMessages]);

  // ── Ajout article ──
  const addArticle = useCallback(() => {
    const newArt: ArticleTerrain = {
      id: uid(), ref: '', designation: '', famille: 'VISSERIE', sousFamille: '', fournisseur: '',
      emplacement: '', qte: 0, unite: 'piece', note: '', zone5S: '', emplacementOdoo: '',
      decisionStock: '', seuilMin: 0, qteReappro: 0, noteDecision: '', statut: 'A traiter',
      dateCreation: new Date().toISOString().slice(0, 10),
    };
    updateArticles([newArt, ...articles]);
  }, [articles, updateArticles]);

  const updateArticle = useCallback((id: string, updates: Partial<ArticleTerrain>) => {
    updateArticles(articles.map(a => a.id === id ? { ...a, ...updates } : a));
  }, [articles, updateArticles]);

  const deleteArticle = useCallback((id: string) => {
    updateArticles(articles.filter(a => a.id !== id));
  }, [articles, updateArticles]);

  // ── Export CSV ──
  const exportCSV = useCallback(() => {
    const headers = ['Ref', 'Designation', 'Famille', 'Fournisseur', 'Emplacement', 'Qte', 'Unite', 'Zone5S', 'EmplacementOdoo', 'DecisionStock', 'SeuilMin', 'QteReappro', 'Statut', 'Note'];
    const rows = articles.map(a => [a.ref, a.designation, a.famille, a.fournisseur, a.emplacement, a.qte, a.unite, a.zone5S, a.emplacementOdoo, a.decisionStock, a.seuilMin, a.qteReappro, a.statut, a.note]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sial_inventaire_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [articles]);

  const filteredArticles = articles.filter(a => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return a.ref.toLowerCase().includes(q) || a.designation.toLowerCase().includes(q) || a.fournisseur.toLowerCase().includes(q) || a.famille.toLowerCase().includes(q);
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'factures', label: 'Factures', icon: <FileText size={16} /> },
    { id: 'recensement', label: 'Recensement', icon: <ClipboardList size={16} /> },
    { id: 'decisions', label: 'Decisions', icon: <CheckSquare size={16} /> },
    { id: 'averifier', label: 'A verifier', icon: <AlertTriangle size={16} /> },
    { id: 'vitrage', label: 'Vitrage', icon: <Layers size={16} /> },
    { id: 'statistiques', label: 'Statistiques', icon: <TrendingUp size={16} /> },
    { id: 'inventaire', label: 'Inventaire 31/07', icon: <ClipboardCheck size={16} /> },
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-sm font-bold text-white">SIAL Apertura — Stage Inventaire</h1>
              <p className="text-[10px] text-gray-500">Gestion stock 5S + Odoo 18</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{articles.length} articles | {factures.length} factures | {vitrages.length} vitrages</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-[#181a20] border-b border-[#2a2d35] px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'factures' && <TabFactures factures={factures} consolidated={consolidated} onUpdate={updateFactures} />}
        {tab === 'recensement' && <TabRecensement articles={filteredArticles} consolidated={consolidated} search={searchFilter} onSearch={setSearchFilter} onAdd={addArticle} onUpdate={updateArticle} onDelete={deleteArticle} />}
        {tab === 'decisions' && <TabDecisions articles={filteredArticles} search={searchFilter} onSearch={setSearchFilter} onUpdate={updateArticle} onExport={exportCSV} />}
        {tab === 'averifier' && <TabAVerifier factures={factures} onLearn={learnCategorie} corrections={corrections} />}
        {tab === 'vitrage' && <TabVitrage vitrages={vitrages} />}
        {tab === 'statistiques' && <TabStatistiques factures={factures} />}
        {tab === 'inventaire' && <TabInventaire articles={articles} consolidated={consolidated} />}
        {tab === 'dashboard' && <TabDashboard articles={articles} consolidated={consolidated} factures={factures} />}
      </main>

      {/* Bouton IA flottant */}
      <button onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 flex items-center justify-center z-40 transition-transform hover:scale-110">
        <MessageCircle size={24} />
      </button>

      {/* Chat IA */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[500px] bg-[#181a20] border border-[#2a2d35] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2d35] flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={14} className="text-orange-400" /> Assistant IA Terrain</span>
            <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[350px]">
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">Posez une question sur le rangement 5S, les codes Odoo, les seuils de stock...</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-xs p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600/20 text-blue-300 ml-8' : 'bg-[#252830] text-gray-300 mr-8'}`}>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#2a2d35] flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Votre question..." className="flex-1 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500" />
            <button onClick={sendChat} className="px-3 py-2 bg-orange-600 rounded-lg text-white hover:bg-orange-500"><Send size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Factures ─────────────────────────────────────────────────────

function TabFactures({ factures, consolidated, onUpdate }: { factures: Facture[]; consolidated: RefConsolidee[]; onUpdate: (f: Facture[]) => void }) {
  const [viewMode, setViewMode] = useState<'factures' | 'consolidee'>('consolidee');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('consolidee')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${viewMode === 'consolidee' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-gray-500 border border-[#353840]'}`}>
            Referentiel consolide ({consolidated.length})
          </button>
          <button onClick={() => setViewMode('factures')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${viewMode === 'factures' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-gray-500 border border-[#353840]'}`}>
            Factures brutes ({factures.length})
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onUpdate(DEMO_FACTURES)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600/10 border border-amber-500/30 text-amber-400 rounded-lg">
            <Upload size={12} /> Charger demo
          </button>
        </div>
      </div>

      {viewMode === 'consolidee' ? (
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2d35] text-gray-500">
                  <th className="text-left px-3 py-2.5">Ref</th>
                  <th className="text-left px-3 py-2.5">Fournisseur</th>
                  <th className="text-left px-3 py-2.5">Designation</th>
                  <th className="text-left px-3 py-2.5">Coloris</th>
                  <th className="text-center px-3 py-2.5">Nb cmd</th>
                  <th className="text-center px-3 py-2.5">Qte totale</th>
                  <th className="text-right px-3 py-2.5">Dernier PU HT</th>
                  <th className="text-left px-3 py-2.5">Derniere cmd</th>
                  <th className="text-left px-3 py-2.5">Recommandation</th>
                </tr>
              </thead>
              <tbody>
                {consolidated.map(r => (
                  <tr key={r.ref} className="border-b border-[#2a2d35]/50 hover:bg-[#1c1e24]">
                    <td className="px-3 py-2 font-mono text-amber-400">{r.ref}</td>
                    <td className="px-3 py-2 text-gray-300">{r.fournisseur}</td>
                    <td className="px-3 py-2 text-white">{r.designation}</td>
                    <td className="px-3 py-2 text-gray-400">{r.coloris || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-white">{r.nbCommandes}</td>
                    <td className="px-3 py-2 text-center text-gray-300">{r.qteTotale}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{r.dernierPrixHT.toFixed(2)} EUR</td>
                    <td className="px-3 py-2 text-gray-400">{r.dateDerniereCommande}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border
                        ${r.recommandation.includes('PERMANENT') ? 'bg-green-600/20 text-green-400 border-green-500/30' :
                          r.recommandation.includes('SECURITE') ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                          r.recommandation.includes('VERIFIER') ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' :
                          'bg-gray-600/20 text-gray-400 border-gray-600/30'}`}>
                        {r.recommandation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {factures.map(f => (
            <div key={f.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-bold text-white">{f.fournisseur}</span>
                  <span className="text-xs text-gray-500 ml-3">{f.numFacture} | {f.dateFacture}</span>
                </div>
                <span className="text-xs text-gray-400">{f.lignes.length} lignes | {f.lignes.reduce((s, l) => s + l.totalLigneHT, 0).toFixed(2)} EUR HT</span>
              </div>
              <div className="space-y-1">
                {f.lignes.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1 border-t border-[#2a2d35]/30">
                    <span className="font-mono text-amber-400 w-24 shrink-0">{l.ref}</span>
                    <span className="text-gray-300 flex-1">{l.designation}</span>
                    <span className="text-gray-500 w-16">{l.coloris || '—'}</span>
                    <span className="text-gray-400 w-8 text-right">{l.qte}</span>
                    <span className="text-gray-400 w-20 text-right">{l.prixUnitaireHT.toFixed(2)} EUR</span>
                    <span className="text-white w-20 text-right font-medium">{l.totalLigneHT.toFixed(2)} EUR</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Recensement ──────────────────────────────────────────────────

function TabRecensement({ articles, consolidated, search, onSearch, onAdd, onUpdate, onDelete }: {
  articles: ArticleTerrain[]; consolidated: RefConsolidee[]; search: string;
  onSearch: (s: string) => void; onAdd: () => void; onUpdate: (id: string, u: Partial<ArticleTerrain>) => void; onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Chercher ref, designation, fournisseur..."
            className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500" />
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
          <Plus size={14} /> Nouvel article
        </button>
      </div>

      <div className="space-y-2">
        {articles.map(art => {
          const isEditing = editingId === art.id;
          const refInfo = consolidated.find(c => c.ref === art.ref);
          return (
            <div key={art.id} className={`bg-[#181a20] border rounded-xl overflow-hidden transition-all ${isEditing ? 'border-blue-500/40' : 'border-[#2a2d35]'}`}>
              {/* Header cliquable */}
              <button onClick={() => setEditingId(isEditing ? null : art.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1c1e24]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${art.statut === 'Valide' ? 'bg-green-500' : art.statut === 'En cours' ? 'bg-blue-500' : art.statut === 'Importe dans Odoo' ? 'bg-purple-500' : 'bg-gray-500'}`} />
                <span className="font-mono text-xs text-amber-400 w-28 shrink-0">{art.ref || '(sans ref)'}</span>
                <span className="text-xs text-white flex-1 truncate">{art.designation || '(sans designation)'}</span>
                <span className="text-[10px] text-gray-500">{art.famille}</span>
                <span className="text-xs text-gray-300 w-16 text-right">{art.qte} {art.unite}</span>
                <button onClick={e => { e.stopPropagation(); onDelete(art.id); }} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={12} /></button>
              </button>

              {/* Formulaire edition */}
              {isEditing && (
                <div className="px-4 pb-4 border-t border-[#2a2d35] pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Reference" value={art.ref} onChange={v => onUpdate(art.id, { ref: v })} />
                    <Field label="Designation" value={art.designation} onChange={v => onUpdate(art.id, { designation: v })} />
                    <Select label="Famille" value={art.famille} options={FAMILLES} onChange={v => onUpdate(art.id, { famille: v })} />
                    <Field label="Sous-famille" value={art.sousFamille} onChange={v => onUpdate(art.id, { sousFamille: v })} />
                    <Field label="Fournisseur" value={art.fournisseur} onChange={v => onUpdate(art.id, { fournisseur: v })} />
                    <Field label="Emplacement physique" value={art.emplacement} onChange={v => onUpdate(art.id, { emplacement: v })} />
                    <FieldNum label="Quantite" value={art.qte} onChange={v => onUpdate(art.id, { qte: v })} />
                    <Select label="Unite" value={art.unite} options={UNITES} onChange={v => onUpdate(art.id, { unite: v })} />
                  </div>
                  <Field label="Note" value={art.note} onChange={v => onUpdate(art.id, { note: v })} />

                  {/* Info facture si ref connue */}
                  {refInfo && (
                    <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 text-xs">
                      <p className="text-blue-400 font-semibold mb-1">Reference connue dans les factures</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-300">
                        <span>Fournisseur : <strong>{refInfo.fournisseur}</strong></span>
                        <span>Dernier prix : <strong>{refInfo.dernierPrixHT.toFixed(2)} EUR</strong></span>
                        <span>Commande {refInfo.nbCommandes}x</span>
                        <span>{refInfo.recommandation}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab Decisions ────────────────────────────────────────────────────

function TabDecisions({ articles, search, onSearch, onUpdate, onExport }: {
  articles: ArticleTerrain[]; search: string; onSearch: (s: string) => void;
  onUpdate: (id: string, u: Partial<ArticleTerrain>) => void; onExport: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Chercher..."
            className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
        </div>
        <button onClick={onExport} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg">
          <Download size={14} /> Exporter CSV
        </button>
      </div>

      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-3 py-2.5">Ref</th>
                <th className="text-left px-3 py-2.5">Designation</th>
                <th className="text-left px-3 py-2.5">Zone 5S</th>
                <th className="text-left px-3 py-2.5">Emplacement Odoo</th>
                <th className="text-left px-3 py-2.5">Decision stock</th>
                <th className="text-center px-3 py-2.5">Seuil min</th>
                <th className="text-center px-3 py-2.5">Qte reappro</th>
                <th className="text-left px-3 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id} className="border-b border-[#2a2d35]/50 hover:bg-[#1c1e24]">
                  <td className="px-3 py-2 font-mono text-amber-400">{a.ref}</td>
                  <td className="px-3 py-2 text-white">{a.designation}</td>
                  <td className="px-3 py-2">
                    <select value={a.zone5S} onChange={e => onUpdate(a.id, { zone5S: e.target.value })}
                      className="bg-[#252830] border border-[#353840] rounded px-2 py-1 text-[10px] text-gray-300 outline-none">
                      <option value="">—</option>
                      {ZONES_5S.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={a.emplacementOdoo} onChange={e => onUpdate(a.id, { emplacementOdoo: e.target.value })}
                      placeholder="MAG/X/XX/X" className="bg-[#252830] border border-[#353840] rounded px-2 py-1 text-[10px] text-gray-300 w-28 outline-none font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={a.decisionStock} onChange={e => onUpdate(a.id, { decisionStock: e.target.value })}
                      className="bg-[#252830] border border-[#353840] rounded px-2 py-1 text-[10px] text-gray-300 outline-none">
                      <option value="">—</option>
                      {DECISIONS_STOCK.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" value={a.seuilMin} onChange={e => onUpdate(a.id, { seuilMin: Number(e.target.value) })}
                      className="bg-[#252830] border border-[#353840] rounded px-2 py-1 text-[10px] text-gray-300 w-16 text-center outline-none" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" value={a.qteReappro} onChange={e => onUpdate(a.id, { qteReappro: Number(e.target.value) })}
                      className="bg-[#252830] border border-[#353840] rounded px-2 py-1 text-[10px] text-gray-300 w-16 text-center outline-none" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={a.statut} onChange={e => onUpdate(a.id, { statut: e.target.value })}
                      className={`rounded px-2 py-1 text-[10px] font-medium border outline-none
                        ${a.statut === 'Valide' ? 'bg-green-600/20 text-green-400 border-green-500/30' :
                          a.statut === 'En cours' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                          a.statut === 'Importe dans Odoo' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' :
                          'bg-[#252830] text-gray-400 border-[#353840]'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab Dashboard ────────────────────────────────────────────────────

function TabDashboard({ articles, consolidated, factures }: { articles: ArticleTerrain[]; consolidated: RefConsolidee[]; factures: Facture[] }) {
  const byFamille = FAMILLES.map(f => ({ name: f, count: articles.filter(a => a.famille === f).length })).filter(f => f.count > 0);
  const byStatut = STATUTS.map(s => ({ name: s, count: articles.filter(a => a.statut === s).length }));
  const sansZone = articles.filter(a => !a.zone5S);
  const qteZero = articles.filter(a => a.qte === 0);
  const totalFactures = factures.reduce((s, f) => s + f.lignes.reduce((s2, l) => s2 + l.totalLigneHT, 0), 0);

  const byFournisseur = new Map<string, number>();
  for (const f of factures) for (const l of f.lignes) byFournisseur.set(f.fournisseur, (byFournisseur.get(f.fournisseur) ?? 0) + l.totalLigneHT);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Articles recenses" value={articles.length} color="text-white" />
        <KPI label="References factures" value={consolidated.length} color="text-amber-400" />
        <KPI label="Factures analysees" value={factures.length} color="text-blue-400" />
        <KPI label="Total factures HT" value={`${Math.round(totalFactures)} EUR`} color="text-green-400" />
        <KPI label="Alertes" value={sansZone.length + qteZero.length} color={sansZone.length + qteZero.length > 0 ? 'text-red-400' : 'text-gray-400'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Répartition par famille */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Repartition par famille</h3>
          <div className="space-y-2">
            {byFamille.map(f => (
              <div key={f.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 truncate">{f.name}</span>
                <div className="flex-1 h-5 bg-[#252830] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600/60 rounded-full" style={{ width: `${(f.count / articles.length) * 100}%` }} />
                </div>
                <span className="text-xs text-white font-bold w-8 text-right">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition par statut */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Repartition par statut</h3>
          <div className="space-y-2">
            {byStatut.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 truncate">{s.name}</span>
                <div className="flex-1 h-5 bg-[#252830] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    s.name === 'Valide' ? 'bg-green-600/60' :
                    s.name === 'En cours' ? 'bg-blue-600/60' :
                    s.name === 'Importe dans Odoo' ? 'bg-purple-600/60' :
                    'bg-gray-600/60'
                  }`} style={{ width: `${articles.length > 0 ? (s.count / articles.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-white font-bold w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Montant par fournisseur */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Montant par fournisseur</h3>
          <div className="space-y-2">
            {[...byFournisseur.entries()].sort((a, b) => b[1] - a[1]).map(([f, total]) => (
              <div key={f} className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">{f}</span>
                <span className="text-white font-bold">{Math.round(total).toLocaleString('fr-FR')} EUR HT</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Alertes</h3>
          {sansZone.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-amber-400 font-semibold mb-1">{sansZone.length} article(s) sans zone 5S</p>
              {sansZone.slice(0, 5).map(a => (
                <p key={a.id} className="text-[10px] text-gray-500">{a.ref} — {a.designation}</p>
              ))}
            </div>
          )}
          {qteZero.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1">{qteZero.length} article(s) avec quantite = 0</p>
              {qteZero.slice(0, 5).map(a => (
                <p key={a.id} className="text-[10px] text-gray-500">{a.ref} — {a.designation}</p>
              ))}
            </div>
          )}
          {sansZone.length === 0 && qteZero.length === 0 && (
            <p className="text-xs text-green-400">Aucune alerte</p>
          )}
        </div>

        {/* Top 10 refs les plus commandées */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 md:col-span-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top 10 references les plus commandees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {consolidated.slice(0, 10).map((r, i) => (
              <div key={r.ref} className="flex items-center gap-3 text-xs py-1">
                <span className="text-gray-600 w-5">{i + 1}.</span>
                <span className="font-mono text-amber-400 w-28">{r.ref}</span>
                <span className="text-gray-300 flex-1 truncate">{r.designation}</span>
                <span className="text-white font-bold">{r.nbCommandes}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composants utilitaires ───────────────────────────────────────────

function KPI({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${color} mt-0.5`}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none focus:border-blue-500" />
    </div>
  );
}

function FieldNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2.5 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none focus:border-blue-500" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none focus:border-blue-500">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Tab Statistiques ─────────────────────────────────────────────────

function TabStatistiques({ factures }: { factures: Facture[] }) {
  const [filtreAnnee, setFiltreAnnee] = useState<string>('tous');
  const [filtreFournisseur, setFiltreFournisseur] = useState<string>('tous');
  const [vueActive, setVueActive] = useState<'annee' | 'mois' | 'fournisseur' | 'produit' | 'categorie' | 'couleur'>('fournisseur');

  // Flatten toutes les lignes avec métadonnées
  const toutesLignes = factures.flatMap(f =>
    f.lignes.map(l => ({
      ...l,
      fournisseur: f.fournisseur,
      dateFacture: f.dateFacture,
      annee: f.dateFacture.slice(0, 4),
      mois: f.dateFacture.slice(0, 7),
      categorie: categoriserArticle(l.ref, l.designation, f.fournisseur).categorie,
    }))
  );

  // Années et fournisseurs uniques pour filtres
  const annees = [...new Set(toutesLignes.map(l => l.annee))].sort();
  const fournisseurs = [...new Set(toutesLignes.map(l => l.fournisseur))].sort();

  // Appliquer filtres
  const lignesFiltrees = toutesLignes.filter(l => {
    if (filtreAnnee !== 'tous' && l.annee !== filtreAnnee) return false;
    if (filtreFournisseur !== 'tous' && l.fournisseur !== filtreFournisseur) return false;
    return true;
  });

  const totalHT = lignesFiltrees.reduce((s, l) => s + l.totalLigneHT, 0);
  const nbLignes = lignesFiltrees.length;
  const nbRefs = new Set(lignesFiltrees.map(l => l.ref)).size;

  // Fonctions d'agrégation
  type Agg = { label: string; totalHT: number; nbLignes: number; nbRefs: number };

  function agreger(keyFn: (l: typeof toutesLignes[0]) => string): Agg[] {
    const map = new Map<string, { totalHT: number; nbLignes: number; refs: Set<string> }>();
    for (const l of lignesFiltrees) {
      const key = keyFn(l);
      const existing = map.get(key) ?? { totalHT: 0, nbLignes: 0, refs: new Set<string>() };
      existing.totalHT += l.totalLigneHT;
      existing.nbLignes++;
      existing.refs.add(l.ref);
      map.set(key, existing);
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, totalHT: v.totalHT, nbLignes: v.nbLignes, nbRefs: v.refs.size }))
      .sort((a, b) => b.totalHT - a.totalHT);
  }

  const vues: { id: typeof vueActive; label: string }[] = [
    { id: 'fournisseur', label: 'Par fournisseur' },
    { id: 'annee', label: 'Par annee' },
    { id: 'mois', label: 'Par mois' },
    { id: 'categorie', label: 'Par categorie' },
    { id: 'produit', label: 'Par produit' },
    { id: 'couleur', label: 'Par couleur' },
  ];

  let donnees: Agg[] = [];
  switch (vueActive) {
    case 'fournisseur': donnees = agreger(l => l.fournisseur); break;
    case 'annee': donnees = agreger(l => l.annee).sort((a, b) => a.label.localeCompare(b.label)); break;
    case 'mois': donnees = agreger(l => l.mois).sort((a, b) => a.label.localeCompare(b.label)); break;
    case 'categorie': donnees = agreger(l => l.categorie); break;
    case 'produit': donnees = agreger(l => `${l.ref} — ${l.designation}`); break;
    case 'couleur': donnees = agreger(l => l.coloris || '(non specifie)'); break;
  }

  const maxHT = Math.max(...donnees.map(d => d.totalHT), 1);

  // Export CSV stats
  const exportStats = () => {
    const headers = ['Label', 'Total HT', 'Nb lignes', 'Nb refs'];
    const rows = donnees.map(d => [d.label, d.totalHT.toFixed(2), d.nbLignes, d.nbRefs]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stats_${vueActive}_${filtreAnnee}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* KPIs filtrés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total HT</p>
          <p className="text-xl font-bold text-white">{Math.round(totalHT).toLocaleString('fr-FR')} EUR</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Lignes factures</p>
          <p className="text-xl font-bold text-blue-400">{nbLignes}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">References uniques</p>
          <p className="text-xl font-bold text-amber-400">{nbRefs}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Prix moyen/ligne HT</p>
          <p className="text-xl font-bold text-green-400">{nbLignes > 0 ? (totalHT / nbLignes).toFixed(2) : '0'} EUR</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Annee :</span>
          <select value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}
            className="px-3 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
            <option value="tous">Toutes</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Fournisseur :</span>
          <select value={filtreFournisseur} onChange={e => setFiltreFournisseur(e.target.value)}
            className="px-3 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
            <option value="tous">Tous</option>
            {fournisseurs.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <button onClick={exportStats} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/20">
          <Download size={12} /> Exporter CSV
        </button>
      </div>

      {/* Sélecteur de vue */}
      <div className="flex gap-1 bg-[#181a20] border border-[#2a2d35] rounded-xl p-1">
        {vues.map(v => (
          <button key={v.id} onClick={() => setVueActive(v.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${vueActive === v.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Tableau + barres */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-4 py-3 w-[35%]">{vueActive === 'produit' ? 'Ref — Designation' : vueActive.charAt(0).toUpperCase() + vueActive.slice(1)}</th>
                <th className="text-left px-4 py-3 w-[30%]">Repartition</th>
                <th className="text-right px-4 py-3">Total HT</th>
                <th className="text-right px-4 py-3">% du total</th>
                <th className="text-center px-4 py-3">Lignes</th>
                <th className="text-center px-4 py-3">Refs</th>
              </tr>
            </thead>
            <tbody>
              {donnees.map((d, i) => {
                const pct = totalHT > 0 ? (d.totalHT / totalHT) * 100 : 0;
                return (
                  <tr key={`${d.label}-${i}`} className="border-b border-[#2a2d35]/50 hover:bg-[#1c1e24]">
                    <td className="px-4 py-2.5 text-white font-medium truncate max-w-[300px]">{d.label}</td>
                    <td className="px-4 py-2.5">
                      <div className="h-4 bg-[#252830] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600/60 rounded-full transition-all"
                          style={{ width: `${(d.totalHT / maxHT) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-white font-bold">{Math.round(d.totalHT).toLocaleString('fr-FR')} EUR</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{pct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-center text-gray-400">{d.nbLignes}</td>
                    <td className="px-4 py-2.5 text-center text-gray-400">{d.nbRefs}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#353840] bg-[#1c1e24]">
                <td className="px-4 py-3 text-white font-bold">TOTAL</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-white font-bold text-sm">{Math.round(totalHT).toLocaleString('fr-FR')} EUR HT</td>
                <td className="px-4 py-3 text-right text-white font-bold">100%</td>
                <td className="px-4 py-3 text-center text-white font-bold">{nbLignes}</td>
                <td className="px-4 py-3 text-center text-white font-bold">{nbRefs}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab Vitrage — Analyse production ─────────────────────────────────

function TabVitrage({ vitrages }: { vitrages: VitrageFacture[] }) {
  const [vue, setVue] = useState<'composition' | 'annee' | 'mois' | 'semaine' | 'dimensions'>('composition');
  const [filtreAnnee, setFiltreAnnee] = useState<string>('tous');

  const annees = [...new Set(vitrages.map(v => v.annee))].sort();
  const filtres = vitrages.filter(v => filtreAnnee === 'tous' || v.annee === filtreAnnee);

  // KPIs
  const totalSurfaceM2 = filtres.reduce((s, v) => s + v.surfaceTotaleM2, 0);
  const totalQte = filtres.reduce((s, v) => s + v.qte, 0);
  const totalHT = filtres.reduce((s, v) => s + v.totalHT, 0);
  const nbCompositions = new Set(filtres.map(v => v.composition.composition)).size;

  // Nombre de mois et semaines dans la période
  const moisUniques = new Set(filtres.map(v => v.mois)).size;
  const semainesUniques = new Set(filtres.map(v => v.semaine)).size;
  const moyenneMoisM2 = moisUniques > 0 ? totalSurfaceM2 / moisUniques : 0;
  const moyenneSemaineM2 = semainesUniques > 0 ? totalSurfaceM2 / semainesUniques : 0;
  const moyenneAnneeM2 = annees.length > 0 ? totalSurfaceM2 / annees.length : totalSurfaceM2;

  type Agg = { label: string; surfaceM2: number; qte: number; totalHT: number; nbLignes: number; details?: string };

  function agreger(keyFn: (v: VitrageFacture) => string, detailFn?: (v: VitrageFacture) => string): Agg[] {
    const map = new Map<string, { surfaceM2: number; qte: number; totalHT: number; nbLignes: number; details: Set<string> }>();
    for (const v of filtres) {
      const key = keyFn(v);
      const ex = map.get(key) ?? { surfaceM2: 0, qte: 0, totalHT: 0, nbLignes: 0, details: new Set<string>() };
      ex.surfaceM2 += v.surfaceTotaleM2;
      ex.qte += v.qte;
      ex.totalHT += v.totalHT;
      ex.nbLignes++;
      if (detailFn) ex.details.add(detailFn(v));
      map.set(key, ex);
    }
    return [...map.entries()].map(([label, v]) => ({
      label, surfaceM2: v.surfaceM2, qte: v.qte, totalHT: v.totalHT, nbLignes: v.nbLignes,
      details: v.details.size > 0 ? [...v.details].join(', ') : undefined,
    })).sort((a, b) => b.surfaceM2 - a.surfaceM2);
  }

  let donnees: Agg[] = [];
  switch (vue) {
    case 'composition':
      donnees = agreger(
        v => v.composition.composition || 'Inconnue',
        v => [v.composition.gaz, ...v.composition.caracteristiques].filter(Boolean).join(', ')
      );
      break;
    case 'annee':
      donnees = agreger(v => v.annee).sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'mois':
      donnees = agreger(v => v.mois).sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'semaine':
      donnees = agreger(v => v.semaine).sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'dimensions':
      donnees = agreger(v => `${v.largeurMM}x${v.hauteurMM}`);
      break;
  }

  const maxSurface = Math.max(...donnees.map(d => d.surfaceM2), 1);

  const exportCSVVitrage = () => {
    const h = ['Composition/Periode', 'Surface m2', 'Quantite', 'Total HT', 'Nb lignes', 'Details'];
    const rows = donnees.map(d => [d.label, d.surfaceM2.toFixed(2), d.qte, d.totalHT.toFixed(2), d.nbLignes, d.details ?? '']);
    const csv = '\uFEFF' + [h.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vitrage_${vue}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* KPIs production */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPI label="Surface totale" value={`${totalSurfaceM2.toFixed(1)} m\u00b2`} color="text-cyan-400" />
        <KPI label="Nb vitrages" value={totalQte} color="text-white" />
        <KPI label="Compositions" value={nbCompositions} color="text-amber-400" />
        <KPI label="Total HT" value={`${Math.round(totalHT).toLocaleString('fr-FR')} EUR`} color="text-green-400" />
        <KPI label="Moy/semaine" value={`${moyenneSemaineM2.toFixed(1)} m\u00b2`} color="text-blue-400" />
        <KPI label="Moy/mois" value={`${moyenneMoisM2.toFixed(1)} m\u00b2`} color="text-blue-400" />
        <KPI label="Moy/an" value={`${moyenneAnneeM2.toFixed(0)} m\u00b2`} color="text-blue-400" />
      </div>

      {/* Objectif production */}
      <div className="bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
        <h3 className="text-xs text-cyan-400 font-bold tracking-wider mb-2">OBJECTIF PRODUCTION INTERNE (95%)</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{(moyenneSemaineM2 * 0.95).toFixed(1)} m&sup2;</p>
            <p className="text-[10px] text-gray-500">par SEMAINE</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{(moyenneMoisM2 * 0.95).toFixed(0)} m&sup2;</p>
            <p className="text-[10px] text-gray-500">par MOIS</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{(moyenneAnneeM2 * 0.95).toFixed(0)} m&sup2;</p>
            <p className="text-[10px] text-gray-500">par AN</p>
          </div>
        </div>
      </div>

      {/* Filtres + sélecteur vue */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Annee :</span>
          <select value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}
            className="px-3 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
            <option value="tous">Toutes</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <button onClick={exportCSVVitrage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600/10 border border-green-500/30 text-green-400 rounded-lg">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 bg-[#181a20] border border-[#2a2d35] rounded-xl p-1">
        {([
          { id: 'composition' as const, label: 'Par composition' },
          { id: 'annee' as const, label: 'Par annee' },
          { id: 'mois' as const, label: 'Par mois' },
          { id: 'semaine' as const, label: 'Par semaine' },
          { id: 'dimensions' as const, label: 'Par dimension' },
        ]).map(v => (
          <button key={v.id} onClick={() => setVue(v.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${vue === v.id ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-4 py-3">{vue === 'composition' ? 'Composition' : vue === 'dimensions' ? 'Dimensions (mm)' : 'Periode'}</th>
                <th className="text-left px-4 py-3 w-[25%]">Repartition surface</th>
                <th className="text-right px-4 py-3">Surface m&sup2;</th>
                <th className="text-right px-4 py-3">% surface</th>
                <th className="text-center px-4 py-3">Quantite</th>
                <th className="text-right px-4 py-3">Total HT</th>
                {vue === 'composition' && <th className="text-left px-4 py-3">Details</th>}
              </tr>
            </thead>
            <tbody>
              {donnees.map((d, i) => {
                const pct = totalSurfaceM2 > 0 ? (d.surfaceM2 / totalSurfaceM2) * 100 : 0;
                return (
                  <tr key={`${d.label}-${i}`} className="border-b border-[#2a2d35]/50 hover:bg-[#1c1e24]">
                    <td className="px-4 py-2.5 text-white font-medium font-mono">{d.label}</td>
                    <td className="px-4 py-2.5">
                      <div className="h-4 bg-[#252830] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600/60 rounded-full" style={{ width: `${(d.surfaceM2 / maxSurface) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-cyan-400 font-bold">{d.surfaceM2.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{pct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-center text-white">{d.qte}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{Math.round(d.totalHT).toLocaleString('fr-FR')} EUR</td>
                    {vue === 'composition' && <td className="px-4 py-2.5 text-gray-500 text-[10px]">{d.details}</td>}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#353840] bg-[#1c1e24]">
                <td className="px-4 py-3 text-white font-bold">TOTAL</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-cyan-400 font-bold text-sm">{totalSurfaceM2.toFixed(2)} m&sup2;</td>
                <td className="px-4 py-3 text-right text-white font-bold">100%</td>
                <td className="px-4 py-3 text-center text-white font-bold">{totalQte}</td>
                <td className="px-4 py-3 text-right text-white font-bold">{Math.round(totalHT).toLocaleString('fr-FR')} EUR</td>
                {vue === 'composition' && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab A Vérifier — Lignes non identifiées ──────────────────────────

function TabAVerifier({ factures, onLearn, corrections }: {
  factures: Facture[];
  onLearn: (ref: string, categorie: string) => void;
  corrections: Record<string, string>;
}) {
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'a_verifier' | 'corrige'>('a_verifier');
  const [searchAV, setSearchAV] = useState('');

  // Flatten toutes les lignes avec catégorisation
  const toutesLignes = factures.flatMap(f =>
    f.lignes.map(l => {
      const result = categoriserArticle(l.ref, l.designation, f.fournisseur);
      const correctionManuelle = corrections[l.ref];
      return {
        ...l,
        fournisseur: f.fournisseur,
        dateFacture: f.dateFacture,
        numFacture: f.numFacture,
        categorieAuto: result.categorie,
        confiance: result.confiance,
        motif: result.motif,
        categorieCorrigee: correctionManuelle ?? null,
        estCorrige: !!correctionManuelle,
      };
    })
  );

  // Dédupliquer par ref (garder la première occurrence)
  const refsVues = new Set<string>();
  const lignesUniques = toutesLignes.filter(l => {
    if (refsVues.has(l.ref)) return false;
    refsVues.add(l.ref);
    return true;
  });

  // Filtrer
  const aVerifier = lignesUniques.filter(l => l.confiance === 'basse' || l.categorieAuto === 'DIVERS');
  const corrigees = lignesUniques.filter(l => l.estCorrige);
  const hauteConfiance = lignesUniques.filter(l => l.confiance === 'haute' && !l.estCorrige && l.categorieAuto !== 'DIVERS');

  let affichees = lignesUniques;
  if (filtreStatut === 'a_verifier') affichees = aVerifier.filter(l => !l.estCorrige);
  else if (filtreStatut === 'corrige') affichees = corrigees;

  if (searchAV) {
    const q = searchAV.toLowerCase();
    affichees = affichees.filter(l => l.ref.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q) || l.fournisseur.toLowerCase().includes(q));
  }

  const nbAVerifier = aVerifier.filter(l => !l.estCorrige).length;
  const nbCorrige = corrigees.length;
  const nbAuto = hauteConfiance.length;
  const totalRefs = lignesUniques.length;
  const pctAuto = totalRefs > 0 ? Math.round(((nbAuto + nbCorrige) / totalRefs) * 100) : 0;

  const allCats = CATEGORIES.map(c => c.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="References totales" value={totalRefs} color="text-white" />
        <KPI label="Identifiees auto" value={nbAuto} color="text-green-400" />
        <KPI label="Corrigees manuellement" value={nbCorrige} color="text-blue-400" />
        <KPI label="A verifier" value={nbAVerifier} color={nbAVerifier > 0 ? 'text-amber-400' : 'text-gray-400'} />
        <KPI label="Taux identification" value={`${pctAuto}%`} color={pctAuto >= 90 ? 'text-green-400' : pctAuto >= 70 ? 'text-amber-400' : 'text-red-400'} />
      </div>

      {/* Barre de progression */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">Progression identification</span>
          <span className="text-white font-bold">{nbAuto + nbCorrige} / {totalRefs} refs</span>
        </div>
        <div className="h-3 bg-[#252830] rounded-full overflow-hidden flex">
          <div className="h-full bg-green-600" style={{ width: `${totalRefs > 0 ? (nbAuto / totalRefs) * 100 : 0}%` }} title="Auto" />
          <div className="h-full bg-blue-600" style={{ width: `${totalRefs > 0 ? (nbCorrige / totalRefs) * 100 : 0}%` }} title="Corrige" />
          <div className="h-full bg-amber-600/50" style={{ width: `${totalRefs > 0 ? (nbAVerifier / totalRefs) * 100 : 0}%` }} title="A verifier" />
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-600" /> Auto ({nbAuto})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-600" /> Corrige ({nbCorrige})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-600" /> A verifier ({nbAVerifier})</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-[#181a20] border border-[#2a2d35] rounded-lg p-1">
          {[
            { id: 'a_verifier' as const, label: `A verifier (${nbAVerifier})`, color: 'amber' },
            { id: 'corrige' as const, label: `Corriges (${nbCorrige})`, color: 'blue' },
            { id: 'tous' as const, label: `Tous (${totalRefs})`, color: 'gray' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltreStatut(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all
                ${filtreStatut === f.id ? `bg-${f.color}-600/20 text-${f.color}-400 border border-${f.color}-500/40` : 'text-gray-500 border border-transparent'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={searchAV} onChange={e => setSearchAV(e.target.value)} placeholder="Chercher ref, designation..."
            className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-3 py-2.5">Ref</th>
                <th className="text-left px-3 py-2.5">Designation</th>
                <th className="text-left px-3 py-2.5">Fournisseur</th>
                <th className="text-left px-3 py-2.5">Categorie auto</th>
                <th className="text-center px-3 py-2.5">Confiance</th>
                <th className="text-left px-3 py-2.5">Correction</th>
                <th className="text-left px-3 py-2.5">Motif</th>
              </tr>
            </thead>
            <tbody>
              {affichees.slice(0, 100).map((l, i) => (
                <tr key={`${l.ref}-${i}`} className={`border-b border-[#2a2d35]/50 hover:bg-[#1c1e24]
                  ${l.estCorrige ? 'bg-blue-600/5' : l.confiance === 'basse' ? 'bg-amber-600/5' : ''}`}>
                  <td className="px-3 py-2 font-mono text-amber-400">{l.ref}</td>
                  <td className="px-3 py-2 text-white max-w-[250px] truncate">{l.designation}</td>
                  <td className="px-3 py-2 text-gray-400">{l.fournisseur}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border
                      ${l.categorieAuto === 'DIVERS' ? 'bg-gray-600/20 text-gray-400 border-gray-600/30' :
                        'bg-[#252830] text-gray-300 border-[#353840]'}`}>
                      {l.categorieAuto}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded
                      ${l.confiance === 'haute' ? 'text-green-400' : l.confiance === 'moyenne' ? 'text-amber-400' : 'text-red-400'}`}>
                      {l.confiance}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={l.categorieCorrigee ?? ''}
                      onChange={e => onLearn(l.ref, e.target.value)}
                      className={`bg-[#252830] border rounded px-2 py-1 text-[10px] outline-none
                        ${l.estCorrige ? 'border-blue-500/40 text-blue-400' : 'border-[#353840] text-gray-400'}`}>
                      <option value="">— Selectionner —</option>
                      {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-600 max-w-[200px] truncate">{l.motif}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {affichees.length > 100 && (
          <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-[#2a2d35]">
            Affichage limite a 100 lignes — {affichees.length - 100} lignes supplementaires
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab Inventaire obligatoire 31/07 ─────────────────────────────────

function TabInventaire({ articles, consolidated }: {
  articles: ArticleTerrain[];
  consolidated: RefConsolidee[];
}) {
  const [filtreZone, setFiltreZone] = useState<string>('tous');
  const [showNonValorise, setShowNonValorise] = useState(false);

  // Enrichir chaque article avec le dernier prix connu
  const articlesValorises = articles.map(a => {
    const refInfo = consolidated.find(c => c.ref === a.ref);
    const prixUnitaire = refInfo?.dernierPrixHT ?? 0;
    const valeur = a.qte * prixUnitaire;
    return { ...a, prixUnitaire, valeur, hasPrix: prixUnitaire > 0 };
  });

  const filtres = articlesValorises.filter(a => {
    if (filtreZone !== 'tous' && a.zone5S !== filtreZone) return false;
    if (showNonValorise && a.hasPrix) return false;
    return true;
  });

  // KPIs inventaire
  const totalArticles = filtres.length;
  const totalValeur = filtres.reduce((s, a) => s + a.valeur, 0);
  const nbValorises = filtres.filter(a => a.hasPrix).length;
  const nbNonValorises = filtres.filter(a => !a.hasPrix).length;
  const nbSansZone = filtres.filter(a => !a.zone5S).length;
  const nbSansOdoo = filtres.filter(a => !a.emplacementOdoo).length;
  const nbQteZero = filtres.filter(a => a.qte === 0).length;

  // Readiness check pour le 31/07
  const checks = [
    { label: 'Articles recenses', ok: totalArticles > 0, value: `${totalArticles}`, detail: totalArticles === 0 ? 'Aucun article' : 'OK' },
    { label: 'Tous valorises (prix connu)', ok: nbNonValorises === 0, value: `${nbValorises}/${totalArticles}`, detail: nbNonValorises > 0 ? `${nbNonValorises} sans prix` : 'OK' },
    { label: 'Tous avec zone 5S', ok: nbSansZone === 0, value: `${totalArticles - nbSansZone}/${totalArticles}`, detail: nbSansZone > 0 ? `${nbSansZone} sans zone` : 'OK' },
    { label: 'Tous avec emplacement Odoo', ok: nbSansOdoo === 0, value: `${totalArticles - nbSansOdoo}/${totalArticles}`, detail: nbSansOdoo > 0 ? `${nbSansOdoo} sans code` : 'OK' },
    { label: 'Aucune quantite a zero', ok: nbQteZero === 0, value: `${nbQteZero} a verifier`, detail: nbQteZero > 0 ? 'Recompter' : 'OK' },
  ];
  const readiness = checks.filter(c => c.ok).length;
  const readinessPct = Math.round((readiness / checks.length) * 100);

  // Valorisation par zone
  const parZone = ZONES_5S.map(z => {
    const arts = articlesValorises.filter(a => a.zone5S === z);
    return { zone: z, nb: arts.length, valeur: arts.reduce((s, a) => s + a.valeur, 0) };
  }).filter(z => z.nb > 0);

  // Valorisation par famille
  const parFamille = FAMILLES.map(f => {
    const arts = articlesValorises.filter(a => a.famille === f);
    return { famille: f, nb: arts.length, valeur: arts.reduce((s, a) => s + a.valeur, 0) };
  }).filter(f => f.nb > 0);

  // Export inventaire comptable
  const exportInventaire = () => {
    const h = ['Ref', 'Designation', 'Famille', 'Zone_5S', 'Emplacement_Odoo', 'Fournisseur', 'Qte', 'Unite', 'PU_HT', 'Valeur_HT', 'Statut'];
    const rows = articlesValorises.map(a => [a.ref, a.designation, a.famille, a.zone5S, a.emplacementOdoo, a.fournisseur, a.qte, a.unite, a.prixUnitaire.toFixed(2), a.valeur.toFixed(2), a.statut]);
    const totalRow = ['', '', '', '', '', 'TOTAL', '', '', '', totalValeur.toFixed(2), ''];
    const csv = '\uFEFF' + [h.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';')), totalRow.map(c => `"${c}"`).join(';')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventaire_31juillet_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Planning stage
  const semaines = [
    { sem: 'S18-19 (1-11 mai)', tache: 'Import factures + categorisation auto + correction manuelle', statut: 'A faire' },
    { sem: 'S20-21 (12-25 mai)', tache: 'Recensement physique Zone A (Visserie) + Zone B (Quincaillerie)', statut: 'A faire' },
    { sem: 'S22-23 (26 mai-8 juin)', tache: 'Recensement Zone C (Joints) + Zone D (Consommables) + Zone E (Accessoires)', statut: 'A faire' },
    { sem: 'S24-25 (9-22 juin)', tache: 'Decisions stock + seuils + emplacements Odoo + import Odoo', statut: 'A faire' },
    { sem: 'S26 (23-30 juin)', tache: 'Verification finale + corrections + export test', statut: 'A faire' },
    { sem: 'S30 (21-25 juil)', tache: 'Recomptage physique final pour inventaire 31/07', statut: 'A faire' },
    { sem: '31 juillet', tache: 'INVENTAIRE LEGAL — export comptable definitif', statut: 'A faire' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Readiness check */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Preparation inventaire 31 juillet</h3>
          <div className={`text-lg font-bold ${readinessPct === 100 ? 'text-green-400' : readinessPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {readinessPct}% pret
          </div>
        </div>
        <div className="space-y-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${c.ok ? 'bg-green-600 text-white' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'}`}>
                {c.ok ? '✓' : '!'}
              </span>
              <span className="text-xs text-gray-300 flex-1">{c.label}</span>
              <span className="text-xs text-gray-500">{c.value}</span>
              <span className={`text-[10px] ${c.ok ? 'text-green-400' : 'text-amber-400'}`}>{c.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs valorisation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Valeur stock totale HT" value={`${Math.round(totalValeur).toLocaleString('fr-FR')} EUR`} color="text-green-400" />
        <KPI label="Articles valorises" value={`${nbValorises}/${totalArticles}`} color={nbNonValorises === 0 ? 'text-green-400' : 'text-amber-400'} />
        <KPI label="Sans prix connu" value={nbNonValorises} color={nbNonValorises > 0 ? 'text-red-400' : 'text-gray-400'} />
        <KPI label="Quantite = 0" value={nbQteZero} color={nbQteZero > 0 ? 'text-amber-400' : 'text-gray-400'} />
      </div>

      {/* Valorisation par zone + famille */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Valorisation par zone 5S</h3>
          {parZone.map(z => (
            <div key={z.zone} className="flex items-center justify-between text-xs py-1.5 border-b border-[#2a2d35]/30">
              <span className="text-gray-300">{z.zone}</span>
              <div className="flex gap-4">
                <span className="text-gray-500">{z.nb} art.</span>
                <span className="text-white font-bold w-24 text-right">{Math.round(z.valeur).toLocaleString('fr-FR')} EUR</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Valorisation par famille</h3>
          {parFamille.map(f => (
            <div key={f.famille} className="flex items-center justify-between text-xs py-1.5 border-b border-[#2a2d35]/30">
              <span className="text-gray-300">{f.famille}</span>
              <div className="flex gap-4">
                <span className="text-gray-500">{f.nb} art.</span>
                <span className="text-white font-bold w-24 text-right">{Math.round(f.valeur).toLocaleString('fr-FR')} EUR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Planning stage */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Planning stage → inventaire</h3>
        <div className="space-y-2">
          {semaines.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${i === semaines.length - 1 ? 'bg-red-600/10 border border-red-500/20' : 'border border-[#2a2d35]/30'}`}>
              <span className="text-[10px] text-gray-500 w-36 shrink-0 font-mono">{s.sem}</span>
              <span className={`text-xs flex-1 ${i === semaines.length - 1 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{s.tache}</span>
              <span className="text-[10px] text-gray-600">{s.statut}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres + export */}
      <div className="flex items-center gap-3">
        <select value={filtreZone} onChange={e => setFiltreZone(e.target.value)}
          className="px-3 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
          <option value="tous">Toutes les zones</option>
          {ZONES_5S.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={showNonValorise} onChange={e => setShowNonValorise(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[#353840] bg-[#252830] text-blue-600" />
          Seulement non valorises
        </label>
        <div className="flex-1" />
        <button onClick={exportInventaire} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg">
          <Download size={14} /> Export inventaire comptable
        </button>
      </div>

      {/* Tableau inventaire */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-3 py-2.5">Ref</th>
                <th className="text-left px-3 py-2.5">Designation</th>
                <th className="text-left px-3 py-2.5">Famille</th>
                <th className="text-left px-3 py-2.5">Zone 5S</th>
                <th className="text-left px-3 py-2.5">Emplacement</th>
                <th className="text-center px-3 py-2.5">Qte</th>
                <th className="text-right px-3 py-2.5">PU HT</th>
                <th className="text-right px-3 py-2.5">Valeur HT</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map(a => (
                <tr key={a.id} className={`border-b border-[#2a2d35]/50 hover:bg-[#1c1e24] ${!a.hasPrix ? 'bg-red-600/5' : ''}`}>
                  <td className="px-3 py-2 font-mono text-amber-400">{a.ref}</td>
                  <td className="px-3 py-2 text-white truncate max-w-[200px]">{a.designation}</td>
                  <td className="px-3 py-2 text-gray-400">{a.famille}</td>
                  <td className="px-3 py-2 text-gray-400 text-[10px]">{a.zone5S || '—'}</td>
                  <td className="px-3 py-2 font-mono text-gray-400 text-[10px]">{a.emplacementOdoo || '—'}</td>
                  <td className="px-3 py-2 text-center text-white font-bold">{a.qte}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{a.hasPrix ? `${a.prixUnitaire.toFixed(2)} EUR` : <span className="text-red-400">?</span>}</td>
                  <td className="px-3 py-2 text-right font-bold text-white">{a.hasPrix ? `${a.valeur.toFixed(2)} EUR` : <span className="text-red-400">manquant</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#353840] bg-[#1c1e24]">
                <td colSpan={5} className="px-3 py-3 text-white font-bold">TOTAL INVENTAIRE</td>
                <td className="px-3 py-3 text-center text-white font-bold">{filtres.reduce((s, a) => s + a.qte, 0)}</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right text-green-400 font-bold text-sm">{Math.round(totalValeur).toLocaleString('fr-FR')} EUR HT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

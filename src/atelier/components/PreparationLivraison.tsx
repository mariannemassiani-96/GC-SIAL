import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Truck, Package, ScanBarcode, Check, MapPin, Phone, AlertTriangle, Pen } from 'lucide-react';
import { DEMO_TOURNEE, getOrdreChargement, getOrdreLivraison, getTotalPoids, getStatutTournee } from '../livraisonTypes';
import type { Tournee, CommandeClient, MenuiserieLivraison, SignatureLivraison } from '../livraisonTypes';

interface Props { onBack: () => void; }

type Ecran = 'tournees' | 'preparation' | 'chargement' | 'livraison' | 'signature';

const STORAGE_KEY = 'sial_livraisons';

function loadTournees(): Tournee[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [DEMO_TOURNEE]; } catch { return [DEMO_TOURNEE]; }
}
function saveTournees(t: Tournee[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

export function PreparationLivraison({ onBack }: Props) {
  const [tournees, setTournees] = useState<Tournee[]>(loadTournees);
  const [ecran, setEcran] = useState<Ecran>('tournees');
  const [tourneeActiveId, setTourneeActiveId] = useState<string | null>(null);
  const [commandeActiveId, setCommandeActiveId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureLivraison[]>([]);
  const [scanInput, setScanInput] = useState('');

  const tourneeActive = tournees.find(t => t.id === tourneeActiveId) ?? null;
  const commandeActive = tourneeActive?.commandes.find(c => c.id === commandeActiveId) ?? null;

  const persist = useCallback((next: Tournee[]) => { setTournees(next); saveTournees(next); }, []);

  const updateMenuiserieStatut = useCallback((tourneeId: string, menuiserieId: string, statut: MenuiserieLivraison['statut']) => {
    const next = tournees.map(t => t.id === tourneeId ? {
      ...t, commandes: t.commandes.map(c => ({
        ...c, menuiseries: c.menuiseries.map(m => m.id === menuiserieId ? { ...m, statut } : m)
      }))
    } : t);
    persist(next);
  }, [tournees, persist]);

  const scanBarcode = useCallback((barcode: string) => {
    if (!tourneeActive) return;
    for (const c of tourneeActive.commandes) {
      const m = c.menuiseries.find(m => m.barcode === barcode);
      if (m) {
        const newStatut = ecran === 'chargement' ? 'charge' as const : ecran === 'livraison' ? 'livre' as const : m.statut;
        updateMenuiserieStatut(tourneeActive.id, m.id, newStatut);
        return { found: true, menuiserie: m, commande: c };
      }
    }
    return { found: false };
  }, [tourneeActive, ecran, updateMenuiserieStatut]);

  const prepareAccessoire = useCallback((tourneeId: string, commandeId: string, menuiserieId: string, accIdx: number) => {
    const next = tournees.map(t => t.id === tourneeId ? {
      ...t, commandes: t.commandes.map(c => c.id === commandeId ? {
        ...c, menuiseries: c.menuiseries.map(m => m.id === menuiserieId ? {
          ...m, accessoires: m.accessoires.map((a, i) => i === accIdx ? { ...a, prepare: !a.prepare } : a)
        } : m)
      } : c)
    } : t);
    persist(next);
  }, [tournees, persist]);

  const ouvrirTournee = (id: string, ecranCible: Ecran) => {
    setTourneeActiveId(id);
    setEcran(ecranCible);
  };

  // ── ECRAN LISTE DES TOURNEES ───────────────────────
  if (ecran === 'tournees') {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <Header onBack={onBack} title="Preparation & Livraison" />
        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tournees de livraison</h2>
          </div>
          {tournees.map(t => {
            const stats = getStatutTournee(t);
            const poids = getTotalPoids(t);
            return (
              <div key={t.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.ref}</h3>
                    <p className="text-xs text-gray-500">{t.date} — {t.chauffeur} — {t.vehicule}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-medium
                    ${t.statut === 'terminee' ? 'bg-green-600/20 text-green-400 border-green-500/30' :
                      t.statut === 'en_cours' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                      'bg-amber-600/20 text-amber-400 border-amber-500/30'}`}>
                    {t.statut === 'terminee' ? 'Terminee' : t.statut === 'en_cours' ? 'En livraison' : t.statut === 'chargement' ? 'Chargement' : 'Preparation'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                  <Stat label="Clients" value={t.commandes.length} />
                  <Stat label="Menuiseries" value={stats.total} />
                  <Stat label="Poids" value={`${poids} kg`} />
                  <Stat label="Charges" value={`${stats.charges}/${stats.total}`} />
                </div>
                {/* Clients de la tournée */}
                <div className="space-y-2 mb-4">
                  {getOrdreLivraison(t).map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 text-xs py-1.5 border-t border-[#2a2d35]/30">
                      <span className="w-5 h-5 rounded-full bg-[#252830] flex items-center justify-center text-[10px] font-bold text-gray-400">{i + 1}</span>
                      <span className="text-white font-medium flex-1">{c.client}</span>
                      <span className="text-gray-500">{c.menuiseries.length} men.</span>
                      <span className="text-gray-600 truncate max-w-[200px]">{c.adresse}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => ouvrirTournee(t.id, 'preparation')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-600/20">
                    <Package size={14} /> Preparer
                  </button>
                  <button onClick={() => ouvrirTournee(t.id, 'chargement')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-600/20">
                    <ScanBarcode size={14} /> Charger
                  </button>
                  <button onClick={() => ouvrirTournee(t.id, 'livraison')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-600/20">
                    <Truck size={14} /> Livrer
                  </button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    );
  }

  // ── ECRAN PREPARATION ──────────────────────────────
  if (ecran === 'preparation' && tourneeActive) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <Header onBack={() => setEcran('tournees')} title={`Preparation — ${tourneeActive.ref}`} />
        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="bg-amber-600/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300">
            <strong>BON DE PREPARATION</strong> — Cochez chaque menuiserie et ses accessoires au fur et a mesure de la preparation.
          </div>

          {getOrdreLivraison(tourneeActive).map((cmd, cmdIdx) => (
            <div key={cmd.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#1c1e24] border-b border-[#2a2d35] flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">{cmdIdx + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{cmd.client}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {cmd.adresse}</p>
                </div>
                <span className="text-xs text-gray-500">{cmd.menuiseries.length} menuiseries</span>
              </div>
              <div className="p-3 space-y-2">
                {cmd.menuiseries.map(m => {
                  
                  const isPrepare = m.statut !== 'a_preparer';
                  return (
                    <div key={m.id} className={`border rounded-lg p-3 transition-all ${isPrepare ? 'border-green-500/30 bg-green-600/5' : 'border-[#2a2d35]'}`}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateMenuiserieStatut(tourneeActive.id, m.id, isPrepare ? 'a_preparer' : 'prepare')}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all
                            ${isPrepare ? 'bg-green-600 border-green-500' : 'border-[#404550] hover:border-green-500'}`}>
                          {isPrepare && <Check size={14} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{m.repere}</span>
                            <span className="text-xs text-gray-300">{m.type}</span>
                            <span className="text-[10px] text-gray-500">{m.dimensions}</span>
                            <span className="text-[10px] text-gray-600">{m.materiau} {m.couleur}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{m.local} — {m.poids_kg} kg — {m.vitrage}</p>
                        </div>
                        <span className="font-mono text-[9px] text-gray-600">{m.barcode.slice(-6)}</span>
                      </div>
                      {/* Accessoires */}
                      {m.accessoires.length > 0 && (
                        <div className="mt-2 ml-9 space-y-1">
                          {m.accessoires.map((a, ai) => (
                            <button key={ai} onClick={() => prepareAccessoire(tourneeActive.id, cmd.id, m.id, ai)}
                              className={`w-full flex items-center gap-2 text-[10px] py-1 px-2 rounded transition-all
                                ${a.prepare ? 'text-green-400 line-through opacity-50' : 'text-gray-400 hover:bg-[#252830]'}`}>
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center
                                ${a.prepare ? 'bg-green-600 border-green-500' : 'border-[#404550]'}`}>
                                {a.prepare && <Check size={8} className="text-white" />}
                              </span>
                              <span className="font-mono">{a.ref}</span>
                              <span className="flex-1">{a.designation}</span>
                              <span>x{a.qte}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {cmd.notes && (
                <div className="px-4 py-2 bg-amber-600/5 border-t border-[#2a2d35] text-[10px] text-amber-400">
                  <AlertTriangle size={10} className="inline mr-1" /> {cmd.notes}
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setEcran('chargement')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm">
            Passer au chargement →
          </button>
        </main>
      </div>
    );
  }

  // ── ECRAN CHARGEMENT (scan code-barres) ────────────
  if (ecran === 'chargement' && tourneeActive) {
    const ordreChargement = getOrdreChargement(tourneeActive);
    const stats = getStatutTournee(tourneeActive);
    const toutCharge = stats.charges === stats.total;

    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <Header onBack={() => setEcran('tournees')} title={`Chargement — ${tourneeActive.ref}`} />
        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          {/* Barre scan */}
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-xs text-blue-300 mb-2"><strong>CHARGEMENT CAMION</strong> — Scannez chaque menuiserie dans l'ordre ci-dessous (dernier livre = premier charge)</p>
            <div className="flex gap-2">
              <input value={scanInput} onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && scanInput.length >= 6) { scanBarcode(scanInput.trim()); setScanInput(''); } }}
                placeholder="Scanner ou saisir le code-barres..."
                autoFocus
                className="flex-1 px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-blue-500" />
              <button onClick={() => { if (scanInput.length >= 6) { scanBarcode(scanInput.trim()); setScanInput(''); } }}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                <ScanBarcode size={16} />
              </button>
            </div>
          </div>

          {/* Progression */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-[#252830] rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${stats.total > 0 ? (stats.charges / stats.total) * 100 : 0}%` }} />
            </div>
            <span className="text-sm font-bold text-white">{stats.charges}/{stats.total}</span>
          </div>

          {/* Liste par ordre de chargement (dernier livré en premier) */}
          {ordreChargement.map((cmd, i) => (
            <div key={cmd.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#1c1e24] border-b border-[#2a2d35] flex items-center gap-2">
                <span className="text-[10px] text-gray-500">CHARGER {i + 1}e</span>
                <span className="text-xs font-bold text-white flex-1">{cmd.client}</span>
                <span className="text-[10px] text-gray-600">(livre en {cmd.priorite}e)</span>
              </div>
              <div className="p-2 space-y-1">
                {cmd.menuiseries.map(m => (
                  <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                    ${m.statut === 'charge' ? 'bg-blue-600/10 border border-blue-500/20' : 'border border-transparent'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${m.statut === 'charge' ? 'bg-blue-600 text-white' : 'bg-[#252830] text-gray-500'}`}>
                      {m.statut === 'charge' ? <Check size={12} /> : '?'}
                    </span>
                    <span className="text-xs font-bold text-white w-12">{m.repere}</span>
                    <span className="text-xs text-gray-300 flex-1">{m.type} {m.dimensions}</span>
                    <span className="text-[10px] text-gray-500">{m.poids_kg} kg</span>
                    <span className="font-mono text-[9px] text-gray-600">{m.barcode.slice(-8)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {toutCharge && (
            <button onClick={() => { setEcran('livraison'); persist(tournees.map(t => t.id === tourneeActive.id ? { ...t, statut: 'en_cours' as const } : t)); }}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm">
              Tout est charge — Demarrer la livraison →
            </button>
          )}
        </main>
      </div>
    );
  }

  // ── ECRAN LIVRAISON (par client) ───────────────────
  if (ecran === 'livraison' && tourneeActive) {
    const ordreLivraison = getOrdreLivraison(tourneeActive);
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <Header onBack={() => setEcran('tournees')} title={`Livraison — ${tourneeActive.ref}`} />
        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          {/* Scan déchargement */}
          <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-xs text-green-300 mb-2"><strong>LIVRAISON</strong> — Scannez chaque menuiserie en la dechargant chez le client</p>
            <div className="flex gap-2">
              <input value={scanInput} onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && scanInput.length >= 6) { scanBarcode(scanInput.trim()); setScanInput(''); } }}
                placeholder="Scanner le code-barres..."
                autoFocus
                className="flex-1 px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-green-500" />
            </div>
          </div>

          {ordreLivraison.map((cmd, i) => {
            const nbLivre = cmd.menuiseries.filter(m => m.statut === 'livre').length;
            const toutLivre = nbLivre === cmd.menuiseries.length;
            const sig = signatures.find(s => s.commandeId === cmd.id);
            return (
              <div key={cmd.id} className={`bg-[#181a20] border rounded-xl overflow-hidden ${toutLivre ? 'border-green-500/30' : 'border-[#2a2d35]'}`}>
                <div className="px-4 py-3 bg-[#1c1e24] border-b border-[#2a2d35]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-bold text-white">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{cmd.client}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-2">
                        <MapPin size={10} /> {cmd.adresse}
                        <a className="text-blue-400 flex items-center gap-0.5"><Phone size={10} /> {cmd.telephone}</a>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-white">{nbLivre}/{cmd.menuiseries.length}</span>
                  </div>
                </div>

                <div className="p-2 space-y-1">
                  {cmd.menuiseries.map(m => (
                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg
                      ${m.statut === 'livre' ? 'bg-green-600/10' : ''}`}>
                      <span className={`w-4 h-4 rounded-full ${m.statut === 'livre' ? 'bg-green-600' : 'bg-[#252830]'}`} />
                      <span className="text-xs font-bold text-white w-12">{m.repere}</span>
                      <span className="text-xs text-gray-300 flex-1">{m.type} {m.dimensions}</span>
                      <span className="text-[10px] text-gray-500">{m.local}</span>
                    </div>
                  ))}
                </div>

                {/* Bouton signature quand tout est livré */}
                {toutLivre && !sig && (
                  <div className="px-4 py-3 border-t border-[#2a2d35]">
                    <button onClick={() => { setCommandeActiveId(cmd.id); setEcran('signature'); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold">
                      <Pen size={14} /> Faire signer le client
                    </button>
                  </div>
                )}
                {sig && (
                  <div className="px-4 py-2 bg-green-600/10 border-t border-green-500/20 text-[10px] text-green-400 flex items-center gap-2">
                    <Check size={12} /> Signe le {sig.dateSignature} {sig.reserves && `— Reserves : ${sig.reserves}`}
                  </div>
                )}
                {cmd.notes && (
                  <div className="px-4 py-2 bg-amber-600/5 border-t border-[#2a2d35] text-[10px] text-amber-400">
                    <AlertTriangle size={10} className="inline mr-1" /> {cmd.notes}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>
    );
  }

  // ── ECRAN SIGNATURE CLIENT ─────────────────────────
  if (ecran === 'signature' && commandeActive) {
    return <SignatureScreen commande={commandeActive} onBack={() => setEcran('livraison')}
      onSave={(sig) => { setSignatures([...signatures, sig]); setEcran('livraison'); }} />;
  }

  return null;
}

// ── Écran Signature ──────────────────────────────────────────────────

function SignatureScreen({ commande, onBack, onSave }: {
  commande: CommandeClient;
  onBack: () => void;
  onSave: (sig: SignatureLivraison) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [reserves, setReserves] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? '';
    onSave({
      commandeId: commande.id,
      signatureDataUrl: dataUrl,
      dateSignature: new Date().toISOString().slice(0, 16).replace('T', ' '),
      reserves,
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <Header onBack={onBack} title="Bon de livraison — Signature" />
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        {/* En-tête BL */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">BON DE LIVRAISON</h2>
            <span className="text-xs text-gray-500">{commande.ref}</span>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-gray-300"><strong className="text-white">Client :</strong> {commande.client}</p>
            <p className="text-gray-300"><strong className="text-white">Adresse :</strong> {commande.adresse}</p>
            <p className="text-gray-300"><strong className="text-white">Date :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {/* Liste menuiseries livrées */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d35] text-gray-500">
                <th className="text-left px-3 py-2">Rep.</th>
                <th className="text-left px-3 py-2">Designation</th>
                <th className="text-left px-3 py-2">Dimensions</th>
                <th className="text-center px-3 py-2">Qte</th>
              </tr>
            </thead>
            <tbody>
              {commande.menuiseries.map(m => (
                <tr key={m.id} className="border-b border-[#2a2d35]/50">
                  <td className="px-3 py-2 font-bold text-white">{m.repere}</td>
                  <td className="px-3 py-2 text-gray-300">{m.type} {m.materiau} {m.couleur}</td>
                  <td className="px-3 py-2 text-gray-400">{m.dimensions}</td>
                  <td className="px-3 py-2 text-center text-white">1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Réserves */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reserves eventuelles</label>
          <textarea value={reserves} onChange={e => setReserves(e.target.value)}
            placeholder="Aucune reserve / Decrire les reserves..."
            className="w-full h-20 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white resize-none outline-none focus:border-green-500 placeholder-gray-600" />
        </div>

        {/* Zone signature */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">Signature du client</label>
            <button onClick={clearCanvas} className="text-[10px] text-gray-500 hover:text-white">Effacer</button>
          </div>
          <canvas ref={canvasRef}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            className="w-full h-40 border-2 border-[#353840] rounded-xl bg-white cursor-crosshair touch-none" />
        </div>

        {/* Validation */}
        <button onClick={saveSignature}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm">
          Valider la livraison
        </button>
      </main>
    </div>
  );
}

// ── Composants utilitaires ───────────────────────────────────────────

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 flex items-center gap-3 shrink-0">
      <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
      <h1 className="text-sm font-bold text-white flex-1">{title}</h1>
      <Truck size={16} className="text-gray-500" />
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#252830] rounded-lg p-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, UserPlus, Shield, Users } from 'lucide-react';
import { listUsers, createUser, updateUser, type UserFull } from './api';
import { useAuth } from './AuthContext';

interface Props { onBack: () => void; }

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: 'text-red-400 bg-red-600/20 border-red-500/30' },
  { value: 'chef_atelier', label: 'Chef atelier', color: 'text-amber-400 bg-amber-600/20 border-amber-500/30' },
  { value: 'operateur', label: 'Operateur', color: 'text-blue-400 bg-blue-600/20 border-blue-500/30' },
  { value: 'stagiaire', label: 'Stagiaire', color: 'text-gray-400 bg-gray-600/20 border-gray-500/30' },
];

const ALL_APPS = [
  { id: 'vitrage', label: 'ISULA VITRAGE' },
  { id: 'reception_matiere', label: 'Reception Matiere' },
  { id: 'poste_coupe', label: 'Preparation & Coupe Profiles' },
  { id: 'gc', label: 'Configurateur GC' },
  { id: 'smart_assembly', label: 'Smart Assembly' },
  { id: 'stock_accessoires', label: 'Stock & Accessoires' },
  { id: 'preparation_livraison', label: 'Preparation & Livraison' },
  { id: 'workshop_layout', label: 'Plan Atelier' },
  { id: 'maintenance_qualite', label: 'Maintenance & Qualite' },
  { id: 'dashboard_global', label: 'Tableau de Bord' },
];

function getRoleStyle(role: string) {
  return ROLES.find(r => r.value === role)?.color ?? 'text-gray-400 bg-gray-600/20 border-gray-500/30';
}

export function AdminPanel({ onBack }: Props) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [formNom, setFormNom] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('operateur');
  const [formApps, setFormApps] = useState<string[]>([...ALL_APPS.map(a => a.id)]);
  const [formPin, setFormPin] = useState('');
  const [formPinEnabled, setFormPinEnabled] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listUsers();
      setUsers(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (u: UserFull) => {
    setEditingId(u.id);
    setFormNom(u.nom);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormApps(u.apps_autorisees ?? [...ALL_APPS.map(a => a.id)]);
    setFormPin((u as unknown as Record<string, unknown>).pin as string || '');
    setFormPinEnabled(!!(u as unknown as Record<string, unknown>).pin_enabled);
    setFormPassword('');
    setShowNew(false);
  };

  const startNew = () => {
    setShowNew(true);
    setEditingId(null);
    setFormNom('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('operateur');
    setFormApps([...ALL_APPS.map(a => a.id)]);
  };

  const toggleApp = (appId: string) => {
    setFormApps(prev => prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]);
  };

  const selectAllApps = () => setFormApps([...ALL_APPS.map(a => a.id)]);
  const clearAllApps = () => setFormApps([]);

  const handleSaveNew = async () => {
    if (!formNom) { setError('Nom requis'); return; }
    if (!formPinEnabled && (!formEmail || !formPassword)) { setError('Email + mot de passe requis (ou activer PIN)'); return; }
    setSaving(true);
    setError(null);
    try {
      await createUser({ email: formEmail, password: formPassword, nom: formNom, role: formRole, apps_autorisees: formApps, pin: formPin, pin_enabled: formPinEnabled });
      setShowNew(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur creation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const updates: Parameters<typeof updateUser>[1] = { nom: formNom, role: formRole, apps_autorisees: formApps, pin: formPin, pin_enabled: formPinEnabled };
      if (formPassword) updates.password = formPassword;
      await updateUser(editingId, updates);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur mise a jour');
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = async (u: UserFull) => {
    if (u.id === currentUser?.id) return;
    try {
      await updateUser(u.id, { actif: !u.actif });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const isEditing = editingId !== null || showNew;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors"><ArrowLeft size={18} /></button>
          <Shield size={18} className="text-red-400" />
          <h1 className="text-sm font-bold text-white">Administration — Utilisateurs</h1>
          <div className="flex-1" />
          <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <UserPlus size={14} /> Nouvel utilisateur
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Chargement...</p>
        ) : (
          <>
            {/* User form (new or edit) */}
            {isEditing && (
              <div className="bg-[#181a20] border border-green-500/30 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-green-400">{showNew ? 'Nouvel utilisateur' : `Modifier : ${formNom}`}</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nom</label>
                    <input value={formNom} onChange={e => setFormNom(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} disabled={!showNew} className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-green-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{showNew ? 'Mot de passe' : 'Nouveau mot de passe (vide = inchange)'}</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white pr-10 focus:outline-none focus:border-green-500/50" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Role</label>
                    <select value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50">
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={formPinEnabled} onChange={e => setFormPinEnabled(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-gray-300">Connexion par PIN (atelier)</span>
                  </label>
                  {formPinEnabled && (
                    <input value={formPin} onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setFormPin(e.target.value); }}
                      placeholder="Code PIN 4 chiffres" maxLength={4}
                      className="w-32 bg-[#181a20] border border-[#2a2d35] rounded px-3 py-1.5 text-sm text-white text-center tracking-[0.5em] font-mono focus:border-orange-500 outline-none" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-xs text-gray-400">Applications autorisees</label>
                    <button onClick={selectAllApps} className="text-[10px] text-green-400 hover:underline">Tout</button>
                    <button onClick={clearAllApps} className="text-[10px] text-red-400 hover:underline">Aucun</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ALL_APPS.map(app => (
                      <button
                        key={app.id}
                        onClick={() => toggleApp(app.id)}
                        className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                          formApps.includes(app.id)
                            ? 'bg-green-600/20 border-green-500/40 text-green-400'
                            : 'bg-[#0f1117] border-[#2a2d35] text-gray-500'
                        }`}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={showNew ? handleSaveNew : handleSaveEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-xs font-semibold rounded-lg transition-colors">
                    <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button onClick={() => { setEditingId(null); setShowNew(false); }} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">Annuler</button>
                </div>
              </div>
            )}

            {/* Users list */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500 text-xs px-1">
                <Users size={14} /> {users.length} utilisateur{users.length > 1 ? 's' : ''}
              </div>
              {users.map(u => (
                <div key={u.id} className={`bg-[#181a20] border rounded-xl p-4 transition-colors ${u.actif ? 'border-[#2a2d35]' : 'border-red-500/20 opacity-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{u.nom}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getRoleStyle(u.role)}`}>
                          {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                        </span>
                        {!u.actif && <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">Desactive</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      {u.apps_autorisees && u.apps_autorisees.length > 0 && u.apps_autorisees.length < ALL_APPS.length && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {u.apps_autorisees.map(appId => {
                            const app = ALL_APPS.find(a => a.id === appId);
                            return app ? <span key={appId} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f1117] text-gray-500 border border-[#2a2d35]">{app.label}</span> : null;
                          })}
                        </div>
                      )}
                      {(!u.apps_autorisees || u.apps_autorisees.length === 0) && (
                        <p className="text-[10px] text-red-400 mt-1">Aucune app autorisee</p>
                      )}
                      {u.apps_autorisees && u.apps_autorisees.length === ALL_APPS.length && (
                        <p className="text-[10px] text-green-400/60 mt-1">Toutes les apps</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(u)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2d35] rounded-lg hover:border-green-500/40 transition-colors">Modifier</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => toggleActif(u)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${u.actif ? 'text-red-400 border-red-500/30 hover:bg-red-600/10' : 'text-green-400 border-green-500/30 hover:bg-green-600/10'}`}>
                          {u.actif ? 'Desactiver' : 'Reactiver'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

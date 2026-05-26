import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Mail, KeyRound, Delete } from 'lucide-react';
import { login as apiLogin, loginPin as apiLoginPin, logout as apiLogout, getStoredUser, fetchMe, type User } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginPin: (nom: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await apiLogin(email, password);
      setUser(u);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginPin = useCallback(async (nom: string, pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await apiLoginPin(nom, pin);
      setUser(u);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  // Vérifier le token au montage
  useEffect(() => {
    if (user) {
      fetchMe().then(setUser).catch(() => {
        apiLogout();
        setUser(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────

type Mode = 'email' | 'pin';

export function LoginScreen() {
  const { login, loginPin, loading, error } = useAuth();
  const [mode, setMode] = useState<Mode>(() => {
    return (localStorage.getItem('sial_last_login_mode') as Mode) || 'email';
  });

  useEffect(() => {
    localStorage.setItem('sial_last_login_mode', mode);
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">SIAL Fabrication</h1>
          <p className="text-sm text-gray-500 mt-1">Connexion à l'espace atelier</p>
        </div>

        <div className="flex bg-[#1c1e24] border border-[#2a2d35] rounded-lg p-0.5 mb-4">
          <button onClick={() => setMode('email')}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'email' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            <Mail size={13} /> Email
          </button>
          <button onClick={() => setMode('pin')}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'pin' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            <KeyRound size={13} /> Prénom + PIN
          </button>
        </div>

        {mode === 'email'
          ? <EmailForm onLogin={login} loading={loading} error={error} />
          : <PinForm onLogin={loginPin} loading={loading} error={error} />}

        <p className="text-center text-xs text-gray-600 mt-4">
          Groupe VISTA — Apertura di Corsica
        </p>
      </div>
    </div>
  );
}

// ── Formulaire Email ─────────────────────────────────────────────────

function EmailForm({ onLogin, loading, error }: { onLogin: (email: string, password: string) => Promise<void>; loading: boolean; error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await onLogin(email, password); } catch { /* error in context */ }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
          className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
          placeholder="prenom@sial.fr" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
          placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium py-2 rounded-lg transition-colors text-sm">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}

// ── Formulaire PIN (prénom + numpad tactile) ─────────────────────────

function PinForm({ onLogin, loading, error }: { onLogin: (nom: string, pin: string) => Promise<void>; loading: boolean; error: string | null }) {
  const [nom, setNom] = useState(() => localStorage.getItem('sial_last_pin_nom') ?? '');
  const [pin, setPin] = useState('');

  const submit = useCallback(async (currentNom: string, currentPin: string) => {
    if (!currentNom.trim() || currentPin.length !== 4) return;
    localStorage.setItem('sial_last_pin_nom', currentNom.trim());
    try { await onLogin(currentNom.trim(), currentPin); }
    catch { setPin(''); /* clear pin for retry */ }
  }, [onLogin]);

  const pressDigit = (d: string) => {
    setPin(p => {
      if (p.length >= 4) return p;
      const next = p + d;
      if (next.length === 4) {
        // Validation auto à 4 chiffres
        setTimeout(() => submit(nom, next), 80);
      }
      return next;
    });
  };

  const pressDelete = () => setPin(p => p.slice(0, -1));
  const pressClear = () => setPin('');

  return (
    <form onSubmit={e => { e.preventDefault(); submit(nom, pin); }}
      className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Prénom</label>
        <input value={nom} onChange={e => setNom(e.target.value)} required autoFocus
          className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
          placeholder="Ex : Jean" autoComplete="off" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Code PIN</label>
        <div className="flex justify-center gap-2 mb-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className={`w-12 h-14 flex items-center justify-center text-xl font-mono font-bold rounded-lg border-2 ${
                pin.length > i ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-[#2a2d35] bg-[#0f1117] text-gray-600'
              }`}>
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button key={d} type="button" onClick={() => pressDigit(d)} disabled={loading || pin.length >= 4}
              className="h-14 bg-[#0f1117] hover:bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xl font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {d}
            </button>
          ))}
          <button type="button" onClick={pressClear} disabled={loading || pin.length === 0}
            className="h-14 bg-[#0f1117] hover:bg-red-500/10 border border-[#2a2d35] hover:border-red-500/40 rounded-lg text-xs text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Effacer
          </button>
          <button type="button" onClick={() => pressDigit('0')} disabled={loading || pin.length >= 4}
            className="h-14 bg-[#0f1117] hover:bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xl font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            0
          </button>
          <button type="button" onClick={pressDelete} disabled={loading || pin.length === 0}
            className="h-14 bg-[#0f1117] hover:bg-[#1c1e24] border border-[#2a2d35] rounded-lg flex items-center justify-center text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Delete size={18} />
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading || !nom.trim() || pin.length !== 4}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/30 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors text-sm">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}

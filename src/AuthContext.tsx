import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { login as apiLogin, loginPin as apiLoginPin, fetchPinUsers, logout as apiLogout, getStoredUser, fetchMe, type User } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (nom: string, pin: string) => Promise<void>;
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
      setUser(await apiLogin(email, password));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPin = useCallback(async (nom: string, pin: string) => {
    setLoading(true);
    setError(null);
    try {
      setUser(await apiLoginPin(nom, pin));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prenom ou PIN incorrect');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    if (user) {
      fetchMe().then(setUser).catch(() => { apiLogout(); setUser(null); });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginWithPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────

export function LoginScreen() {
  const { login, loginWithPin, loading, error } = useAuth();
  const [mode, setMode] = useState<'email' | 'pin'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinUsers, setPinUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchPinUsers().then(setPinUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      loginWithPin(selectedUser, pin).catch(() => setPin(''));
    }
  }, [pin, selectedUser, loginWithPin]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(email, password); } catch {}
  };

  const addDigit = (d: string) => { if (pin.length < 4) setPin(pin + d); };
  const backspace = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white">SIAL</h1>
          <p className="text-sm text-gray-500 mt-1">Groupe VISTA — Apertura di Corsica</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-[#181a20] rounded-xl border border-[#2a2d35] overflow-hidden">
          <button onClick={() => setMode('pin')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'pin' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}>
            ATELIER (Prenom + PIN)
          </button>
          <button onClick={() => setMode('email')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'email' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
            BUREAU (Email)
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {mode === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                placeholder="prenom@sial.fr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6">
            {/* User selection */}
            {!selectedUser ? (
              <div>
                <p className="text-sm text-gray-400 mb-3">Qui etes-vous ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {pinUsers.map(name => (
                    <button key={name} onClick={() => setSelectedUser(name)}
                      className="p-4 bg-[#0f1117] border border-[#2a2d35] rounded-xl text-white text-lg font-bold hover:border-orange-500 transition-colors active:scale-95">
                      {name}
                    </button>
                  ))}
                </div>
                {pinUsers.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-8">Aucun operateur avec PIN active.<br/>Demandez a l'admin d'activer le PIN.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => { setSelectedUser(''); setPin(''); }}
                    className="text-gray-500 hover:text-white text-sm">← Changer</button>
                  <span className="text-xl font-bold text-orange-400">{selectedUser}</span>
                </div>

                {/* PIN display */}
                <div className="flex justify-center gap-3 mb-6">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black ${
                      i < pin.length ? 'border-orange-500 bg-orange-500/20 text-orange-400' : 'border-gray-700 text-gray-700'}`}>
                      {i < pin.length ? '●' : ''}
                    </div>
                  ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9','','0','←'].map(d => (
                    d === '' ? <div key="empty" /> :
                    <button key={d} onClick={() => d === '←' ? backspace() : addDigit(d)}
                      className={`py-4 rounded-xl text-2xl font-bold transition-colors active:scale-95 ${
                        d === '←' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-[#0f1117] border border-[#2a2d35] text-white hover:bg-gray-800'}`}>
                      {d}
                    </button>
                  ))}
                </div>

                {loading && <p className="text-orange-400 text-center mt-4 animate-pulse">Connexion...</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      const apiError = err.response?.data;
      let msg = apiError?.error_description || err.message || 'Neznámá chyba.';
      
      if (apiError?.error === 'invalid_grant' || msg.includes('login nebo heslo')) {
        msg = 'Nesprávné přihlašovací jméno nebo heslo.';
      } else if (msg.includes('client_id')) {
        msg = 'Chyba serveru (neplatné client_id). Prosím obnovte celou stránku (např. F5).';
      } else if (err.response?.status === 502) {
        msg = 'Proxy Error: Nepodařilo se připojit k serveru Bakalářů. ' + (err.response.data?.message || '');
      } else if (err.response?.status >= 500) {
        msg = `Interní chyba serveru Bakalářů (kód ${err.response.status}). Body: ${JSON.stringify(err.response.data)}`;
      } else if (apiError) {
        msg = `Chyba API: ${typeof apiError === 'object' ? JSON.stringify(apiError) : apiError}`;
      } else if (err.message) {
        msg = `Síťová chyba: ${err.message}`;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm px-6 relative z-10"
      >
        <div className="glass-card p-8 space-y-8">
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2"
            >
              <LogIn size={24} />
            </motion.div>
            <h1 className="text-xl font-semibold tracking-tight text-[#fafafa]">Bakaláři Redesign</h1>
            <p className="text-[#71717a] text-xs">SPŠD Motol • Student Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start gap-3"
                >
                  <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-rose-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[#71717a] uppercase tracking-widest pl-1">
                  Uživatelské jméno
                </label>
                <div className="relative group">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="glass-input w-full pl-10 h-10 text-xs"
                    placeholder="student.jmeno"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[#71717a] uppercase tracking-widest pl-1">
                  Heslo
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-input w-full pl-10 h-10 text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Přihlásit se
                  <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-[10px] text-[#71717a] italic">
              Váš školní účet je spravován automaticky. Problémy s přihlášením řešte s IT oddělením školy.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Lock, Loader2, AlertCircle, Globe } from 'lucide-react';

// Normalize school URL: strip trailing slash, ensure https://
const normalizeUrl = (raw: string): string => {
  let url = raw.trim().replace(/\/+$/, '');
  if (url && !url.startsWith('http')) url = 'https://' + url;
  return url;
};

export default function Login() {
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [schoolUrl, setSchoolUrl] = useState(() => localStorage.getItem('bakalari_school_url') || '');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate + save school URL before attempting login
    const normalized = normalizeUrl(schoolUrl);
    if (!normalized) { setError('Zadej URL Bakalářů své školy.'); return; }
    localStorage.setItem('bakalari_school_url', normalized);

    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      const apiError = err.response?.data;
      let msg = apiError?.error_description || err.message || 'Neznámá chyba.';
      if (apiError?.error === 'invalid_grant' || msg.includes('login nebo heslo')) {
        msg = 'Nesprávné přihlašovací jméno nebo heslo.';
      } else if (err.response?.status === 502) {
        msg = 'Nepodařilo se připojit k serveru školy. Zkontroluj URL Bakalářů.';
      } else if (err.response?.status >= 500) {
        msg = `Chyba serveru (${err.response.status}). Zkontroluj URL Bakalářů.`;
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
        <div className="glass-card p-8 space-y-7">
          <div className="text-center space-y-2">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2">
              <LogIn size={24} />
            </motion.div>
            <h1 className="text-xl font-semibold tracking-tight text-[#fafafa]">Bakaláři Redesign</h1>
            <p className="text-[#71717a] text-xs">Funguje s jakoukoli školou používající Bakaláře</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-rose-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* School URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[#71717a] uppercase tracking-widest pl-1">
                  URL Bakalářů školy
                </label>
                <div className="relative group">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
                  <input type="text" value={schoolUrl} onChange={e => setSchoolUrl(e.target.value)} required
                    className="glass-input w-full pl-10 h-10 text-xs"
                    placeholder="https://moje-skola.bakalari.cz" />
                </div>
                <p className="text-[9px] text-[#52525b] pl-1">Najdeš v prohlížeči, když se přihlašuješ přes web školy</p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[#71717a] uppercase tracking-widest pl-1">
                  Uživatelské jméno
                </label>
                <div className="relative group">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                    className="glass-input w-full pl-10 h-10 text-xs" placeholder="student.jmeno" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[#71717a] uppercase tracking-widest pl-1">
                  Heslo
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="glass-input w-full pl-10 h-10 text-xs" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : (
                <>Přihlásit se<LogIn size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#52525b] italic">
            Přihlašovací údaje jsou stejné jako v oficiální aplikaci Bakaláři.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

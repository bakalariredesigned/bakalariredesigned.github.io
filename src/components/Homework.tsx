import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Clock, AlertCircle, MoreVertical, Filter, X, Calendar, Loader, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Homework {
  ID: string; Content: string; DateEnd: string; Done: boolean;
  Subject: { Name: string; Abbrev: string }; Teacher?: { Name: string };
  personal?: boolean;
}

const STORAGE_DONE = 'bakDone';
const STORAGE_PERSONAL = 'bakPersonal';

const getDoneIds  = (): Set<string> => new Set(JSON.parse(localStorage.getItem(STORAGE_DONE) || '[]'));
const saveDoneIds = (s: Set<string>) => localStorage.setItem(STORAGE_DONE, JSON.stringify([...s]));
const getPersonal = (): Homework[] => JSON.parse(localStorage.getItem(STORAGE_PERSONAL) || '[]');
const savePersonal = (arr: Homework[]) => localStorage.setItem(STORAGE_PERSONAL, JSON.stringify(arr));

export default function Homework() {
  const [apiTasks,  setApiTasks]  = useState<Homework[]>([]);
  const [doneIds,   setDoneIds]   = useState<Set<string>>(getDoneIds);
  const [personal,  setPersonal]  = useState<Homework[]>(getPersonal);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<'all'|'todo'|'done'>('all');
  const [subFilter, setSubFilter] = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  // Add form
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDate,    setNewDate]    = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0,10));

  useEffect(() => {
    bakalariService.getHomeworks()
      .then(d => { if (d?.Homeworks) setApiTasks(d.Homeworks); })
      .finally(() => setLoading(false));
  }, []);

  const allTasks: Homework[] = useMemo(() => [
    ...apiTasks.map(t => ({ ...t, Done: t.Done || doneIds.has(t.ID) })),
    ...personal,
  ], [apiTasks, doneIds, personal]);

  const subjects = useMemo(() =>
    [...new Set(allTasks.map(t => t.Subject?.Abbrev).filter(Boolean))].sort(),
    [allTasks]);

  const visible = useMemo(() => allTasks.filter(t => {
    if (subFilter && t.Subject?.Abbrev !== subFilter) return false;
    if (filter === 'todo') return !t.Done;
    if (filter === 'done') return t.Done;
    return true;
  }), [allTasks, filter, subFilter]);

  const todo = visible.filter(t => !t.Done);
  const done = visible.filter(t => t.Done);

  const toggleDone = (id: string, isPersonal?: boolean) => {
    if (isPersonal) {
      const updated = personal.map(t => t.ID === id ? { ...t, Done: !t.Done } : t);
      setPersonal(updated); savePersonal(updated);
    } else {
      const next = new Set(doneIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setDoneIds(next); saveDoneIds(next);
    }
  };

  const addPersonal = () => {
    if (!newContent.trim()) return;
    const task: Homework = {
      ID: `p-${Date.now()}`, Content: newContent.trim(),
      DateEnd: newDate, Done: false,
      Subject: { Name: newSubject || 'Osobní', Abbrev: newSubject || 'OB' },
      personal: true,
    };
    const updated = [task, ...personal];
    setPersonal(updated); savePersonal(updated);
    setNewContent(''); setNewSubject(''); setShowAdd(false);
  };

  const deletePersonal = (id: string) => {
    const updated = personal.filter(t => t.ID !== id);
    setPersonal(updated); savePersonal(updated);
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d); const today = new Date(); const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    if (dt.toDateString() === today.toDateString()) return 'Dnes';
    if (dt.toDateString() === tom.toDateString()) return 'Zítra';
    const days = Math.round((dt.getTime() - today.getTime()) / 86400000);
    if (days > 0 && days <= 7) return `Za ${days} ${days===1?'den':days<5?'dny':'dní'}`;
    if (days < 0) return `Před ${Math.abs(days)} dny`;
    return dt.toLocaleDateString('cs-CZ', { day:'2-digit', month:'2-digit' });
  };

  const isUrgent = (d: string) => {
    const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
    return days <= 1;
  };

  const TaskCard = ({ t }: { t: Homework }) => (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className={cn('glass-card p-4 group transition-all', t.Done && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-[#71717a] uppercase">{t.Subject?.Abbrev}</span>
            {t.personal && <Star size={10} className="text-amber-400 shrink-0" />}
          </div>
          <p className={cn('text-sm font-medium text-[#fafafa]', t.Done && 'line-through text-[#71717a]')}>{t.Content}</p>
          {t.Teacher?.Name && <p className="text-[10px] text-[#71717a] mt-1">{t.Teacher.Name}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {t.personal && (
            <button onClick={() => deletePersonal(t.ID)}
              className="p-1 text-[#52525b] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
              <X size={13} />
            </button>
          )}
          <button onClick={() => toggleDone(t.ID, t.personal)}
            className={cn('p-1.5 rounded-lg transition-all text-xs font-semibold border flex items-center gap-1',
              t.Done
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-[#18181b] border-[#27272a] text-[#71717a] hover:border-emerald-500/40 hover:text-emerald-400')}>
            <CheckCircle2 size={13} />
          </button>
        </div>
      </div>
      {!t.Done && t.DateEnd && (
        <div className={cn('mt-3 flex items-center gap-1 text-[11px] font-medium',
          isUrgent(t.DateEnd) ? 'text-rose-400' : 'text-[#71717a]')}>
          <Calendar size={11} />
          {fmtDate(t.DateEnd)}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#fafafa]">Domácí úkoly</h2>
          <p className="text-[#a1a1aa] text-sm">Správa studijních povinností a úkolů</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-xs font-medium transition-colors self-start">
          <Plus size={14} /> Nový osobní úkol
        </button>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden">
          {(['all','todo','done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f ? 'bg-indigo-500 text-white' : 'text-[#71717a] hover:text-[#fafafa]')}>
              {f==='all'?'Vše':f==='todo'?`K vypracování (${allTasks.filter(t=>!t.Done).length})`:`Hotové (${allTasks.filter(t=>t.Done).length})`}
            </button>
          ))}
        </div>
        {subjects.length > 0 && (
          <select value={subFilter} onChange={e => setSubFilter(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-[#fafafa] outline-none focus:border-indigo-500">
            <option value="">Všechny předměty</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader className="animate-spin text-indigo-400" size={24} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* To do */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Clock size={14} /></div>
              <h3 className="text-sm font-semibold text-[#fafafa]">K vypracování</h3>
              <span className="text-[10px] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-full text-[#71717a]">{todo.length}</span>
            </div>
            {todo.length === 0
              ? <div className="text-center py-8 text-[#71717a] flex flex-col items-center gap-2">
                  <CheckCircle2 size={28} className="opacity-40" />
                  <p className="text-sm">Všechny úkoly hotovy!</p>
                </div>
              : todo.map(t => <TaskCard key={t.ID} t={t} />)
            }
          </div>

          {/* Done */}
          <div className="space-y-3 opacity-75">
            <div className="flex items-center gap-3 px-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 size={14} /></div>
              <h3 className="text-sm font-semibold text-[#fafafa]">Dokončeno</h3>
              <span className="text-[10px] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-full text-[#71717a]">{done.length}</span>
            </div>
            {done.length === 0
              ? <div className="h-28 border border-dashed border-[#27272a] rounded-lg flex items-center justify-center text-[#52525b] text-xs">Žádné dokončené úkoly</div>
              : done.map(t => <TaskCard key={t.ID} t={t} />)
            }
          </div>
        </div>
      )}

      {/* ═══ Add personal task modal ═══ */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdd(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border border-[#27272a] rounded-xl w-full max-w-sm">
              <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
                <h2 className="text-base font-semibold text-[#fafafa]">Nový osobní úkol</h2>
                <button onClick={() => setShowAdd(false)} className="p-1.5 text-[#71717a] hover:text-[#fafafa]"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Popis úkolu</span>
                  <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={3}
                    placeholder="Co je potřeba udělat…" autoFocus
                    className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b] resize-none" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Předmět (zkratka)</span>
                    <input value={newSubject} onChange={e => setNewSubject(e.target.value.toUpperCase())} maxLength={5}
                      placeholder="MAT"
                      className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b]" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Termín</span>
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                      className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500" />
                  </label>
                </div>
                <button onClick={addPersonal} disabled={!newContent.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                  Přidat úkol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

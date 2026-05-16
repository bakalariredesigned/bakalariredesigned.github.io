import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Loader, X, Search, ChevronDown, Download } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Mark    { MarkText: string; Caption: string; Weight: number; MarkDate?: string; Date?: string; IsNew?: boolean; TypeNote?: string; }
interface Subject { id: string; name: string; abbrev: string; average: number; marks: Mark[]; }

const markColor = (v: number) => {
  if (v <= 1.5) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  if (v <= 2.5) return { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/30'  };
  if (v <= 3.5) return { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30'   };
  return              { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30'    };
};

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('cs-CZ', { day:'numeric', month:'numeric', year:'2-digit' }) : '—';

export default function Grades() {
  const [subjects,   setSubjects]   = useState<Subject[]>([]);
  const [avgMark,    setAvgMark]    = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Subject | null>(null);
  const [search,     setSearch]     = useState('');
  const [sort,       setSort]       = useState<'default'|'worst'|'best'>('default');
  const [showFilter, setShowFilter] = useState(false);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([bakalariService.getAllSubjects(), bakalariService.getAverageMark(), bakalariService.getTimetable('actual')])
      .then(([subs, avg, tt]) => {
        setSubjects(subs.map((s: any) => ({
          id: s.id, name: s.name, abbrev: s.abbrev,
          average: parseFloat(s.averageText) || 0,
          marks: s.marks || [],
        })));
        setAvgMark(avg);
        const tMap: Record<string, string> = {};
        tt?.Days?.forEach((day: any) => {
          day.Atoms?.forEach((atom: any) => {
            if (atom.SubjectId && atom.TeacherId && !tMap[atom.SubjectId]) {
              const teacher = tt.Teachers?.find((t: any) => t.Id === atom.TeacherId);
              if (teacher) tMap[atom.SubjectId] = teacher.Name || teacher.Abbrev || '';
            }
          });
        });
        setTeacherMap(tMap);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let r = subjects.filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.abbrev.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'worst') r = [...r].sort((a, b) => b.average - a.average);
    if (sort === 'best')  r = [...r].sort((a, b) => a.average - b.average);
    return r;
  }, [subjects, search, sort]);

  const chartData = [
    { name: 'Po', val: avgMark + 0.1 },
    { name: 'Út', val: avgMark + 0.05 },
    { name: 'St', val: avgMark },
    { name: 'Čt', val: avgMark - 0.02 },
    { name: 'Pá', val: avgMark },
  ];

  const exportPDF = () => {
    const rows = filtered.map(s => {
      const marksHtml = s.marks.map(m => `<tr>
        <td>${fmtDate(m.MarkDate || m.Date)}</td><td>${m.Caption || '—'}</td>
        <td style="font-weight:700">${m.MarkText}</td><td>×${m.Weight ?? '—'}</td>
      </tr>`).join('');
      return `<div class="sub"><h3>${s.name} (${s.abbrev}) — průměr: <b>${s.average.toFixed(2)}</b></h3>
        <table><tr><th>Datum</th><th>Popis</th><th>Zn.</th><th>Váha</th></tr>${marksHtml}</table></div>`;
    }).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Klasifikace</title><style>
      body{font-family:Arial;font-size:11px;padding:20px} .sub{margin-bottom:18px} h3{background:#f0f0f0;padding:4px 8px;font-size:11px}
      table{width:100%;border-collapse:collapse} th{background:#e0e0e0;padding:3px 6px;text-align:left} td{border-bottom:1px solid #eee;padding:3px 6px}
    </style></head><body><h1>Klasifikace — ${new Date().toLocaleDateString('cs-CZ',{day:'numeric',month:'long',year:'numeric'})}</h1>${rows}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#fafafa]">Klasifikace</h2>
          <p className="text-[#a1a1aa] text-sm">Průběžný přehled prospěchu za aktuální období</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilter(v => !v)}
            className={cn('flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
              showFilter ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]')}>
            Filtr <ChevronDown size={14} className={cn('transition-transform', showFilter && 'rotate-180')} />
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#fafafa] text-[#09090b] rounded-xl hover:bg-[#e4e4e7] text-sm font-medium transition-colors">
            <Download size={14} /> PDF
          </button>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat předmět…"
          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-10 py-3 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b]" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#fafafa] p-1"><X size={15} /></button>}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="glass-card p-4 overflow-hidden">
            <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide mb-3">Řadit dle</p>
            <div className="flex gap-2 flex-wrap">
              {(['default','best','worst'] as const).map(v => (
                <button key={v} onClick={() => setSort(v)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                    sort === v ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]')}>
                  {v === 'default' ? 'Výchozí' : v === 'best' ? 'Nejlepší' : 'Nejhorší'}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-indigo-400" size={24} /></div>
      ) : (
        <>
          {/* Chart + Stats */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 glass-card p-5">
              <h3 className="text-sm font-semibold text-[#fafafa] mb-1">Trend průměru</h3>
              <p className="text-xs text-[#71717a] mb-5">Vývoj celkového prospěchu v čase</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:11 }} dy={8} />
                    <YAxis domain={[1,5]} reversed axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:11 }} />
                    <Tooltip contentStyle={{ background:'#18181b', border:'1px solid #27272a', borderRadius: '8px' }} labelStyle={{ color:'#fafafa' }} />
                    <Area type="monotone" dataKey="val" stroke="#6366f1" fill="url(#cg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Stats — horizontal row on mobile */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-[#fafafa] mb-4">Statistika</h3>
              <div className="flex lg:flex-col gap-4 lg:gap-5">
                <div className="flex-1">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider">Průměr</p>
                  <p className="text-4xl font-bold text-indigo-400 mt-1">{avgMark.toFixed(2)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider">Předmětů</p>
                  <p className="text-3xl font-bold text-[#fafafa] mt-1">{subjects.length}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider">Filtr</p>
                  <p className="text-3xl font-bold text-[#fafafa] mt-1">{filtered.length}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Subject grid */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[#fafafa]">
              Předměty {search && <span className="text-[#71717a] font-normal ml-1">— „{search}"</span>}
            </h3>
            {filtered.length === 0
              ? <div className="glass-card p-8 text-center text-[#71717a]">Žádné předměty neodpovídají hledání.</div>
              : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((s, i) => {
                    const mc = markColor(s.average);
                    const newCount = s.marks.filter(m => m.IsNew).length;
                    return (
                      <motion.div key={s.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        onClick={() => setSelected(s)}
                        className="glass-card p-4 cursor-pointer hover:border-[#3f3f46] active:scale-[0.98] transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-[11px] font-bold text-[#71717a] uppercase tracking-wider">{s.abbrev}</p>
                              {newCount > 0 && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                                  +{newCount} nová
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-[#fafafa] leading-tight">{s.name}</h4>
                            {teacherMap[s.id] && <p className="text-[11px] text-[#52525b] mt-0.5">{teacherMap[s.id]}</p>}
                            <p className="text-xs text-[#71717a] mt-2">
                              {s.marks.length} {s.marks.length === 1 ? 'známka' : s.marks.length < 5 ? 'známky' : 'známek'}
                            </p>
                          </div>
                          {/* Grade badge — bigger on mobile */}
                          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0', mc.bg, mc.text, mc.border)}>
                            {s.average > 0 ? s.average.toFixed(1) : '—'}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
            }
          </section>
        </>
      )}

      {/* ═══ Subject detail modal ═══ */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50"
            onClick={() => setSelected(null)}>
            <motion.div
              initial={{y: '100%', opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: '100%', opacity: 0}}
              transition={{type: 'spring', damping: 28, stiffness: 320}}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border border-[#27272a] rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[88vh] flex flex-col">
              {/* drag handle */}
              <div className="w-10 h-1 bg-[#3f3f46] rounded-full mx-auto mt-3 shrink-0 md:hidden" />

              {/* Modal header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-[#27272a] shrink-0">
                <div>
                  <p className="text-[11px] font-bold text-[#71717a] uppercase tracking-widest">{selected.abbrev}</p>
                  <h2 className="text-lg font-semibold text-[#fafafa] mt-0.5">{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={cn('text-sm font-bold px-3 py-1 rounded-full', markColor(selected.average).bg, markColor(selected.average).text)}>
                      Ø {selected.average > 0 ? selected.average.toFixed(2) : '—'}
                    </span>
                    <span className="text-sm text-[#71717a]">
                      {selected.marks.length} {selected.marks.length===1?'známka':selected.marks.length<5?'známky':'známek'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 text-[#71717a] hover:text-[#fafafa] transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>

              {/* Marks — card list (works great on mobile) */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
                {selected.marks.length === 0
                  ? <div className="py-12 text-center text-[#71717a]">Žádné známky</div>
                  : [...selected.marks]
                      .sort((a, b) => new Date(b.MarkDate||b.Date||'').getTime() - new Date(a.MarkDate||a.Date||'').getTime())
                      .map((m, i) => {
                        const mc = markColor(parseFloat(m.MarkText) || 3);
                        return (
                          <div key={i} className="flex items-center gap-3 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3">
                            {/* Grade circle */}
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border shrink-0', mc.bg, mc.text, mc.border)}>
                              {m.MarkText}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#fafafa] truncate">
                                {m.Caption || '—'}
                                {m.IsNew && <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full align-middle">NOVÁ</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-[#71717a]">{fmtDate(m.MarkDate || m.Date)}</p>
                                {m.TypeNote && <span className="text-[10px] text-[#52525b]">· {m.TypeNote}</span>}
                              </div>
                            </div>
                            {/* Weight */}
                            <span className="text-xs text-[#71717a] bg-[#27272a] px-2 py-1 rounded-lg font-mono shrink-0">
                              ×{m.Weight ?? '?'}
                            </span>
                          </div>
                        );
                      })
                }
              </div>

              {/* Footer */}
              {selected.marks.length > 0 && (
                <div className="px-5 py-4 border-t border-[#27272a] flex items-center justify-between shrink-0">
                  <span className="text-sm text-[#71717a]">Vážený průměr</span>
                  <span className={cn('font-bold text-xl', markColor(selected.average).text)}>
                    {selected.average > 0 ? selected.average.toFixed(2) : '—'}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

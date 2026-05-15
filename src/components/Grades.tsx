import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Filter, Download, Loader, X, Search, ChevronDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Mark  { MarkText: string; Caption: string; Weight: number; MarkDate?: string; Date?: string; IsNew?: boolean; TypeNote?: string; }
interface Subject { id: string; name: string; abbrev: string; average: number; marks: Mark[]; }

const markColor = (v: number) => {
  if (v <= 1.5) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  if (v <= 2.5) return { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/30'  };
  if (v <= 3.5) return { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30'   };
  return              { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30'    };
};

const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('cs-CZ', { day:'numeric', month:'numeric', year:'2-digit' }) : '—';

export default function Grades() {
  const [subjects,  setSubjects]  = useState<Subject[]>([]);
  const [avgMark,   setAvgMark]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Subject | null>(null);
  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState<'default'|'worst'|'best'>('default');
  const [showFilter,setShowFilter]= useState(false);
  // subjectId → teacher name (from timetable)
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
        // Build subjectId → teacher name map from timetable
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
        <td>${fmtDate(m.MarkDate || m.Date)}</td>
        <td>${m.Caption || '—'}</td>
        <td style="font-weight:700;color:${parseFloat(m.MarkText)<=2?'#16a34a':parseFloat(m.MarkText)>=4?'#dc2626':'#2563eb'}">${m.MarkText}</td>
        <td>×${m.Weight ?? '—'}</td>
      </tr>`).join('');
      return `<div class="sub"><h3>${s.name} (${s.abbrev}) — průměr: <b>${s.average.toFixed(2)}</b></h3>
        <table><tr><th>Datum</th><th>Popis</th><th>Zn.</th><th>Váha</th></tr>${marksHtml}</table></div>`;
    }).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Klasifikace</title><style>
      body{font-family:Arial;font-size:11px;padding:20px} h1{font-size:15px}
      .sub{margin-bottom:18px;page-break-inside:avoid} h3{background:#f0f0f0;padding:4px 8px;font-size:11px}
      table{width:100%;border-collapse:collapse} th{background:#e0e0e0;padding:3px 6px;text-align:left}
      td{border-bottom:1px solid #eee;padding:3px 6px}
    </style></head><body>
      <h1>Klasifikace — ${new Date().toLocaleDateString('cs-CZ',{day:'numeric',month:'long',year:'numeric'})}</h1>
      ${rows}
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#fafafa]">Klasifikace</h2>
          <p className="text-[#a1a1aa] text-sm">Průběžný přehled prospěchu za aktuální období</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilter(v => !v)}
            className={cn('flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-medium transition-colors',
              showFilter ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]')}>
            <Filter size={14} /> Filtrovat <ChevronDown size={12} className={cn('transition-transform', showFilter && 'rotate-180')} />
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#fafafa] text-[#09090b] rounded-lg hover:bg-[#e4e4e7] text-xs font-medium transition-colors">
            <Download size={14} /> Export do PDF
          </button>
        </div>
      </section>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="glass-card p-4 flex flex-wrap gap-4 items-end overflow-hidden">
            <label className="space-y-1.5 flex-1 min-w-[200px]">
              <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Hledat předmět</span>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Matematika, MAT…"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b]" />
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Řadit dle</span>
              <select value={sort} onChange={e => setSort(e.target.value as any)}
                className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500">
                <option value="default">Výchozí pořadí</option>
                <option value="worst">Nejhorší první</option>
                <option value="best">Nejlepší první</option>
              </select>
            </label>
            {(search || sort !== 'default') && (
              <button onClick={() => { setSearch(''); setSort('default'); }}
                className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 transition-colors">
                Resetovat
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar (always visible, quick) */}
      {!showFilter && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat předmět…"
            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b]" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#fafafa]"><X size={14} /></button>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-indigo-400" size={24} /></div>
      ) : (
        <>
          {/* Chart + Stats */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="text-sm font-semibold text-[#fafafa] mb-1">Trend průměru</h3>
              <p className="text-[10px] text-[#71717a] mb-6">Vývoj celkového prospěchu v čase</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:10 }} dy={8} />
                    <YAxis domain={[1,5]} reversed axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:10 }} />
                    <Tooltip contentStyle={{ background:'#18181b', border:'1px solid #27272a' }} labelStyle={{ color:'#fafafa' }} />
                    <Area type="monotone" dataKey="val" stroke="#6366f1" fill="url(#cg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6 space-y-5">
              <h3 className="text-sm font-semibold text-[#fafafa]">Statistika</h3>
              <div><p className="text-[10px] text-[#71717a] uppercase tracking-wider">Průměr</p>
                   <p className="text-3xl font-bold text-indigo-400 mt-1">{avgMark.toFixed(2)}</p></div>
              <div><p className="text-[10px] text-[#71717a] uppercase tracking-wider">Předmětů</p>
                   <p className="text-2xl font-bold text-[#fafafa] mt-1">{subjects.length}</p></div>
              <div><p className="text-[10px] text-[#71717a] uppercase tracking-wider">Zobrazeno</p>
                   <p className="text-2xl font-bold text-[#fafafa] mt-1">{filtered.length}</p></div>
            </div>
          </section>

          {/* Subject grid */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[#fafafa]">
              Předměty {search && <span className="text-[#71717a] font-normal ml-1">— výsledky pro „{search}"</span>}
            </h3>
            {filtered.length === 0
              ? <div className="glass-card p-8 text-center text-[#71717a]">Žádné předměty neodpovídají hledání.</div>
              : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((s, i) => {
                    const mc = markColor(s.average);
                    return (
                      <motion.div key={s.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        onClick={() => setSelected(s)}
                        className="glass-card p-5 cursor-pointer hover:border-[#3f3f46] transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">{s.abbrev}</p>
                            <h4 className="text-sm font-semibold text-[#fafafa] mt-0.5 group-hover:text-indigo-400 transition-colors">{s.name}</h4>
                            {teacherMap[s.id] && <p className="text-[10px] text-[#52525b] mt-0.5">{teacherMap[s.id]}</p>}
                          </div>
                          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm border', mc.bg, mc.text, mc.border)}>
                            {s.average > 0 ? s.average.toFixed(2) : '—'}
                          </div>
                        </div>
                        <p className="text-[11px] text-[#71717a]">{s.marks.length} {s.marks.length === 1 ? 'známka' : s.marks.length < 5 ? 'známky' : 'známek'}</p>
                        {s.marks.filter(m => m.IsNew).length > 0 && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">
                            +{s.marks.filter(m => m.IsNew).length} nová
                          </span>
                        )}
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
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border border-[#27272a] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Modal header */}
              <div className="flex items-start justify-between p-5 border-b border-[#27272a] shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest">{selected.abbrev}</p>
                  <h2 className="text-lg font-semibold text-[#fafafa] mt-0.5">{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn('text-sm font-bold px-2 py-0.5 rounded', markColor(selected.average).bg, markColor(selected.average).text)}>
                      Průměr: {selected.average > 0 ? selected.average.toFixed(2) : '—'}
                    </span>
                    <span className="text-xs text-[#71717a]">{selected.marks.length} {selected.marks.length===1?'známka':selected.marks.length<5?'známky':'známek'}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 text-[#71717a] hover:text-[#fafafa] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Marks table */}
              <div className="overflow-y-auto flex-1">
                {selected.marks.length === 0
                  ? <div className="p-8 text-center text-[#71717a]">Žádné známky</div>
                  : <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#09090b]">
                        <tr className="border-b border-[#27272a]">
                          <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#71717a] uppercase">Datum</th>
                          <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#71717a] uppercase">Popis</th>
                          <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#71717a] uppercase">Typ</th>
                          <th className="text-center px-5 py-3 text-[10px] font-semibold text-[#71717a] uppercase">Zn.</th>
                          <th className="text-center px-5 py-3 text-[10px] font-semibold text-[#71717a] uppercase">Váha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272a]">
                        {[...selected.marks]
                          .sort((a, b) => new Date(b.MarkDate||b.Date||'').getTime() - new Date(a.MarkDate||a.Date||'').getTime())
                          .map((m, i) => {
                            const mc = markColor(parseFloat(m.MarkText) || 3);
                            return (
                              <tr key={i} className="hover:bg-[#18181b]/40 transition-colors">
                                <td className="px-5 py-3 text-[#71717a] text-xs">{fmtDate(m.MarkDate || m.Date)}</td>
                                <td className="px-5 py-3 text-[#fafafa] text-xs">
                                  {m.Caption || '—'}
                                  {m.IsNew && <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded">NOVÁ</span>}
                                </td>
                                <td className="px-5 py-3 text-[#71717a] text-xs">{m.TypeNote || '—'}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className={cn('text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center mx-auto', mc.bg, mc.text)}>
                                    {m.MarkText}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center text-[#71717a] text-xs">×{m.Weight ?? '—'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                }
              </div>

              {/* Weighted avg footer */}
              {selected.marks.length > 0 && (
                <div className="p-4 border-t border-[#27272a] flex items-center justify-between text-xs text-[#71717a] shrink-0">
                  <span>Vážený průměr ze {selected.marks.length} {selected.marks.length===1?'známky':selected.marks.length<5?'známek':'známek'}</span>
                  <span className={cn('font-bold text-sm', markColor(selected.average).text)}>
                    Ø {selected.average > 0 ? selected.average.toFixed(2) : '—'}
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

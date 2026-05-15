import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Clock, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

// ── types ──────────────────────────────────────────────────────────────────
interface DayRow {
  date: string;
  missed: number;
  ok: number;
  unsolved: number;
  late: number;
  soon: number;
  school: number;
}
interface SubjectRow {
  name: string;
  total: number;
  lessons: number;
  pct: number;
}

export default function Attendance() {
  const [days,        setDays]        = useState<DayRow[]>([]);
  const [subjects,    setSubjects]    = useState<SubjectRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);

  useEffect(() => {
    bakalariService.getAbsences().then(data => {
      if (data?.Absences) {
        const rows: DayRow[] = data.Absences
          .filter((a: any) => (a.Ok||0)+(a.Missed||0)+(a.Unsolved||0)+(a.Late||0)+(a.Soon||0) > 0)
          .map((a: any) => ({
            date:     a.Date,
            missed:   a.Missed   || 0,
            ok:       a.Ok       || 0,
            unsolved: a.Unsolved || 0,
            late:     a.Late     || 0,
            soon:     a.Soon     || 0,
            school:   a.School   || 0,
          }))
          .sort((a: DayRow, b: DayRow) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setDays(rows);
      }
      if (data?.AbsencesPerSubject) {
        const rows: SubjectRow[] = data.AbsencesPerSubject
          .map((s: any) => {
            const total = (s.Base||0) + (s.Late||0) + (s.Soon||0) + (s.School||0) + (s.DistanceTeaching||0);
            const pct   = s.LessonsCount ? (total / s.LessonsCount) * 100 : 0;
            return { name: s.SubjectName || '—', total, lessons: s.LessonsCount || 0, pct };
          })
          .sort((a: SubjectRow, b: SubjectRow) => b.pct - a.pct);
        setSubjects(rows);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── derived totals ──
  const totalOk       = days.reduce((s, d) => s + d.ok,       0);
  const totalMissed   = days.reduce((s, d) => s + d.missed,   0);
  const totalUnsolved = days.reduce((s, d) => s + d.unsolved, 0);
  const totalAll      = totalOk + totalMissed + totalUnsolved + days.reduce((s,d) => s+d.late+d.soon, 0);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('cs-CZ', { weekday:'short', day:'numeric', month:'numeric' });

  const visibleDays = showAllDays ? days : days.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Absence</h2>
        <p className="text-[#a1a1aa] text-sm mt-1">Přehled absencí za aktuální školní rok</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Celkem hodin',   value: totalAll,      color: 'text-[#fafafa]',    bg: 'bg-[#18181b]',        icon: Clock        },
              { label: 'Omluveno',       value: totalOk,       color: 'text-emerald-400',  bg: 'bg-emerald-500/10',   icon: CheckCircle2 },
              { label: 'Neomluveno',     value: totalMissed,   color: 'text-rose-400',     bg: 'bg-rose-500/10',      icon: AlertCircle  },
              { label: 'Nezpracováno',   value: totalUnsolved, color: 'text-amber-400',    bg: 'bg-amber-500/10',     icon: Clock        },
            ].map(s => (
              <motion.div key={s.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                className="glass-card p-4">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', s.bg, s.color)}>
                  <s.icon size={16} />
                </div>
                <p className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">{s.label}</p>
                <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value} <span className="text-sm font-normal">h</span></p>
              </motion.div>
            ))}
          </div>

          {/* ── Per-subject breakdown ── */}
          {subjects.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-[#27272a]">
                <h3 className="text-sm font-semibold text-[#fafafa]">Absence podle předmětů</h3>
              </div>
              <div className="divide-y divide-[#27272a]">
                {subjects.map(s => {
                  const pctColor = s.pct >= 25 ? 'bg-rose-500' : s.pct >= 15 ? 'bg-amber-500' : 'bg-indigo-500';
                  return (
                    <div key={s.name} className="px-4 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-[#fafafa] truncate">{s.name}</p>
                          <span className={cn('text-xs font-semibold ml-4 shrink-0',
                            s.pct >= 25 ? 'text-rose-400' : s.pct >= 15 ? 'text-amber-400' : 'text-[#a1a1aa]')}>
                            {s.total} / {s.lessons} h ({s.pct.toFixed(0)} %)
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', pctColor)}
                            style={{ width: `${Math.min(s.pct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Day-by-day list ── */}
          {days.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-[#27272a]">
                <h3 className="text-sm font-semibold text-[#fafafa]">Přehled podle dní</h3>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-6 px-4 py-2 text-[9px] font-semibold text-[#52525b] uppercase tracking-wider border-b border-[#27272a]">
                <span className="col-span-2">Datum</span>
                <span className="text-center">Omluv.</span>
                <span className="text-center text-rose-400/60">Neomluv.</span>
                <span className="text-center text-amber-400/60">Nezprac.</span>
                <span className="text-center">Pozd.</span>
              </div>

              <div className="divide-y divide-[#27272a]">
                {visibleDays.map((d, i) => (
                  <motion.div key={i} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                    className="grid grid-cols-6 px-4 py-3 text-sm hover:bg-[#18181b]/40 transition-colors">
                    <span className="col-span-2 text-[#fafafa] font-medium">{fmtDate(d.date)}</span>
                    <span className="text-center text-emerald-400 font-semibold">{d.ok || '—'}</span>
                    <span className={cn('text-center font-semibold', d.missed > 0 ? 'text-rose-400' : 'text-[#52525b]')}>
                      {d.missed || '—'}
                    </span>
                    <span className={cn('text-center font-semibold', d.unsolved > 0 ? 'text-amber-400' : 'text-[#52525b]')}>
                      {d.unsolved || '—'}
                    </span>
                    <span className={cn('text-center font-semibold', d.late > 0 ? 'text-indigo-400' : 'text-[#52525b]')}>
                      {d.late || '—'}
                    </span>
                  </motion.div>
                ))}
              </div>

              {days.length > 7 && (
                <button onClick={() => setShowAllDays(v => !v)}
                  className="w-full p-3 flex items-center justify-center gap-2 text-xs text-indigo-400 hover:bg-[#18181b] transition-colors border-t border-[#27272a]">
                  {showAllDays ? <><ChevronUp size={14} /> Zobrazit méně</> : <><ChevronDown size={14} /> Zobrazit vše ({days.length} dní)</>}
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-[#a1a1aa]">Žádné absence</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

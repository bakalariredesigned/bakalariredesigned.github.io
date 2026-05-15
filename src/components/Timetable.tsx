import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
const DAYS_S = ['Po', 'Út', 'St', 'Čt', 'Pá'];
type ChangeKind = 'normal' | 'canceled' | 'substitution' | 'other';

const detectKind = (change: any): ChangeKind => {
  if (!change) return 'normal';
  const ct = (change.ChangeType || change.TypeAbbrev || '').toLowerCase();
  const desc = (change.Description || change.TypeName || '').toLowerCase();
  if (ct.includes('cancel') || ct.includes('removed') || desc.includes('odpad') || desc.includes('zruš')) return 'canceled';
  if (ct.includes('substit') || desc.includes('supl')) return 'substitution';
  return 'other';
};

const CHANGE: Record<ChangeKind, { bg: string; text: string; label: string }> = {
  normal: { bg: '', text: 'text-[#fafafa]', label: '' },
  canceled: { bg: 'bg-rose-500/10', text: 'text-rose-400 line-through', label: 'Odpadá' },
  substitution: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Supl.' },
  other: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Změna' },
};

interface Lesson {
  dayIdx: number;
  hourId: number;
  subjectId: string;
  teacherId: string;
  roomId: string;
  theme: string;
  changeKind: ChangeKind;
  changeDesc: string;
}

interface Hour {
  Id: number;
  Caption?: string;
  BeginTime: string;
  EndTime: string;
}

export default function Timetable() {
  const todayDow = new Date().getDay() - 1;
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(Math.min(Math.max(todayDow, 0), 4));
  const [ttData, setTtData] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);

  const getWeekDate = (o: number) => {
    const d = new Date();
    const dow = d.getDay() || 7;
    d.setDate(d.getDate() - dow + 1 + o * 7);
    return d.toISOString().slice(0, 10);
  };

  const weekLabel = weekOffset === 0 ? 'Tento týden' : weekOffset === 1 ? 'Příští týden' : weekOffset === -1 ? 'Minulý týden' : `Týden ${weekOffset > 0 ? '+' : ''}${weekOffset}`;

  const getDayDate = (i: number) => {
    const d = ttData?.Days?.[i]?.Date;
    if (!d) return '';
    const x = new Date(d);
    return `${x.getDate()}.${x.getMonth() + 1}.`;
  };

  const getWeekRange = () => {
    if (!ttData?.Days?.length) return '';
    const fmt = (d: string) => {
      const x = new Date(d);
      return `${x.getDate()}. ${x.getMonth() + 1}.`;
    };
    try {
      return `${fmt(ttData.Days[0].Date)} – ${fmt(ttData.Days[ttData.Days.length - 1].Date)}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    setLoading(true);
    setLessons([]);
    setHours([]);
    const date = weekOffset === 0 ? undefined : getWeekDate(weekOffset);
    bakalariService.getTimetable('actual', date).then(data => {
      if (data) {
        setTtData(data);
        setHours(data.Hours || []);
        const out: Lesson[] = [];
        (data.Days || []).forEach((day: any, di: number) => {
          (day.Atoms || []).forEach((atom: any) => {
            const hr = (data.Hours || []).find((h: any) => h.Id === atom.HourId);
            if (!hr) return;
            const ck = detectKind(atom.Change);
            out.push({
              dayIdx: di,
              hourId: atom.HourId,
              subjectId: atom.SubjectId,
              teacherId: atom.TeacherId,
              roomId: atom.RoomId,
              theme: atom.Theme || '',
              changeKind: ck,
              changeDesc: atom.Change?.Description || atom.Change?.TypeName || '',
            });
          });
        });
        setLessons(out);
      }
    }).finally(() => setLoading(false));
  }, [weekOffset]);

  const sub = (id: string) => ttData?.Subjects?.find((s: any) => s.Id === id);
  const tch = (id: string) => ttData?.Teachers?.find((t: any) => t.Id === id);
  const rm = (id: string) => ttData?.Rooms?.find((r: any) => r.Id === id);
  const cell = (di: number, hid: number) => lessons.find(l => l.dayIdx === di && l.hourId === hid);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#fafafa]">Rozvrh hodin</h2>
          <p className="text-[#a1a1aa] text-sm">{getWeekRange()}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-[10px] text-[#71717a] mr-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-rose-500/50" />
              Odpadá
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-amber-500/50" />
              Suplování
            </span>
          </div>
          {/* Week nav */}
          <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg p-1">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 hover:bg-[#27272a] rounded text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
              <ChevronLeft size={15} />
            </button>
            <div className="px-3 flex items-center text-xs font-medium text-[#fafafa] min-w-[110px] justify-center">{weekLabel}</div>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 hover:bg-[#27272a] rounded text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : lessons.length === 0 ? (
        <div className="glass-card p-10 text-center text-[#71717a]">Rozvrh není k dispozici.</div>
      ) : (
        <>
          {/* ═══ DESKTOP TABLE ═══ */}
          <div className="hidden md:block glass-card overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${100 + hours.length * 80}px` }}>
              <thead>
                <tr>
                  {/* Corner cell - empty */}
                  <th className="w-24 p-2 border-b border-r border-[#27272a] bg-[#0c0c0e]" />
                  {/* Hour headers */}
                  {hours.map(hr => (
                    <th key={hr.Id} className="p-2 border-b border-r border-[#27272a] bg-[#0c0c0e] min-w-[80px]">
                      <div className="text-sm font-bold text-[#fafafa]">{hr.Caption || hr.Id}.</div>
                      <div className="text-[10px] text-[#71717a] font-normal mt-0.5">
                        {hr.BeginTime} - {hr.EndTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => {
                  const isToday = di === todayDow && weekOffset === 0;
                  return (
                    <tr key={di} className={isToday ? 'bg-indigo-500/5' : ''}>
                      {/* Day label */}
                      <td className={cn(
                        'p-2 border-b border-r border-[#27272a] font-medium',
                        isToday ? 'bg-indigo-500/10' : 'bg-[#0c0c0e]'
                      )}>
                        <div className={cn('text-sm', isToday ? 'text-indigo-400' : 'text-[#fafafa]')}>{day}</div>
                        <div className="text-[10px] text-[#52525b]">{getDayDate(di)}</div>
                      </td>
                      {/* Lesson cells */}
                      {hours.map(hr => {
                        const l = cell(di, hr.Id);
                        if (!l) {
                          return (
                            <td key={hr.Id} className="p-1.5 border-b border-r border-[#27272a] text-center">
                              <div className="text-[#27272a] text-xs">-</div>
                            </td>
                          );
                        }
                        const c = CHANGE[l.changeKind];
                        const s = sub(l.subjectId);
                        const t = tch(l.teacherId);
                        const r = rm(l.roomId);
                        return (
                          <td key={hr.Id} className={cn('p-1.5 border-b border-r border-[#27272a]', c.bg)}>
                            <div className="flex flex-col items-center gap-0.5 min-h-[52px] justify-center">
                              {/* Badge for changes */}
                              {l.changeKind !== 'normal' && (
                                <span className={cn(
                                  'text-[8px] font-bold px-1.5 py-0.5 rounded',
                                  l.changeKind === 'canceled' ? 'bg-rose-500/20 text-rose-400' :
                                  l.changeKind === 'substitution' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-purple-500/20 text-purple-400'
                                )}>
                                  {c.label}
                                </span>
                              )}
                              {/* Subject */}
                              <div className={cn('text-sm font-bold', c.text)}>
                                {s?.Abbrev || '-'}
                              </div>
                              {/* Teacher */}
                              <div className="text-[10px] text-[#71717a]">{t?.Abbrev || ''}</div>
                              {/* Room */}
                              <div className="text-[9px] text-[#52525b] font-mono">{r?.Abbrev || ''}</div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ MOBILE: day tabs + list ═══ */}
          <div className="md:hidden space-y-3">
            {/* Day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {DAYS.map((d, i) => {
                const isToday = i === todayDow && weekOffset === 0;
                const isSelected = i === activeDay;
                const hasChanges = lessons.filter(l => l.dayIdx === i && l.changeKind !== 'normal').length > 0;
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(i)}
                    className={cn(
                      'flex flex-col items-center px-3 py-2 rounded-lg border transition-all min-w-[52px] relative shrink-0',
                      isSelected ? 'bg-indigo-500 border-indigo-600 text-white' :
                      isToday ? 'bg-[#18181b] border-indigo-500/40 text-indigo-400' :
                      'bg-transparent text-[#71717a] border-[#27272a]'
                    )}
                  >
                    {hasChanges && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    <span className="text-[9px] opacity-70">{getDayDate(i)}</span>
                    <span className="text-sm font-medium">{DAYS_S[i]}</span>
                  </button>
                );
              })}
            </div>

            {/* Lessons list */}
            <div className="space-y-2">
              {hours.filter(hr => cell(activeDay, hr.Id)).map((hr, i) => {
                const l = cell(activeDay, hr.Id)!;
                const c = CHANGE[l.changeKind];
                const s = sub(l.subjectId);
                const t = tch(l.teacherId);
                const r = rm(l.roomId);
                return (
                  <motion.div
                    key={hr.Id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'glass-card p-3 flex items-center gap-3',
                      c.bg,
                      l.changeKind === 'canceled' ? 'opacity-60' : ''
                    )}
                  >
                    {/* Hour number + time */}
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-lg font-bold text-[#fafafa]">{hr.Caption || hr.Id}.</div>
                      <div className="text-[9px] text-[#52525b]">{hr.BeginTime}</div>
                      <div className="text-[9px] text-[#52525b]">{hr.EndTime}</div>
                    </div>
                    
                    {/* Divider */}
                    <div className={cn(
                      'w-0.5 h-12 rounded-full',
                      l.changeKind === 'canceled' ? 'bg-rose-500/50' :
                      l.changeKind === 'substitution' ? 'bg-amber-500/50' :
                      l.changeKind === 'other' ? 'bg-purple-500/50' :
                      'bg-indigo-500/30'
                    )} />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {l.changeKind !== 'normal' && (
                        <span className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mb-1',
                          l.changeKind === 'canceled' ? 'bg-rose-500/20 text-rose-400' :
                          l.changeKind === 'substitution' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-purple-500/20 text-purple-400'
                        )}>
                          {c.label}
                        </span>
                      )}
                      <p className={cn('text-sm font-semibold truncate', c.text)}>
                        {s?.Name || s?.Abbrev || '-'}
                      </p>
                      <p className="text-[11px] text-[#a1a1aa]">{t?.Name || t?.Abbrev || ''}</p>
                      {l.changeDesc && (
                        <p className="text-[10px] text-[#71717a] italic mt-0.5">{l.changeDesc}</p>
                      )}
                    </div>
                    
                    {/* Room */}
                    <span className="text-[10px] font-mono bg-[#27272a] text-[#a1a1aa] px-2 py-1 rounded shrink-0">
                      {r?.Abbrev || r?.Name || '?'}
                    </span>
                  </motion.div>
                );
              })}
              {hours.filter(hr => cell(activeDay, hr.Id)).length === 0 && (
                <div className="text-center py-10 text-[#71717a] text-sm">Žádné hodiny v tento den.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

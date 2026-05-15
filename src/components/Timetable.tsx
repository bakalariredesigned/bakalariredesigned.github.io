import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader, User, MapPin, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
const DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá'];

type ChangeKind = 'normal' | 'canceled' | 'substitution' | 'other';

interface Lesson {
  dayIdx: number;
  hourId: number;
  subjectId: string;
  teacherId: string;
  roomId: string;
  theme: string;
  changeKind: ChangeKind;
  changeDesc: string;
  beginTime: string;
  endTime: string;
}

const CHANGE_STYLE: Record<ChangeKind, { leftBorder: string; bg: string; badge: string; label: string }> = {
  normal:       { leftBorder: 'border-l-indigo-500',  bg: '',                  badge: '',                                     label: '' },
  canceled:     { leftBorder: 'border-l-rose-500',    bg: 'bg-rose-500/5',     badge: 'bg-rose-500/20 text-rose-400',         label: 'ODPADLÁ' },
  substitution: { leftBorder: 'border-l-amber-500',   bg: 'bg-amber-500/5',    badge: 'bg-amber-500/20 text-amber-400',       label: 'SUPLOVÁNÍ' },
  other:        { leftBorder: 'border-l-purple-500',  bg: 'bg-purple-500/5',   badge: 'bg-purple-500/20 text-purple-400',     label: 'ZMĚNA' },
};

const detectChangeKind = (change: any): ChangeKind => {
  if (!change) return 'normal';
  const ct = (change.ChangeType || change.TypeAbbrev || '').toLowerCase();
  const desc = (change.Description || change.TypeName || '').toLowerCase();
  if (ct.includes('cancel') || ct.includes('removed') || ct.includes('odpad') ||
      desc.includes('odpad') || desc.includes('zruš') || ct === 'h') return 'canceled';
  if (ct.includes('substit') || ct.includes('supl') || desc.includes('supl') ||
      ct === 'z' || ct === 'zs') return 'substitution';
  return 'other';
};

export default function Timetable() {
  const todayDow = new Date().getDay() - 1; // 0=Mon … 4=Fri
  const [activeDay, setActiveDay] = useState(Math.min(Math.max(todayDow, 0), 4));
  const [timetableData, setTimetableData] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bakalariService.getTimetable('actual')
      .then(data => {
        if (data) { setTimetableData(data); setLessons(parseTimetable(data)); }
      })
      .finally(() => setLoading(false));
  }, []);

  const parseTimetable = (data: any): Lesson[] => {
    if (!data?.Days || !data?.Hours) return [];
    const out: Lesson[] = [];
    data.Days.forEach((day: any, dayIdx: number) => {
      (day.Atoms || []).forEach((atom: any) => {
        const hour = data.Hours.find((h: any) => h.Id === atom.HourId);
        if (!hour) return;
        const changeKind = detectChangeKind(atom.Change);
        const changeDesc = atom.Change
          ? (atom.Change.Description || atom.Change.TypeName || '')
          : '';
        out.push({
          dayIdx, hourId: atom.HourId,
          subjectId: atom.SubjectId, teacherId: atom.TeacherId, roomId: atom.RoomId,
          theme: atom.Theme || '',
          changeKind, changeDesc,
          beginTime: hour.BeginTime, endTime: hour.EndTime,
        });
      });
    });
    return out;
  };

  const getSubject = (id: string) => timetableData?.Subjects?.find((s: any) => s.Id === id);
  const getTeacher = (id: string) => timetableData?.Teachers?.find((t: any) => t.Id === id);
  const getRoom   = (id: string) => timetableData?.Rooms?.find((r: any) => r.Id === id);

  const getDayLabel = (idx: number) => {
    const d = timetableData?.Days?.[idx]?.Date;
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getDate()}. ${dt.getMonth() + 1}.`;
  };

  const getWeekRange = () => {
    if (!timetableData?.Days?.length) return 'Tento týden';
    const fmt = (d: string) => { const x = new Date(d); return `${x.getDate()}. ${x.getMonth() + 1}.`; };
    return `${fmt(timetableData.Days[0].Date)} – ${fmt(timetableData.Days[timetableData.Days.length - 1].Date)}`;
  };

  const getDayLessons = (dayIdx: number) =>
    lessons.filter(l => l.dayIdx === dayIdx).sort((a, b) => a.hourId - b.hourId);

  const allHourIds = [...new Set(lessons.map(l => l.hourId))].sort((a, b) => a - b);

  // --- Shared change info pill ---
  const ChangeBadge = ({ kind, desc }: { kind: ChangeKind; desc: string }) => {
    if (kind === 'normal') return null;
    const s = CHANGE_STYLE[kind];
    return (
      <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-block', s.badge)}>
        {s.label}{desc ? ` · ${desc}` : ''}
      </span>
    );
  };

  // --- Desktop grid cell ---
  const GridCell = ({ lesson }: { lesson: Lesson }) => {
    const s = CHANGE_STYLE[lesson.changeKind];
    const subject = getSubject(lesson.subjectId);
    const teacher = getTeacher(lesson.teacherId);
    const room    = getRoom(lesson.roomId);
    const isCanceled = lesson.changeKind === 'canceled';
    return (
      <div className={cn('rounded-lg border p-2 text-[10px] h-full', s.bg,
        lesson.changeKind === 'canceled'  ? 'border-rose-500/40 opacity-70' :
        lesson.changeKind === 'substitution' ? 'border-amber-500/40' :
        lesson.changeKind === 'other'     ? 'border-purple-500/40' :
        'border-[#27272a]'
      )}>
        {lesson.changeKind !== 'normal' && (
          <span className={cn('text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded mb-1 inline-block', s.badge)}>
            {s.label}
          </span>
        )}
        <p className={cn('font-semibold text-[#fafafa] truncate leading-tight', isCanceled && 'line-through text-[#71717a]')}>
          {subject?.Abbrev || subject?.Name || lesson.subjectId || '—'}
        </p>
        <p className="text-[#71717a] truncate mt-0.5">{teacher?.Abbrev || '—'}</p>
        <p className="text-[#52525b] truncate">{room?.Abbrev || lesson.roomId || ''}</p>
        {lesson.changeDesc && (
          <p className="text-[8px] text-[#a1a1aa] italic mt-0.5 truncate">{lesson.changeDesc}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Rozvrh hodin</h2>
          <p className="text-[#a1a1aa] text-sm">{getWeekRange()}</p>
        </div>
        <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg p-1 self-start">
          <button className="p-1.5 hover:bg-[#27272a] rounded transition-colors text-[#a1a1aa] hover:text-[#fafafa]">
            <ChevronLeft size={16} />
          </button>
          <div className="px-3 flex items-center font-medium text-xs text-[#fafafa] min-w-[100px] justify-center">
            Tento týden
          </div>
          <button className="p-1.5 hover:bg-[#27272a] rounded transition-colors text-[#a1a1aa] hover:text-[#fafafa]">
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-[#71717a]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#18181b] border border-[#27272a]" />Normální hodina</span>
        <span className="flex items-center gap-1.5 text-rose-400"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/40" />Odpadlá hodina</span>
        <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />Suplování</span>
        <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500/40" />Jiná změna</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : lessons.length === 0 ? (
        <div className="glass-card p-12 text-center text-[#71717a]">Rozvrh není k dispozici.</div>
      ) : (
        <>
          {/* === MOBILE: day tabs + list === */}
          <div className="lg:hidden space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DAYS.map((day, i) => {
                const isToday = i === todayDow;
                const isSelected = i === activeDay;
                const hasChanges = getDayLessons(i).some(l => l.changeKind !== 'normal');
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(i)}
                    className={cn(
                      'flex flex-col items-center px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap border min-w-[58px] relative',
                      isSelected ? 'bg-indigo-500 border-indigo-600 text-white' :
                      isToday ? 'bg-[#18181b] border-indigo-500/40 text-indigo-400' :
                      'bg-transparent text-[#71717a] border-[#27272a] hover:border-[#3f3f46]'
                    )}
                  >
                    {hasChanges && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    <span className="text-[9px] opacity-70">{getDayLabel(i)}</span>
                    <span className="text-sm">{DAYS_SHORT[i]}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {getDayLessons(activeDay).map((lesson, i) => {
                const s = CHANGE_STYLE[lesson.changeKind];
                const subject = getSubject(lesson.subjectId);
                const teacher = getTeacher(lesson.teacherId);
                const room    = getRoom(lesson.roomId);
                const isCanceled = lesson.changeKind === 'canceled';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'glass-card p-4 border-l-[3px] transition-all',
                      s.leftBorder, s.bg,
                      isCanceled && 'opacity-75'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Time */}
                      <div className="shrink-0 w-[72px]">
                        <p className="text-xs font-semibold text-[#fafafa]">{lesson.beginTime}</p>
                        <p className="text-[10px] text-[#71717a]">— {lesson.endTime}</p>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            {lesson.changeKind !== 'normal' && (
                              <div className="mb-1">
                                <ChangeBadge kind={lesson.changeKind} desc={lesson.changeDesc} />
                              </div>
                            )}
                            <h4 className={cn(
                              'text-sm font-semibold text-[#fafafa] truncate',
                              isCanceled && 'line-through text-[#71717a]'
                            )}>
                              {subject?.Name || subject?.Abbrev || lesson.subjectId}
                            </h4>
                          </div>
                          <span className="text-[10px] text-[#71717a] bg-[#27272a] px-2 py-0.5 rounded shrink-0 font-mono">
                            {room?.Abbrev || lesson.roomId || '?'}
                          </span>
                        </div>
                        <p className={cn(
                          'text-[11px] flex items-center gap-1',
                          isCanceled ? 'text-[#52525b]' : 'text-[#a1a1aa]'
                        )}>
                          <User size={11} className="shrink-0" />
                          {teacher?.Name || teacher?.Abbrev || '—'}
                        </p>
                        {lesson.theme && (
                          <p className="text-[10px] text-[#52525b] mt-1 italic truncate">{lesson.theme}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {getDayLessons(activeDay).length === 0 && (
                <div className="text-center py-10 text-[#71717a] text-sm">
                  Žádné hodiny v tento den
                </div>
              )}
            </div>
          </div>

          {/* === DESKTOP: full weekly grid === */}
          <div className="hidden lg:block glass-card overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="px-4 py-3 text-left w-[90px] text-[10px] font-semibold text-[#71717a] uppercase">
                    Hodina
                  </th>
                  {DAYS.map((day, i) => {
                    const isToday = i === todayDow;
                    const hasChanges = getDayLessons(i).some(l => l.changeKind !== 'normal');
                    return (
                      <th key={day} className={cn('px-3 py-3 text-left text-[10px] font-semibold uppercase', isToday ? 'text-indigo-400' : 'text-[#71717a]')}>
                        <div className="flex items-center gap-1.5">
                          {day}
                          {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Jsou zde změny" />}
                        </div>
                        <div className="font-normal normal-case text-[#52525b] mt-0.5">{getDayLabel(i)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {allHourIds.map((hourId) => {
                  const sample = lessons.find(l => l.hourId === hourId);
                  return (
                    <tr key={hourId}>
                      <td className="px-4 py-2 align-top w-[90px]">
                        <div className="text-[10px] font-semibold text-[#fafafa]">{sample?.beginTime}</div>
                        <div className="text-[9px] text-[#71717a]">{sample?.endTime}</div>
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const lesson = lessons.find(l => l.dayIdx === dayIdx && l.hourId === hourId);
                        const isToday = dayIdx === todayDow;
                        return (
                          <td key={dayIdx} className={cn('px-2 py-2 align-top', isToday && 'bg-indigo-500/[0.04]')}>
                            {lesson
                              ? <GridCell lesson={lesson} />
                              : <div className="text-[#3f3f46] text-center py-2">—</div>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

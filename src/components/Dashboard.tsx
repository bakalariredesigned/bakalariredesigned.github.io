import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, BookOpen, TrendingUp, AlarmClock,
  Plus, X, Send, Loader2, Trash2, StickyNote, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

// ── helpers ──────────────────────────────────────────────────────────────────
const timeToMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowMins    = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const calcAbsence = (data: any): string => {
  const days: any[] = data?.Absences || [];
  const total = days.reduce((s, a) =>
    s + (a.Missed||0) + (a.Ok||0) + (a.Unsolved||0) + (a.Late||0) + (a.Soon||0) + (a.School||0), 0);
  const lessons = (data?.AbsencesPerSubject || []).reduce((s: number, x: any) => s + (x.LessonsCount||0), 0);
  if (total === 0) return '0 h';
  if (lessons > 0) return `${Math.min(Math.round((total / lessons) * 100), 100)} %`;
  return `${total} h`;
};

// ── component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [avgMark,    setAvgMark]    = useState(0);
  const [hwCount,    setHwCount]    = useState(0);
  const [homeworks,  setHomeworks]  = useState<any[]>([]);
  const [todayDate,  setTodayDate]  = useState('');
  const [absence,    setAbsence]    = useState('…');
  const [todayLessons, setTodayLessons] = useState<any[]>([]);
  const [nextLesson,   setNextLesson]   = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  // ── real-time clock (updates every 30 s) ──
  const [currentTime, setCurrentTime] = useState(nowMins());
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(nowMins()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── modals ──
  const [showOmluvenka, setShowOmluvenka] = useState(false);
  const [omluvenkaFrom,    setOmluvenkaFrom]    = useState(() => new Date().toISOString().slice(0,10));
  const [omluvenkaTo,      setOmluvenkaTo]      = useState(() => new Date().toISOString().slice(0,10));
  const [omluvenkaReason,  setOmluvenkaReason]  = useState('');
  const [omluvenkaRecip,   setOmluvenkaRecip]   = useState('');
  const [recipients,       setRecipients]       = useState<any[]>([]);
  const [omloading,        setOmloading]        = useState(false);
  const [omError,          setOmError]          = useState('');
  const [omSuccess,        setOmSuccess]        = useState(false);

  const [showNote,  setShowNote]  = useState(false);
  const [noteText,  setNoteText]  = useState('');
  const [notes, setNotes] = useState<{text:string;date:string}[]>(() =>
    JSON.parse(localStorage.getItem('bakNotes') || '[]'));

  // ── date label ──
  useEffect(() => {
    const d = new Date();
    const days   = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];
    const months = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
    setTodayDate(`${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`);
  }, []);

  // ── load data ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [avg, hwData, tt, absData] = await Promise.all([
          bakalariService.getAverageMark(),
          bakalariService.getHomeworks(),
          bakalariService.getTimetable('actual'),
          bakalariService.getAbsences(),
        ]);

        setAvgMark(avg);
        setAbsence(calcAbsence(absData));

        if (hwData?.Homeworks) {
          const pending = hwData.Homeworks.filter((h: any) => !h.Done);
          setHwCount(pending.length);
          setHomeworks(pending.slice(0, 3));
        }

        if (tt?.Days && tt?.Hours) {
          const dow = new Date().getDay() - 1;
          if (dow >= 0 && dow < tt.Days.length) {
            const atoms = tt.Days[dow].Atoms || [];
            const lessons = atoms.map((a: any) => ({
              ...a,
              hour:    tt.Hours.find((h: any)    => h.Id === a.HourId),
              subject: tt.Subjects?.find((s: any) => s.Id === a.SubjectId),
              teacher: tt.Teachers?.find((t: any) => t.Id === a.TeacherId),
              room:    tt.Rooms?.find((r: any)    => r.Id === a.RoomId),
            }));
            const nm = nowMins();
            const cur = lessons.find((l: any) => {
              const b = timeToMins(l.hour?.BeginTime || '0:00');
              const e = timeToMins(l.hour?.EndTime   || '0:00');
              return nm >= b && nm < e;
            });
            const nxt = cur || lessons.find((l: any) => timeToMins(l.hour?.BeginTime || '0:00') > nm) || lessons[0];
            setCurrentLesson(cur || null);
            setNextLesson(nxt || null);
            setTodayLessons(lessons.slice(0, 5));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── load recipients for omluvenka ──
  const openOmluvenka = async () => {
    setShowOmluvenka(true);
    setOmError(''); setOmSuccess(false);
    if (recipients.length === 0) {
      const data = await bakalariService.getMessageTypes();
      const r: any[] = data?.Recipients || [];
      setRecipients(r);
      if (r.length > 0) setOmluvenkaRecip(r[0].Code);
    }
  };

  const sendOmluvenka = async () => {
    if (!omluvenkaReason.trim()) { setOmError('Vyplň důvod absence.'); return; }
    if (!omluvenkaRecip)         { setOmError('Vyber příjemce.');      return; }
    setOmloading(true); setOmError('');
    try {
      await bakalariService.sendMessage({
        MessageType: 'OMLUVENKA',
        Title: `Omluvenka ${omluvenkaFrom} – ${omluvenkaTo}`,
        Text:  `Dobrý den,\nomlouvám svou absenci v termínu ${omluvenkaFrom} – ${omluvenkaTo}.\n\nDůvod: ${omluvenkaReason}\n\nS pozdravem,\n${user?.name || ''}`,
        RecipientType: 'U',
        Recipients: [omluvenkaRecip],
        Lifetime: null, DateFrom: null, DateTo: null, PreviousMessageId: null,
        CopyForClassTeacher: false, CopyForParent: false, EmailNotification: false,
        SendAsDirector: false, RequireConfirmation: false, TypeOfRatingId: null,
        Scale: null, Attachments: [], DraftDate: null,
      });
      setOmSuccess(true);
      setOmluvenkaReason('');
    } catch {
      setOmError('Zprávu se nepodařilo odeslat. Zkus to znovu.');
    } finally {
      setOmloading(false);
    }
  };

  const saveNote = () => {
    if (!noteText.trim()) return;
    const updated = [{ text: noteText.trim(), date: new Date().toLocaleDateString('cs-CZ') }, ...notes];
    setNotes(updated);
    localStorage.setItem('bakNotes', JSON.stringify(updated));
    setNoteText('');
    setShowNote(false);
  };

  const deleteNote = (i: number) => {
    const updated = notes.filter((_, idx) => idx !== i);
    setNotes(updated);
    localStorage.setItem('bakNotes', JSON.stringify(updated));
  };

  const stats = [
    { label: 'Průměr známek', value: avgMark ? avgMark.toFixed(2) : '—', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Absence',        value: absence,                            icon: AlarmClock,  color: 'text-amber-500',   bg: 'bg-amber-500/10'  },
    { label: 'Domácí úkoly',   value: hwCount.toString(),                 icon: BookOpen,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
    { label: 'Nadch. testy',   value: '—',                                icon: Calendar,    color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">
            Ahoj, {user?.name?.split(' ')?.[0] || 'Studente'}!
          </h2>
          <p className="text-[#a1a1aa] text-sm">
            {todayDate}.{' '}
            {nextLesson?.subject?.Name
              ? `Nejbližší hodina v ${nextLesson.hour?.BeginTime} (${nextLesson.subject?.Abbrev}).`
              : 'Dnes žádné vyučování.'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
            Celková absence: {absence}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors font-medium text-xs text-[#a1a1aa] hover:text-[#fafafa]"
          >
            <StickyNote size={14} />
            Přidat poznámku
          </button>
          <button
            onClick={openOmluvenka}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-xs"
          >
            Rychlá omluvenka
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.08 }}
            className="glass-card p-5 hover:border-[#3f3f46] transition-colors cursor-default">
            <div className={`${s.bg} ${s.color} w-8 h-8 rounded-lg flex items-center justify-center mb-4`}>
              <s.icon size={16} />
            </div>
            <p className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">{s.label}</p>
            <h3 className="text-2xl font-semibold tracking-tighter text-[#fafafa] mt-1">{s.value}</h3>
          </motion.div>
        ))}
      </section>

      {/* ── Timetable + Homework ── */}
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e4e4e7]">Dnešní rozvrh</h3>
            <button onClick={() => navigate('/timetable')}
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
              Zobrazit vše <ChevronRight size={12} />
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            {todayLessons.length === 0 && !loading
              ? <div className="p-6 text-center text-[#71717a] text-sm">Dnes žádné vyučování.</div>
              : todayLessons.map((l, i) => {
                  const begin = timeToMins(l.hour?.BeginTime || '0:00');
                  const end   = timeToMins(l.hour?.EndTime   || '0:00');
                  const isCur  = currentTime >= begin && currentTime < end;
                  const isPast = currentTime >= end;
                  // progress % during current lesson
                  const progress = isCur ? Math.min(Math.round(((currentTime - begin) / (end - begin)) * 100), 100) : 0;

                  return (
                    <div key={i} className={[
                      'flex items-center gap-4 px-4 py-3 border-b border-[#27272a] last:border-0 relative transition-colors',
                      isCur  ? 'bg-indigo-500/[0.07]' : '',
                      isPast ? 'opacity-45' : 'hover:bg-[#18181b]/40',
                    ].join(' ')}>
                      {/* current lesson left bar */}
                      {isCur && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />}

                      {/* time + status */}
                      <div className="w-28 shrink-0">
                        <p className={`text-xs font-medium ${isCur ? 'text-indigo-400' : isPast ? 'text-[#52525b]' : 'text-[#71717a]'}`}>
                          {l.hour?.BeginTime} — {l.hour?.EndTime}
                        </p>
                        <p className={`text-[9px] uppercase tracking-widest mt-0.5 font-semibold ${
                          isCur ? 'text-indigo-400' : isPast ? 'text-[#52525b]' : 'text-[#71717a]'
                        }`}>
                          {isCur ? 'probíhá' : isPast ? 'proběhlo' : 'nadcházející'}
                        </p>
                      </div>

                      {/* subject + teacher */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm truncate ${isPast ? 'text-[#71717a]' : 'text-[#fafafa]'}`}>
                          {l.subject?.Name || '—'}
                        </h4>
                        <p className="text-[10px] text-[#a1a1aa]">{l.teacher?.Name || ''}</p>
                        {/* progress bar for current lesson */}
                        {isCur && (
                          <div className="mt-1.5 h-1 bg-[#27272a] rounded-full overflow-hidden w-32">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                 style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-[#71717a] bg-[#27272a] px-2 py-0.5 rounded font-mono shrink-0">
                        {l.room?.Abbrev || '?'}
                      </span>
                    </div>
                  );
                })
            }
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 space-y-3">
          {/* Notes */}
          {notes.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Poznámky</h3>
              {notes.slice(0,3).map((n, i) => (
                <div key={i} className="flex items-start justify-between gap-2 border-l-2 border-amber-500/60 pl-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#fafafa] line-clamp-2">{n.text}</p>
                    <p className="text-[9px] text-[#71717a] mt-0.5">{n.date}</p>
                  </div>
                  <button onClick={() => deleteNote(i)} className="text-[#52525b] hover:text-rose-400 transition-colors shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Homeworks */}
          <div className="glass-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Nejbližší úkoly</h3>
            {homeworks.length === 0
              ? <p className="text-xs text-[#71717a] text-center py-3">Žádné úkoly</p>
              : homeworks.map((hw) => (
                <div key={hw.ID} className="border-l-2 border-indigo-500 pl-3">
                  <p className="text-[10px] text-[#71717a]">{hw.Subject?.Abbrev}</p>
                  <p className="text-xs font-medium text-[#fafafa] mt-0.5 line-clamp-2">{hw.Content}</p>
                </div>
              ))
            }
          </div>
        </section>
      </div>

      {/* ═══ MODAL: Rychlá omluvenka ═══ */}
      <AnimatePresence>
        {showOmluvenka && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !omloading && setShowOmluvenka(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border border-[#27272a] rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
                <div>
                  <h2 className="text-base font-semibold text-[#fafafa]">Rychlá omluvenka</h2>
                  <p className="text-[11px] text-[#71717a] mt-0.5">Zpráva bude odeslána přes Bakaláře</p>
                </div>
                <button onClick={() => setShowOmluvenka(false)} disabled={omloading}
                  className="p-1.5 text-[#71717a] hover:text-[#fafafa] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {omSuccess ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Send size={20} />
                  </div>
                  <p className="text-sm font-medium text-[#fafafa]">Omluvenka odeslána!</p>
                  <button onClick={() => { setShowOmluvenka(false); setOmSuccess(false); }}
                    className="text-[11px] text-indigo-400 hover:underline">Zavřít</button>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Od</span>
                      <input type="date" value={omluvenkaFrom} onChange={e => setOmluvenkaFrom(e.target.value)}
                        className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Do</span>
                      <input type="date" value={omluvenkaTo} onChange={e => setOmluvenkaTo(e.target.value)}
                        className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500" />
                    </label>
                  </div>

                  {recipients.length > 0 && (
                    <label className="space-y-1.5 block">
                      <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Příjemce</span>
                      <select value={omluvenkaRecip} onChange={e => setOmluvenkaRecip(e.target.value)}
                        className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500">
                        {recipients.map((r: any) => (
                          <option key={r.Code} value={r.Code}>{r.DisplayName || r.Name || r.Code}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="space-y-1.5 block">
                    <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">Důvod absence</span>
                    <textarea value={omluvenkaReason} onChange={e => setOmluvenkaReason(e.target.value)}
                      rows={3} placeholder="Nemoc, rodinné důvody…"
                      className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b] resize-none" />
                  </label>

                  {omError && <p className="text-xs text-rose-400">{omError}</p>}

                  <button onClick={sendOmluvenka} disabled={omloading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
                    {omloading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    {omloading ? 'Odesílám…' : 'Odeslat omluvenku'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Přidat poznámku ═══ */}
      <AnimatePresence>
        {showNote && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNote(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border border-[#27272a] rounded-xl w-full max-w-sm">
              <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
                <h2 className="text-base font-semibold text-[#fafafa]">Nová poznámka</h2>
                <button onClick={() => setShowNote(false)} className="p-1.5 text-[#71717a] hover:text-[#fafafa]">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
                  placeholder="Napiš si poznámku…"
                  autoFocus
                  className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-indigo-500 placeholder:text-[#52525b] resize-none" />
                <button onClick={saveNote} disabled={!noteText.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                  Uložit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

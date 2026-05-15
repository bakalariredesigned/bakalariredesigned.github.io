import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  Loader,
  Calendar as CalIcon,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Absence {
  Date: string;
  Unsolved: number;
  Ok: number;
  Missed: number;
  Late: number;
  Soon: number;
  School: number;
  DistanceTeaching: number;
}

interface SubjectAbsence {
  SubjectName: string;
  LessonsCount: number;
  Base: number;
  Late: number;
  Soon: number;
  School: number;
  DistanceTeaching: number;
}

interface Event {
  Id: string;
  EventType: string;
  EventStart: string;
  Content?: string;
  LengthMinutes?: number;
}

export default function Attendance() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [subjectAbsences, setSubjectAbsences] = useState<SubjectAbsence[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'absence' | 'late'>('all');

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        const absenceData = await bakalariService.getAbsences();
        const eventsData = await bakalariService.getEvents();
        
        if (absenceData && absenceData.Absences) {
          setAbsences(absenceData.Absences);
        }

        if (absenceData && Array.isArray(absenceData.AbsencesPerSubject)) {
          setSubjectAbsences(absenceData.AbsencesPerSubject);
        }
        
        if (eventsData && Array.isArray(eventsData.Events)) {
          // Filter for late arrivals
          const lateArrivals = eventsData.Events.filter((e: any) => e.EventType === 'LateComingEvent');
          setEvents(lateArrivals);
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  const getApprovalColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'approved':
      case '1':
      case 'summary':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle2 };
      case 'pending':
      case '0':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock };
      case 'denied':
      case '2':
        return { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: AlertCircle };
      default:
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: Clock };
    }
  };

  const formatDateRange = (dateFrom: string, dateTo: string) => {
    const from = new Date(dateFrom).toLocaleDateString('cs-CZ');
    const to = new Date(dateTo).toLocaleDateString('cs-CZ');
    return from === to ? from : `${from} - ${to}`;
  };

  const formatSummaryDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatPercentage = (missed: number, total: number) => {
    if (!total) return '0 %';
    return `${((missed / total) * 100).toFixed(1).replace('.', ',')} %`;
  };

  const subjectSummaries = [...subjectAbsences]
    .map((subject) => {
      const totalAbsenceHours = subject.Base + subject.Late + subject.Soon + subject.School + subject.DistanceTeaching;
      const absencePercent = subject.LessonsCount ? (totalAbsenceHours / subject.LessonsCount) * 100 : 0;

      return {
        ...subject,
        totalAbsenceHours,
        absencePercent,
      };
    })
    .sort((a, b) => b.absencePercent - a.absencePercent);

  const absenceItems = absences.map((abs, idx) => ({
    id: `absence-${idx}-${abs.Date}`,
    type: 'absence',
    date: formatSummaryDate(abs.Date),
    title: `Souhrn absencí za ${formatSummaryDate(abs.Date)}`,
    hours: `Neomluveno ${abs.Missed}, omluveno ${abs.Ok}`,
    status: abs.Missed > 0 ? 'pending' : 'summary',
    content: `Pozdní ${abs.Late}, brzy ${abs.Soon}, ve škole ${abs.School}, distančně ${abs.DistanceTeaching}`,
    index: idx,
    timestamp: new Date(abs.Date).getTime()
  }));

  const lateItems = events.map((evt, idx) => ({
    id: evt.Id,
    type: 'late',
    date: new Date(evt.EventStart).toLocaleDateString('cs-CZ'),
    title: evt.Content || 'Pozdní příchod',
    hours: evt.LengthMinutes ? `${evt.LengthMinutes} minut` : 'Neuvedeno',
    status: 'reported',
    index: idx,
    timestamp: new Date(evt.EventStart).getTime()
  }));

  const allItems = [...absenceItems, ...lateItems];
  const filteredItems = filter === 'all' ? allItems : allItems.filter(item => item.type === filter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Absence a pozdní příchody</h2>
          <p className="text-[#a1a1aa] text-sm">Přehled absence a pozdních příchodů s jejich schválením</p>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Dny s absencí</span>
                <AlertCircle size={16} className="text-indigo-400" />
              </div>
              <p className="text-3xl font-semibold text-[#fafafa]">{absences.length}</p>
              <p className="text-[10px] text-[#71717a] mt-2">Souhrn podle dní</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Pozdní příchody</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <p className="text-3xl font-semibold text-[#fafafa]">{events.length}</p>
              <p className="text-[10px] text-[#71717a] mt-2">Zaznamenáno v systému</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Dny bez neomluvené</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <p className="text-3xl font-semibold text-[#fafafa]">
                {absences.filter(a => a.Missed === 0).length}
              </p>
              <p className="text-[10px] text-[#71717a] mt-2">Bez neomluvených hodin</p>
            </motion.div>
          </section>

          {/* Subject Absence Summary */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-[#fafafa]">Absence podle předmětů</h3>
                <p className="text-xs text-[#a1a1aa]">Kolik hodin a v procentech žák chyběl v jednotlivých předmětech</p>
              </div>
            </div>

            {subjectSummaries.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-4" />
                <p className="text-[#a1a1aa]">Pro předměty nejsou dostupná data o absenci.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {subjectSummaries.map((subject) => {
                  const percentageLabel = `${subject.absencePercent.toFixed(1).replace('.', ',')} %`;
                  const hoursLabel = `${subject.totalAbsenceHours} z ${subject.LessonsCount} hodin`;
                  const progressWidth = `${Math.min(subject.absencePercent, 100)}%`;

                  return (
                    <motion.div
                      key={subject.SubjectName}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-4"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[#fafafa] truncate">{subject.SubjectName}</h4>
                          <p className="text-xs text-[#a1a1aa] mt-1">{hoursLabel}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#fafafa]">{percentageLabel}</div>
                          <div className="text-[10px] text-[#71717a]">absence</div>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#18181b]">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: progressWidth }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                filter === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]'
              )}
            >
              Vše
            </button>
            <button
              onClick={() => setFilter('absence')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                filter === 'absence'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]'
              )}
            >
              <AlertCircle size={12} />
              Absence
            </button>
            <button
              onClick={() => setFilter('late')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                filter === 'late'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]'
              )}
            >
              <Clock size={12} />
              Pozdní příchody
            </button>
          </div>

          {/* Items List */}
          <section className="space-y-3">
            {sortedItems.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-4" />
                <p className="text-[#a1a1aa]">Žádné absence ani pozdní příchody</p>
              </div>
            ) : (
              sortedItems.map((item, idx) => {
                const colors = getApprovalColor(item.status);
                const Icon = colors.icon;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-4 hover:border-[#3f3f46] transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        colors.bg
                      )}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[#fafafa]">{item.title}</h3>
                            <p className="text-xs text-[#a1a1aa] mt-1 flex items-center gap-2">
                              <CalIcon size={12} />
                              {item.date}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className={cn(
                              "text-xs font-semibold px-2.5 py-1 rounded",
                              colors.bg, colors.text
                            )}>
                              {item.hours}
                            </div>
                          </div>
                        </div>
                        
                        {item.content && (
                          <p className="text-[10px] text-[#71717a] mt-3">
                            {item.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

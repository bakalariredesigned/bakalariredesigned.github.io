import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  AlarmClock, 
  ChevronRight,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avgMark, setAvgMark] = useState<number>(0);
  const [homeworkCount, setHomeworkCount] = useState<number>(0);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [todayDate, setTodayDate] = useState<string>('');
  const [absencePercentage, setAbsencePercentage] = useState<string>('0%');
  const [timetableData, setTimetableData] = useState<any>(null);
  const [todayLessons, setTodayLessons] = useState<any[]>([]);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  // Helper function to convert time string "HH:MM" to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to get current time in minutes since midnight
  const getCurrentTimeInMinutes = (): number => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  useEffect(() => {
    const today = new Date();
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const monthNames = ['ledna', 'února', 'března', 'dubna', 'května', 'június', 'července', 'srpna', 'září', 'octombrie', 'listopadu', 'decembrie'];
    const dayName = dayNames[today.getDay()];
    const date = `${dayName} ${today.getDate()}. ${monthNames[today.getMonth()]}`;
    setTodayDate(date);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const avgMark = await bakalariService.getAverageMark();
        const homeworksData = await bakalariService.getHomeworks();
        const timetable = await bakalariService.getTimetable('actual');
        const absenceData = await bakalariService.getAbsences();
        
        setAvgMark(avgMark);
        
        if (homeworksData?.Homeworks) {
          const uncompletedHomeworks = homeworksData.Homeworks.filter((h: any) => !h.Done);
          setHomeworkCount(uncompletedHomeworks.length);
          setHomeworks(uncompletedHomeworks.slice(0, 3));
        }

        if (timetable && timetable.Days && timetable.Hours) {
          setTimetableData(timetable);
          const today = new Date();
          const dayOfWeek = today.getDay() - 1;
          
          if (dayOfWeek >= 0 && dayOfWeek < timetable.Days.length) {
            const todayData = timetable.Days[dayOfWeek];
            if (todayData.Atoms) {
              const lessons = todayData.Atoms.map((atom: any) => {
                const hour = timetable.Hours.find((h: any) => h.Id === atom.HourId);
                const subject = timetable.Subjects?.find((s: any) => s.Id === atom.SubjectId);
                const teacher = timetable.Teachers?.find((t: any) => t.Id === atom.TeacherId);
                const room = timetable.Rooms?.find((r: any) => r.Id === atom.RoomId);
                return { ...atom, hour, subject, teacher, room };
              });
              
              // Find the current lesson (between begin and end time)
              const currentTimeInMinutes = getCurrentTimeInMinutes();
              const current = lessons.find((lesson: any) => {
                const beginTime = timeToMinutes(lesson.hour?.BeginTime || '0:00');
                const endTime = timeToMinutes(lesson.hour?.EndTime || '0:00');
                return currentTimeInMinutes >= beginTime && currentTimeInMinutes < endTime;
              });
              
              // Find the next lesson (first lesson after current time)
              const nextLessonItem = current || lessons.find((lesson: any) => {
                const beginTime = timeToMinutes(lesson.hour?.BeginTime || '0:00');
                return beginTime > getCurrentTimeInMinutes();
              }) || lessons[0];
              
              setCurrentLesson(current || null);
              setTodayLessons(lessons.slice(0, 4));
              if (nextLessonItem) {
                setNextLesson(nextLessonItem);
              }
            }
          }
        }

        if (absenceData?.Absences) {
          const totalHours = absenceData.Absences.reduce((sum: number, a: any) => {
            const hours = parseInt(a.Hours) || 0;
            return sum + hours;
          }, 0);
          const percentage = Math.min(Math.round((totalHours / 200) * 100), 100);
          setAbsencePercentage(`${percentage}%`);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const stats = [
    { label: 'Průměr známek', value: avgMark.toFixed(2), trend: '-0.05', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Absence', value: absencePercentage, trend: null, icon: AlarmClock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Domácí úkoly', value: homeworkCount.toString(), trend: null, icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Nadcházející testy', value: '0', trend: null, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">
            Ahoj, {user?.name?.split(' ')?.[0] || 'Studente'}! 👋
          </h2>
          <p className="text-[#a1a1aa] text-sm">
            {todayDate}. {nextLesson?.subject?.Name ? `Tvé první vyučování začíná v ${nextLesson?.hour?.BeginTime} (${nextLesson?.subject?.Abbrev}).` : 'Nemáš žádné vyučování.'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
            Celková absence: {absencePercentage}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors font-medium text-xs text-[#a1a1aa] hover:text-[#fafafa]">
            <Plus size={14} />
            Přidat poznámku
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-xs">
            Rychlá omluvenka
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex items-start justify-between group cursor-pointer hover:border-[#3f3f46] transition-colors"
          >
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className={`${stat.bg} ${stat.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                  <stat.icon size={16} />
                </div>
                <button className="p-1 text-[#71717a] hover:text-[#fafafa] transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-2xl font-semibold tracking-tighter text-[#fafafa]">{stat.value}</h3>
                  {stat.trend && (
                    <span className={`text-[10px] mb-1 px-1.5 py-0.5 rounded ${stat.trend.startsWith('-') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                      {stat.trend} od min. týdne
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-tight text-[#e4e4e7]">Dnešní rozvrh</h3>
            <button className="text-[10px] text-indigo-400 hover:underline">Zobrazit celý den</button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="flex flex-col divide-y divide-[#27272a]">
              {todayLessons.map((lesson, i) => {
                const isCurrentLesson = currentLesson?.HourId === lesson.HourId && currentLesson?.SubjectId === lesson.SubjectId;
                return (
                  <div key={i} className={`p-4 flex items-center gap-6 hover:bg-[#27272a]/20 transition-all relative overflow-hidden ${isCurrentLesson ? 'bg-indigo-500/5' : ''}`}>
                    {isCurrentLesson && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                    <div className="w-32 shrink-0">
                      <p className={`text-xs font-medium ${isCurrentLesson ? 'text-indigo-400' : 'text-[#71717a]'}`}>
                        {lesson.hour?.BeginTime} — {lesson.hour?.EndTime}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-[#71717a] mt-1">{isCurrentLesson ? 'probíhá' : 'nadcházející'}</p>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-[#fafafa]">{lesson.subject?.Name || 'Předmět'}</h4>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">{lesson.teacher?.Name || 'Učitel'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#71717a]">Room {lesson.room?.Abbrev || 'N/A'}</p>
                    </div>
                  </div>
                );
              })}
              {todayLessons.length === 0 && (
                <div className="p-4 text-center text-[#71717a] text-sm">Dnes nemáš žádné vyučování.</div>
              )}
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-5 h-full space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Nejbližší úkoly</h2>
            <div className="space-y-4">
              {homeworks.length === 0 ? (
                <p className="text-xs text-[#71717a] text-center py-4">Žádné úkoly</p>
              ) : (
                homeworks.map((hw) => (
                  <div key={hw.ID} className="border-l-2 border-indigo-500 pl-3">
                    <p className="text-[10px] text-[#71717a]">{hw.Subject?.Abbrev}</p>
                    <h4 className="text-xs font-medium text-[#fafafa] mt-1">{hw.Content}</h4>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

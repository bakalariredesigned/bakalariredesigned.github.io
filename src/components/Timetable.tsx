import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings2, 
  MapPin, 
  User, 
  Info,
  Download,
  Loader
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

interface Lesson {
  dayIdx: number;
  hourId: number;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  roomId: string;
  theme: string;
  type: 'normal' | 'canceled' | 'supl';
  beginTime: string;
  endTime: string;
}

export default function Timetable() {
  const [activeDay, setActiveDay] = useState(0);
  const [timetableData, setTimetableData] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimetable = async () => {
      try {
        const data = await bakalariService.getTimetable('actual');
        if (data) {
          setTimetableData(data);
          parseTimetable(data);
        }
      } catch (error) {
        console.error('Error loading timetable:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimetable();
  }, []);

  const parseTimetable = (data: any) => {
    if (!data?.Days || !data?.Hours) return;
    
    const parsed: Lesson[] = [];
    
    data.Days.forEach((day: any, dayIdx: number) => {
      if (day.Atoms) {
        day.Atoms.forEach((atom: any) => {
          const hour = data.Hours.find((h: any) => h.Id === atom.HourId);
          if (hour) {
            parsed.push({
              dayIdx,
              hourId: atom.HourId,
              subjectId: atom.SubjectId,
              teacherId: atom.TeacherId,
              roomId: atom.RoomId,
              theme: atom.Theme,
              type: atom.Change ? 'canceled' : 'normal',
              beginTime: hour.BeginTime,
              endTime: hour.EndTime,
            });
          }
        });
      }
    });
    
    setLessons(parsed);
  };

  const getSubjectName = (subjectId: string) => {
    if (!timetableData?.Subjects) return subjectId;
    const subject = timetableData.Subjects.find((s: any) => s.Id === subjectId);
    return subject?.Abbrev || subjectId;
  };

  const getTeacherName = (teacherId: string) => {
    if (!timetableData?.Teachers) return teacherId;
    const teacher = timetableData.Teachers.find((t: any) => t.Id === teacherId);
    return teacher?.Abbrev || teacherId;
  };

  const getRoomName = (roomId: string) => {
    if (!timetableData?.Rooms) return roomId;
    const room = timetableData.Rooms.find((r: any) => r.Id === roomId);
    return room?.Abbrev || roomId;
  };

  const getDayLabel = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}. ${d.getMonth() + 1}.`;
  };

  const getWeekRange = () => {
    if (!timetableData?.Days || timetableData.Days.length === 0) {
      return 'Tento týden';
    }
    const firstDay = timetableData.Days[0]?.DayDescription;
    const lastDay = timetableData.Days[timetableData.Days.length - 1]?.DayDescription;
    if (firstDay && lastDay) {
      return `${getDayLabel(firstDay)} – ${getDayLabel(lastDay)}`;
    }
    return 'Tento týden';
  };

  const getLessonsForDay = (dayIdx: number) => {
    return lessons.filter(l => l.dayIdx === dayIdx).sort((a, b) => a.hourId - b.hourId);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Rozvrh hodin</h2>
          <p className="text-[#a1a1aa] text-sm">Týden: {getWeekRange()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg p-1">
            <button className="p-1 hover:bg-[#27272a] rounded transition-colors text-[#a1a1aa] hover:text-[#fafafa]"><ChevronLeft size={16} /></button>
            <div className="px-3 flex items-center font-medium text-xs text-[#fafafa]">Tento týden</div>
            <button className="p-1 hover:bg-[#27272a] rounded transition-colors text-[#a1a1aa] hover:text-[#fafafa]"><ChevronRight size={16} /></button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#fafafa] text-[#09090b] rounded-lg hover:bg-[#e4e4e7] transition-colors font-medium text-xs">
            <Download size={14} />
            Exportovat
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(i)}
                  className={cn(
                    "px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border",
                    activeDay === i ? "bg-[#18181b] border-[#3f3f46] text-[#fafafa]" : "bg-transparent text-[#71717a] border-[#27272a]"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {getLessonsForDay(activeDay).map((lesson, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 border-l-4 border-indigo-500"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col justify-center min-w-fit">
                      <span className="text-xs font-bold text-[#fafafa]">{lesson.beginTime}</span>
                      <span className="text-[9px] text-[#71717a]">{lesson.endTime}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#fafafa] mb-2">{getSubjectName(lesson.subjectId)}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-[#a1a1aa]">
                        <span className="flex items-center gap-1">
                          <User size={12} /> {getTeacherName(lesson.teacherId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {getRoomName(lesson.roomId)}
                        </span>
                      </div>
                      {lesson.theme && (
                        <p className="text-[9px] text-[#71717a] mt-2 italic">{lesson.theme}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {getLessonsForDay(activeDay).length === 0 && (
                <div className="text-center py-12 text-[#71717a]">
                  <p className="text-sm">Žádné hodiny v tento den</p>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#27272a]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#71717a] uppercase">Čas</th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-6 py-4 text-left text-xs font-semibold text-[#71717a] uppercase">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {Array.from(new Set(lessons.map(l => l.hourId))).sort().map((hourId) => (
                    <tr key={hourId}>
                      <td className="px-6 py-4 text-[10px] font-medium text-[#a1a1aa]">
                        {lessons.find(l => l.hourId === hourId)?.beginTime}
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const lesson = lessons.find(l => l.dayIdx === dayIdx && l.hourId === hourId);
                        return (
                          <td key={`${dayIdx}-${hourId}`} className="px-6 py-4">
                            {lesson ? (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-[#fafafa]">{getSubjectName(lesson.subjectId)}</p>
                                <p className="text-[9px] text-[#71717a]">{getTeacherName(lesson.teacherId)}</p>
                                <p className="text-[9px] text-[#71717a]">{getRoomName(lesson.roomId)}</p>
                              </div>
                            ) : (
                              <p className="text-[9px] text-[#71717a]">—</p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

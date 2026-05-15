import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Filter,
  Loader
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Homework {
  ID: string;
  Content: string;
  DateEnd: string;
  Done: boolean;
  Subject: { Name: string; Abbrev: string };
  Teacher: { Name: string };
}

export default function Homework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');

  useEffect(() => {
    const loadHomeworks = async () => {
      try {
        const data = await bakalariService.getHomeworks();
        if (data?.Homeworks) {
          setHomeworks(data.Homeworks);
        }
      } catch (error) {
        console.error('Error loading homeworks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeworks();
  }, []);

  const todoTasks = homeworks.filter(t => !t.Done);
  const doneTasks = homeworks.filter(t => t.Done);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) return 'Dnes';
    if (d.toDateString() === tomorrow.toDateString()) return 'Zítra';
    
    const days = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return `Za ${days} dny`;
    
    return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Domácí úkoly</h2>
          <p className="text-[#a1a1aa] text-sm">Správa studijních povinností a úkolů</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Vyhledat úkol..."
              className="w-48 bg-[#18181b] border border-[#27272a] rounded-lg py-1.5 pl-9 pr-3 outline-none focus:border-[#3f3f46] text-xs text-[#fafafa] placeholder:text-[#71717a] transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors font-medium text-xs text-[#a1a1aa] hover:text-[#fafafa]">
            <Filter size={14} />
            Filtrovat
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-xs">
            <Plus size={14} />
            Nový osobní úkol
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          {/* Kanban Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column: To Do */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Clock size={16} />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#fafafa]">K vypracování</h3>
                  <span className="text-[10px] font-medium text-[#71717a] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-full">{todoTasks.length}</span>
                </div>
              </div>

              <div className="space-y-4">
                {todoTasks.length === 0 ? (
                  <div className="text-center py-8 text-[#71717a]">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Všechny úkoly hotovy!</p>
                  </div>
                ) : (
                  todoTasks.map((task, i) => {
                    const dueDate = new Date(task.DateEnd);
                    const today = new Date();
                    const isOverdue = dueDate < today && !task.Done;
                    const isToday = dueDate.toDateString() === today.toDateString();
                    const isTomorrow = dueDate.toDateString() === new Date(today.getTime() + 24*60*60*1000).toDateString();
                    
                    return (
                      <motion.div
                        key={task.ID}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-5 group cursor-pointer hover:border-[#3f3f46] transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-medium text-[#a1a1aa] tracking-widest">{task.Subject.Abbrev}</span>
                            <h4 className="text-sm font-semibold mt-1 group-hover:text-indigo-400 transition-colors text-[#fafafa]">{task.Content}</h4>
                          </div>
                          <button className="p-1 text-[#71717a] hover:text-[#fafafa] opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs font-medium">
                            <span className={cn(
                              "flex items-center gap-1",
                              isToday || isTomorrow || isOverdue ? 'text-rose-400' : 'text-[#71717a]'
                            )}>
                              <Calendar size={12} /> {formatDate(task.DateEnd)}
                            </span>
                          </div>
                          <button className="px-3 py-1.5 rounded-lg bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold transition-all uppercase tracking-tight flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Hotovo
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column: Completed */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 text-[#71717a]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#fafafa]">Dokončeno</h3>
                  <span className="text-[10px] font-medium text-[#71717a] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-full">{doneTasks.length}</span>
                </div>
              </div>

              <div className="space-y-4 opacity-70">
                {doneTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-[#27272a] rounded-lg flex items-center justify-center text-[#71717a] font-medium text-xs">
                    Žádné dokončené úkoly
                  </div>
                ) : (
                  doneTasks.map((task, i) => (
                    <div
                      key={task.ID}
                      className="glass-card p-5 border-[#27272a] border-dashed"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-medium text-[#71717a] tracking-widest">{task.Subject.Abbrev}</span>
                          <h4 className="text-sm font-semibold mt-1 line-through text-[#71717a]">{task.Content}</h4>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between text-xs font-medium text-[#71717a]">
                        <span className="flex items-center gap-1 text-[#a1a1aa]">
                          <CheckCircle2 size={12} className="text-emerald-400" /> Dokončeno
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

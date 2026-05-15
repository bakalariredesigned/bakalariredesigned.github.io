import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

interface NotifItem { id: string; type: string; text: string; path: string; read: boolean; }

const STORAGE_KEY = 'bakNotifDismissed';
const getDismissed = (): Set<string> => new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
const saveDismissed = (s: Set<string>) => localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));

const READ_KEY = 'bakNotifRead';
const getRead = (): Set<string> => new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
const saveRead = (s: Set<string>) => localStorage.setItem(READ_KEY, JSON.stringify([...s]));

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [absencePercentage, setAbsencePercentage] = useState<string>('…');
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [dismissed,  setDismissed]  = useState<Set<string>>(getDismissed);
  const [readIds,    setReadIds]    = useState<Set<string>>(getRead);
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const visible    = notifItems.filter(n => !dismissed.has(n.id));
  const unreadCount = visible.filter(n => !readIds.has(n.id)).length;

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markRead = (id: string) => {
    const next = new Set(readIds); next.add(id);
    setReadIds(next); saveRead(next);
  };
  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next); saveDismissed(next);
  };
  const markAllRead = () => {
    const next = new Set(readIds);
    visible.forEach(n => next.add(n.id));
    setReadIds(next); saveRead(next);
  };
  const dismissAll = () => {
    const next = new Set(dismissed);
    visible.forEach(n => next.add(n.id));
    setDismissed(next); saveDismissed(next);
  };
  
  useEffect(() => {
    const loadFooterData = async () => {
      try {
        const absenceData = await bakalariService.getAbsences();
        if (absenceData?.Absences) {
          const total = absenceData.Absences.reduce((s: number, a: any) =>
            s + (a.Missed||0) + (a.Ok||0) + (a.Unsolved||0) + (a.Late||0) + (a.Soon||0) + (a.School||0), 0);
          const lessons = (absenceData.AbsencesPerSubject || []).reduce((s: number, x: any) => s + (x.LessonsCount||0), 0);
          if (total === 0) setAbsencePercentage('0 h');
          else if (lessons > 0) setAbsencePercentage(`${Math.min(Math.round((total/lessons)*100),100)} %`);
          else setAbsencePercentage(`${total} h`);
        }
      } catch (error) {
        console.error('Error loading footer data:', error);
      }
    };
    loadFooterData();
  }, []);

  // Notifications: new marks + unread messages
  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const [marksData, msgs] = await Promise.all([
          bakalariService.getMarks(),
          bakalariService.getReceivedMessages(),
        ]);
        const items: NotifItem[] = [];
        marksData?.Subjects?.forEach((s: any) => {
          s.Marks?.forEach((m: any) => {
            if (m.IsNew) {
              const id = `mark-${s.Subject?.Id}-${m.MarkDate||m.Date}`;
              items.push({ id, type:'mark', text:`Nová známka z ${s.Subject?.Abbrev}: ${m.MarkText}${m.Caption?' – '+m.Caption:''}`, path:'/marks', read: false });
            }
          });
        });
        msgs?.filter((m: any) => !m.IsRead).slice(0, 5).forEach((m: any) => {
          const id = `msg-${m.Id}`;
          items.push({ id, type:'msg', text:`Zpráva: ${m.Title || '(bez předmětu)'}`, path:'/messages', read: false });
        });
        setNotifItems(items);
      } catch {}
    };
    checkNotifs();
  }, []);
  
  // Extract initials from name
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };
  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans overflow-hidden select-none">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-[#27272a] px-6 flex items-center justify-between">
          <div className="flex-1 max-w-xl">
            <div className="relative group flex items-center bg-[#18181b] rounded-full px-3 py-1.5 border border-[#27272a] w-80">
              <Search size={16} className="text-[#71717a] mr-2" />
              <input
                type="text"
                placeholder="Hledej předměty, učitele nebo zkoušky..."
                className="bg-transparent border-none outline-none text-xs text-[#fafafa] w-full placeholder:text-[#71717a]"
              />
              <span className="ml-auto text-[10px] bg-[#27272a] px-1.5 rounded text-[#a1a1aa]">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button onClick={() => setShowNotifs(v => !v)}
                className="relative p-1 hover:text-[#fafafa] text-[#a1a1aa] transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div initial={{opacity:0,y:-8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.95}}
                    className="absolute right-0 top-8 w-88 bg-[#18181b] border border-[#27272a] rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{ width: '22rem' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-[#fafafa]">Oznámení</h3>
                        {unreadCount > 0 && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                            {unreadCount} nových
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {visible.length > 0 && (
                          <>
                            <button onClick={markAllRead} title="Označit vše jako přečtené"
                              className="p-1.5 text-[#71717a] hover:text-emerald-400 transition-colors rounded">
                              <CheckCheck size={14} />
                            </button>
                            <button onClick={dismissAll} title="Smazat vše"
                              className="p-1.5 text-[#71717a] hover:text-rose-400 transition-colors rounded">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        <button onClick={() => setShowNotifs(false)} className="p-1.5 text-[#71717a] hover:text-[#fafafa] transition-colors rounded">
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    {visible.length === 0
                      ? <div className="p-6 text-center text-[#71717a] text-xs">Žádná oznámení</div>
                      : <div className="max-h-72 overflow-y-auto divide-y divide-[#27272a]">
                          <AnimatePresence initial={false}>
                            {visible.map(n => {
                              const isRead = readIds.has(n.id);
                              return (
                                <motion.div key={n.id}
                                  initial={{opacity:1,height:'auto'}} exit={{opacity:0,height:0,overflow:'hidden'}}
                                  transition={{duration:0.2}}
                                  className={`flex items-start gap-2 px-4 py-3 group transition-colors ${isRead ? 'opacity-60' : 'bg-indigo-500/[0.03]'} hover:bg-[#27272a]/60`}>
                                  {/* unread dot */}
                                  <div className="mt-1.5 shrink-0">
                                    {!isRead
                                      ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                      : <div className="w-1.5 h-1.5" />
                                    }
                                  </div>

                                  {/* content – clickable */}
                                  <button className="flex-1 text-left min-w-0"
                                    onClick={() => { markRead(n.id); navigate(n.path); setShowNotifs(false); }}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${n.type==='mark'?'bg-emerald-500/20 text-emerald-400':'bg-indigo-500/20 text-indigo-400'}`}>
                                        {n.type==='mark'?'Známka':'Zpráva'}
                                      </span>
                                    </div>
                                    <p className={`text-xs line-clamp-2 ${isRead ? 'text-[#71717a]' : 'text-[#fafafa]'}`}>{n.text}</p>
                                  </button>

                                  {/* action buttons */}
                                  <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!isRead && (
                                      <button onClick={() => markRead(n.id)} title="Označit jako přečtené"
                                        className="p-1 text-[#71717a] hover:text-emerald-400 transition-colors">
                                        <Check size={12} />
                                      </button>
                                    )}
                                    <button onClick={() => dismiss(n.id)} title="Smazat"
                                      className="p-1 text-[#71717a] hover:text-rose-400 transition-colors">
                                      <X size={12} />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-4 w-[1px] bg-[#27272a]" />
            <div className="flex items-center gap-3 pl-2">
              <span className="text-xs font-medium text-[#a1a1aa]">{user?.name || 'Studenté'}</span>
              <div className="w-8 h-8 rounded-full border border-[#3f3f46] bg-[#27272a] flex items-center justify-center text-[#a1a1aa] text-[10px] font-medium">
                {getInitials(user?.name || 'U')}
              </div>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <Outlet />
          </motion.div>
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t border-[#27272a] px-4 flex items-center justify-between bg-[#09090b]">
          <div className="flex items-center gap-4 text-[9px] text-[#71717a]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> API Připojeno
            </span>
            <span>Systém v24.10.1</span>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-[#71717a] uppercase tracking-tighter">
            <span>Absence: {absencePercentage}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

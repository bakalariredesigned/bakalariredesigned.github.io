import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [absencePercentage, setAbsencePercentage] = useState<string>('…');
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<{type:string;text:string;path:string}[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  
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
        const items: {type:string;text:string;path:string}[] = [];
        // New marks
        marksData?.Subjects?.forEach((s: any) => {
          s.Marks?.forEach((m: any) => {
            if (m.IsNew) items.push({ type:'mark', text:`Nová známka z ${s.Subject?.Abbrev}: ${m.MarkText} – ${m.Caption||''}`, path:'/marks' });
          });
        });
        // Unread messages
        msgs?.filter((m: any) => !m.IsRead).slice(0, 5).forEach((m: any) => {
          items.push({ type:'msg', text:`Zpráva: ${m.Title || '(bez předmětu)'}`, path:'/messages' });
        });
        setNotifItems(items);
        setNotifCount(items.length);
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
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div initial={{opacity:0,y:-8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.95}}
                    className="absolute right-0 top-8 w-80 bg-[#18181b] border border-[#27272a] rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
                      <h3 className="text-xs font-semibold text-[#fafafa]">Oznámení</h3>
                      <button onClick={() => setShowNotifs(false)} className="text-[#71717a] hover:text-[#fafafa]"><X size={14} /></button>
                    </div>
                    {notifItems.length === 0
                      ? <div className="p-6 text-center text-[#71717a] text-xs">Žádná nová oznámení</div>
                      : <div className="max-h-64 overflow-y-auto divide-y divide-[#27272a]">
                          {notifItems.map((n, i) => (
                            <button key={i} onClick={() => { navigate(n.path); setShowNotifs(false); }}
                              className="w-full text-left px-4 py-3 hover:bg-[#27272a] transition-colors">
                              <div className="flex items-start gap-2">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${n.type==='mark'?'bg-emerald-500/20 text-emerald-400':'bg-indigo-500/20 text-indigo-400'}`}>
                                  {n.type==='mark'?'Známka':'Zpráva'}
                                </span>
                                <p className="text-xs text-[#fafafa] line-clamp-2">{n.text}</p>
                              </div>
                            </button>
                          ))}
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

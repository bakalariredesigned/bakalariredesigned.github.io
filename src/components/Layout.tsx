import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, X, Check, CheckCheck, Trash2, GraduationCap, User, Calendar, LayoutDashboard, Clock, MessageSquare, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

interface SearchResult { type: string; title: string; sub: string; path: string; }
interface NotifItem { id: string; type: string; text: string; path: string; read: boolean; }

const STORAGE_KEY = 'bakNotifDismissed';
const getDismissed = (): Set<string> => new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
const saveDismissed = (s: Set<string>) => localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));

const READ_KEY = 'bakNotifRead';
const getRead = (): Set<string> => new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
const saveRead = (s: Set<string>) => localStorage.setItem(READ_KEY, JSON.stringify([...s]));

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Přehled',  path: '/' },
  { icon: Calendar,        label: 'Rozvrh',   path: '/timetable' },
  { icon: GraduationCap,  label: 'Známky',   path: '/marks' },
  { icon: Clock,           label: 'Absence',  path: '/attendance' },
  { icon: MessageSquare,   label: 'Zprávy',   path: '/messages' },
];

const PAGE_TITLES: Record<string, string> = {
  '/':             'Přehled',
  '/timetable':    'Rozvrh',
  '/marks':        'Známky & Analýza',
  '/homework':     'Úkoly',
  '/attendance':   'Absence',
  '/messages':     'Zprávy',
  '/notifications':'Oznámení',
  '/download':     'Stáhnout aplikaci',
};

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [absencePercentage, setAbsencePercentage] = useState<string>('…');
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [dismissed,  setDismissed]  = useState<Set<string>>(getDismissed);
  const [readIds,    setReadIds]    = useState<Set<string>>(getRead);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const bellRef  = useRef<HTMLDivElement>(null);

  const [searchQ,      setSearchQ]      = useState('');
  const [searchItems,  setSearchItems]  = useState<SearchResult[]>([]);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadSearchData = useCallback(async () => {
    if (searchLoaded) return;
    try {
      const [marksData, tt] = await Promise.all([
        bakalariService.getMarks(),
        bakalariService.getTimetable('actual'),
      ]);
      const items: SearchResult[] = [];
      marksData?.Subjects?.forEach((s: any) => {
        items.push({ type:'subject', title: s.Subject?.Name || '', sub: `${s.Subject?.Abbrev||''} · průměr ${parseFloat(s.AverageText||'0').toFixed(2)}`, path:'/marks' });
      });
      const seenT = new Set<string>();
      tt?.Teachers?.forEach((t: any) => {
        if (!seenT.has(t.Id)) { seenT.add(t.Id); items.push({ type:'teacher', title: t.Name||t.Abbrev||'', sub:'Učitel · rozvrh', path:'/timetable' }); }
      });
      const seenS = new Set<string>();
      tt?.Subjects?.forEach((s: any) => {
        if (!seenS.has(s.Id)) { seenS.add(s.Id); items.push({ type:'timetable', title: s.Name||s.Abbrev||'', sub:`Rozvrh · ${s.Abbrev||''}`, path:'/timetable' }); }
      });
      setSearchItems(items);
      setSearchLoaded(true);
    } catch {}
  }, [searchLoaded]);

  const searchResults: SearchResult[] = searchQ.length < 2 ? [] :
    searchItems.filter(i => i.title.toLowerCase().includes(searchQ.toLowerCase()) || i.sub.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 7);

  const visible     = notifItems.filter(n => !dismissed.has(n.id));
  const unreadCount = visible.filter(n => !readIds.has(n.id)).length;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (bellRef.current  && !bellRef.current.contains(e.target as Node))   setShowNotifs(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markRead   = (id: string) => { const n = new Set(readIds); n.add(id); setReadIds(n); saveRead(n); };
  const dismiss    = (id: string) => { const n = new Set(dismissed); n.add(id); setDismissed(n); saveDismissed(n); };
  const markAllRead = () => { const n = new Set(readIds); visible.forEach(x => n.add(x.id)); setReadIds(n); saveRead(n); };
  const dismissAll  = () => { const n = new Set(dismissed); visible.forEach(x => n.add(x.id)); setDismissed(n); saveDismissed(n); };

  useEffect(() => {
    const load = async () => {
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
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const check = async () => {
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
    check();
  }, []);

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const currentTitle = PAGE_TITLES[location.pathname] || 'Bakaláři 3.0';

  const NotifDropdown = () => (
    <motion.div initial={{opacity:0,y:-8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.95}}
      className="absolute right-0 top-8 bg-[#18181b] border border-[#27272a] rounded-xl shadow-xl z-50 overflow-hidden"
      style={{ width: '22rem', maxWidth: 'calc(100vw - 2rem)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[#fafafa]">Oznámení</h3>
          {unreadCount > 0 && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">{unreadCount} nových</span>}
        </div>
        <div className="flex items-center gap-1">
          {visible.length > 0 && (
            <>
              <button onClick={markAllRead} title="Označit vše jako přečtené" className="p-1.5 text-[#71717a] hover:text-emerald-400 transition-colors rounded"><CheckCheck size={14} /></button>
              <button onClick={dismissAll} title="Smazat vše" className="p-1.5 text-[#71717a] hover:text-rose-400 transition-colors rounded"><Trash2 size={14} /></button>
            </>
          )}
          <button onClick={() => setShowNotifs(false)} className="p-1.5 text-[#71717a] hover:text-[#fafafa] transition-colors rounded"><X size={14} /></button>
        </div>
      </div>
      {visible.length === 0
        ? <div className="p-6 text-center text-[#71717a] text-xs">Žádná oznámení</div>
        : <div className="max-h-72 overflow-y-auto divide-y divide-[#27272a]">
            <AnimatePresence initial={false}>
              {visible.map(n => {
                const isRead = readIds.has(n.id);
                return (
                  <motion.div key={n.id} initial={{opacity:1,height:'auto'}} exit={{opacity:0,height:0,overflow:'hidden'}} transition={{duration:0.2}}
                    className={`flex items-start gap-2 px-4 py-3 group transition-colors ${isRead ? 'opacity-60' : 'bg-indigo-500/[0.03]'} hover:bg-[#27272a]/60`}>
                    <div className="mt-1.5 shrink-0">{!isRead ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> : <div className="w-1.5 h-1.5" />}</div>
                    <button className="flex-1 text-left min-w-0" onClick={() => { markRead(n.id); navigate(n.path); setShowNotifs(false); }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${n.type==='mark'?'bg-emerald-500/20 text-emerald-400':'bg-indigo-500/20 text-indigo-400'}`}>
                          {n.type==='mark'?'Známka':'Zpráva'}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${isRead ? 'text-[#71717a]' : 'text-[#fafafa]'}`}>{n.text}</p>
                    </button>
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isRead && <button onClick={() => markRead(n.id)} className="p-1 text-[#71717a] hover:text-emerald-400 transition-colors"><Check size={12} /></button>}
                      <button onClick={() => dismiss(n.id)} className="p-1 text-[#71717a] hover:text-rose-400 transition-colors"><X size={12} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
      }
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans overflow-hidden select-none">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">

        {/* ── Desktop header ── */}
        <header className="hidden md:flex h-14 border-b border-[#27272a] px-6 items-center justify-between relative z-40">
          <div ref={searchRef} className="flex-1 max-w-md relative">
            <div className={`flex items-center bg-[#18181b] rounded-full px-3 py-1.5 border transition-colors ${showSearch && searchQ ? 'border-indigo-500/50' : 'border-[#27272a]'}`}>
              <Search size={14} className="text-[#71717a] mr-2 shrink-0" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                onFocus={() => { setShowSearch(true); loadSearchData(); }}
                placeholder="Hledej předměty, učitele…"
                className="bg-transparent border-none outline-none text-xs text-[#fafafa] w-full placeholder:text-[#71717a]" />
              {searchQ
                ? <button onClick={() => { setSearchQ(''); setShowSearch(false); }} className="ml-2 text-[#71717a] hover:text-[#fafafa]"><X size={13} /></button>
                : <span className="ml-auto text-[10px] bg-[#27272a] px-1.5 rounded text-[#a1a1aa] shrink-0">⌘K</span>
              }
            </div>
            <AnimatePresence>
              {showSearch && searchQ.length >= 2 && (
                <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                  className="absolute top-10 left-0 right-0 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchResults.length === 0
                    ? <div className="px-4 py-3 text-xs text-[#71717a]">Žádné výsledky pro „{searchQ}"</div>
                    : searchResults.map((r, i) => {
                        const Icon = r.type === 'teacher' ? User : r.type === 'subject' ? GraduationCap : Calendar;
                        return (
                          <button key={i} onClick={() => { navigate(r.path); setShowSearch(false); setSearchQ(''); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#27272a] transition-colors text-left">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.type==='teacher'?'bg-indigo-500/15 text-indigo-400':r.type==='subject'?'bg-emerald-500/15 text-emerald-400':'bg-amber-500/15 text-amber-400'}`}>
                              <Icon size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[#fafafa] truncate">{r.title}</p>
                              <p className="text-[10px] text-[#71717a] truncate">{r.sub}</p>
                            </div>
                          </button>
                        );
                      })
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <div ref={bellRef} className="relative">
              <button onClick={() => setShowNotifs(v => !v)} className="relative p-1 hover:text-[#fafafa] text-[#a1a1aa] transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>{showNotifs && <NotifDropdown />}</AnimatePresence>
            </div>
            <div className="h-4 w-[1px] bg-[#27272a]" />
            <div className="flex items-center gap-3 pl-2">
              <span className="text-xs font-medium text-[#a1a1aa]">{user?.name || 'Student'}</span>
              <div className="w-8 h-8 rounded-full border border-[#3f3f46] bg-[#27272a] flex items-center justify-center text-[#a1a1aa] text-[10px] font-medium">
                {getInitials(user?.name || 'U')}
              </div>
            </div>
          </div>
        </header>

        {/* ── Mobile header ── */}
        <header className="md:hidden flex h-14 border-b border-[#27272a] px-4 items-center justify-between relative z-40 shrink-0">
          <AnimatePresence mode="wait">
            {showMobileSearch ? (
              <motion.div key="search" initial={{opacity:0, x: 20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}}
                className="flex-1 flex items-center gap-2">
                <div className="flex-1 flex items-center bg-[#18181b] rounded-full px-3 py-2 border border-indigo-500/50">
                  <Search size={14} className="text-[#71717a] mr-2 shrink-0" />
                  <input autoFocus type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    onFocus={loadSearchData}
                    placeholder="Hledej…"
                    className="bg-transparent border-none outline-none text-sm text-[#fafafa] w-full placeholder:text-[#71717a]" />
                  {searchQ && <button onClick={() => setSearchQ('')} className="ml-2 text-[#71717a]"><X size={14} /></button>}
                </div>
                <button onClick={() => { setShowMobileSearch(false); setSearchQ(''); }}
                  className="text-[#a1a1aa] text-sm font-medium px-1 shrink-0">Zrušit</button>
              </motion.div>
            ) : (
              <motion.div key="title" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex-1 flex items-center justify-between">
                <h1 className="text-base font-semibold text-[#fafafa] truncate">{currentTitle}</h1>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setShowMobileSearch(true); loadSearchData(); }}
                    className="p-2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
                    <Search size={20} />
                  </button>
                  <div ref={bellRef} className="relative">
                    <button onClick={() => setShowNotifs(v => !v)} className="relative p-2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <AnimatePresence>{showNotifs && <NotifDropdown />}</AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile search results dropdown */}
          <AnimatePresence>
            {showMobileSearch && searchQ.length >= 2 && (
              <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                className="absolute top-14 left-0 right-0 bg-[#18181b] border-b border-[#27272a] shadow-2xl z-50 overflow-hidden">
                {searchResults.length === 0
                  ? <div className="px-4 py-4 text-sm text-[#71717a]">Žádné výsledky pro „{searchQ}"</div>
                  : searchResults.map((r, i) => {
                      const Icon = r.type === 'teacher' ? User : r.type === 'subject' ? GraduationCap : Calendar;
                      return (
                        <button key={i} onClick={() => { navigate(r.path); setShowMobileSearch(false); setSearchQ(''); }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#27272a] active:bg-[#27272a] transition-colors text-left border-b border-[#27272a]/50 last:border-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type==='teacher'?'bg-indigo-500/15 text-indigo-400':r.type==='subject'?'bg-emerald-500/15 text-emerald-400':'bg-amber-500/15 text-amber-400'}`}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#fafafa] truncate">{r.title}</p>
                            <p className="text-xs text-[#71717a] truncate">{r.sub}</p>
                          </div>
                        </button>
                      );
                    })
                }
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 custom-scrollbar">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </div>

        {/* Desktop status bar */}
        <footer className="hidden md:flex h-8 border-t border-[#27272a] px-4 items-center justify-between bg-[#09090b]">
          <div className="flex items-center gap-4 text-[9px] text-[#71717a]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API Připojeno</span>
            <span>Systém v24.10.1</span>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-[#71717a] uppercase tracking-tighter">
            <span>Absence: {absencePercentage}</span>
            <div className="w-px h-3 bg-[#27272a]" />
            <span className="normal-case tracking-normal">© Made by Daniel <span className="text-[#52525b]">"Dndskid"</span> Horáček</span>
          </div>
        </footer>

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-t border-[#27272a] pb-safe">
          <div className="flex items-stretch h-16">
            {BOTTOM_NAV.map(item => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 relative"
                >
                  <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <item.icon size={22} className={isActive ? 'text-indigo-400' : 'text-[#52525b]'} strokeWidth={isActive ? 2.2 : 1.8} />
                  </motion.div>
                  <span className={`text-[9px] font-medium leading-none ${isActive ? 'text-indigo-400' : 'text-[#52525b]'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div layoutId="bottomNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}

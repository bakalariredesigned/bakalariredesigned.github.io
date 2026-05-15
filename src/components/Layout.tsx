import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { bakalariService } from '../services/bakalariService';

export default function Layout() {
  const { user } = useAuth();
  const [absencePercentage, setAbsencePercentage] = useState<string>('0%');
  const [storageUsage, setStorageUsage] = useState<string>('0 / 5 GB');
  
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
            <div className="relative">
              <Bell size={20} className="text-[#a1a1aa]" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#09090b]" />
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
            <div className="w-px h-3 bg-[#27272a]"></div>
            <span>Úlohy: {storageUsage}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

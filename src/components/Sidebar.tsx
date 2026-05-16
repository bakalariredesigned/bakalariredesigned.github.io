import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, GraduationCap, BookOpen,
  MessageSquare, Bell, Clock, LogOut, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Přehled',        path: '/' },
    { icon: Calendar,        label: 'Rozvrh',         path: '/timetable' },
    { icon: GraduationCap,  label: 'Známky & Analýza',path: '/marks' },
    { icon: BookOpen,        label: 'Úkoly',           path: '/homework' },
    { icon: Clock,           label: 'Absence',         path: '/attendance' },
    { icon: MessageSquare,   label: 'Zprávy',          path: '/messages' },
    { icon: Bell,            label: 'Oznámení',        path: '/notifications' },
  ];

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col bg-[#09090b] border-r border-[#27272a] p-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <img src="/favicon.png" alt="logo" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
        <span className="font-semibold tracking-tight text-lg">Bakaláři <span className="text-emerald-400 font-normal">3.0</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => cn(isActive ? 'nav-item-active' : 'nav-item')}>
            <item.icon size={16} className="shrink-0" />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="mt-auto border-t border-[#27272a] pt-4 space-y-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-[10px] text-[#a1a1aa] shrink-0 uppercase">
            {user?.name?.[0] || 'S'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate">{user?.name || 'Student'}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {user?.class && <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded shrink-0">{user.class}</span>}
              {user?.className && <span className="text-[10px] text-[#71717a] truncate">{user.className}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/download')}
          className="flex items-center gap-2 px-2 py-2 w-full rounded-lg text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors text-xs border border-emerald-500/20 hover:border-emerald-500/40">
          <Smartphone size={15} className="shrink-0" />
          <span>Stáhnout aplikaci</span>
        </button>
        <button onClick={logout}
          className="flex items-center gap-2 px-2 py-2 w-full rounded-lg text-[#71717a] hover:text-rose-400 hover:bg-rose-500/5 transition-colors text-xs">
          <LogOut size={15} className="shrink-0" />
          <span>Odhlásit se</span>
        </button>
      </div>
    </aside>
  );
}

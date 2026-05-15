import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, GraduationCap, BookOpen,
  MessageSquare, Bell, Clock, LogOut, Smartphone, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Přehled', path: '/' },
    { icon: Calendar, label: 'Rozvrh', path: '/timetable' },
    { icon: GraduationCap, label: 'Známky & Analýza', path: '/marks' },
    { icon: BookOpen, label: 'Úkoly', path: '/homework' },
    { icon: Clock, label: 'Absence', path: '/attendance' },
    { icon: MessageSquare, label: 'Zprávy', path: '/messages' },
    { icon: Bell, label: 'Oznámení', path: '/notifications' },
  ];

  const SidebarContent = () => (
    <aside className={cn(
      "h-full flex flex-col bg-[#09090b] border-r border-[#27272a] transition-all duration-300 p-4",
      collapsed ? "w-20" : "w-60"
    )}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <img src="/favicon.png" alt="logo" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
        {!collapsed && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-0">
            <span className="font-semibold tracking-tight text-lg">Bakaláři <span className="text-emerald-400 font-normal">3.0</span></span>
          </motion.div>
        )}
        {/* Mobile close button */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="ml-auto p-1 text-[#71717a] hover:text-[#fafafa] transition-colors md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onMobileClose}
            className={({ isActive }) => cn(
              isActive ? "nav-item-active" : "nav-item"
            )}
          >
            <item.icon size={16} className="shrink-0" />
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
                {item.label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="mt-auto border-t border-[#27272a] pt-4 space-y-2">
        <div className={cn('flex items-center gap-3 px-2', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-[10px] text-[#a1a1aa] shrink-0 uppercase">
            {user?.name?.[0] || 'S'}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user?.name || 'Student'}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {user?.class && (
                  <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded shrink-0">{user.class}</span>
                )}
                {user?.className && (
                  <span className="text-[10px] text-[#71717a] truncate">{user.className}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => { navigate('/download'); onMobileClose?.(); }}
          className={cn('flex items-center gap-2 px-2 py-2 w-full rounded-lg text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors text-xs border border-emerald-500/20 hover:border-emerald-500/40',
            collapsed && 'justify-center')}>
          <Smartphone size={15} className="shrink-0" />
          {!collapsed && <span>Stáhnout aplikaci</span>}
        </button>
        <button onClick={logout}
          className={cn('flex items-center gap-2 px-2 py-2 w-full rounded-lg text-[#71717a] hover:text-rose-400 hover:bg-rose-500/5 transition-colors text-xs',
            collapsed && 'justify-center')}>
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Odhlásit se</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block h-screen">
        <SidebarContent />
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

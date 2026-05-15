import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  Loader,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Announcement {
  Id: string;
  Title: string;
  Content: string;
  DateCreated: string;
  IsRead?: boolean;
  Priority?: number;
  Expiration?: string;
}

export default function Notifications() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await bakalariService.getAnnouncements();
        if (data && data.Komens) {
          setAnnouncements([
            ...data.Komens,
          ].sort((a, b) => new Date(b.DateCreated).getTime() - new Date(a.DateCreated).getTime()));
        }
      } catch (error) {
        console.error('Error loading announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 1:
        return { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: AlertCircle, label: 'Vysoká' };
      case 2:
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertCircle, label: 'Normální' };
      default:
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: Info, label: 'Nízká' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Právě teď';
    if (diffHours < 24) return `Před ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Před ${diffDays} dny`;
    
    return date.toLocaleDateString('cs-CZ');
  };

  const isExpired = (expiration?: string) => {
    if (!expiration) return false;
    return new Date(expiration) < new Date();
  };

  const sortedAnnouncements = announcements;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Oznámení</h2>
          <p className="text-[#a1a1aa] text-sm">Oznámení a informace od školy</p>
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
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Celkem oznámení</span>
                <Bell size={16} className="text-indigo-400" />
              </div>
              <p className="text-3xl font-semibold text-[#fafafa]">{announcements.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Aktivní</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <p className="text-3xl font-semibold text-[#fafafa]">
                {announcements.filter(a => !isExpired(a.Expiration)).length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#a1a1aa] uppercase">Poslední</span>
                <Calendar size={16} className="text-amber-400" />
              </div>
              <p className="text-sm text-[#fafafa] font-medium">
                {announcements.length > 0 ? formatDate(announcements[0].DateCreated) : 'N/A'}
              </p>
            </motion.div>
          </section>

          {/* Announcements List */}
          <div className="space-y-3">
            {sortedAnnouncements.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Bell size={32} className="mx-auto text-[#71717a] mb-4" />
                <p className="text-[#a1a1aa]">Žádná oznámení</p>
              </div>
            ) : (
              sortedAnnouncements.map((announcement, idx) => {
                const priorityInfo = getPriorityColor(announcement.Priority);
                const Icon = priorityInfo.icon;
                const expired = isExpired(announcement.Expiration);

                return (
                  <motion.button
                    key={announcement.Id}
                    onClick={() => setSelectedAnnouncement(announcement)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "w-full glass-card p-4 text-left hover:border-[#3f3f46] transition-all",
                      expired && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        priorityInfo.bg
                      )}>
                        <Icon size={18} className={priorityInfo.text} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[#fafafa] truncate">
                              {announcement.Title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                                priorityInfo.bg, priorityInfo.text
                              )}>
                                {priorityInfo.label}
                              </span>
                              {expired && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#71717a]/20 text-[#71717a]">
                                  Vypršelo
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-xs text-[#71717a] whitespace-nowrap">
                            <Calendar size={12} className="inline mr-1" />
                            {formatDate(announcement.DateCreated)}
                          </div>
                        </div>
                        
                        <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2">
                          {announcement.Content}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Announcement Detail Modal */}
          {selectedAnnouncement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#09090b] border border-[#27272a] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-[#09090b] border-b border-[#27272a] p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-[#fafafa]">{selectedAnnouncement.Title}</h2>
                    <p className="text-[10px] text-[#71717a] mt-2">
                      <Calendar size={12} className="inline mr-1" />
                      {new Date(selectedAnnouncement.DateCreated).toLocaleDateString('cs-CZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-2 text-[#71717a] hover:text-[#fafafa] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Priority Badge */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const info = getPriorityColor(selectedAnnouncement.Priority);
                      const Icon = info.icon;
                      return (
                        <>
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", info.bg)}>
                            <Icon size={18} className={info.text} />
                          </div>
                          <div>
                            <p className="text-xs text-[#71717a] uppercase font-bold">Priorita</p>
                            <p className={cn("text-sm font-semibold", info.text)}>{info.label}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Content */}
                  <div className="glass-card p-6 whitespace-pre-wrap text-sm text-[#a1a1aa] leading-relaxed">
                    {selectedAnnouncement.Content}
                  </div>

                  {/* Expiration Info */}
                  {selectedAnnouncement.Expiration && (
                    <div className="glass-card p-4 bg-amber-500/5 border-amber-500/20">
                      <p className="text-xs text-[#71717a] uppercase font-bold mb-1">Platnost</p>
                      <p className="text-sm text-amber-400">
                        Do {new Date(selectedAnnouncement.Expiration).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

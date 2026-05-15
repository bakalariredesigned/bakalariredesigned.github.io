import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ChevronRight, 
  Filter, 
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Loader,
  X,
  Calendar as CalIcon,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Subject {
  id: string;
  name: string;
  abbrev: string;
  average: number;
  marks: any[];
}

export default function Grades() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [avgMark, setAvgMark] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [sortOrder, setSortOrder] = useState<'default' | 'worst-first' | 'best-first'>('default');

  useEffect(() => {
    const loadGrades = async () => {
      try {
        const allSubjects = await bakalariService.getAllSubjects();
        const avg = await bakalariService.getAverageMark();
        
        const formattedSubjects = allSubjects.map((s: any) => ({
          id: s.id,
          name: s.name,
          abbrev: s.abbrev,
          average: parseFloat(s.averageText) || 0,
          marks: s.marks || [],
        }));
        
        setSubjects(formattedSubjects);
        setAvgMark(avg);
      } catch (error) {
        console.error('Error loading grades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, []);

  const getSortedSubjects = () => {
    const sorted = [...subjects];
    if (sortOrder === 'worst-first') {
      return sorted.sort((a, b) => b.average - a.average);
    } else if (sortOrder === 'best-first') {
      return sorted.sort((a, b) => a.average - b.average);
    }
    return sorted;
  };

  const chartData = [
    { name: 'Po', val: 1.5 },
    { name: 'Út', val: 1.4 },
    { name: 'St', val: 1.45 },
    { name: 'Čt', val: 1.5 },
    { name: 'Pá', val: avgMark },
  ];

  const getMarkColor = (val: number) => {
    if (val === 1) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    if (val === 2) return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
    if (val === 3) return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' };
    return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Klasifikace</h2>
          <p className="text-[#a1a1aa] text-sm">Průběžný přehled prospěchu za aktuální období</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors font-medium text-xs text-[#a1a1aa] hover:text-[#fafafa]">
            <Filter size={14} />
            Filtrovat
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#fafafa] text-[#09090b] rounded-lg hover:bg-[#e4e4e7] transition-colors font-medium text-xs">
            <Download size={14} />
            Export do PDF
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#fafafa]">Trend průměru</h3>
                  <p className="text-[10px] text-[#71717a] mt-1">Vývoj celkového prospěchu v čase</p>
                </div>
              </div>
              <div className="h-48 mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      dy={10}
                    />
                    <YAxis 
                      domain={[1, 5]} 
                      reversed 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a' }}
                      labelStyle={{ color: '#fafafa' }}
                    />
                    <Area type="monotone" dataKey="val" stroke="#6366f1" fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col">
              <h3 className="text-sm font-semibold tracking-tight text-[#fafafa] mb-4">Statistika</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">Průměr</p>
                  <p className="text-3xl font-semibold text-indigo-400 mt-1">{avgMark.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">Předmětů</p>
                  <p className="text-2xl font-semibold text-[#fafafa] mt-1">{subjects.length}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-[#fafafa]">Předměty</h3>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1 text-xs text-[#fafafa] outline-none focus:border-[#3f3f46]"
              >
                <option value="default">Výchozí pořadí</option>
                <option value="worst-first">Nejhorší první</option>
                <option value="best-first">Nejlepší první</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSortedSubjects().map((subject) => {
                const markColor = getMarkColor(subject.average);
                return (
                  <motion.div
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 cursor-pointer hover:border-[#3f3f46] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">{subject.abbrev}</p>
                        <h4 className="text-sm font-semibold text-[#fafafa] mt-1">{subject.name}</h4>
                      </div>
                      <div className={`${markColor.bg} ${markColor.text} w-12 h-12 rounded-lg flex items-center justify-center font-bold`}>
                        {subject.average.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#71717a]">
                      <span className="text-xs font-medium text-[#fafafa]">{subject.marks.length}</span>
                      <span>známek</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

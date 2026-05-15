import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Smartphone, Shield, Zap, Star, CircleCheck as CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const APK_SIZE_MB = '8.4 MB';
const APK_VERSION = '1.0.0';
const APK_FILENAME = 'BakalariRedesigned.apk';

export default function DownloadPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      const link = document.createElement('a');
      link.href = '/BakalariRedesigned.apk';
      link.download = APK_FILENAME;
      link.click();
    }, 800);
  };

  const features = [
    { icon: Zap, label: 'Rychlé načítání', desc: 'Optimalizováno pro Android' },
    { icon: Shield, label: 'Bezpečné přihlášení', desc: 'Přihlašovací údaje zůstávají v zařízení' },
    { icon: Star, label: 'Moderní design', desc: 'Dark theme, čisté rozhraní' },
    { icon: CheckCircle2, label: 'Veškeré funkce', desc: 'Rozvrh, známky, zprávy, absence' },
  ];

  const steps = [
    'Stáhni APK soubor tlačítkem níže',
    'Otevři soubor v telefonu (Správce souborů → Stažené)',
    'Pokud se zobrazí varování, povol instalaci z neznámých zdrojů',
    'Dokončení instalace a přihlášení',
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      {/* Background decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-16">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#71717a] hover:text-[#fafafa] transition-colors text-sm mb-10 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Zpět do aplikace
        </button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Smartphone size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Bakaláři <span className="text-emerald-400">Redesigned</span>
          </h1>
          <p className="text-[#a1a1aa] text-base max-w-md mx-auto leading-relaxed">
            Moderní Android aplikace pro školní systém Bakaláři. Stáhni si ji přímo do telefonu.
          </p>

          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <span className="text-[11px] bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-full text-[#71717a]">
              Verze {APK_VERSION}
            </span>
            <span className="text-[11px] bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-full text-[#71717a]">
              Android 6.0+
            </span>
            <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400">
              Zdarma
            </span>
          </div>
        </motion.div>

        {/* Download card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* APK info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-center shrink-0">
                <img src="/favicon.png" alt="logo" className="w-9 h-9 rounded-lg object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#fafafa] truncate">{APK_FILENAME}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-[#71717a]">{APK_SIZE_MB}</span>
                  <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                  <span className="text-xs text-[#71717a]">APK soubor</span>
                  <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                  <span className="text-xs text-[#71717a]">v{APK_VERSION}</span>
                </div>
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.97] text-sm whitespace-nowrap shrink-0 w-full sm:w-auto justify-center"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Stahování…
                </>
              ) : downloaded ? (
                <>
                  <CheckCircle2 size={16} />
                  Staženo
                </>
              ) : (
                <>
                  <Download size={16} />
                  Stáhnout · {APK_SIZE_MB}
                </>
              )}
            </button>
          </div>

          {/* Warning */}
          <div className="mt-5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
            <p className="text-xs text-amber-400/80 leading-relaxed">
              <strong className="text-amber-400">Upozornění:</strong> Aplikace není distribuována přes Google Play.
              Při instalaci bude třeba povolit instalaci z neznámých zdrojů v nastavení Androidu.
            </p>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="bg-[#18181b] border border-[#27272a] rounded-xl p-4"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                <f.icon size={15} className="text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-[#fafafa]">{f.label}</p>
              <p className="text-[10px] text-[#71717a] mt-0.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Installation steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 md:p-8"
        >
          <h2 className="text-sm font-semibold text-[#fafafa] mb-5 uppercase tracking-wider">Jak nainstalovat</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-[#52525b] mt-8">
          Bakaláři Redesigned není oficální aplikace. Vytvořil Daniel "Dndskid" Horáček.
        </p>
      </div>
    </div>
  );
}

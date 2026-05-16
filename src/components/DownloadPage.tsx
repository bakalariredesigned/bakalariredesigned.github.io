import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Smartphone, Shield, Zap, Star, CircleCheck as CheckCircle2, ChevronLeft, Package, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const APK_SIZE_MB = '22 MB';
const APK_VERSION = '2.0';
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
    }, 600);
  };

  const features = [
    { icon: Zap,          label: 'Rychlé načítání',       desc: 'Optimalizováno pro Android' },
    { icon: Shield,       label: 'Bezpečné přihlášení',   desc: 'Údaje zůstávají v zařízení' },
    { icon: Star,         label: 'Moderní design',         desc: 'Dark theme, čisté rozhraní' },
    { icon: CheckCircle2, label: 'Veškeré funkce',         desc: 'Rozvrh, známky, zprávy, absence' },
  ];

  const steps = [
    { title: 'Stáhni APK', desc: 'Klikni na tlačítko Stáhnout níže. Soubor se uloží do složky Stažené.' },
    { title: 'Otevři soubor', desc: 'Otevři Správce souborů → Stažené → BakalariRedesigned.apk a klepni na něj.' },
    { title: 'Povol instalaci', desc: 'Pokud se zobrazí varování „Neznámý zdroj", klepni na Nastavení a povol instalaci z tohoto zdroje.' },
    { title: 'Přihlas se', desc: 'Spusť aplikaci, zadej URL Bakalářů své školy a přihlašovací údaje.' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 md:py-16">
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
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Smartphone size={36} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Bakaláři <span className="text-indigo-400">Redesigned</span>
          </h1>
          <p className="text-[#a1a1aa] text-sm max-w-sm mx-auto leading-relaxed">
            Moderní Android aplikace pro školní systém Bakaláři. Stáhni si ji přímo do svého telefonu.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-full text-indigo-300 font-medium">
              <Package size={11} /> Verze {APK_VERSION}
            </span>
            <span className="text-[11px] bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-full text-[#71717a]">
              Android 6.0+
            </span>
            <span className="text-[11px] bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-full text-[#71717a]">
              {APK_SIZE_MB}
            </span>
            <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400">
              Zdarma
            </span>
          </div>
        </motion.div>

        {/* Download card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-center shrink-0">
                <img src="/favicon.png" alt="logo" className="w-9 h-9 rounded-lg object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#fafafa]">{APK_FILENAME}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-[#71717a]">{APK_SIZE_MB}</span>
                  <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                  <span className="text-xs text-[#71717a]">APK soubor</span>
                  <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                  <span className="text-xs text-indigo-400 font-medium">v{APK_VERSION}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.97] text-sm whitespace-nowrap shrink-0 w-full sm:w-auto justify-center"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Připravuji…
                </>
              ) : downloaded ? (
                <>
                  <CheckCircle2 size={16} />
                  Staženo!
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
          <div className="mt-5 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80 leading-relaxed">
              <strong className="text-amber-400">Upozornění:</strong> Aplikace není dostupná na Google Play.
              Při instalaci bude třeba jednorázově povolit <strong className="text-amber-400">instalaci z neznámých zdrojů</strong> v nastavení Androidu.
            </p>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.05 }}
              className="bg-[#18181b] border border-[#27272a] rounded-xl p-4"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
                <f.icon size={15} className="text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-[#fafafa]">{f.label}</p>
              <p className="text-[10px] text-[#71717a] mt-0.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Installation steps */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Info size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-[#fafafa] uppercase tracking-wider">Jak nainstalovat</h2>
          </div>
          <div className="space-y-5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-[11px] font-bold text-indigo-400 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#fafafa]">{step.title}</p>
                  <p className="text-xs text-[#71717a] mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Re-download CTA */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] text-sm mb-6"
        >
          {downloaded ? (
            <>
              <CheckCircle2 size={17} />
              Staženo — zkontroluj složku Stažené
            </>
          ) : (
            <>
              <Download size={17} />
              Stáhnout Bakaláři Redesigned v{APK_VERSION} · {APK_SIZE_MB}
              <ArrowRight size={15} className="ml-1" />
            </>
          )}
        </motion.button>

        <p className="text-center text-[10px] text-[#52525b]">
          Bakaláři Redesigned není oficiální aplikace. Vytvořil Daniel "Dndskid" Horáček.
        </p>
      </div>
    </div>
  );
}

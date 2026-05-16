import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, ArrowUpCircle } from 'lucide-react';

const CURRENT_VERSION_CODE = 1;
const DISMISS_KEY = 'bakUpdateDismissed';
const VERSION_URL = '/version.json';

interface VersionInfo {
  versionCode: number;
  versionName: string;
  notes: string;
  required: boolean;
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<VersionInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);

    fetch(VERSION_URL)
      .then(r => r.json())
      .then((data: VersionInfo) => {
        if (data.versionCode > CURRENT_VERSION_CODE) {
          if (data.required || dismissed !== String(data.versionCode)) {
            setUpdate(data);
            setVisible(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (update) localStorage.setItem(DISMISS_KEY, String(update.versionCode));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && update && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed top-0 left-0 right-0 z-[60] md:top-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="bg-indigo-600 border-b md:border border-indigo-500/60 md:rounded-2xl px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowUpCircle size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Nová verze {update.versionName} je k dispozici
              </p>
              <p className="text-xs text-indigo-200 mt-0.5 line-clamp-2">{update.notes}</p>
              <a
                href="/download"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 active:bg-white/40 px-3 py-1.5 rounded-lg transition-colors"
                onClick={dismiss}
              >
                <Download size={13} />
                Stáhnout aktualizaci
              </a>
            </div>
            {!update.required && (
              <button
                onClick={dismiss}
                className="p-1.5 text-indigo-200 hover:text-white transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

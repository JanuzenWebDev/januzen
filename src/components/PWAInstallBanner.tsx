import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles, ArrowRight } from "lucide-react";
import { JanuzenLogo } from "./Logos";
import { safeLocalStorage as localStorage } from "../utils/storage";

interface PWAInstallBannerProps {
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => void;
}

export function PWAInstallBanner({
  isInstallable,
  isInstalled,
  onInstall
}: PWAInstallBannerProps) {
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDismissed = localStorage.getItem("januzen_pwa_banner_dismissed") === "true";
    if (!isDismissed && isInstallable && !isInstalled) {
      // Delay prompt banner display slightly so user can view page first
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  if (dismissed || isInstalled || !isInstallable) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("januzen_pwa_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-md w-full animate-fade-in-up">
      <div className="relative bg-card-theme border-2 border-amber-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-hidden text-slate-900 dark:text-slate-100 backdrop-blur-md">
        {/* Top gradient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-amber-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-md border border-amber-500/30 shrink-0 mt-0.5">
            <JanuzenLogo size={32} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Download App
              </span>
              <span className="text-[10px] font-mono text-gray-400">PWA</span>
            </div>
            <h4 className="font-serif text-base font-bold text-slate-900 dark:text-white leading-tight">
              Add Januzen to Home Screen
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-300 leading-snug">
              Instant access to Nuthan Medicals, JA Stationery, and Levra Home.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => {
              onInstall();
              handleDismiss();
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-xl shadow-md hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Add to Home Screen
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

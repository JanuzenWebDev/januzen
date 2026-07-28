import React from "react";
import { X, Download, Share, PlusSquare, MoreVertical, Smartphone, Monitor, CheckCircle, ArrowRight } from "lucide-react";
import { JanuzenLogo } from "./Logos";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryAutoInstall?: () => void;
  hasNativePrompt?: boolean;
  isIOS?: boolean;
}

export function PWAInstallModal({
  isOpen,
  onClose,
  onTryAutoInstall,
  hasNativePrompt,
  isIOS
}: PWAInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-card-theme border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-amber-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo & Title */}
        <div className="flex items-center gap-4 pr-8">
          <div className="relative p-2.5 bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-md border border-amber-500/30 shrink-0">
            <JanuzenLogo size={42} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                PWA Application
              </span>
              <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                Fast & Offline Ready
              </span>
            </div>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-0.5">
              Install Januzen App
            </h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
          Add Januzen Global to your Home Screen for one-tap access to Nuthan Medicals, JA Stationery, and Levra Home Essentials with instant push notifications and fast offline access.
        </p>

        {/* Primary Auto Install Button if Native Prompt Available */}
        {hasNativePrompt && onTryAutoInstall && (
          <div className="p-4 bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                <Download className="w-4 h-4 animate-bounce" />
                Direct One-Tap Install Ready
              </div>
            </div>
            <button
              onClick={() => {
                onTryAutoInstall();
                onClose();
              }}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm tracking-wide rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download & Add to Home Screen Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step-by-Step Instructions based on OS */}
        <div className="space-y-4">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {isIOS ? (
              <>
                <Smartphone className="w-4 h-4 text-indigo-500" />
                iOS Safari Instructions (Add to Home Screen)
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 text-teal-500" />
                Manual Installation Guide ({isIOS ? "iOS" : "Android / Chrome / Desktop"})
              </>
            )}
          </h4>

          {isIOS ? (
            /* iOS Instructions */
            <ol className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
              <li className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Tap the Share Button
                    <Share className="w-4 h-4 text-indigo-500 inline ml-1" />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Located at the bottom bar in Safari (or top right on iPad).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Scroll down & tap "Add to Home Screen"
                    <PlusSquare className="w-4 h-4 text-amber-500 inline ml-1" />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select the option with the plus icon in the popup list.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Tap "Add" in Top Right Corner
                    <CheckCircle className="w-4 h-4 text-emerald-500 inline ml-1" />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Januzen icon will appear directly on your iPhone or iPad home screen!
                  </p>
                </div>
              </li>
            </ol>
          ) : (
            /* Chrome / Android / Desktop Instructions */
            <ol className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
              <li className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Look for the Install Icon or Browser Menu
                    <MoreVertical className="w-4 h-4 text-teal-500 inline ml-1" />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    In Chrome or Edge, click the <strong>Install [⊕]</strong> icon in the address bar or tap the 3-dot menu <strong className="font-mono">⋮</strong> in top right.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Select "Add to Home screen" / "Install Januzen App"
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Confirm the prompt to download Januzen directly as a standalone application.
                  </p>
                </div>
              </li>
            </ol>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-gray-400 font-mono">
            Requires no App Store download
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

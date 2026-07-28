import { useState, useEffect, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running as standalone app (already installed)
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      const isPWA = isStandaloneMedia || isIOSStandalone;
      setIsInstalled(isPWA);
      return isPWA;
    };

    const standalone = checkIsStandalone();

    // Check for iOS platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    // If on iOS and not standalone, it is technically installable via Safari Share -> Add to Home Screen
    if (iosDevice && !standalone) {
      setIsInstallable(true);
    }

    // Handle beforeinstallprompt event (Chrome, Edge, Android, Opera)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard mini-infobar or browser prompt
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log("📱 [PWA] App is installable! beforeinstallprompt event captured.");
    };

    // Handle appinstalled event
    const handleAppInstalled = () => {
      console.log("🎉 [PWA] App was successfully installed!");
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstructionsModal(false);
      if (typeof (window as any).showToast === "function") {
        (window as any).showToast("Januzen Global App installed to Home Screen! 🎉", "success");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Trigger prompt or show platform-specific instructions modal
  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          console.log("✅ [PWA] User accepted the install prompt");
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          if (typeof (window as any).showToast === "function") {
            (window as any).showToast("Installing Januzen Global to your device...", "info");
          }
        } else {
          console.log("ℹ️ [PWA] User dismissed the install prompt");
        }
      } catch (err) {
        console.error("❌ [PWA] Error calling install prompt:", err);
        setShowInstructionsModal(true);
      }
    } else {
      // If no native prompt event is stored (e.g. iOS Safari, or browser already auto-dismissed)
      setShowInstructionsModal(true);
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showInstructionsModal,
    setShowInstructionsModal,
    promptInstall,
    hasNativePrompt: !!deferredPrompt
  };
}

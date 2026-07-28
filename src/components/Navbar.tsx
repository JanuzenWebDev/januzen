import React from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { gsap } from "gsap";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { ShoppingBag, User, LogOut, ShieldAlert, Activity, BookOpen, Menu, X, Settings, Palette, Bell, Download, Smartphone, ChevronDown, Search, MapPin } from "lucide-react";
import { User as UserType, Product } from "../types";
import { JanuzenLogo, NuthanMedicalsLogo, JaStationeryLogo, LevraLogo, ZenoraLogo } from "./Logos";
import { subscribeToPush } from "../lib/push";
import { NotificationDrawer } from "./NotificationDrawer";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  cartCount: number;
  theme?: "light" | "dark" | "emerald" | "amber" | "device";
  onThemeChange?: (theme: "light" | "dark" | "emerald" | "amber" | "device") => void;
  onCartClick?: () => void;
  onInstallApp?: () => void;
  isInstalled?: boolean;
  isInstallable?: boolean;
}

export default function Navbar({ currentView, onNavigate, currentUser, onLogout, cartCount, theme = "light", onThemeChange, onCartClick, onInstallApp, isInstalled, isInstallable }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = React.useState(false);
  const [searchCategory, setSearchCategory] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = React.useState(false);

  const desktopSearchRef = React.useRef<HTMLDivElement>(null);
  const mobileSearchRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(desktopSearchRef, () => setIsSearchDropdownOpen(false));
  useClickOutside(mobileSearchRef, () => setIsSearchDropdownOpen(false));

  // Live Autocomplete Debounced Fetcher
  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        params.append("search", trimmed);
        if (searchCategory !== "all") {
          params.append("shop", searchCategory);
        }
        params.append("limit", "6");

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          let items: Product[] = data.products || [];

          // If exact search yields few results (< 3), fetch nearest products from division/all to display similar recommendations
          if (items.length < 3) {
            const fallbackParams = new URLSearchParams();
            if (searchCategory !== "all") {
              fallbackParams.append("shop", searchCategory);
            }
            fallbackParams.append("limit", "6");
            const fallbackRes = await fetch(`/api/products?${fallbackParams.toString()}`);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              const fallbacks: Product[] = fallbackData.products || [];
              const existingIds = new Set(items.map((i) => i.id));
              for (const fb of fallbacks) {
                if (!existingIds.has(fb.id) && items.length < 6) {
                  items.push(fb);
                }
              }
            }
          }

          setSearchResults(items);
          setIsSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCategory]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearchDropdownOpen(false);

    let targetView = searchCategory;
    if (searchCategory === "all") {
      // Intelligently redirect to division of top matched product if available
      if (searchResults.length > 0 && searchResults[0].shop) {
        targetView = searchResults[0].shop;
      } else if (["medicals", "stationery", "levra"].includes(currentView)) {
        targetView = currentView;
      } else {
        targetView = "medicals";
      }
    }

    onNavigate(targetView, { search: trimmed });
  };

  const handleSelectSuggestedProduct = (product: Product) => {
    setIsSearchDropdownOpen(false);
    onNavigate("product-detail", { productId: product.id });
  };

  const renderSearchDropdown = () => {
    if (!isSearchDropdownOpen || !searchQuery.trim()) return null;

    return (
      <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0A1626] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[100] text-white backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Dropdown Header */}
        <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 select-none">
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {searchCategory === "all" ? "Matching & Nearest Products" : `Searching in ${
                searchCategory === "medicals" ? "Nuthan Medicals" : searchCategory === "stationery" ? "JA Stationery" : "Levra Essentials"
              }`}
            </span>
          </div>
          {isSearching && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-400 animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              Finding matches...
            </span>
          )}
        </div>

        {/* Product Suggestions List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
          {searchResults.length > 0 ? (
            searchResults.map((product) => {
              const isMed = product.shop === "medicals";
              const isStat = product.shop === "stationery";
              const shopName = isMed ? "Nuthan Medicals" : isStat ? "JA Stationery" : "Levra Essentials";
              const shopBadgeClass = isMed
                ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                : isStat
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectSuggestedProduct(product)}
                  className="w-full text-left p-2.5 flex items-center gap-3 hover:bg-slate-800/90 transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.25 rounded border ${shopBadgeClass}`}>
                        {shopName}
                      </span>
                      {product.stock > 0 ? (
                        <span className="text-[9px] text-emerald-400 font-medium">In Stock</span>
                      ) : (
                        <span className="text-[9px] text-rose-400 font-medium">Out of Stock</span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {product.description || product.category}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-amber-400">
                      ₹{product.price}
                    </span>
                    <span className="block text-[9px] text-slate-400 group-hover:text-amber-300 transition-colors">
                      View item →
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            !isSearching && (
              <div className="p-4 text-center text-xs text-slate-400">
                <p className="font-semibold text-slate-300">No exact product matches found for "{searchQuery}"</p>
                <p className="text-[11px] text-slate-500 mt-1">Press Enter to view nearest possible products in store</p>
              </div>
            )
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="p-2 bg-slate-900 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            className="w-full py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Press Enter to view all results for "{searchQuery}"</span>
          </button>
        </div>
      </div>
    );
  };

  // Notification Permission states for native push alerts
  const [notifPermission, setNotifPermission] = React.useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    return Notification.permission;
  });

  const [showPermissionBanner, setShowPermissionBanner] = React.useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    return Notification.permission === "default" && localStorage.getItem("januzen_notif_banner_dismissed") !== "true";
  });

  const handleRequestPermission = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotifPermission(permission);
      setShowPermissionBanner(false);
      if (permission === "granted") {
        (window as any).showToast?.("Push notifications enabled successfully! 🔔", "success");
        // Also subscribe client immediately to web push server
        subscribeToPush(currentUser?.id || undefined).catch((e) => {
          console.error("[PUSH] Subscription failed in permission handler:", e);
        });
      } else {
        (window as any).showToast?.("Notifications permission was not granted.", "info");
      }
    });
  };

  const handleDismissBanner = () => {
    localStorage.setItem("januzen_notif_banner_dismissed", "true");
    setShowPermissionBanner(false);
  };

  const cartIconRef = React.useRef<HTMLButtonElement>(null);
  const cartIconRefMobile = React.useRef<HTMLButtonElement>(null);
  const mobileMenuRef = React.useRef<HTMLElement>(null);

  useClickOutside(mobileMenuRef, () => setMobileMenuOpen(false), mobileMenuOpen);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Cart Icon GSAP hover effects (elite-themed)
  const handleCartMouseEnter = (isMobile: boolean) => {
    const targetRef = isMobile ? cartIconRefMobile : cartIconRef;
    if (targetRef.current) {
      gsap.to(targetRef.current, {
        scale: 1.15,
        rotate: -8,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
      const icon = targetRef.current.querySelector("svg");
      if (icon) {
        gsap.to(icon, {
          color: "#3FE9D9",
          duration: 0.2
        });
      }
    }
  };

  const handleCartMouseLeave = (isMobile: boolean) => {
    const targetRef = isMobile ? cartIconRefMobile : cartIconRef;
    if (targetRef.current) {
      gsap.to(targetRef.current, {
        scale: 1,
        rotate: 0,
        duration: 0.3,
        ease: "power2.out"
      });
      const icon = targetRef.current.querySelector("svg");
      if (icon) {
        gsap.to(icon, {
          color: "currentColor",
          duration: 0.2
        });
      }
    }
  };

  // Bounce and elastic effect when items increment
  React.useEffect(() => {
    if (cartCount > 0) {
      if (cartIconRef.current) {
        gsap.fromTo(cartIconRef.current,
          { scale: 0.8, rotate: -15 },
          { scale: 1.25, rotate: 0, duration: 0.45, ease: "elastic.out(1.1, 0.45)", clearProps: "scale,rotate" }
        );
      }
      if (cartIconRefMobile.current) {
        gsap.fromTo(cartIconRefMobile.current,
          { scale: 0.8, rotate: -15 },
          { scale: 1.25, rotate: 0, duration: 0.45, ease: "elastic.out(1.1, 0.45)", clearProps: "scale,rotate" }
        );
      }
    }
  }, [cartCount]);

  const fetchNotifications = React.useCallback(async () => {
    if (!currentUser) return;
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to load user notifications:", e);
    }
  }, [currentUser]);

  React.useEffect(() => {
    fetchNotifications();

    if (!currentUser) return;

    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;

    // Use absolute or relative URL for real-time alert stream
    const streamUrl = `/api/updates/stream?token=${encodeURIComponent(jwtToken)}`;

    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener("connected", (event) => {
      // Connected to SSE stream
    });

    eventSource.addEventListener("notification", (event) => {
      try {
        const notif = JSON.parse(event.data);

        // Prepend new notification in real-time
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });

        // Trigger native browser notification
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const title = notif.title.startsWith("JANUZEN") ? notif.title : `JANUZEN | ${notif.title}`;
          const options = {
            body: notif.content,
            icon: "/logo.png",
            badge: "/logo.png",
            tag: notif.id,
            requireInteraction: true // Keep the notification visible for important details like OTPs
          };

          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options);
            }).catch(() => {
              new Notification(title, options);
            });
          } else {
            new Notification(title, options);
          }
        }

        // Trigger in-app toast
        (window as any).showToast?.(`🔔 ${notif.title}: ${notif.content}`, "info");

        // Synthesize double-chime high pitch frequencies (Web Audio API)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          osc.start();

          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (soundErr) {
          // Silent fallback if audio context blocked/unsupported
        }
      } catch (err) {
        console.error("Error processing real-time notification payload:", err);
      }
    });

    eventSource.addEventListener("error", (event) => {
      // Stream reconnecting
    });

    // Clean up EventSource on unmount/re-login
    return () => {
      eventSource.close();
    };
  }, [currentUser, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
          })
        )
      );
      (window as any).showToast?.("All notifications marked as read! ✔️", "success");
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      const res = await fetch(`/api/notifications/${notifId}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: "Home", view: "home" },
    { label: "Nuthan Medicals", view: "medicals" },
    { label: "JA Stationery", view: "stationery" },
    { label: "Levra", view: "levra" },
    { label: "About", view: "about" },
    { label: "Contact", view: "contact" },
    ...(currentUser?.role === "admin" ? [{ label: "Delivery Portal", view: "delivery" }] : []),
  ];

  return (
    <>
      {currentUser && showPermissionBanner && (
        <div className="bg-gradient-to-r from-teal-800 via-[#0F9B8E] to-emerald-800 text-white py-2.5 px-4 text-center relative z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-sans font-medium">
            <span className="animate-pulse">🔔</span>
            <span>Enable real-time push alerts on this device to instantly receive your order status updates, OTP verifications, and announcements!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRequestPermission}
              className="bg-white text-[#0F9B8E] hover:bg-teal-50 px-3 py-0.5 sm:py-1 rounded text-[10px] font-bold tracking-wider uppercase shadow transition-all cursor-pointer font-sans"
            >
              Enable
            </button>
            <button
              onClick={handleDismissBanner}
              className="bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/30 text-white px-2.5 py-0.5 sm:py-1 rounded text-[10px] font-medium transition-all cursor-pointer font-sans"
            >
              Later
            </button>
          </div>
        </div>
      )}
      <nav ref={mobileMenuRef} className="sticky top-0 z-50 bg-[#0D1B2A] text-white border-b border-[#1E293B] shadow-lg">
        {/* Row 1: Primary Enterprise Header Bar */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 lg:gap-6">
            
            {/* 1. Left Section: Brand Logo & Location Pill */}
            <div className="flex items-center gap-2 xl:gap-4 shrink-0">
              {/* Logo Brand */}
              <div
                className="flex items-center gap-2 cursor-pointer shrink-0 group"
                onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}
              >
                <JanuzenLogo size={36} className="group-hover:rotate-6 transition-transform" />
                <div className="flex flex-col">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-widest text-white leading-tight">JANUZEN</span>
                  <span className="block text-[8px] uppercase tracking-[#0.2em] text-amber-400/90 font-mono">Global LLP</span>
                </div>
              </div>

              {/* Delivery Location Pill (Desktop) */}
              <button
                type="button"
                onClick={() => onNavigate(currentUser ? "profile" : "login")}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/60 cursor-pointer text-left shrink-0"
                title="Deliver Location Parameters"
              >
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] text-gray-400 font-sans">
                    Deliver to {currentUser?.name ? currentUser.name.split(" ")[0] : "Guest"}
                  </span>
                  <span className="text-xs font-bold text-white font-mono tracking-tight">
                    Secunderabad 500011
                  </span>
                </div>
              </button>
            </div>

            {/* 2. Middle Section: Search Bar (Desktop / Tablet) */}
            <div ref={desktopSearchRef} className="hidden md:block relative flex-1 max-w-2xl lg:max-w-3xl">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-white rounded-lg shadow-inner overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-amber-500 transition-all"
              >
                {/* Division Selector */}
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-2.5 border-r border-slate-300 outline-none cursor-pointer transition-colors font-sans"
                >
                  <option value="all">All Divisions</option>
                  <option value="medicals">Nuthan Medicals</option>
                  <option value="stationery">JA Stationery</option>
                  <option value="levra">Levra Essentials</option>
                </select>

                {/* Input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsSearchDropdownOpen(true);
                  }}
                  placeholder="Search prescription medicines, executive stationery, household essentials..."
                  className="flex-1 px-3 py-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 outline-none font-medium"
                />

                {/* Submit button */}
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Search Store Catalog"
                >
                  <Search className="h-4 w-4 stroke-[2.5]" />
                </button>
              </form>

              {renderSearchDropdown()}
            </div>

            {/* 3. Right Section: Account, Orders & Cart */}
            <div className="hidden lg:flex items-center shrink-0 space-x-2 xl:space-x-4">
              
              {/* Account & Profile */}
              {currentUser ? (
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex flex-col text-left px-2 py-1 rounded-md hover:bg-slate-800/80 transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] text-gray-400 leading-tight">
                    Hello, {currentUser.name.split(" ")[0]}
                  </span>
                  <div className="flex items-center gap-0.5 text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    <span>Account & Profile</span>
                    <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-amber-400" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("login")}
                  className="flex flex-col text-left px-2 py-1 rounded-md hover:bg-slate-800/80 transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] text-gray-400 leading-tight">Hello, sign in</span>
                  <div className="flex items-center gap-0.5 text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    <span>Account & Access</span>
                    <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-amber-400" />
                  </div>
                </button>
              )}

              {/* Returns & Orders */}
              <button
                onClick={() => onNavigate(currentUser ? "orders" : "login")}
                className="flex flex-col text-left px-2 py-1 rounded-md hover:bg-slate-800/80 transition-colors cursor-pointer group"
              >
                <span className="text-[10px] text-gray-400 leading-tight">Returns</span>
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  & Orders
                </span>
              </button>

              {/* Notifications Alert Bell */}
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setIsNotifDrawerOpen(true)}
                  className="relative p-2 text-gray-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Notifications Alert Panel"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold text-white bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cart Widget */}
              <button
                ref={cartIconRef}
                onClick={() => {
                  if (onCartClick) onCartClick();
                  else onNavigate("cart");
                }}
                onMouseEnter={() => handleCartMouseEnter(false)}
                onMouseLeave={() => handleCartMouseLeave(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-500/30 text-white transition-all cursor-pointer group"
                title="Shopping Cart"
              >
                <div className="relative">
                  <ShoppingBag className="h-5 w-5 text-teal-400 group-hover:text-amber-400 transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center px-1.5 py-0.25 text-[10px] font-extrabold text-slate-950 bg-amber-400 rounded-full shadow-md">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold tracking-wide">Cart</span>
              </button>

              {/* Theme Dropdown */}
              <div className="relative group">
                <button 
                  className="flex items-center gap-1 bg-[#1E293B] hover:bg-slate-700 text-white rounded-lg font-mono font-bold transition-all border border-slate-700 cursor-pointer px-2 py-1.5 text-xs"
                  title="Switch Januzen Theme"
                >
                  <Palette className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="capitalize text-teal-300 font-bold">{theme}</span>
                </button>
                <div className="absolute right-0 top-full pt-1.5 w-44 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-[#0D1B2A] border border-[#1e293b] rounded-xl shadow-2xl py-1">
                    <div className="px-3 py-1 text-[9px] font-mono tracking-widest text-gray-400 uppercase border-b border-gray-800 mb-1">
                      Workspace Theme
                    </div>
                    <button
                      onClick={() => onThemeChange?.("light")}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "light" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      Light Workspace
                    </button>
                    <button
                      onClick={() => onThemeChange?.("dark")}
                      className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "dark" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600"></span>
                      Dark Obsidian
                    </button>
                  </div>
                </div>
              </div>

              {/* Logout Button if logged in */}
              {currentUser && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                  title="Logout Session"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Header Controls */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile Cart */}
              <button
                ref={cartIconRefMobile}
                onClick={() => {
                  if (onCartClick) onCartClick();
                  else onNavigate("cart");
                }}
                className="relative p-2 text-gray-300 hover:text-white cursor-pointer"
              >
                <ShoppingBag className="h-5 w-5 text-teal-400" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.25 text-[9px] font-extrabold text-slate-950 bg-amber-400 rounded-full shadow-md">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Notification Bell */}
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setIsNotifDrawerOpen(true)}
                  className="relative p-2 text-gray-300 hover:text-white cursor-pointer"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold text-white bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search Input Bar */}
          <div ref={mobileSearchRef} className="md:hidden pb-3 pt-1 relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-white rounded-lg shadow-inner overflow-hidden border border-slate-300">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setIsSearchDropdownOpen(true);
                }}
                placeholder="Search products..."
                className="flex-1 px-3 py-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 outline-none font-medium"
              />
              <button type="submit" className="bg-amber-500 text-slate-950 font-bold px-3 py-2 flex items-center justify-center">
                <Search className="h-4 w-4" />
              </button>
            </form>
            {renderSearchDropdown()}
          </div>
        </div>

        {/* Row 2: Sub-Nav Category Bar */}
        <div className="bg-[#132235] text-white border-t border-[#1E293B] shadow-inner">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-1.5 flex items-center justify-between text-xs font-medium space-x-2 sm:space-x-4 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center space-x-1 sm:space-x-2">
              
              {/* All / Divisions Dropdown */}
              <div className="relative group shrink-0">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-amber-300 hover:text-white hover:bg-[#1E293B] font-bold transition-all cursor-pointer border border-amber-500/20"
                >
                  <Menu className="h-4 w-4 text-amber-400" />
                  <span>All Divisions</span>
                  <ChevronDown className="h-3 w-3 text-amber-400 group-hover:rotate-180 transition-transform" />
                </button>

                <div className="absolute left-0 top-full pt-2 w-72 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-[#0D1B2A] border border-[#1e293b] rounded-2xl shadow-2xl p-2 space-y-1 backdrop-blur-xl">
                    <div className="px-3 py-1 text-[9px] font-mono tracking-widest text-amber-400 uppercase border-b border-gray-800 flex items-center justify-between">
                      <span>JANUZEN Sectors</span>
                      <span className="text-[8px] text-gray-500">Official</span>
                    </div>

                    <button
                      onClick={() => onNavigate("medicals")}
                      className={`w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-[#1E293B] transition-colors cursor-pointer ${
                        currentView === "medicals" ? "bg-teal-950/50 border border-teal-500/30" : ""
                      }`}
                    >
                      <NuthanMedicalsLogo size={24} />
                      <div>
                        <div className="text-xs font-bold text-white">Nuthan Medicals</div>
                        <div className="text-[10px] text-gray-400">Medicines & Equipment</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onNavigate("stationery")}
                      className={`w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-[#1E293B] transition-colors cursor-pointer ${
                        currentView === "stationery" ? "bg-amber-950/50 border border-amber-500/30" : ""
                      }`}
                    >
                      <JaStationeryLogo size={24} />
                      <div>
                        <div className="text-xs font-bold text-white">JA Stationery</div>
                        <div className="text-[10px] text-gray-400">Luxury Diaries & Planners</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onNavigate("levra")}
                      className={`w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-[#1E293B] transition-colors cursor-pointer ${
                        currentView === "levra" || currentView === "zenora" ? "bg-indigo-950/50 border border-indigo-500/30" : ""
                      }`}
                    >
                      <LevraLogo size={24} />
                      <div>
                        <div className="text-xs font-bold text-white">Levra Essentials</div>
                        <div className="text-[10px] text-gray-400">Home & Kitchen Utilities</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <button
                onClick={() => onNavigate("home")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "home" ? "text-amber-400 font-bold bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/60"
                }`}
              >
                Home
              </button>

              <button
                onClick={() => onNavigate("medicals")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "medicals" ? "text-teal-300 font-bold bg-teal-950/60 border border-teal-500/30" : "text-gray-300 hover:text-teal-300 hover:bg-[#1E293B]/60"
                }`}
              >
                <NuthanMedicalsLogo size={16} />
                <span>Nuthan Medicals</span>
              </button>

              <button
                onClick={() => onNavigate("stationery")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "stationery" ? "text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30" : "text-gray-300 hover:text-amber-300 hover:bg-[#1E293B]/60"
                }`}
              >
                <JaStationeryLogo size={16} />
                <span>JA Stationery</span>
              </button>

              <button
                onClick={() => onNavigate("levra")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "levra" || currentView === "zenora" ? "text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-500/30" : "text-gray-300 hover:text-indigo-300 hover:bg-[#1E293B]/60"
                }`}
              >
                <LevraLogo size={16} />
                <span>Levra Essentials</span>
              </button>

              <button
                onClick={() => onNavigate("about")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "about" ? "text-white font-bold bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/60"
                }`}
              >
                About Us
              </button>

              <button
                onClick={() => onNavigate("contact")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === "contact" ? "text-white font-bold bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/60"
                }`}
              >
                Contact
              </button>

              {currentUser?.role === "admin" && (
                <>
                  <button
                    onClick={() => onNavigate("delivery")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      currentView === "delivery" ? "text-white font-bold bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/60"
                    }`}
                  >
                    Delivery Portal
                  </button>

                  <button
                    onClick={() => onNavigate("admin")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#D4820A] text-white font-bold hover:bg-opacity-90 transition-all cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Admin Suite</span>
                  </button>
                </>
              )}
            </div>

            {/* Corporate tag */}
            <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-amber-400/90 font-bold shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Authorized Enterprise Logistics</span>
            </div>
          </div>
        </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D1B2A] border-t border-[#1E293B]">
          <div className="px-3 pt-3 pb-5 space-y-3">
            {/* Home */}
            <button
              onClick={() => {
                onNavigate("home");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold tracking-wide cursor-pointer ${
                currentView === "home" ? "text-white bg-[#1E293B] border border-gray-700" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/50"
              }`}
            >
              Home Overview
            </button>

            {/* Divisions Group */}
            <div className="bg-[#112236] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold flex items-center justify-between">
                <span>JANUZEN Divisions</span>
                <span className="text-[9px] text-gray-500">Select Sector</span>
              </div>

              {/* Nuthan Medicals */}
              <button
                onClick={() => {
                  onNavigate("medicals");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                  currentView === "medicals" ? "bg-teal-950/60 border border-teal-500/40 text-teal-300 font-bold" : "text-gray-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <NuthanMedicalsLogo size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold">Nuthan Medicals</div>
                  <div className="text-[10px] text-gray-400">Healthcare & Medicines</div>
                </div>
              </button>

              {/* JA Stationery */}
              <button
                onClick={() => {
                  onNavigate("stationery");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                  currentView === "stationery" ? "bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold" : "text-gray-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <JaStationeryLogo size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold">JA Stationery</div>
                  <div className="text-[10px] text-gray-400">Luxury Diaries & Books</div>
                </div>
              </button>

              {/* Levra Essentials */}
              <button
                onClick={() => {
                  onNavigate("levra");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                  currentView === "levra" || currentView === "zenora" ? "bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 font-bold" : "text-gray-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <LevraLogo size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold">Levra Essentials</div>
                  <div className="text-[10px] text-gray-400">Home & Kitchen Supplies</div>
                </div>
              </button>
            </div>

            {/* About & Contact */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigate("about");
                  setMobileMenuOpen(false);
                }}
                className={`text-center py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border ${
                  currentView === "about" ? "text-white bg-[#1E293B] border-gray-600" : "text-gray-300 bg-slate-900/60 border-gray-800 hover:bg-[#1E293B]"
                }`}
              >
                About Us
              </button>
              <button
                onClick={() => {
                  onNavigate("contact");
                  setMobileMenuOpen(false);
                }}
                className={`text-center py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border ${
                  currentView === "contact" ? "text-white bg-[#1E293B] border-gray-600" : "text-gray-300 bg-slate-900/60 border-gray-800 hover:bg-[#1E293B]"
                }`}
              >
                Contact
              </button>
            </div>

            {/* Delivery Portal if admin */}
            {currentUser?.role === "admin" && (
              <button
                onClick={() => {
                  onNavigate("delivery");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  currentView === "delivery" ? "text-white bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/50"
                }`}
              >
                Delivery Portal
              </button>
            )}

            {currentUser && currentUser.role === "admin" && (
              <button
                onClick={() => {
                  onNavigate("admin");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded bg-[#D4820A] text-white text-base font-medium cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Admin Suite
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  onNavigate("orders");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded text-base font-medium cursor-pointer ${
                  currentView === "orders" ? "text-white bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                My Orders
              </button>
            )}

            {currentUser && (
              <div className="border-t border-gray-800 pt-3 mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsNotifDrawerOpen(true);
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium cursor-pointer text-gray-300 hover:text-white hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#0F9B8E]" />
                    <span>Notifications</span>
                  </span>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-mono">All read</span>
                  )}
                </button>
              </div>
            )}

            {/* Mobile theme modes */}
            <div className="pt-4 pb-2 border-t border-gray-800 px-3 space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-gray-400 block uppercase">Thematic Theme Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onThemeChange?.("light"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "light" ? "bg-white text-black border-white font-bold" : "text-gray-300 border-gray-700 hover:bg-gray-800"}`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => { onThemeChange?.("dark"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "dark" ? "bg-white text-black border-white font-bold" : "text-gray-300 border-gray-700 hover:bg-gray-800"}`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {currentUser ? (
              <div className="pt-4 pb-2 border-t border-gray-800 px-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-left group cursor-pointer"
                  >
                    {currentUser.image ? (
                      <img
                        src={currentUser.image}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full border border-gray-600 object-cover group-hover:border-[#0F9B8E] transition-colors"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-serif text-xs font-bold group-hover:bg-teal-500 transition-colors">
                        {currentUser.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-teal-300 transition-colors">{currentUser.name}</div>
                      <div className="text-xs font-medium text-gray-400 capitalize">{currentUser.role}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm py-1 px-2 hover:bg-red-500/10 rounded cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-800 px-3">
                <button
                  onClick={() => {
                    onNavigate("login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-md text-white hover:bg-gray-800 transition"
                >
                  <User className="h-4 w-4" />
                  Portal Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>

    {/* Slide-over Notification Drawer */}
    <NotificationDrawer
      isOpen={isNotifDrawerOpen}
      onClose={() => setIsNotifDrawerOpen(false)}
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      notifPermission={notifPermission}
      onRequestPermission={handleRequestPermission}
    />
    </>
  );
}

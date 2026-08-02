import { useEffect, RefObject } from "react";

/**
 * useClickOutside — fires callback when user clicks/taps outside the referenced element(s)
 * Works for both mouse (desktop) and touch (mobile) events
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside(ref, () => setIsOpen(false));
 *   OR
 *   useClickOutside([desktopRef, mobileRef], () => setIsOpen(false));
 */
export function useClickOutside<T extends HTMLElement>(
  refOrRefs: RefObject<T | null> | (RefObject<T | null> | null)[],
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleEvent(event: MouseEvent | TouchEvent) {
      const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];
      const isInside = refs.some(
        (r) => r && r.current && r.current.contains(event.target as Node)
      );
      if (!isInside) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleEvent);
    document.addEventListener("touchstart", handleEvent, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleEvent);
      document.removeEventListener("touchstart", handleEvent);
    };
  }, [refOrRefs, callback, enabled]);
}


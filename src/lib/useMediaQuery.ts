"use client";

// Screen-size hook used to switch between the desktop layouts and the phone
// layouts. Starts `false` on the server + first paint, then settles after mount
// (the app already gates rendering on `hydrated`, so there's no visible flip).
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();

    // iOS Safari < 14 only has the deprecated addListener/removeListener; the
    // window resize listener is a cheap backstop for both paths.
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", update);
    else legacy.addListener?.(update);
    window.addEventListener("resize", update);

    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", update);
      else legacy.removeListener?.(update);
      window.removeEventListener("resize", update);
    };
  }, [query]);

  return matches;
}

/** Phone-sized: one column, bigger touch targets, no fixed design coords. */
export const MOBILE_QUERY = "(max-width: 720px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

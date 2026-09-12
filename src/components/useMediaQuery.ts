import { useSyncExternalStore } from "react";

/** True while `query` matches; re-renders on change. SSR-safe (false on the server). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind `md` breakpoint. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");

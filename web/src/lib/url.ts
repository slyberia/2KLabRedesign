import { useEffect, useRef, useState } from "react";

/** Query string with ":" kept literal so shared links stay readable. */
export function queryString(p: URLSearchParams): string {
  const s = p.toString().replace(/%3A/gi, ":");
  return s ? `?${s}` : "";
}

export function replaceUrl(params: URLSearchParams, hash: string) {
  const next = `${location.pathname}${queryString(params)}${hash ? `#${hash}` : ""}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(null, "", next);
}

/** The URL's query parameters as the page first loaded them. */
export const initialParams = () => new URLSearchParams(location.search);

/**
 * Tab state driven by the URL hash. Reacts to `hashchange` too: same-page links (footer, account
 * menu) change only the hash, and silently did nothing in the static build without a handler.
 */
export function useHashTab<T extends string>(tabs: readonly T[], fallback: T, onExternalChange?: (t: T) => void) {
  const read = (): T | null => {
    const h = decodeURIComponent(location.hash.slice(1)) as T;
    return tabs.includes(h) ? h : null;
  };
  const [tab, setTab] = useState<T>(() => read() ?? fallback);
  const cb = useRef(onExternalChange);
  cb.current = onExternalChange;
  useEffect(() => {
    const on = () => {
      const t = read();
      if (t) { setTab(t); cb.current?.(t); }
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [tab, setTab] as const;
}

/** Calls `fn` at most once per `ms` after the last change (Safari caps history rewrites at ~100 per 30 s). */
export function useDebouncedEffect(fn: () => void, deps: unknown[], ms: number) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  }, deps);
}

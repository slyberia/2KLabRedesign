import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "../shell/account";
import { api } from "./api";

/** Progress keys the server accepts (lib/accounts.js). */
export interface ProgressValues {
  rep: number | null;
  lifetime: number | null;
  crew: number | null;
  spec9: boolean;
  seasons: number;
  /** "section.task" -> done */
  starter: Record<string, boolean>;
}
type Key = keyof ProgressValues;
type Entry = { v: unknown; at: number };
type Store = Partial<Record<Key, Entry>>;

const LS = "nba2klab.progress";
const DEFAULTS: ProgressValues = { rep: null, lifetime: null, crew: null, spec9: false, seasons: 0, starter: {} };
const SAVE_DELAY = 400;
const RETRY_DELAY = 5000;

/**
 * The browser copy of progress, tagged with the account it belongs to (null = signed out).
 * The tag is what keeps one person's progress out of another account on a shared device:
 * a copy owned by a different account is never merged, and signing out clears it.
 */
interface LocalCopy { owner: string | null; progress: Store }

function readLocal(): LocalCopy {
  try {
    const o = JSON.parse(localStorage.getItem(LS) ?? "null");
    if (o && typeof o === "object") {
      // the static build stored the progress object itself, untagged
      return "progress" in o ? { owner: o.owner ?? null, progress: o.progress ?? {} } : { owner: null, progress: o };
    }
  } catch { /* unreadable or blocked storage */ }
  return { owner: null, progress: {} };
}
function writeLocal(c: LocalCopy) {
  try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* storage blocked */ }
}

export type SaveStatus =
  | { kind: "local" }
  | { kind: "local-signin" }
  | { kind: "syncing" }
  | { kind: "saving" }
  | { kind: "saved"; name: string }
  | { kind: "error"; message: string };

/**
 * Rewards progress. Signed out: kept in this browser. Signed in: saved to the demo account; the
 * server merges per key (newer `at` wins), so progress marked while signed out joins the account
 * on sign-in. Unsaved keys stay pending until the server confirms them, and are retried.
 */
export function useProgress() {
  const { user, available, ready } = useAccount();
  const [store, setStore] = useState<Store>(() => {
    const local = readLocal();
    return local.owner === null ? local.progress : {};
  });
  const [status, setStatus] = useState<SaveStatus>({ kind: "local" });
  const owner = useRef<string | null>(null);
  const pending = useRef<Store>({});
  const storeRef = useRef(store);
  storeRef.current = store;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [synced, setSynced] = useState(false);
  const signedIn = useRef(false);
  signedIn.current = !!user;

  const push = useCallback(async () => {
    const keys = Object.keys(pending.current) as Key[];
    if (!owner.current || !keys.length) return; // not synced yet: the sync sends pending keys
    const body: Store = { ...pending.current };
    setStatus({ kind: "saving" });
    try {
      await api("/api/progress", { method: "PUT", body: { progress: body } });
      // clear only what was sent and not changed again since
      for (const k of keys) if (pending.current[k]?.at === body[k]!.at) delete pending.current[k];
      setStatus({ kind: "saved", name: user?.name ?? "" });
      if (Object.keys(pending.current).length) timer.current = setTimeout(push, SAVE_DELAY);
    } catch (x) {
      setStatus({ kind: "error", message: `Couldn’t save: ${(x as Error).message}. Retrying…` });
      timer.current = setTimeout(push, RETRY_DELAY);
    }
  }, [user]);

  // Account changes: sync on sign-in, clear the browser copy on sign-out.
  useEffect(() => {
    let live = true;
    ready.then(async () => {
      if (!live) return;
      const local = readLocal();
      if (!user) {
        if (owner.current || local.owner) {
          // signed out (here or on another page): never show or keep another account's progress
          writeLocal({ owner: null, progress: {} });
          setStore({});
        }
        owner.current = null;
        pending.current = {};
        setSynced(true);
        setStatus(available === false ? { kind: "local" } : { kind: "local-signin" });
        return;
      }
      setStatus({ kind: "syncing" });
      // Merge only progress this account owns, or progress marked while signed out.
      const mine = local.owner === null || local.owner === user.id ? local.progress : {};
      const sent: Store = { ...mine, ...pending.current };
      try {
        const d = await api<{ progress: Store }>("/api/progress", { method: "PUT", body: { progress: sent } });
        if (!live) return;
        owner.current = user.id;
        // keys marked while the sync was in flight stay pending and win locally
        for (const k of Object.keys(pending.current) as Key[]) if (pending.current[k]?.at === sent[k]?.at) delete pending.current[k];
        const merged = { ...d.progress, ...pending.current };
        writeLocal({ owner: user.id, progress: merged });
        setStore(merged);
        setStatus({ kind: "saved", name: user.name });
        if (Object.keys(pending.current).length) timer.current = setTimeout(push, SAVE_DELAY);
      } catch (x) {
        if (live) setStatus({ kind: "error", message: `Couldn’t sync: ${(x as Error).message}` });
      }
      setSynced(true);
    });
    return () => { live = false; };
  }, [user, ready, available, push]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const get = useCallback(<K extends Key>(k: K): ProgressValues[K] => {
    const e = store[k];
    return (e ? e.v : DEFAULTS[k]) as ProgressValues[K];
  }, [store]);

  const set = useCallback(<K extends Key>(k: K, v: ProgressValues[K]) => {
    const entry: Entry = { v, at: Date.now() };
    const next = { ...storeRef.current, [k]: entry };
    setStore(next);
    writeLocal({ owner: owner.current, progress: next });
    if (signedIn.current) {
      pending.current[k] = entry;
      clearTimeout(timer.current);
      timer.current = setTimeout(push, SAVE_DELAY);
    }
  }, [push]);

  return { get, set, status, synced };
}

export type Progress = ReturnType<typeof useProgress>;

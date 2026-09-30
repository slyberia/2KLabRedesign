import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";

export interface User {
  id: string;
  name: string;
  premium: boolean;
}

interface AccountState {
  user: User | null;
  /** null while checking; false when no API is reachable (e.g. a static preview). */
  available: boolean | null;
  /** Resolves once the initial session check is done. */
  ready: Promise<User | null>;
  /** Opens the demo sign-in dialog; `then` runs after a successful sign-in. */
  signIn: (then?: (u: User) => void) => void;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountState | null>(null);

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount outside AccountProvider");
  return ctx;
}

/**
 * Demo accounts (HANDOVER.md section 9). Account state is provided through context, so page
 * code never depends on script order (the static build's sync bug).
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pending = useRef<((u: User) => void) | null>(null);
  const readyRef = useRef<Promise<User | null> | null>(null);

  if (!readyRef.current) {
    readyRef.current = api<{ user: User | null }>("/api/session").then(
      (d) => d.user,
      () => {
        throw new Error("no api");
      },
    );
  }
  useEffect(() => {
    readyRef.current!.then(
      (u) => { setAvailable(true); setUser(u); },
      () => setAvailable(false),
    );
  }, []);

  const signIn = useCallback((then?: (u: User) => void) => {
    pending.current = then ?? null;
    setDialogOpen(true);
  }, []);
  const signOut = useCallback(async () => {
    await api("/api/session", { method: "DELETE" });
    setUser(null);
  }, []);

  const value = useMemo<AccountState>(
    () => ({ user, available, ready: readyRef.current!.catch(() => null), signIn, signOut }),
    [user, available, signIn, signOut],
  );

  return (
    <AccountContext.Provider value={value}>
      {children}
      <SignInDialog
        open={dialogOpen}
        available={available}
        onClose={() => setDialogOpen(false)}
        onSignedIn={(u) => {
          setUser(u);
          setDialogOpen(false);
          const p = pending.current;
          pending.current = null;
          p?.(u);
        }}
      />
    </AccountContext.Provider>
  );
}

function SignInDialog(props: { open: boolean; available: boolean | null; onClose: () => void; onSignedIn: (u: User) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) {
      setError(null);
      d.showModal();
    } else if (!props.open && d.open) d.close();
  }, [props.open]);

  const unavailable = props.available === false;

  return (
    <dialog ref={ref} className="sh-dialog" aria-labelledby="sh-signin-h" onClose={props.onClose}>
      <form
        className="sh-signin-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (unavailable) return;
          const f = e.currentTarget.elements as unknown as { name: HTMLInputElement; premium: HTMLInputElement };
          setBusy(true);
          try {
            const d = await api<{ user: User }>("/api/session", {
              method: "POST",
              body: { name: f.name.value, premium: f.premium.checked },
            });
            e.currentTarget?.reset();
            props.onSignedIn(d.user);
          } catch (x) {
            setError((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="sh-signin-h">Sign in (demo)</h2>
        <p className="sh-demo-note">
          This redesign can&rsquo;t reach real 2KLab accounts, so sign-in here is a <b>demo</b>. There&rsquo;s no
          password: anyone who uses the same name gets the same account. Don&rsquo;t use your real name or anything
          personal.
        </p>
        {unavailable && (
          <p className="sh-err" role="alert">
            Sign-in works on the deployed site. This copy of the page has no server behind it.
          </p>
        )}
        <label className="sh-field">
          Display name
          <input name="name" autoComplete="off" maxLength={20} required aria-describedby="sh-name-hint" autoFocus disabled={unavailable} />
        </label>
        <span className="sh-hint" id="sh-name-hint">2&ndash;20 letters, numbers, spaces, - or _</span>
        <label className="sh-check">
          <input type="checkbox" name="premium" disabled={unavailable} /> Make it a demo Premium account{" "}
          <span className="sh-hint">(Premium can rate community builds, as on the live site. Set when the account is created.)</span>
        </label>
        {error && <p className="sh-err" role="alert">{error}</p>}
        <div className="sh-dialog-actions">
          <button type="button" className="sh-btn sh-ghost" onClick={props.onClose}>Cancel</button>
          <button type="submit" className="sh-btn sh-primary" disabled={busy || unavailable}>Sign in</button>
        </div>
      </form>
    </dialog>
  );
}

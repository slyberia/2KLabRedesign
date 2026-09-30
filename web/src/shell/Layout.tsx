import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useAccount } from "./account";
import { EXT_DESC_ID, NAV, PAGE_PATH, live, type PageKey } from "./links";
import "./shell.css";

/** A link to the live nba2klab.com: opens in a new tab and says so (the footer carries the description). */
export function ExtLink({ href, className, style, children }: { href: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <a className={`${className ?? ""} ext`} href={href} target="_blank" rel="noopener" aria-describedby={EXT_DESC_ID} style={style}>
      {children}
    </a>
  );
}

function NavLinks({ current, cls }: { current: PageKey; cls: string }) {
  return (
    <>
      {NAV.map((n) => (
        <a key={n.key} className={cls} href={PAGE_PATH[n.key]} aria-current={current === n.key ? "page" : undefined}>
          {n.label}
        </a>
      ))}
    </>
  );
}

function AccountControl({ id }: { id: string }) {
  const { user, signIn, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <span className="sh-acct">
        <button type="button" className="sh-btn sh-ghost" data-closes-drawer onClick={() => signIn()}>Log In</button>
      </span>
    );
  }
  return (
    <span className="sh-acct" ref={wrap}>
      <button
        type="button"
        className="sh-btn sh-ghost sh-acct-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {user.name}
        {user.premium && <span className="sh-prem">Premium</span>}
      </button>
      <div className="sh-menu" id={id} hidden={!open}>
        <span className="sh-menu-note">Demo account</span>
        <a href="/builder#my-builds" onClick={() => setOpen(false)}>My builds</a>
        <a href="/game-details?track=rep#rewards" onClick={() => setOpen(false)}>My progress</a>
        <button type="button" data-closes-drawer onClick={() => { setOpen(false); void signOut(); }}>Sign out</button>
      </div>
    </span>
  );
}

function Header({ current }: { current: PageKey }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // Mobile drawer: focus moves in, Tab is trapped, Escape closes and returns focus, desktop width closes it.
  useEffect(() => {
    if (!open) return;
    const focusables = () => drawer.current?.querySelectorAll<HTMLElement>("a,button") ?? [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const onResize = () => { if (window.innerWidth > 1080) setOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <header className="sh-bar">
        <div className="sh-wrap">
          <a className="sh-logo" href="/" aria-current={current === "home" ? "page" : undefined}>
            NBA2K<em>LAB</em>
          </a>
          <nav className="sh-nav" aria-label="Primary">
            <NavLinks current={current} cls="sh-link" />
          </nav>
          <div className="sh-actions">
            <AccountControl id="sh-menu-0" />
            <a className="sh-btn sh-primary" href="/#premium">Go Premium</a>
          </div>
          <button
            ref={toggle}
            className="sh-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="sh-drawer"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>
      <div
        className="sh-drawer"
        id="sh-drawer"
        ref={drawer}
        hidden={!open}
        // links and account actions (which open a dialog or change the page) close the drawer
        onClick={(e) => { if ((e.target as HTMLElement).closest("a, [data-closes-drawer]")) setOpen(false); }}
      >
        <div className="sh-wrap">
          <NavLinks current={current} cls="sh-dl" />
          <div className="sh-drawer-actions">
            <AccountControl id="sh-menu-1" />
            <a className="sh-btn sh-primary" href="/#premium">Go Premium</a>
          </div>
        </div>
      </div>
    </>
  );
}

type FooterLink = { label: string; href: string; ext?: boolean };
const FOOTER_COLS: [string, FooterLink[]][] = [
  ["Tools", [
    { label: "Builds", href: "/builds" }, { label: "MyPlayer Builder", href: "/builder" },
    { label: "Requirements", href: "/reference-table" }, { label: "MyCareer Progression", href: "/mycareer" },
    { label: "Shooting Guide", href: "/shooting" }, { label: "Game Details", href: "/game-details" },
  ]],
  ["Reference", [
    { label: "Signature Blueprints", href: "/builds#blueprints" }, { label: "Build Specializations", href: "/mycareer#specializations" },
    { label: "REP & Lifetime Rewards", href: "/game-details?track=rep#rewards" }, { label: "Rebirth Rewards", href: "/mycareer#rebirth" },
    { label: "Takeover Requirements", href: "/reference-table#takeovers" }, { label: "Cap Breakers", href: "/game-details?track=cap-breakers#rewards" },
    { label: "Best Settings", href: "/game-details#settings" }, { label: "Controls", href: "/game-details#controls" },
  ]],
  ["Support", [
    { label: "Go Premium", href: "/#premium" },
    { label: "Jumpshot Lab", href: live("/jumpshot-recommender"), ext: true },
    { label: "Contact", href: live("/contact"), ext: true },
    { label: "Terms", href: live("/terms-and-conditions"), ext: true },
    { label: "Privacy", href: live("/privacy-policy"), ext: true },
  ]],
];

function Footer() {
  return (
    <footer className="sh-foot">
      <div className="sh-wrap">
        <div className="sh-cols">
          <div className="sh-brand">
            <a className="sh-logo" href="/">NBA2K<em>LAB</em></a>
            <p>Data-tested jumpers, badges and builds for NBA 2K27, backed by 10 years of large-sample testing.</p>
          </div>
          {FOOTER_COLS.map(([title, links], i) => (
            <nav key={title} className="sh-fcol" aria-labelledby={`sh-fh-${i}`}>
              <h2 className="sh-fh" id={`sh-fh-${i}`}>{title}</h2>
              {links.map((l) =>
                l.ext
                  ? <ExtLink key={l.label} className="sh-fl" href={l.href}>{l.label}</ExtLink>
                  : <a key={l.label} className="sh-fl" href={l.href}>{l.label}</a>,
              )}
            </nav>
          ))}
        </div>
        <div className="sh-fine">
          <p>&copy; 2026 NBA2KLab. Not associated with NBA 2K, Take-Two Interactive, or the NBA.</p>
          <p className="sh-extnote"><span aria-hidden="true">&#8599;</span> Opens the current NBA2KLab site in a new tab</p>
        </div>
        <span id={EXT_DESC_ID} hidden>Opens the current NBA2KLab site in a new tab</span>
      </div>
    </footer>
  );
}

export function Layout({ current, children }: { current: PageKey; children: ReactNode }) {
  return (
    <>
      <Header current={current} />
      {children}
      <Footer />
    </>
  );
}

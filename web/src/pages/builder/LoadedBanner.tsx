import { useEffect, useRef, useState } from "react";
import type { Clamped } from "../../domain";
import { useAccount } from "../../shell/account";
import { api } from "../../lib/api";
import type { SavedBuild } from "../../lib/apiTypes";
import { presetRef, type Loaded } from "./useBuilder";

export function LoadedBanner(props: {
  loaded: Loaded;
  clamped: Clamped[];
  /** Attributes changed from the archetype start (range blueprints only). */
  changes: number;
  overrides: string;
  pinned: boolean;
  onPin: () => void;
  onReset: () => void;
  /** The share URL for the build on screen. */
  shareUrl: () => string;
  onSaved: () => void;
}) {
  const { loaded } = props;
  const { user, available, signIn } = useAccount();
  const [msg, setMsg] = useState<string>("");
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const linkField = useRef<HTMLInputElement>(null);

  // A new preset clears any message about the previous one.
  const ref = presetRef(loaded);
  const refKey = `${ref.type}:${ref.id}`;
  useEffect(() => { setMsg(""); setManualLink(null); setSaving(false); }, [refKey]);
  useEffect(() => { if (manualLink) linkField.current?.select(); }, [manualLink]);

  const isBp = loaded.type === "blueprint";
  const potential = isBp ? loaded.bp.potentialOverall : loaded.p.overall;
  const name = isBp ? loaded.bp.archetype : loaded.p.name;
  const editable = isBp && loaded.mode === "range";

  const copyLink = async () => {
    const url = props.shareUrl();
    setManualLink(null);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setMsg("Link copied");
      setTimeout(() => setMsg((m) => (m === "Link copied" ? "" : m)), 2500);
    } catch {
      // Clipboard blocked (sandboxed preview, older browser): show the link ready to copy by hand.
      setMsg("");
      setManualLink(url);
    }
  };

  const startSave = () => {
    if (available === false) return setMsg("Saving builds works on the deployed site.");
    if (!user) return signIn(() => setSaving(true));
    setSaving(true);
  };

  return (
    <div className="loaded">
      <div>
        <span className="lname">{name}<span className="ltype">{isBp ? "Blueprint" : "Real Player"}</span></span>
        <div className="lmeta">
          {isBp
            ? <>{loaded.bp.position} &middot; {loaded.bp.height} &middot; {loaded.bp.weight} lbs &middot; {loaded.bp.wingspan} wingspan</>
            : <>{loaded.p.position} &middot; {loaded.p.height} &middot; {loaded.p.team}</>}
        </div>
        {isBp && loaded.bp.comparisons.length > 0 && <div className="lcomps">Plays like: {loaded.bp.comparisons.join(", ")}</div>}
        {props.clamped.length > 0 && (
          <p className="clamp-note" role="status">
            This link had values outside the archetype&rsquo;s range, so they were adjusted:{" "}
            {props.clamped.map((c) => `${c.attribute} ${c.asked} → ${c.used}`).join(", ")}.
          </p>
        )}
        <div className="lactions">
          <button type="button" className="btn btn-primary" onClick={startSave}>Save build</button>
          <button type="button" className="btn btn-ghost" onClick={copyLink}>Copy link</button>
          {editable && (
            <>
              <button type="button" className="btn btn-ghost" disabled={props.changes === 0} onClick={props.onReset}>Reset</button>
              <span className="custom-state">
                {props.changes ? `Custom build: ${props.changes} change${props.changes === 1 ? "" : "s"} from the archetype start` : "Archetype start"}
              </span>
            </>
          )}
          <span className="copy-msg" role="status" aria-live="polite">
            {msg}
            {manualLink && <input ref={linkField} className="copy-field" readOnly value={manualLink} aria-label="Build link" />}
          </span>
          <button type="button" className="btn btn-ghost" aria-pressed={props.pinned} onClick={props.onPin}>
            {props.pinned ? "★ Pinned" : "☆ Pin to Compare"}
          </button>
        </div>
        {saving && (
          <SaveForm
            defaultName={props.changes ? `${name} (custom)` : name}
            onCancel={() => setSaving(false)}
            onSave={async (buildName) => {
              try {
                const d = await api<{ build: SavedBuild }>("/api/builds", {
                  method: "POST",
                  body: { name: buildName, preset: `${ref.type}:${ref.id}`, a: props.overrides },
                });
                setSaving(false);
                setMsg(`Saved as “${d.build.name}” in My Builds`);
                props.onSaved();
              } catch (x) {
                setMsg((x as Error).message);
              }
            }}
          />
        )}
      </div>
      <div className="lpotential">
        <div className="num">{potential == null ? <span className="unpub-num">&mdash;</span> : potential}</div>
        <div className="cap">{potential == null ? "Not published by 2KLab" : isBp ? "Archetype Potential" : "Player Overall"}</div>
      </div>
    </div>
  );
}

function SaveForm(props: { defaultName: string; onCancel: () => void; onSave: (name: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  return (
    <form className="save-form" onSubmit={(e) => { e.preventDefault(); props.onSave(input.current!.value); }}>
      <label className="sr-only" htmlFor="saveName">Build name</label>
      <input id="saveName" ref={input} maxLength={40} defaultValue={props.defaultName} />
      <button type="submit" className="btn btn-primary">Save</button>
      <button type="button" className="btn btn-ghost" onClick={props.onCancel}>Cancel</button>
    </form>
  );
}

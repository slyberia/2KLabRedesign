import { useEffect, useState } from "react";
import { useAccount } from "../../shell/account";
import { api } from "../../lib/api";
import type { CommunityBuild, SavedBuild } from "../../lib/apiTypes";

const MAX_BUILDS = 25;

/** Saved builds for the signed-in demo account (HANDOVER.md section 9). */
export function MyBuilds(props: { version: number; onOpen: (b: SavedBuild) => void }) {
  const { user, available, signIn } = useAccount();
  const [builds, setBuilds] = useState<SavedBuild[] | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) { setBuilds(null); setShared(new Set()); return; }
    let live = true;
    Promise.all([api<{ builds: SavedBuild[] }>("/api/builds"), api<{ builds: CommunityBuild[] }>("/api/community")]).then(
      ([b, c]) => {
        if (!live) return;
        setBuilds(b.builds);
        setShared(new Set(c.builds.filter((x) => x.mine && x.sourceId).map((x) => x.sourceId!)));
        setError(null);
      },
      (x) => live && setError((x as Error).message),
    );
    return () => { live = false; };
  }, [user, props.version, reload]);

  if (available === false) return <div className="my-empty">Saved builds need the deployed site. This copy has no server behind it.</div>;
  if (!user) {
    return (
      <div className="my-empty">
        Sign in to save builds and see them here.
        <br />
        <button type="button" className="btn btn-primary" onClick={() => signIn()}>Sign in (demo)</button>
      </div>
    );
  }
  if (error) return <div className="my-empty">Couldn&rsquo;t load your builds: {error}</div>;
  if (!builds) return <div className="my-empty">Loading your builds&hellip;</div>;
  if (!builds.length) {
    return <div className="my-empty">No saved builds yet. Load an archetype or a player, then use <b>Save build</b>.</div>;
  }

  const share = async (id: string) => {
    try {
      await api("/api/community", { method: "POST", body: { action: "publish", buildId: id } });
      setShared((s) => new Set(s).add(id));
      setMsg("Shared. It now appears under Builds → Community Builds.");
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this saved build?")) return;
    try {
      await api(`/api/builds?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setReload((r) => r + 1);
    } catch (x) {
      setMsg((x as Error).message);
    }
  };

  return (
    <>
      <p className="my-msg" role="status">{msg || `${builds.length} saved build${builds.length === 1 ? "" : "s"} (up to ${MAX_BUILDS}).`}</p>
      <div className="my-list">
        {builds.map((b) => {
          const edits = b.a ? b.a.split(".").length : 0;
          const isShared = shared.has(b.id);
          return (
            <article className="my-card" key={b.id}>
              <h3>{b.name}</h3>
              <div className="my-meta">
                {b.archetype ? `${b.archetype} · ${b.position}` : "Real player card"} &middot;{" "}
                {edits ? `${edits} change${edits === 1 ? "" : "s"}` : "archetype start"}
              </div>
              <div className="my-meta">
                Saved {new Date(b.createdAt).toLocaleDateString()}
                {isShared && <> &middot; <span className="my-shared">Shared</span></>}
              </div>
              <div className="my-actions">
                <button type="button" className="btn btn-primary" onClick={() => props.onOpen(b)}>Open</button>
                {b.archetype && !isShared && (
                  <button type="button" className="btn btn-ghost" onClick={() => share(b.id)}>Share to community</button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => del(b.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

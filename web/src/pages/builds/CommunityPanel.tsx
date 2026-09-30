import { useEffect, useRef, useState } from "react";
import { useAccount } from "../../shell/account";
import { api } from "../../lib/api";
import type { CommunityBuild } from "../../lib/apiTypes";

type Sort = "rating" | "new";
const builderLink = (b: CommunityBuild) => `/builder?preset=${b.preset}${b.a ? `&a=${b.a}` : ""}`;

/** Community builds from /api/community. Rating needs a Premium demo account, as on the live site. */
export function CommunityPanel() {
  const { user, available, ready, signIn } = useAccount();
  const [list, setList] = useState<CommunityBuild[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("rating");
  const [msg, setMsg] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    ready.then(() => api<{ builds: CommunityBuild[] }>("/api/community")).then(
      (d) => { if (live) { setList(d.builds); setError(null); } },
      (x) => live && setError((x as Error).message),
    );
    return () => { live = false; };
  }, [user, ready]);

  if (available === false) {
    return <div className="empty"><h2>Community builds need the deployed site</h2><p>This copy of the page has no server behind it.</p></div>;
  }

  const rate = async (b: CommunityBuild, stars: number) => {
    try {
      const d = await api<{ builds: CommunityBuild[] }>("/api/community", { method: "POST", body: { action: "rate", id: b.id, stars } });
      setList(d.builds);
      setMsg("Rating saved.");
      requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(`[data-rate="${b.id}"][data-stars="${stars}"]`)?.focus());
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const remove = async (b: CommunityBuild) => {
    if (!confirm("Remove this build from the community list?")) return;
    try {
      const d = await api<{ builds: CommunityBuild[] }>(`/api/community?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
      setList(d.builds);
      setMsg("Removed.");
    } catch (x) {
      setMsg((x as Error).message);
    }
  };

  const stars = (b: CommunityBuild) => {
    if (b.mine) return <span className="c-note">Your build</span>;
    if (!user) return <span className="c-note"><button type="button" className="linkish" onClick={() => signIn()}>Sign in</button> with a Premium demo account to rate.</span>;
    if (!user.premium) return <span className="c-note">Rating builds is a Premium feature.</span>;
    const r = b.myRating ?? 0;
    return (
      <div className="stars" role="group" aria-label={`Your rating for ${b.name}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" className={i <= r ? "on" : ""} data-rate={b.id} data-stars={i} aria-pressed={i === r} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => rate(b, i)}>
            &#9733;
          </button>
        ))}
      </div>
    );
  };

  const sorted = (list ?? []).slice().sort(
    sort === "new"
      ? (a, b) => b.createdAt - a.createdAt
      : (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount || b.createdAt - a.createdAt,
  );

  return (
    <div ref={panel}>
      <div className="src-banner community">
        <span className="src-tag">Community &middot; from 2KLab members</span>
        <p>Builds shared by 2KLab members and rated by Premium members. Separate from 2K&rsquo;s official archetypes. In this redesign, accounts are demo accounts.</p>
      </div>
      <div className="community-bar">
        <span className="sort-lbl" id="cSortLbl">Sort</span>
        <div className="seg" role="group" aria-labelledby="cSortLbl">
          <button type="button" aria-pressed={sort === "rating"} onClick={() => setSort("rating")}>Top rated</button>
          <button type="button" aria-pressed={sort === "new"} onClick={() => setSort("new")}>Newest</button>
        </div>
        <a className="btnlink" href="/builder#my-builds">Share a build</a>
      </div>
      <p className="c-msg" role="status" aria-live="polite">{msg}</p>
      {error ? (
        <p className="basis">Couldn&rsquo;t load community builds: {error}</p>
      ) : list == null ? (
        <p className="basis">Loading community builds&hellip;</p>
      ) : !list.length ? (
        <div className="empty">
          <h2>No 2K27 builds have been shared yet</h2>
          <p>Save a build in the MyPlayer Builder, then share it from My Builds. Premium members rate them here.</p>
          <a className="btnlink" href="/builder#my-builds">Share a build</a>
        </div>
      ) : (
        <div className="c-grid">
          {sorted.map((b) => {
            const edits = b.a ? b.a.split(".").length : 0;
            return (
              <article className="c-card" key={b.id}>
                <h3>{b.name}</h3>
                <div className="c-by">by {b.ownerName} &middot; demo account</div>
                <div className="c-meta">
                  {b.archetype ? `${b.archetype} · ${b.position}` : "Real player card"} &middot;{" "}
                  {edits ? `${edits} change${edits === 1 ? "" : "s"} from the archetype start` : "archetype start"}
                </div>
                <div className="c-rating">
                  {b.rating != null
                    ? <>&#9733; {b.rating.toFixed(1)} <span className="none">({b.ratingCount} rating{b.ratingCount === 1 ? "" : "s"})</span></>
                    : <span className="none">No ratings yet</span>}
                </div>
                {stars(b)}
                <div className="c-actions">
                  <a href={builderLink(b)}>Open in Builder &rarr;</a>
                  {b.mine && <button type="button" className="linkish" onClick={() => remove(b)}>Remove</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

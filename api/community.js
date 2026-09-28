import { handle, json, body, readSession } from "../lib/http.js";
import { requireUser, getAccount, newId, update, err } from "../lib/accounts.js";
import { store } from "../lib/store.js";

const PATH = "community/index.json";
const PER_OWNER = 10, TOTAL = 500;

function view(list, me) {
  return list.map((b) => {
    const votes = Object.values(b.ratings || {});
    return { id: b.id, name: b.name, preset: b.preset, a: b.a, archetype: b.archetype, position: b.position,
      ownerName: b.ownerName, createdAt: b.createdAt, ratingCount: votes.length,
      rating: votes.length ? Math.round((votes.reduce((x, y) => x + y, 0) / votes.length) * 10) / 10 : null,
      mine: !!me && b.owner === me.id, myRating: me ? (b.ratings || {})[me.id] ?? null : null,
      sourceId: me && b.owner === me.id ? b.sourceId : undefined };      // only the owner sees which saved build it came from
  });
}

export default handle({
  async GET(request) {                                  // public: anyone can browse
    const s = readSession(request); const me = s && (await getAccount(s.id));
    const r = await (await store()).read(PATH);
    return json({ builds: view(r ? r.data.builds : [], me) });
  },
  async POST(request) {
    const me = await requireUser(request);
    const b = await body(request);
    if (b.action === "publish") {                       // publish one of your saved builds
      const saved = (me.builds || []).find((x) => x.id === b.buildId);
      if (!saved) throw err(404, "Saved build not found");
      const data = await update(PATH, { builds: [] }, (d) => {
        if (d.builds.some((x) => x.owner === me.id && x.sourceId === saved.id)) throw err(409, "Already shared");
        if (d.builds.filter((x) => x.owner === me.id).length >= PER_OWNER) throw err(409, `Up to ${PER_OWNER} shared builds per account`);
        if (d.builds.length >= TOTAL) throw err(409, "Community list is full");
        d.builds.unshift({ id: newId(), sourceId: saved.id, owner: me.id, ownerName: me.name, name: saved.name, preset: saved.preset,
          a: saved.a, archetype: saved.archetype, position: saved.position, createdAt: Date.now(), ratings: {} });
      });
      return json({ builds: view(data.builds, me) }, 201);
    }
    if (b.action === "rate") {                          // Premium only, as on the live site; not your own build
      if (!me.premium) throw err(403, "Rating builds is a Premium feature");
      const stars = Number(b.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw err(400, "Rating must be 1-5 stars");
      const data = await update(PATH, { builds: [] }, (d) => {
        const t = d.builds.find((x) => x.id === b.id); if (!t) throw err(404, "Build not found");
        if (t.owner === me.id) throw err(403, "You can't rate your own build");
        t.ratings = t.ratings || {}; t.ratings[me.id] = stars;
      });
      return json({ builds: view(data.builds, me) });
    }
    throw err(400, "Unknown action");
  },
  async DELETE(request) {                               // remove your own shared build
    const me = await requireUser(request);
    const id = new URL(request.url).searchParams.get("id");
    const data = await update(PATH, { builds: [] }, (d) => {
      const t = d.builds.find((x) => x.id === id); if (!t) throw err(404, "Build not found");
      if (t.owner !== me.id) throw err(403, "Not your build");
      d.builds = d.builds.filter((x) => x.id !== id);
    });
    return json({ builds: view(data.builds, me) });
  },
});

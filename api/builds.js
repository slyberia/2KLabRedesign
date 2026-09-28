import { handle, json, body } from "../lib/http.js";
import { requireUser, accountPath, normalizeBuild, newId, update, err } from "../lib/accounts.js";

const MAX_BUILDS = 25;
export default handle({
  async GET(request) {
    const a = await requireUser(request);
    return json({ builds: a.builds || [] });
  },
  async POST(request) {
    const a = await requireUser(request);
    const build = { id: newId(), ...normalizeBuild(await body(request)), createdAt: Date.now() };
    await update(accountPath(a.id), a, (d) => {
      d.builds = d.builds || [];
      if (d.builds.length >= MAX_BUILDS) throw err(409, `You can save up to ${MAX_BUILDS} builds`);
      d.builds.unshift(build);
    });
    return json({ build }, 201);
  },
  async DELETE(request) {
    const a = await requireUser(request);
    const id = new URL(request.url).searchParams.get("id");
    await update(accountPath(a.id), a, (d) => {
      const n = (d.builds || []).length; d.builds = (d.builds || []).filter((x) => x.id !== id);
      if (d.builds.length === n) throw err(404, "Build not found");
    });
    return json({ ok: true });
  },
});

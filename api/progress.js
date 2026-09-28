import { handle, json, body } from "../lib/http.js";
import { requireUser, accountPath, mergeProgress, update } from "../lib/accounts.js";

// Rewards progress, owned by the account. PUT merges per key: the newer timestamp wins,
// which is also how progress marked before signing in joins the account on first sign-in.
export default handle({
  async GET(request) {
    const a = await requireUser(request);
    return json({ progress: a.progress || {} });
  },
  async PUT(request) {
    const a = await requireUser(request);
    const b = await body(request);
    const acct = await update(accountPath(a.id), a, (d) => { d.progress = d.progress || {}; return mergeProgress(d.progress, b.progress); });
    return json({ progress: acct.progress });
  },
});

import { handle, json, body, makeSession, readSession, cookieHeader } from "../lib/http.js";
import { slugFor, accountPath, getAccount, publicUser, update } from "../lib/accounts.js";

// DEMO sign-in: this mockup cannot reach real 2KLab accounts. A name picks (or creates) a demo account.
export default handle({
  async GET(request) {
    const s = readSession(request); const a = s && (await getAccount(s.id));
    return json({ user: a ? publicUser(a) : null });
  },
  async POST(request) {
    const b = await body(request);
    const { display, slug } = slugFor(b.name);
    const fresh = { __new: true, id: slug, name: display, premium: !!b.premium, createdAt: Date.now(), progress: {}, builds: [] };
    // existing account: loaded as-is (its Premium flag stays as created); new account: written once
    const acct = await update(accountPath(slug), fresh, (d) => { if (!d.__new) return false; delete d.__new; });
    return json({ user: publicUser(acct), created: acct.createdAt === fresh.createdAt },
      200, { "set-cookie": cookieHeader(makeSession(acct), 60 * 60 * 24 * 30) });
  },
  async DELETE() {
    return json({ user: null }, 200, { "set-cookie": cookieHeader("", 0) });
  },
});

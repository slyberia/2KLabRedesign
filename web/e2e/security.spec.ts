import { expect, test } from "@playwright/test";
import { openSignIn, signIn, uniqueName } from "./helpers";

const PAGES = ["/", "/builds", "/builder?preset=blueprint:certified-bucket", "/reference-table", "/mycareer", "/shooting", "/game-details#face-creations"];

test.describe("Public-deploy safety (HANDOVER.md section 13)", () => {
  test("every page runs under the CSP with no violations, and asks not to be indexed", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
    page.on("pageerror", (e) => violations.push(e.message));
    for (const path of PAGES) {
      const r = await page.goto(path);
      const h = r!.headers();
      expect(h["content-security-policy"], path).toContain("script-src 'self'");
      expect(h["x-robots-tag"], path).toBe("noindex, nofollow");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      await expect(page.getByRole("note")).toContainText("Unofficial redesign concept.");
      await page.waitForLoadState("networkidle");
    }
    expect(violations).toEqual([]);
  });

  test("a name that only differs in capitals from an existing account is refused with the exact name", async ({ page }) => {
    const name = uniqueName("Case");
    await page.goto("/");
    await openSignIn(page);
    await signIn(page, name);
    await page.context().clearCookies();
    await page.reload();
    await openSignIn(page);
    const dialog = page.getByRole("dialog", { name: "Sign in (demo)" });
    await dialog.getByLabel("Display name").fill(name.toLowerCase());
    await dialog.getByRole("button", { name: "Sign in" }).click();
    await expect(dialog.getByRole("alert")).toContainText(`“${name}”`);
  });
});

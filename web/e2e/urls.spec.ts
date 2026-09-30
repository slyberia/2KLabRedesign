import { expect, test } from "@playwright/test";

const PAGES = ["builds", "builder", "reference-table", "mycareer", "shooting", "game-details"];

test.describe("Clean URLs", () => {
  test("every page is served without .html", async ({ page }) => {
    for (const p of ["", ...PAGES]) {
      const r = await page.goto(`/${p}`);
      expect(r?.status(), `/${p}`).toBe(200);
      await expect(page.locator(".sh-bar")).toBeVisible();
    }
  });

  test("old .html links redirect and keep their query and hash", async ({ page }) => {
    await page.goto("/reference-table.html?badge=LimitlessRange&tier=bronze#badges");
    await expect(page).toHaveURL("/reference-table?badge=LimitlessRange&tier=bronze#badges");
    await expect(page.locator("#desc-LimitlessRange .crossings-head")).toContainText("(866 total)");

    await page.goto("/builder.html?preset=blueprint:certified-bucket&a=tpt93");
    await expect(page).toHaveURL(/\/builder\?preset=blueprint:certified-bucket&a=tpt93$/);
    await expect(page.locator("#bcard-LimitlessRange .reached-tag")).toHaveText("Gold");

    await page.goto("/game-details.html?track=cap-breakers#rewards");
    await expect(page).toHaveURL("/game-details?track=cap-breakers#rewards");
    await expect(page.getByRole("tab", { name: "Cap Breakers" })).toHaveAttribute("aria-selected", "true");

    await page.goto("/index.html#premium");
    await expect(page).toHaveURL("/#premium");
  });

  test("in-page links use clean paths", async ({ page }) => {
    for (const p of ["", ...PAGES]) {
      await page.goto(`/${p}`);
      const bad = await page.locator("a[href]").evaluateAll((as) =>
        as.map((a) => a.getAttribute("href")!).filter((h) => /\.html\b/.test(h) && !/^https?:/.test(h)));
      expect(bad, `/${p}`).toEqual([]);
    }
  });
});

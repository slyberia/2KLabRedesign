import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, openSignIn, signIn, uniqueName } from "./helpers";

test.describe("Builds", () => {
  test("blueprints: position filter, and sorting at the starting build", async ({ page }) => {
    await page.goto("/builds");
    await expect(page.locator(".bp-count").getByText("40 archetypes")).toBeVisible();
    await page.getByRole("button", { name: "PG", exact: true }).click();
    await expect(page.locator(".bp-count").getByText("8 archetypes")).toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();

    await page.getByRole("button", { name: "Takeovers", exact: true }).click();
    await page.getByLabel("Takeover").selectOption({ label: "Shot Artist only" });
    await expect(page.locator(".bp-count").getByText("14 archetypes")).toBeVisible();

    await page.getByRole("button", { name: "Badges", exact: true }).click();
    const cb = page.locator(".bp-card", { hasText: "Certified Bucket" });
    await expect(cb.locator(".bp-metric")).toHaveText("12 badges Gold+");
    await page.getByLabel("Tier").selectOption("hof");
    await expect(cb.locator(".bp-metric")).toHaveText("1 badge HoF");

    await page.getByRole("button", { name: "Attribute", exact: true }).click();
    await expect(cb.locator(".bp-metric")).toHaveText("Three-Point Shot 89");
    await expect(cb.getByRole("link", { name: "Explore in Builder →" })).toHaveAttribute("href", "/builder?preset=blueprint:certified-bucket");
    await expect(page.locator(".bp-card").filter({ hasText: "Launchpad" }).locator(".bp-pot")).toContainText("—");
    await expectNoHorizontalOverflow(page);
  });

  test("tabs follow the hash", async ({ page }) => {
    await page.goto("/builds#community");
    await expect(page.getByRole("tab", { name: "Community Builds" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Signature Blueprints" }).click();
    await expect(page).toHaveURL(/#blueprints$/);
    await page.getByRole("link", { name: "Signature Blueprints" }).last().click(); // footer link: hash only
    await expect(page.getByRole("tab", { name: "Signature Blueprints" })).toHaveAttribute("aria-selected", "true");
  });

  test("community: a shared build can be rated by a Premium account, not by its owner", async ({ page, browser }) => {
    const owner = uniqueName("Owner");
    await page.goto("/builds#community");
    await openSignIn(page);
    await signIn(page, owner);
    const saved = await (await page.request.post("/api/builds", { data: { name: `${owner} build`, preset: "blueprint:certified-bucket", a: "tpt93" } })).json();
    await page.request.post("/api/community", { data: { action: "publish", buildId: saved.build.id } });
    await page.reload();
    const mine = page.locator(".c-card", { hasText: `${owner} build` });
    await expect(mine).toContainText("Your build");
    await expect(mine.getByRole("link", { name: "Open in Builder →" })).toHaveAttribute("href", "/builder?preset=blueprint:certified-bucket&a=tpt93");

    const ctx = await browser.newContext({ viewport: page.viewportSize()!, isMobile: false });
    const other = await ctx.newPage();
    await other.goto("/builds#community");
    const card = other.locator(".c-card", { hasText: `${owner} build` });
    await expect(card).toContainText("with a Premium demo account to rate");
    await openSignIn(other);
    await signIn(other, uniqueName("Rater"), true);
    await card.getByRole("button", { name: "4 stars" }).click();
    await expect(other.getByText("Rating saved.")).toBeVisible();
    await expect(card.locator(".c-rating")).toContainText("★ 4.0 (1 rating)");
    await ctx.close();
  });
});

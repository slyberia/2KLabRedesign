import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, isPhone, search, signIn, uniqueName } from "./helpers";

const reached = (page: import("@playwright/test").Page, tier: string) => page.locator(`.reached-tag.r-${tier}`);

test.describe("Builder", () => {
  test("Certified Bucket starting build: 1 HoF, 11 Gold, 18 Silver, 2 Bronze; 1,203 animations; 12 of 24 takeovers", async ({ page }) => {
    await page.goto("/builder?preset=blueprint:certified-bucket");
    await expect(page.locator(".lname")).toContainText("Certified Bucket");
    await expect(reached(page, "hof")).toHaveCount(1);
    await expect(reached(page, "gold")).toHaveCount(11);
    await expect(reached(page, "silver")).toHaveCount(18);
    await expect(reached(page, "bronze")).toHaveCount(2);
    const unlocked = await page.locator(".animcount .n").evaluateAll((els) => els.reduce((n, e) => n + parseInt(e.textContent!, 10), 0));
    expect(unlocked).toBe(1203);
    await expect(page.getByText("Takeovers 12/24")).toBeVisible();
    const specs = page.locator(".specsummary").first();
    await expect(specs.locator(".spec-chip.ok")).toHaveCount(5);
    await expect(specs.locator(".spec-chip:not(.ok)")).toHaveText("Rebounding (not yet)");
    await expectNoHorizontalOverflow(page);
  });

  test("share link values outside the range are clamped and reported", async ({ page }) => {
    await page.goto("/builder?preset=blueprint:certified-bucket&a=tpt99.mid10.swb07");
    await expect(page.locator(".clamp-note")).toContainText("Three-Point Shot 99 → 95, Mid-Range Shot 10 → 93, Speed With Ball 7 → 86");
    await expect.poll(() => search(page).get("a")).toBe("tpt95");
    await expect(page.getByText("Custom build: 1 change from the archetype start")).toBeVisible();
  });

  test("sliders update tiers live, the share URL and Reset", async ({ page }) => {
    await page.goto("/builder?preset=blueprint:certified-bucket");
    const lr = page.locator("#bcard-LimitlessRange .reached-tag");
    await expect(lr).toHaveText("Silver");
    const slider = page.getByRole("slider", { name: "Three-Point Shot, 89 to 95" });
    await slider.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(lr).toHaveText("Gold");
    await expect.poll(() => search(page).get("a")).toBe("tpt93");
    // the Requirements link carries height and the reached tier
    await expect(page.locator("#bcard-LimitlessRange .card-link")).toHaveAttribute("href", "/reference-table?badge=LimitlessRange&height=6-2&tier=gold#badges");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(lr).toHaveText("Silver");
    await expect.poll(() => search(page).get("a")).toBeNull();
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  test("floor-only blueprints and players are fixed, and ignore a=", async ({ page }) => {
    await page.goto("/builder?preset=blueprint:launchpad&a=tpt99");
    await expect(page.locator(".lpotential .cap")).toHaveText("Not published by 2KLab");
    await expect(page.locator(".lpotential .num")).toHaveText("—");
    await expect(page.locator(".attr-row input[type=range]:not([disabled])")).toHaveCount(0);
    await expect(page.locator(".clamp-note")).toHaveCount(0);
    await expect.poll(() => search(page).get("a")).toBeNull();

    await page.goto("/builder?preset=player:1");
    await expect(page.getByRole("tab", { name: "Real Players" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".lname")).toContainText("Joel Embiid");
    await expect(page.locator(".attr-row input[type=range]:not([disabled])")).toHaveCount(0);
  });

  test("focus= highlights the badge once a preset is picked", async ({ page }) => {
    await page.goto("/builder?focus=LimitlessRange");
    await expect(page.locator(".dl-notice")).toContainText("Limitless Range");
    await page.getByRole("button", { name: /Certified Bucket/ }).click();
    await expect(page.locator("#bcard-LimitlessRange")).toHaveClass(/is-focus/);
    await expect.poll(() => search(page).get("preset")).toBe("blueprint:certified-bucket");
    expect(search(page).get("focus")).toBe("LimitlessRange");
  });

  test("pinning two presets compares them", async ({ page }) => {
    await page.goto("/builder?preset=blueprint:certified-bucket");
    await page.getByRole("button", { name: "☆ Pin to Compare" }).click();
    await page.getByRole("button", { name: /Backcourt Bully/ }).click();
    await page.getByRole("button", { name: "☆ Pin to Compare" }).click();
    if (isPhone(page)) {
      await expect(page.locator(".comparetray")).toHaveClass(/has-items/);
      await expect(page.locator(".comparetray").getByRole("button", { name: "Compare (2)" })).toBeVisible();
    } else {
      const panel = page.getByRole("complementary", { name: "Compare presets" });
      await panel.getByRole("button", { name: "View Full Comparison →" }).click();
      await expect(panel.getByText("Badges Reached, by Tier")).toBeVisible();
      await expect(panel.getByRole("table").first()).toContainText("Certified Bucket");
      // the panel reflows the page instead of covering the picker
      const box = await panel.boundingBox();
      const grid = await page.locator(".picker-grid").first().boundingBox();
      expect(grid!.x + grid!.width).toBeLessThanOrEqual(box!.x + 1);
    }
  });

  test("saved builds: sign in, save, open, share and delete", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/builder?preset=blueprint:certified-bucket&a=tpt93");
    await page.getByRole("button", { name: "Save build" }).click();
    await signIn(page, uniqueName("Saver"));
    const nameField = page.getByLabel("Build name");
    await expect(nameField).toHaveValue("Certified Bucket (custom)");
    await nameField.fill("My Bucket");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved as “My Bucket” in My Builds")).toBeVisible();

    await page.getByRole("tab", { name: "My Builds" }).click();
    const card = page.locator(".my-card", { hasText: "My Bucket" });
    await expect(card).toContainText("Certified Bucket · PG · 1 change");
    await card.getByRole("button", { name: "Share to community" }).click();
    await expect(page.getByText("Shared. It now appears under Builds → Community Builds.")).toBeVisible();
    await expect(card.getByText("Shared")).toBeVisible();

    await page.goto("/builder#my-builds");
    await expect(page.getByRole("tab", { name: "My Builds" })).toHaveAttribute("aria-selected", "true");
    await page.locator(".my-card", { hasText: "My Bucket" }).getByRole("button", { name: "Open" }).click();
    await expect(page.locator(".lname")).toContainText("Certified Bucket");
    await expect(page.getByRole("slider", { name: "Three-Point Shot, 89 to 95" })).toHaveValue("93");

    await page.locator(".my-card", { hasText: "My Bucket" }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No saved builds yet.")).toBeVisible();
  });

  test("phones get a live results bar", async ({ page }) => {
    test.skip(!isPhone(page), "phone layout only");
    await page.goto("/builder?preset=blueprint:certified-bucket");
    const bar = page.getByRole("region", { name: "Live results" });
    await expect(bar).toContainText("1 HoF");
    await expect(bar).toContainText("1203 anims");
    await expect(page.locator("details.cat-group[open]")).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, search } from "./helpers";

test.describe("MyCareer", () => {
  test("attributes link to exact-match badge filters and to specializations", async ({ page }) => {
    await page.goto("/mycareer");
    const speed = page.locator(".attr-row", { has: page.getByRole("heading", { name: "Speed", exact: true }) });
    await expect(speed.getByRole("link", { name: "Keys 2 badges" })).toHaveAttribute("href", "/reference-table?attr=Speed#badges");
    const steal = page.locator(".attr-row", { has: page.getByRole("heading", { name: "Steal", exact: true }) });
    await steal.getByRole("button", { name: "Unlocks Defense" }).click();
    await expect(page.getByRole("tab", { name: "Specializations" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Defense" })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => search(page).get("spec")).toBe("defense");
    await expect(page).toHaveURL(/#specializations$/);
    await expectNoHorizontalOverflow(page);
  });

  test("?spec= opens a specialization; Defense is an OR of two AND groups", async ({ page }) => {
    await page.goto("/mycareer?spec=defense#specializations");
    const unlock = page.locator(".unlock");
    await expect(unlock.locator(".unlock-group")).toHaveCount(2);
    await expect(unlock.locator(".unlock-group").first()).toHaveText(/60 Perimeter Defense\s*AND\s*60 Steal/);
    await expect(unlock.locator(":scope .unlock-list > .op-chip")).toHaveText("OR");
    await expect(page.locator("table.goals tbody tr")).toHaveCount(10);
    await page.getByRole("tab", { name: "Physicals" }).click();
    await expect(page.getByText("No attribute requirement. Any build can pick it.")).toBeVisible();
  });

  test("hash tabs and the Workout Warrior checklist", async ({ page }) => {
    await page.goto("/mycareer#workout");
    await expect(page.getByText("0 / 12 done")).toBeVisible();
    const boxes = page.locator(".checklist input");
    for (let i = 0; i < 12; i++) await boxes.nth(i).check();
    await expect(page.getByText("Workout Warrior unlocked")).toBeVisible();
    await page.getByRole("link", { name: "Rebirth Rewards" }).click(); // footer: hash only
    await expect(page.getByRole("tab", { name: "Rebirth" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".tier")).toHaveCount(4);
  });
});

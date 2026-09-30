import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, isPhone, search } from "./helpers";

test.describe("Requirements", () => {
  test("loads every badge and keeps the URL in step with the filters", async ({ page }) => {
    await page.goto("/reference-table.html");
    await expect(page.getByText("53 of 53 badges")).toBeVisible();
    await page.getByLabel("Your build’s height").selectOption("6'11");
    await expect(page.getByText("46 of 53 badges")).toBeVisible();
    expect(search(page).get("height")).toBe("6-11");
    await page.getByLabel("Search badges").fill("range");
    await expect.poll(() => search(page).get("q")).toBe("range");
    expect(new URL(page.url()).hash).toBe("#badges");
    await expectNoHorizontalOverflow(page);
  });

  test("co-unlock deep link: Limitless Range Bronze, any height = 866", async ({ page }) => {
    await page.goto("/reference-table.html?badge=LimitlessRange&tier=bronze#badges");
    const card = page.locator("#bcard-LimitlessRange");
    await expect(card).toHaveClass(/is-focus/);
    await expect(page.locator("#desc-LimitlessRange .crossings-head")).toContainText("Three-Point Shot ≥ 83 (866 total)");
  });

  test("co-unlocks follow the height filter: 310 at 6'11, 474 at Silver 6'2", async ({ page }) => {
    await page.goto("/reference-table.html?badge=LimitlessRange&tier=bronze&height=6-11#badges");
    await expect(page.locator("#desc-LimitlessRange .crossings-head")).toContainText("(310 total at 6'11)");
    await page.getByLabel("Your build’s height").selectOption("6'2");
    await page.locator("#bcard-LimitlessRange").getByRole("button", { name: /^Silver: 89/ }).click();
    await expect(page.locator("#desc-LimitlessRange .crossings-head")).toContainText("(474 total at 6'2)");
  });

  test("a badge outside the height filter says so and offers to clear it", async ({ page }) => {
    await page.goto("/reference-table.html?badge=MiniMarksman&height=6-11#badges");
    await expect(page.locator(".dl-notice")).toContainText("Mini Marksman isn’t available at 6'11");
    await expect(page.locator("#bcard-MiniMarksman")).toHaveCount(0);
    await page.getByRole("button", { name: "Show all heights" }).click();
    await expect(page.locator("#bcard-MiniMarksman")).toBeVisible();
    expect(search(page).get("height")).toBeNull();
  });

  test("attr= filters by exact attribute (Speed is not Speed With Ball)", async ({ page }) => {
    await page.goto("/reference-table.html?attr=Speed#badges");
    await expect(page.getByText("2 of 53 badges")).toBeVisible();
    await page.getByRole("button", { name: "Clear attribute filter" }).click();
    await expect(page.getByText("53 of 53 badges")).toBeVisible();
    expect(search(page).get("attr")).toBeNull();
    await page.goto("/reference-table.html?attr=Three-Point%20Shot#badges");
    await expect(page.getByText("6 of 53 badges")).toBeVisible();
  });

  test("takeover deep link opens the tab and focuses the card; no height filter there", async ({ page }) => {
    await page.goto("/reference-table.html?takeover=ShotArtist");
    await expect(page.getByRole("tab", { name: "Takeovers" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#tk-ShotArtist")).toHaveClass(/is-focus/);
    await expect(page.locator(".heightbar")).toBeHidden();
    expect(new URL(page.url()).hash).toBe("#takeovers");
    await expect(page.getByText("24 of 24 takeovers")).toBeVisible();
  });

  test("tabs: arrow keys move selection; same-page hash links switch tabs", async ({ page }) => {
    await page.goto("/reference-table.html");
    const badgesTab = page.getByRole("tab", { name: "Badges" });
    await badgesTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Animations" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Animations" })).toBeFocused();
    await expect(page).toHaveURL(/#animations$/);
    // the footer's Takeover Requirements link only changes the hash
    await page.getByRole("link", { name: "Takeover Requirements" }).click();
    await expect(page.getByRole("tab", { name: "Takeovers" })).toHaveAttribute("aria-selected", "true");
  });

  test("animations: subtypes, search and paging", async ({ page }) => {
    await page.goto("/reference-table.html#animations");
    await expect(page.getByText("781 jumpers")).toBeVisible();
    await expect(page.getByText("Page 1 of 32")).toBeVisible();
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Page 2 of 32")).toBeVisible();
    await page.getByRole("button", { name: "Dribble Moves" }).click();
    await expect(page.getByText("775 dribble moves")).toBeVisible();
    await expect(page.getByText("Page 1 of 31")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("pinning two badges enables the comparison", async ({ page }) => {
    await page.goto("/reference-table.html");
    await page.getByLabel("Pin Limitless Range to compare").check();
    await page.getByLabel("Pin Mini Marksman to compare").check();
    if (isPhone(page)) {
      const tray = page.locator(".comparetray");
      await expect(tray).toHaveClass(/expanded/);
      await expect(tray.getByText("Badges (2)")).toBeVisible();
      await tray.getByRole("button", { name: "Compare (2)" }).click();
      await expect(tray).not.toHaveClass(/expanded/);
    } else {
      const panel = page.getByRole("complementary", { name: "Compare pinned items" });
      await expect(panel.getByText("Compare (2)")).toBeVisible();
      await expect(page.locator("body")).toHaveClass(/side-has-items/);
      await panel.getByRole("button", { name: "View Full Comparison →" }).click();
      await expect(panel.getByRole("table")).toContainText("Limitless Range");
      await panel.getByRole("button", { name: "Remove Mini Marksman" }).click();
      await expect(page.getByLabel("Pin Mini Marksman to compare")).not.toBeChecked();
      await panel.getByRole("button", { name: "Clear" }).click();
      await expect(page.locator("body")).not.toHaveClass(/side-has-items/);
    }
  });

  test("badge name toggles its description", async ({ page }) => {
    await page.goto("/reference-table.html");
    const name = page.locator("#bcard-LimitlessRange").getByRole("button", { name: "Limitless Range" });
    await name.click();
    await expect(name).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#desc-LimitlessRange")).toBeVisible();
    await name.click();
    await expect(page.locator("#desc-LimitlessRange")).toBeHidden();
  });
});

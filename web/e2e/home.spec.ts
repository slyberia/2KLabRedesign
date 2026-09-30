import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, isPhone } from "./helpers";

test.describe("Home", () => {
  test("previews come from the data and link into the tools", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Home" })).toHaveCount(0); // no breadcrumb on the homepage
    const badgesFacet = page.locator(".facet", { hasText: "Badge Requirements" });
    await expect(badgesFacet).toContainText("All 53 badges");
    await expect(badgesFacet.locator(".tiers b")).toHaveText(["65", "85", "92", "99"]);
    await expect(page.locator(".facet", { hasText: "Takeover Requirements" })).toContainText("All 24 takeover abilities");
    await expect(page.getByText("Shape only, not a measured jumper.")).toBeVisible();
    await page.getByRole("button", { name: /Play video/ }).click();
    await expect(page.getByText("Video not set up yet in this redesign.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("header navigation and the mobile drawer", async ({ page }) => {
    await page.goto("/");
    if (isPhone(page)) {
      const toggle = page.getByRole("button", { name: "Open menu" });
      await toggle.click();
      await expect(page.locator("#sh-drawer")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#sh-drawer")).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page.locator("#sh-drawer").getByRole("link", { name: "Requirements" }).click();
    } else {
      await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Requirements" }).click();
    }
    await expect(page).toHaveURL(/reference-table\.html/);
    await expect(page.locator(".sh-link", { hasText: "Requirements" })).toHaveAttribute("aria-current", "page");
  });
});

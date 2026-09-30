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
    await expect(page.getByRole("link", { name: /See the Lab in Action/ })).toHaveAttribute("href", "https://www.youtube.com/@2KLabs");
    await expectNoHorizontalOverflow(page);
  });

  test("footer links to NBA2KLab's social accounts", async ({ page }) => {
    await page.goto("/");
    const social = page.getByRole("list", { name: "NBA2KLab on social media" });
    const hrefs = await social.getByRole("link").evaluateAll((as) => as.map((a) => [a.textContent!.trim(), a.getAttribute("href")]));
    expect(hrefs).toEqual([
      ["NBA2KLab on YouTube", "https://www.youtube.com/@2KLabs"],
      ["NBA2KLab on Twitter", "https://twitter.com/NBA2kLab"],
      ["NBA2KLab on TikTok", "https://www.tiktok.com/@nba2klabyt"],
      ["NBA2KLab on Instagram", "https://www.instagram.com/nba2klabyt"],
      ["NBA2KLab on Facebook", "https://www.facebook.com/NBA2KLab"],
    ]);
    for (const a of await social.getByRole("link").all()) {
      await expect(a).toHaveAttribute("target", "_blank");
      const box = (await a.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
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
    await expect(page).toHaveURL(/\/reference-table(\?|#|$)/);
    await expect(page.locator(".sh-link", { hasText: "Requirements" })).toHaveAttribute("aria-current", "page");
  });
});

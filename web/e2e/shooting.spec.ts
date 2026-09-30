import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test.describe("Shooting", () => {
  test("badge list comes from the data, with test status and Requirements links", async ({ page }) => {
    await page.goto("/shooting");
    await expect(page.locator(".bdg")).toHaveCount(9);
    const lr = page.locator(".bdg", { hasText: "Limitless Range" });
    await expect(lr.locator(".tile")).toHaveText(["83", "89", "93", "99"]);
    await expect(lr.getByRole("link", { name: "2KLab test results" })).toHaveAttribute("href", "https://www.nba2klab.com/badges/limitless-range");
    await expect(lr.getByRole("link", { name: "Requirements →" })).toHaveAttribute("href", "/reference-table?badge=LimitlessRange#badges");
    await expect(page.locator(".bdg", { hasText: "Deadeye" }).getByText("Test pending")).toBeVisible();
    await expect(page.locator(".bdg", { hasText: "Post Fade Phenom" })).toContainText("Keys on Mid-Range Shot AND Post Control.");
    await expect(page.locator(".status")).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
  });

  test("an incoming #anchor scrolls to its section", async ({ page }) => {
    await page.goto("/shooting#practice");
    await expect(page.locator("#practice")).toBeInViewport();
  });
});

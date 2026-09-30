import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, isPhone, openSignIn, signIn, uniqueName } from "./helpers";

const node = (page: Page, group: string, name: RegExp) => page.getByRole("radiogroup", { name: group }).getByRole("radio", { name });

async function signOut(page: Page) {
  if (isPhone(page)) await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator(".sh-acct-btn:visible").click();
  await page.locator(".sh-menu:visible").getByRole("button", { name: "Sign out" }).click();
}

test.describe("Game Details", () => {
  test("hash tabs, the controls toggle and the how-to guides", async ({ page }) => {
    await page.goto("/game-details.html#controls");
    await expect(page.getByRole("tab", { name: "Controls" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".controller")).toContainText("Post Up");
    await page.getByRole("button", { name: "Defense" }).click();
    await expect(page.locator(".controller")).toContainText("Intense-D");
    await expect(page.locator(".ctrl-table tbody tr")).toHaveCount(17);

    await page.getByRole("tab", { name: "How-To Guides" }).click();
    await expect(page).toHaveURL(/#guides$/);
    await expect(page.locator(".move-chips li")).toHaveCount(30);
    await page.getByRole("tab", { name: "How to Post" }).click();
    await expect(page.locator(".reftable.mini tbody tr")).toHaveCount(21);
    await page.getByRole("tab", { name: "How to Post" }).press("ArrowDown"); // wraps to the first guide
    await expect(page.getByRole("tab", { name: "How to Dribble" })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("link", { name: "Best Settings" }).last().click(); // footer: hash only
    await expect(page.getByRole("tab", { name: "Best Settings" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".set-row:not(.set-head)")).toHaveCount(7);
    await expectNoHorizontalOverflow(page);
  });

  test("VC, face creations and 2KTV render from their sources", async ({ page }) => {
    await page.goto("/game-details.html#vc-prices");
    await expect(page.locator(".pack")).toHaveCount(6);
    await expect(page.locator(".pack.is-featured .amt")).toHaveText("35,000");
    await page.getByRole("tab", { name: "Face Creations" }).click();
    await expect(page.locator(".face-card")).toHaveCount(20);
    await page.getByRole("tab", { name: "2KTV Answers" }).click();
    await expect(page.locator(".qa")).toHaveCount(12);
    await expect(page.locator(".qa-head")).toContainText("snapshot");
  });

  test("Cap Breakers reference scenario: 15 of 28 (13 free, 2 locked); progress survives a reload", async ({ page }) => {
    await page.goto("/game-details.html?track=rep#rewards");
    await node(page, "Your REP level", /^Veteran IV:/).click();
    await page.getByRole("tab", { name: "Lifetime Challenges" }).click();
    await expect(page).toHaveURL(/\?track=lifetime#rewards$/);
    await node(page, "Lifetime Challenges completed", /^250 challenges:/).click();
    await page.getByRole("tab", { name: "Crew" }).click();
    await node(page, "Your Crew level", /^Level 30:/).click();
    await page.getByRole("tab", { name: "Cap Breakers" }).click();
    await expect(page).toHaveURL(/\?track=cap-breakers#rewards$/);
    await page.getByRole("button", { name: "Goal 9 complete" }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "One more season" }).click();
    const panel = page.locator("#rw-p-capb");
    await expect(panel.locator(".cb-big")).toHaveText("15 of 28");
    await expect(panel).toContainText("You have 13 free and 2 locked.");
    await expect(panel.locator(".cb-src .n")).toHaveText(["6 / 11", "1 / 2", "3 / 4", "2 / 2", "3 / 9"]);

    await page.reload();
    await expect(page.locator("#rw-p-capb .cb-big")).toHaveText("15 of 28");
  });

  test("roadmaps are radio groups with one tab stop and arrow keys", async ({ page }) => {
    await page.goto("/game-details.html?track=crew#rewards");
    const group = page.getByRole("radiogroup", { name: "Your Crew level" });
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
    await group.getByRole("radio", { name: /^Level 1:/ }).focus();
    await page.keyboard.press("End");
    await expect(group.getByRole("radio", { name: /^Level 41:/ })).toHaveAttribute("aria-checked", "true");
    await expect(group.getByRole("radio", { name: /^Level 41:/ })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(group.getByRole("radio", { name: /^Level 40:/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#rw-p-crew .rw-status")).toHaveText("Level 40 · 4 of 4 Cap Breakers");
    await page.locator("#rw-p-crew").getByRole("button", { name: "Clear" }).click();
    await expect(group.locator('[aria-checked="true"]')).toHaveCount(0);
  });

  test("starter challenges are independent toggles", async ({ page }) => {
    await page.goto("/game-details.html?track=starter#rewards");
    await expect(page.getByText("0 of 21 tasks done")).toBeVisible();
    const task = page.getByRole("button", { name: /Visit Swags/ });
    await task.click();
    await expect(task).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1 of 21 tasks done")).toBeVisible();
  });

  test("shared device: signing out keeps one account's progress out of the next account", async ({ page }) => {
    await page.goto("/game-details.html?track=rep#rewards");
    await openSignIn(page);
    await signIn(page, uniqueName("PlayerA"));
    await expect(page.getByText(/Saved to your demo account/)).toBeVisible();
    await node(page, "Your REP level", /^Legend VIII:/).click();
    await expect(page.getByText(/Saved to your demo account/)).toBeVisible();
    await expect.poll(async () => (await (await page.request.get("/api/progress")).json()).progress.rep?.v).toBe(38);

    await signOut(page);
    await expect(page.getByRole("radiogroup", { name: "Your REP level" }).locator('[aria-checked="true"]')).toHaveCount(0);

    await openSignIn(page);
    await signIn(page, uniqueName("PlayerB"));
    await expect(page.getByText(/Saved to your demo account/)).toBeVisible();
    const b = await (await page.request.get("/api/progress")).json();
    expect(b.progress.rep).toBeUndefined();
    await expect(page.getByRole("radiogroup", { name: "Your REP level" }).locator('[aria-checked="true"]')).toHaveCount(0);
  });

  test("progress marked while signed out joins the account on sign-in", async ({ page }) => {
    await page.goto("/game-details.html?track=lifetime#rewards");
    await node(page, "Lifetime Challenges completed", /^200 challenges:/).click();
    await openSignIn(page);
    await signIn(page, uniqueName("Joiner"));
    await expect.poll(async () => (await (await page.request.get("/api/progress")).json()).progress.lifetime?.v).toBe(14);
  });
});

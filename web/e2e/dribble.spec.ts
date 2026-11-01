import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test.describe("Dribble Lab", () => {
  test("is discoverable from guides, offers 30 moves and shares presentation choices", async ({ page }) => {
    await page.goto("/game-details#guides");
    await page.getByRole("link", { name: "Open the Dribble Lab" }).click();
    await expect(page.getByRole("heading", { name: "Dribble Lab", exact: true })).toBeVisible();
    await expect(page.getByLabel("Move", { exact: true }).locator("option")).toHaveCount(30);
    await page.getByLabel("Controller illustration").selectOption("dualsense");
    await expect(page.getByRole("img", { name: "DualSense controller input overlay" })).toBeVisible();
    await page.getByLabel("Move", { exact: true }).selectOption("spin");
    await expect(page).toHaveURL(/move=spin&controller=dualsense/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Spin", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("demonstration is opt-in, pausable and stepable; all simulations start off", async ({ page }) => {
    await page.goto("/dribble-lab?move=spin");
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
    await expect.poll(() => page.getByTestId("raw-marker").evaluate((e) => getComputedStyle(e).fill)).not.toBe("rgb(0, 0, 0)");
    await page.getByRole("button", { name: "Step +100 ms" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
    await page.getByRole("button", { name: "Play demonstration" }).click();
    await page.getByRole("button", { name: "Pause demonstration" }).click();
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
    await page.getByText("Practice settings", { exact: false }).first().click();
    for (const label of ["Apply dead zone", "Adjust sensitivity", "Simulate stick drift", "Simulate input lag", "Override direction tolerance", "Assess demo timing"]) await expect(page.getByLabel(label, { exact: true })).not.toBeChecked();
    await expect(page.getByLabel("Show movement trails")).toBeChecked();
  });

  test("paused demonstrations retain their motion trail", async ({ page }) => {
    await page.goto("/dribble-lab?move=spin");
    for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Step +100 ms" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "800");
    const points = await page.getByTestId("raw-trail").getAttribute("points");
    // Moving the browser clock beyond the trail window must not age a paused demo.
    await page.clock.install();
    await page.clock.fastForward(7000);
    await expect(page.getByTestId("raw-trail")).toHaveAttribute("points", points!);
  });

  test("pointer practice records a real path, reviews it, replays and clears it", async ({ page }) => {
    await page.goto("/dribble-lab");
    await page.getByRole("button", { name: "Practice", exact: true }).click();
    await page.getByLabel("Input source").selectOption("pointer");
    await page.getByRole("button", { name: "Start attempt" }).click();
    await page.getByRole("button", { name: "Stick Up", exact: true }).click();
    await expect.poll(() => page.getByTestId("raw-marker").getAttribute("cy")).not.toBe("150");
    await page.getByRole("button", { name: "Stick Center", exact: true }).click();
    await expect(page.getByTestId("raw-marker")).toHaveAttribute("cy", "150");
    await page.getByRole("button", { name: "Finish attempt" }).click();
    await expect(page.getByRole("heading", { name: "Practice pattern matched" })).toBeVisible();
    await page.getByRole("button", { name: "Replay attempt" }).click();
    await expect(page.getByLabel("Replay position")).toBeVisible();
    await page.getByRole("button", { name: "Clear trace and recording" }).click();
    await expect(page.getByLabel("Replay position")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("separates raw input from synthetic drift, dead zone and delayed response", async ({ page }) => {
    await page.goto("/dribble-lab");
    await page.getByRole("button", { name: "Live input", exact: true }).click();
    await page.getByLabel("Input source").selectOption("pointer");
    await page.locator(".dl-settings summary").click();
    await page.getByLabel("Simulate stick drift", { exact: true }).check();
    await expect(page.getByTestId("raw-marker")).toHaveAttribute("cx", "150");
    await expect.poll(() => page.getByTestId("response-marker").getAttribute("cx")).not.toBe("150");
    await page.getByLabel("Apply dead zone", { exact: true }).check();
    await expect(page.getByTestId("response-marker")).toHaveAttribute("cx", "150");
    await page.getByLabel("Simulate stick drift", { exact: true }).uncheck();
    await page.getByLabel("Apply dead zone", { exact: true }).uncheck();
    await page.getByLabel("Simulate input lag", { exact: true }).check();
    const delay = page.getByLabel("Simulated delay", { exact: true });
    await delay.focus(); await delay.press("End");
    await page.getByRole("button", { name: "Stick Right", exact: true }).click();
    await expect.poll(() => page.getByTestId("raw-marker").getAttribute("cx")).not.toBe("150");
    await expect.poll(async () => Number(await page.getByTestId("response-marker").getAttribute("cx"))).toBeGreaterThan(230);
    await page.getByLabel("Show movement trails").uncheck();
    await expect(page.getByTestId("raw-trail")).toHaveCount(0);
    await page.getByRole("button", { name: "Reset practice settings" }).click();
    await expect(page.getByLabel("Simulate input lag", { exact: true })).not.toBeChecked();
  });

  test("reads standard gamepad snapshots and clears an interrupted attempt", async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as unknown as { testPad: { id: string; index: number; connected: boolean; mapping: string; axes: number[]; buttons: { value: number }[] } };
      state.testPad = { id: "Test controller", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => state.testPad.connected ? [state.testPad] : [] });
    });
    await page.goto("/dribble-lab");
    await page.getByRole("button", { name: "Practice", exact: true }).click();
    await page.getByRole("button", { name: "Read controller input" }).click();
    await expect(page.getByRole("status")).toContainText("Connected: Test controller");
    await page.getByRole("button", { name: "Start attempt" }).click();
    await page.evaluate(() => { const p = (window as unknown as { testPad: { axes: number[]; buttons: { value: number }[] } }).testPad; p.axes[2] = .8; p.buttons[0]!.value = 1; });
    await expect.poll(() => page.locator(".dl-button.is-pressed").count()).toBe(1);
    await page.evaluate(() => { (window as unknown as { testPad: { connected: boolean } }).testPad.connected = false; });
    await expect(page.getByRole("status")).toContainText("Connect a controller");
    await expect(page.getByText("Controller input was interrupted.", { exact: false })).toBeVisible();
    await expect(page.getByTestId("raw-marker")).toHaveAttribute("cx", "150");
    await page.evaluate(() => { const p = (window as unknown as { testPad: { connected: boolean; mapping: string } }).testPad; p.connected = true; p.mapping = ""; });
    await expect(page.getByRole("status")).toContainText("unsupported input layout");
    await expect(page.getByRole("button", { name: "Start attempt" })).toBeDisabled();
  });

  test("handles blocked access and fits at 320px", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "getGamepads", { value: () => { throw new DOMException("Blocked", "SecurityError"); } }));
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto("/dribble-lab?move=not-a-move&controller=unknown");
    await page.getByRole("button", { name: "Live input", exact: true }).click();
    await page.getByRole("button", { name: "Read controller input" }).click();
    await expect(page.getByRole("status")).toContainText("blocked");
    await page.locator(".dl-settings summary").click();
    await page.getByLabel("Override direction tolerance", { exact: true }).check();
    await page.getByLabel("Assess demo timing", { exact: true }).check();
    await expect(page.getByLabel("Timing tolerance", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

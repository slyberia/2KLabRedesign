import { expect, type Page } from "@playwright/test";

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/** Fails if the page is wider than the viewport (grid children without min-width: 0, wide tables). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export const search = (page: Page) => new URL(page.url()).searchParams;

/** A fresh demo account per test run: the local store persists between runs. */
export const uniqueName = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 8)}`;

export async function signIn(page: Page, name: string, premium = false) {
  const dialog = page.getByRole("dialog", { name: "Sign in (demo)" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Display name").fill(name);
  if (premium) await dialog.getByLabel(/Make it a demo Premium account/).check();
  await dialog.getByRole("button", { name: "Sign in" }).click();
  await expect(dialog).toBeHidden();
}

/** Opens the header's sign-in (the drawer on phones). */
export async function openSignIn(page: Page) {
  if (isPhone(page)) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Log In" }).first().click();
}

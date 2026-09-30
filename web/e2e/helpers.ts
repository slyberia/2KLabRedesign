import { expect, type Page } from "@playwright/test";

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/** Fails if the page is wider than the viewport (grid children without min-width: 0, wide tables). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export const search = (page: Page) => new URL(page.url()).searchParams;

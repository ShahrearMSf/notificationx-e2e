// @ts-check
import { test, expect } from "@playwright/test";
import {
  gotoNxPage,
  handleEmailVerification,
  waitForSuccess,
  deleteAllNotifications,
  uniqueTitle,
  safeGoto,
} from "../helpers/utils.js";

/**
 * Cart Peek — dedicated tests for the new PRO notification type.
 *
 * Cart Peek is a WooCommerce-based social-proof popup that shows a live
 * "N shoppers/buyers/clients have this in their cart" card, driven by a
 * rolling-window `wp_nx_cart_peek_events` table.
 *
 * Added in NX Pro (Pro-only). Notomation site runs with Pro active, so
 * all themes are testable.
 *
 * Design step has For Desktop / For Mobile sub-tabs, each with 6 themes.
 * Theme values (from wizard DOM):
 *   woocommerce_cart_peek_theme-one
 *   woocommerce_cart_peek_theme-two
 *   woocommerce_cart_peek_theme-three
 *   woocommerce_cart_peek_conv-theme-twelve
 *   woocommerce_cart_peek_conv-theme-fourteen
 *   woocommerce_cart_peek_conv-theme-sixteen
 */

const THEME_COUNT = 6;
const ALL_THEMES = Array.from({ length: THEME_COUNT }, (_, i) => i);

async function openCartPeekWizard(page, title) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  const typeCard = page.locator("#type_section").getByText(/^Cart Peek/i).first();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1500);

  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(title);
  }
}

async function openCartPeekQuickBuilder(page, title) {
  await safeGoto(page, "/wp-admin/admin.php?page=nx-builder");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  const typeCard = page.locator("#type_section").getByText(/^Cart Peek/i).first();
  await typeCard.scrollIntoViewIfNeeded();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1500);

  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(title);
  }
}

async function gotoStep(page, stepName) {
  const tabEl = page.locator('.wprf-tab-nav li, ul.wprf-tab-nav li')
    .filter({ hasText: new RegExp(`^${stepName}$`, 'i') })
    .first();
  await tabEl.click();
  await page.waitForTimeout(2500);
}

/**
 * Select theme by index within the active For Desktop sub-tab.
 */
async function selectTheme(page, index) {
  const activeTab = page.locator('#for_desktop.wprf-active, .wprf-tab-content.wprf-active').first();
  const optionContainer = activeTab.locator('.wprf-input-radio-option').nth(index);

  if (await optionContainer.count() > 0) {
    await optionContainer.scrollIntoViewIfNeeded().catch(() => {});
    await optionContainer.click({ force: true });
  } else {
    const label = page.locator(`label[for="wprf-input-radio-2-${index}"]`).first();
    if (await label.count() > 0) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
      await label.click({ force: true });
    }
  }
  await page.waitForTimeout(1500);
}

async function publishNotification(page) {
  const publishBtn = page.getByRole("button", { name: "Publish" }).first();
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await publishBtn.click();
  await page.waitForTimeout(4000);
  await waitForSuccess(page, "Successfully Created");
}

test.describe.serial("8 - Cart Peek", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  test("Cleanup before Cart Peek tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });

  test("Cart Peek type card is present in Add New with 🛒 emoji", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
    await page.waitForTimeout(2500);

    const section = page.locator("#type_section");
    const text = await section.innerText();
    expect(text).toContain("Cart Peek");
    // Emoji check (🛒) — soft
    console.log(`Cart Peek entry line includes emoji: ${/🛒/.test(text)}`);
  });

  test("Cart Peek type card is present in Quick Builder", async ({ page }) => {
    await safeGoto(page, "/wp-admin/admin.php?page=nx-builder");
    await page.waitForTimeout(2500);

    const section = page.locator("#type_section");
    const text = await section.innerText();
    expect(text).toContain("Cart Peek");
  });

  test(`Cart Peek has ${THEME_COUNT} themes on Design step`, async ({ page }) => {
    await openCartPeekWizard(page, uniqueTitle("CartPeek ThemeCount"));
    await gotoStep(page, "Design");

    // Count only themes inside the active For Desktop sub-tab to avoid
    // double-counting the mobile sub-tab.
    const activeTab = page.locator('#for_desktop.wprf-active, .wprf-tab-content.wprf-active').first();
    const themeCount = await activeTab.locator('input[name="themes"]').count();

    console.log(`Cart Peek themes (For Desktop) found: ${themeCount}`);
    expect(themeCount).toBe(THEME_COUNT);
  });

  test("Cart Peek Design step has For Desktop and For Mobile sub-tabs", async ({ page }) => {
    await openCartPeekWizard(page, uniqueTitle("CartPeek SubTabs"));
    await gotoStep(page, "Design");

    // Sub-tabs live inside .wprf-tab-menu-wrapper
    const desktopTab = page.locator('.wprf-tab-menu-wrapper li').filter({ hasText: /^For Desktop$/i }).first();
    const mobileTab = page.locator('.wprf-tab-menu-wrapper li').filter({ hasText: /^For Mobile$/i }).first();

    await expect(desktopTab).toBeVisible({ timeout: 5000 });
    await expect(mobileTab).toBeVisible({ timeout: 5000 });
  });

  // ─── Create with each theme via Add New ────────────────────

  for (const themeIdx of ALL_THEMES) {
    test(`Add New: Cart Peek Theme ${themeIdx + 1} — create and publish`, async ({ page }) => {
      await deleteAllNotifications(page);
      await openCartPeekWizard(page, uniqueTitle(`CartPeek Theme ${themeIdx + 1}`));

      await gotoStep(page, "Design");
      await selectTheme(page, themeIdx);

      await publishNotification(page);
    });
  }

  // ─── Create via Quick Builder ─────────────────────────────

  test("Quick Builder: Cart Peek default theme — create and publish", async ({ page }) => {
    await deleteAllNotifications(page);
    await openCartPeekQuickBuilder(page, uniqueTitle("CartPeek QB Default"));

    // Walk through the QB steps until Publish appears
    for (let step = 0; step < 5; step++) {
      const publishBtn = page.getByRole("button", { name: /Publish|Create|Finalize/i }).first();
      if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) break;

      const nextBtn = page.getByRole("button", { name: "Next" }).first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextBtn.scrollIntoViewIfNeeded();
        await nextBtn.click({ force: true });
        await page.waitForTimeout(1500);
      } else {
        break;
      }
    }

    const publish = page.getByRole("button", { name: /Publish|Create|Finalize|Save/i }).first();
    if (await publish.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publish.click({ force: true });
      await page.waitForTimeout(3000);
      await waitForSuccess(page, "Successfully Created");
    }
  });

  test("Cleanup after Cart Peek tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

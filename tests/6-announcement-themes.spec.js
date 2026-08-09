// @ts-check
import { test, expect } from "@playwright/test";
import {
  gotoNxPage,
  handleEmailVerification,
  waitForSuccess,
  deleteAllNotifications,
  uniqueTitle,
} from "../helpers/utils.js";

/**
 * Announcement — dedicated theme tests.
 *
 * The Announcement type uses 11 popup themes (indices 0-10):
 *   popup_notification_theme-one, two, three, four, five, six, seven,
 *   eight, eleven, twelve, thirteen
 *
 * A few of these are the "new free" themes released recently. On the live
 * Notomation site NX Pro is active, so all 11 are creatable.
 */

const THEME_COUNT = 11;
const ALL_THEMES = Array.from({ length: THEME_COUNT }, (_, i) => i);

async function openAnnouncementWizard(page, title) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  const typeCard = page.locator("#type_section").getByText(/^Announcement$/).first();
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

async function selectTheme(page, index) {
  // Announcement's Design step is not split by Desktop/Mobile like Exit Intent.
  // But use the same wprf-input-radio-option pattern to be safe.
  const activeTab = page.locator('.wprf-tab-content.wprf-active, #for_desktop.wprf-active').first();
  let optionContainer;

  if (await activeTab.count() > 0) {
    optionContainer = activeTab.locator('.wprf-input-radio-option').nth(index);
  } else {
    optionContainer = page.locator('.wprf-input-radio-option').nth(index);
  }

  await optionContainer.scrollIntoViewIfNeeded().catch(() => {});
  await optionContainer.click({ force: true });
  await page.waitForTimeout(1500);
}

async function publishNotification(page) {
  const publishBtn = page.getByRole("button", { name: "Publish" }).first();
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await publishBtn.click();
  await page.waitForTimeout(4000);
  await waitForSuccess(page, "Successfully Created");
}

test.describe.serial("6 - Announcement Themes", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  test("Cleanup before Announcement theme tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });

  test(`Verify Announcement has ${THEME_COUNT} themes on Design step`, async ({ page }) => {
    await openAnnouncementWizard(page, uniqueTitle("Announcement ThemeCount"));
    await gotoStep(page, "Design");

    const themeCount = await page.locator('input[name="themes"]').count();
    console.log(`Announcement themes found: ${themeCount}`);
    expect(themeCount).toBeGreaterThanOrEqual(THEME_COUNT);
  });

  for (const themeIdx of ALL_THEMES) {
    test(`Announcement Theme ${themeIdx + 1} — create and publish`, async ({ page }) => {
      await deleteAllNotifications(page);
      await openAnnouncementWizard(page, uniqueTitle(`Announcement Theme ${themeIdx + 1}`));

      await gotoStep(page, "Design");
      await selectTheme(page, themeIdx);

      await publishNotification(page);
    });
  }

  test("Cleanup after Announcement theme tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

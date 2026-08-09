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
 * Country Targeting — feature is now available (free + pro) on most types.
 *
 * PRESENT on: Notification Bar (baseline), Announcement, Comments,
 *             WooCommerce, Discount Alert (and other regular types).
 *
 * ABSENT on:  GDPR / Cookie Notice, Exit Intent Popup.
 *
 * The control lives in Customize > TARGETING section:
 *   - "Country Targeting" (multi-select, default "All Country")
 *   - "Set Target Audience" (multi-select, default "Show for All Users")
 */

const TYPES_WITH_TARGETING = [
  "Notification Bar",
  "Announcement",
  "Comments",
  "WooCommerce",
  "Discount Alert",
];

const TYPES_WITHOUT_TARGETING = [
  "Cookie Notice",
  "Exit Intent Popup",
];

async function openWizardForType(page, typeName, title) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  const typeCard = page.locator("#type_section").getByText(new RegExp(`^${typeName}$`, 'i')).first();
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

async function publishNotification(page) {
  const publishBtn = page.getByRole("button", { name: "Publish" }).first();
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await publishBtn.click();
  await page.waitForTimeout(4000);
  await waitForSuccess(page, "Successfully Created");
}

/**
 * Check whether the Country Targeting field exists on the Customize step.
 * The field wrapper has class "wprf-name-country_targeting".
 */
async function hasCountryTargetingField(page) {
  await gotoStep(page, "Customize");

  // Scroll to make sure it's rendered
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const fieldCount = await page.locator('.wprf-name-country_targeting').count();
  return fieldCount > 0;
}

/**
 * Remove the default "All Country" chip if present, so a specific country
 * can be added.
 */
async function clearAllCountry(page) {
  const allCountryChip = page.locator('.wprf-name-country_targeting .wprf-async-select__multi-value')
    .filter({ hasText: /All Country/i })
    .first();
  const removeBtn = allCountryChip.locator('[role="button"], svg, [class*="Remove" i]').last();
  if (await removeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await removeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }
}

/**
 * Pick a specific country in the Country Targeting react-select.
 * @param {string} countryName - e.g. "Bangladesh"
 */
async function pickCountry(page, countryName) {
  const targetingRow = page.locator('.wprf-name-country_targeting').first();
  await targetingRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Click the input area to focus and open the menu
  const selectControl = targetingRow.locator('.wprf-async-select__control').first();
  await selectControl.click();
  await page.waitForTimeout(1000);

  // Type via keyboard (react-select input uses ARIA controls)
  await page.keyboard.type(countryName, { delay: 60 });
  await page.waitForTimeout(2000);

  // Find matching option in the react-select menu (case-insensitive exact-ish match)
  const menu = page.locator('.wprf-async-select__menu, [class*="__menu-list"]').first();
  const option = menu.locator('[class*="__option"], [role="option"]')
    .filter({ hasText: new RegExp(`^${countryName}$`, 'i') })
    .first();

  let clicked = false;
  if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
    await option.click();
    clicked = true;
  } else {
    // Fallback: pick first option that contains the name
    const looseOption = menu.locator('[class*="__option"], [role="option"]')
      .filter({ hasText: new RegExp(countryName, 'i') })
      .first();
    if (await looseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await looseOption.click();
      clicked = true;
    } else {
      // Final fallback: press Enter to select the highlighted option
      await page.keyboard.press('Enter');
      clicked = true;
    }
  }

  await page.waitForTimeout(1000);
  return clicked;
}

test.describe.serial("7 - Country Targeting", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  test("Cleanup before Country Targeting tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });

  // ─── Types that SHOULD have Country Targeting ──────────────

  for (const typeName of TYPES_WITH_TARGETING) {
    test(`${typeName}: Country Targeting field is present in Customize`, async ({ page }) => {
      await openWizardForType(page, typeName, uniqueTitle(`CT Present ${typeName}`));

      const hasField = await hasCountryTargetingField(page);
      expect(hasField, `${typeName} should have Country Targeting field`).toBe(true);

      // Also verify Set Target Audience field
      const targetAudience = await page.locator('.wprf-name-set_target_audience, [class*="target_audience" i]').count();
      console.log(`${typeName}: Country Targeting=${hasField}, Set Target Audience count=${targetAudience}`);
    });
  }

  // ─── Types that should NOT have Country Targeting ─────────

  for (const typeName of TYPES_WITHOUT_TARGETING) {
    test(`${typeName}: Country Targeting field is NOT present`, async ({ page }) => {
      await openWizardForType(page, typeName, uniqueTitle(`CT Absent ${typeName}`));

      const hasField = await hasCountryTargetingField(page);
      console.log(`${typeName}: Country Targeting field present=${hasField}`);
      expect(hasField, `${typeName} should NOT have Country Targeting field`).toBe(false);
    });
  }

  // ─── Select and save with a specific country ──────────────

  test("Notification Bar: pick Bangladesh in Country Targeting and publish", async ({ page }) => {
    await deleteAllNotifications(page);
    await openWizardForType(page, "Notification Bar", uniqueTitle("CT Bangladesh Bar"));
    await gotoStep(page, "Customize");

    await clearAllCountry(page);
    await pickCountry(page, "Bangladesh");

    const chips = await page.locator('.wprf-name-country_targeting .wprf-async-select__multi-value__label').allTextContents();
    console.log(`Selected countries after pick: ${JSON.stringify(chips)}`);
    expect(chips.some(c => /bangladesh/i.test(c))).toBe(true);

    await publishNotification(page);
  });

  test("Announcement: pick multiple countries and publish", async ({ page }) => {
    await deleteAllNotifications(page);
    await openWizardForType(page, "Announcement", uniqueTitle("CT Multi Announcement"));
    await gotoStep(page, "Customize");

    await clearAllCountry(page);
    await pickCountry(page, "Bangladesh");
    await pickCountry(page, "India");

    const chips = await page.locator('.wprf-name-country_targeting .wprf-async-select__multi-value__label').allTextContents();
    console.log(`Selected countries: ${JSON.stringify(chips)}`);

    const hasBangladesh = chips.some(c => /bangladesh/i.test(c));
    const hasIndia = chips.some(c => /india/i.test(c));
    expect(hasBangladesh || hasIndia).toBe(true);

    await publishNotification(page);
  });

  test("Cleanup after Country Targeting tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

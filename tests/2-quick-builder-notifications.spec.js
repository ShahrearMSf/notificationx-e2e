// @ts-check
import { test, expect } from "@playwright/test";
import {
  gotoNxPage,
  safeGoto,
  handleEmailVerification,
  waitForSuccess,
  deleteAllNotifications,
  uniqueTitle,
} from "../helpers/utils.js";

/**
 * Flow 3: Create all notification types through the Quick Builder,
 * then delete all notifications.
 *
 * Quick Builder URL: admin.php?page=nx-builder
 * It's a single-page form with tabs: SOURCE → DESIGN → DISPLAY → FINALIZE
 *
 * The Source tab shows the NOTIFICATION TYPE grid (same types as Add New)
 * plus CONTENT and COUNTDOWN TIMER sections below.
 *
 * Behaviour settings: Display The Last → 2000, Display From The Last → 2000
 */

// Notification types as they appear on the Quick Builder type grid.
// Using same labels as the grid card text (partial match).
const NOTIFICATION_TYPES = [
  { label: "WooCommerce", name: "WooCommerce" },
  { label: "Sales Notification", name: "Sales Notification" },
  { label: "Cookie Notice", name: "Cookie Notice" },
  { label: "eLearning", name: "eLearning" },
  { label: "Notification Bar", name: "Notification Bar" },
  { label: "Announcement", name: "Announcement" },
  { label: "Reviews", name: "Reviews" },
  { label: "Contact Form", name: "Contact Form" },
  { label: "Download Stats", name: "Download Stats" },
  { label: "Comments", name: "Comments" },
  { label: "Discount Alert", name: "Discount Alert" },
  { label: "Donations", name: "Donations" },
  { label: "Flashing Tab", name: "Flashing Tab" },
  { label: "Growth Alert", name: "Growth Alert" },
  { label: "Custom Notification", name: "Custom Notification" },
  { label: "Video", name: "Video" },
  { label: "Email Subscription", name: "Email Subscription" },
  { label: "Page Analytics", name: "Page Analytics" },
];

/**
 * Helper: Create a notification via Quick Builder.
 */
async function createNotificationViaQuickBuilder(page, nx) {
  // Navigate directly to Quick Builder page
  await safeGoto(page, "/wp-admin/admin.php?page=nx-builder");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  // Select the notification type from the grid
  // Select type from the NOTIFICATION TYPE grid inside #type_section
  const typeCard = page.locator("#type_section").getByText(nx.label, { exact: false }).first();
  await typeCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1000);

  // Click Next to go through tabs: SOURCE → DESIGN → DISPLAY → FINALIZE
  // Keep clicking Next until Publish/Create/Finalize button appears
  for (let step = 0; step < 5; step++) {
    // Check if we've reached the final step
    const publishBtn = page.getByRole("button", { name: /Publish|Create|Finalize/i }).first();
    if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      break;
    }

    const nextBtn = page.getByRole("button", { name: "Next" }).first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  // Try to set behaviour/display values: Display The Last → 2000, Display From The Last → 2000
  const numberInputs = page.locator('input[type="number"]');
  const inputCount = await numberInputs.count();
  for (let i = 0; i < Math.min(inputCount, 2); i++) {
    const input = numberInputs.nth(i);
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      await input.fill("2000");
    }
  }

  // Publish / Create / Finalize
  const publishBtn = page.getByRole("button", { name: /Publish|Create|Finalize|Save/i }).first();
  if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await publishBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await waitForSuccess(page, "Successfully Created");
  }
}

test.describe.serial("2 - Create All Notification Types via Quick Builder", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  for (const nx of NOTIFICATION_TYPES) {
    test(`Quick Builder - ${nx.name}`, async ({ page }) => {
      await createNotificationViaQuickBuilder(page, nx);
    });
  }

  test("Delete all notifications after Quick Builder tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

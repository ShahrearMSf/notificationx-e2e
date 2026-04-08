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
 * Flow 2: Create all notification types through the Add New wizard,
 * then delete all notifications.
 *
 * Behaviour settings: Display The Last → 2000, Display From The Last → 2000
 *
 * The Add New wizard flow:
 * 1. Source/Type selection (grid of type cards in #type_section)
 * 2. Design/Theme
 * 3. Content
 * 4. Display
 * 5. Customize
 * 6. Behaviour (optional, depends on type)
 * → Publish
 *
 * Available types on live site (18):
 * WooCommerce, Sales Notification, Cookie Notice, eLearning,
 * Notification Bar, Announcement, Reviews, Contact Form,
 * Download Stats, Comments, Discount Alert, Donations,
 * Flashing Tab, Growth Alert 🚀, Custom Notification, Video,
 * Email Subscription, Page Analytics
 *
 * Growth Alert: always use "Tea" product and Low Stock Threshold = 99.
 */

const NOTIFICATION_TYPES = [
  { label: "WooCommerce", subSource: null, name: "WooCommerce Sales" },
  { label: "WooCommerce", subSource: "Reviews", name: "WooCommerce Reviews" },
  { label: "Sales Notification", subSource: null, name: "Sales Notification" },
  { label: "Cookie Notice", subSource: null, name: "Cookie Notice" },
  { label: "eLearning", subSource: null, name: "eLearning" },
  { label: "Notification Bar", subSource: null, name: "Notification Bar" },
  { label: "Announcement", subSource: null, name: "Announcement" },
  { label: "Reviews", subSource: null, name: "Reviews" },
  { label: "Contact Form", subSource: null, name: "Contact Form" },
  { label: "Download Stats", subSource: null, name: "Download Stats" },
  { label: "Comments", subSource: null, name: "Comments" },
  { label: "Discount Alert", subSource: null, name: "Discount Alert" },
  { label: "Donations", subSource: null, name: "Donations" },
  { label: "Flashing Tab", subSource: null, name: "Flashing Tab" },
  { label: "Growth Alert", subSource: null, name: "Growth Alert" },
  { label: "Custom Notification", subSource: null, name: "Custom Notification" },
  { label: "Video", subSource: null, name: "Video" },
  { label: "Email Subscription", subSource: null, name: "Email Subscription" },
  { label: "Page Analytics", subSource: null, name: "Page Analytics" },
];

/**
 * Navigate through the Add New wizard, set behaviour values, and publish.
 * Special handling for Growth Alert: set Low Stock Threshold to 99.
 */
async function createNotificationViaAddNew(page, nx) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  // Step 1: Select the notification type from the grid
  const typeCard = page.locator("#type_section").getByText(nx.label, { exact: false }).first();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1000);

  // If there's a sub-source (e.g., WooCommerce → Reviews), select it
  if (nx.subSource) {
    const sourceTab = page.locator("li").filter({ hasText: /^Source$/ });
    if (await sourceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sourceTab.click();
      await page.waitForTimeout(500);
    }
    await page
      .locator("#source_section")
      .getByText(nx.subSource, { exact: true })
      .click();
    await page.waitForTimeout(500);
  }

  // Fill the title
  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(uniqueTitle(`AddNew ${nx.name}`));
  }

  // Click Next repeatedly until Publish button appears
  for (let step = 0; step < 8; step++) {
    const publishBtn = page.getByRole("button", { name: "Publish" });
    if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      break;
    }

    const nextBtn = page.getByRole("button", { name: "Next" });
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1500);

      // Special handling for Growth Alert Content step:
      // Set Low Stock Threshold to 99
      if (nx.name === "Growth Alert") {
        const lowStockInput = page.locator('input[type="number"]').last();
        if (await lowStockInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const currentVal = await lowStockInput.inputValue();
          // Only set if we're on the content step with the threshold field
          if (currentVal !== "2000") {
            await lowStockInput.fill("99");
          }
        }
      }
    } else {
      break;
    }
  }

  // Try to set Behaviour values: Display The Last → 2000, Display From The Last → 2000
  const numberInputs = page.locator('input[type="number"]');
  const inputCount = await numberInputs.count();
  for (let i = 0; i < Math.min(inputCount, 2); i++) {
    const input = numberInputs.nth(i);
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      await input.fill("2000");
    }
  }

  // Publish
  const publishBtn = page.getByRole("button", { name: "Publish" });
  if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishBtn.click();
    await page.waitForTimeout(3000);
    await waitForSuccess(page, "Successfully Created");
  }
}

test.describe.serial("1 - Create All Notification Types via Add New", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  // First, delete the existing Growth Alert (study complete)
  test("Cleanup existing notifications before starting", async ({ page }) => {
    await deleteAllNotifications(page);
  });

  for (const nx of NOTIFICATION_TYPES) {
    test(`Add New - ${nx.name}`, async ({ page }) => {
      await createNotificationViaAddNew(page, nx);
    });
  }

  test("Delete all notifications after Add New tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

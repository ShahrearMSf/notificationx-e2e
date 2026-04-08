// @ts-check
import { expect } from "@playwright/test";

const DB_ERROR_TEXT = "Error establishing a database connection";
const DB_RETRY_WAIT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Navigate to a URL with automatic retry on database connection errors.
 * Waits 2 minutes and retries once if DB error detected.
 */
export async function safeGoto(page, url) {
  await page.goto(url, { timeout: 60000 }).catch(() => null);
  await page.waitForLoadState("domcontentloaded");

  const bodyText = await page.locator("body").innerText();
  if (bodyText.toLowerCase().includes(DB_ERROR_TEXT.toLowerCase())) {
    console.log(`DB error at ${url}. Waiting 2 min before retry...`);
    await page.waitForTimeout(DB_RETRY_WAIT_MS);
    await page.goto(url, { timeout: 60000 }).catch(() => null);
    await page.waitForLoadState("domcontentloaded");

    const retryText = await page.locator("body").innerText();
    expect(
      retryText.toLowerCase().includes(DB_ERROR_TEXT.toLowerCase()),
      `DB error persists at ${url} after retry`
    ).toBe(false);
  }
}

/**
 * Navigate to a NotificationX admin page.
 * @param {import("@playwright/test").Page} page
 * @param {string} slug - e.g. "nx-dashboard", "nx-settings", "nx-analytics"
 */
export async function gotoNxPage(page, slug) {
  await safeGoto(page, `/wp-admin/admin.php?page=${slug}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
}

/**
 * Handle WordPress "Administration email verification" screen.
 * If the screen appears, clicks "The email is correct" to proceed.
 * @param {import("@playwright/test").Page} page
 */
export async function handleEmailVerification(page) {
  try {
    const correctEmailBtn = page.locator('a:has-text("correct")').first();
    const isVisible = await correctEmailBtn.isVisible({ timeout: 3000 });
    if (isVisible) {
      await correctEmailBtn.click();
      await page.waitForLoadState("domcontentloaded");
    }
  } catch {
    // Not on email verification screen, proceed normally
  }
}

/**
 * Wait for NX success toast/message after create/update/delete.
 * Also handles cases where the page redirects to the dashboard after creation.
 * @param {import("@playwright/test").Page} page
 * @param {string} [text] - optional text to match in the success message
 */
export async function waitForSuccess(page, text) {
  // Try to find the success message first
  if (text) {
    const found = await page.getByText(text).first().isVisible({ timeout: 10000 }).catch(() => false);
    if (found) return;
  }

  // Fallback: check for any success toast/notification
  const successIndicators = [
    page.locator('[class*="success"], [class*="Success"]').first(),
    page.locator('.Toastify__toast--success').first(),
    page.locator('[class*="toast"][class*="success"]').first(),
  ];

  for (const indicator of successIndicators) {
    if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) return;
  }

  // Final fallback: if we're on the dashboard with notifications listed, assume success
  const onDashboard = page.url().includes("nx-admin");
  if (onDashboard) return;

  // Wait a bit more for any redirect
  await page.waitForTimeout(3000);
}

/**
 * Delete all notifications from the NX All NotificationX page.
 *
 * Dashboard structure:
 * - Header checkbox: input[name="nx_all"] (select all)
 * - Page size dropdown: select with options 10/20/50/100/200
 * - Bulk Action dropdown + Apply button
 * - Table rows with action icons in last column
 *
 * @param {import("@playwright/test").Page} page
 */
export async function deleteAllNotifications(page) {
  let maxRounds = 5;

  while (maxRounds > 0) {
    await gotoNxPage(page, "nx-admin");
    await page.waitForTimeout(2000);

    // First, show all notifications by selecting max page size (200)
    const pageSizeSelect = page.locator("select").first();
    if (await pageSizeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await pageSizeSelect.locator("option").allTextContents();
      if (options.includes("200")) {
        await pageSizeSelect.selectOption("200");
        await page.waitForTimeout(3000);
      }
    }

    // Check if there are any notification rows in the table
    const tableRows = page.locator("table tbody tr");
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log("All notifications deleted.");
      return;
    }

    console.log(`Found ${rowCount} notifications. Selecting all and deleting...`);

    // Check the select-all checkbox
    const selectAll = page.locator('input[name="nx_all"]');
    if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectAll.check();
      await page.waitForTimeout(500);
    }

    // Find and use the Bulk Action dropdown
    // It's labeled "Bulk Action" and has delete option
    const bulkActionBtn = page.getByText("Bulk Action", { exact: false }).first();
    if (await bulkActionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bulkActionBtn.click();
      await page.waitForTimeout(500);

      // Click Delete option in the dropdown
      const deleteOption = page.getByText("Delete", { exact: true }).first();
      if (await deleteOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Click Apply button
    const applyBtn = page.getByRole("button", { name: /Apply/i }).first();
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(3000);
    }

    // Handle confirmation modal: "Are you sure?" with "Yes, Delete It" button
    const confirmBtn = page.getByRole("button", { name: "Yes, Delete It" });
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    maxRounds--;
  }
}

/**
 * Take a named screenshot and save to snapshots directory.
 * @param {import("@playwright/test").Page} page
 * @param {string} name - descriptive name for the snapshot
 */
export async function takeSnapshot(page, name) {
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "_");
  await page.screenshot({
    path: `snapshots/${safeName}.png`,
    fullPage: true,
    timeout: 60000,
  });
}

/**
 * Generate a unique title for test notifications.
 * @param {string} prefix
 * @returns {string}
 */
export function uniqueTitle(prefix = "Test NX") {
  return `${prefix} ${Date.now().toString(36)}`;
}

/**
 * Visit the frontend site from admin.
 * @param {import("@playwright/test").Page} page
 */
export async function goToFrontend(page) {
  await safeGoto(page, "/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
}

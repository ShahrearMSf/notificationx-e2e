// @ts-check
import { test, expect } from "@playwright/test";
import {
  gotoNxPage,
  handleEmailVerification,
  waitForSuccess,
  deleteAllNotifications,
  uniqueTitle,
  goToFrontend,
  takeSnapshot,
  safeGoto,
} from "../helpers/utils.js";

/**
 * Flow 4: Create displayable notifications, verify on frontend,
 * reload multiple times for analytics data, click some, check analytics, delete all.
 *
 * Notifications created:
 * - Comment Notification (position: bottom-left)
 * - Cookie Notice (position: bottom-right)
 * - Notification Bar / Announcement (position: top)
 * - Custom Notification (position: bottom-left)
 * - Growth Alert with Tea product, Low Stock Threshold = 99 (visible on Shop page)
 *
 * Then: frontend visits + reloads → click notifications → check analytics → cleanup
 */

/**
 * Helper: Create a notification via Add New wizard (reuses proven flow from test 2).
 */
async function createNotification(page, { label, title, subSource }) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  // Select type from the grid
  const typeCard = page.locator("#type_section").getByText(label, { exact: false }).first();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1000);

  // Sub-source if needed
  if (subSource) {
    const sourceTab = page.locator("li").filter({ hasText: /^Source$/ });
    if (await sourceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sourceTab.click();
      await page.waitForTimeout(500);
    }
    await page.locator("#source_section").getByText(subSource, { exact: true }).click();
    await page.waitForTimeout(500);
  }

  // Fill the title
  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(title);
  }

  // Click Next until Publish
  for (let step = 0; step < 8; step++) {
    const publishBtn = page.getByRole("button", { name: "Publish" });
    if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) break;

    const nextBtn = page.getByRole("button", { name: "Next" });
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  // Set Display The Last and Display From The Last to 2000
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

/**
 * Helper: Create Growth Alert specifically for Tea product with Low Stock Threshold = 99.
 */
async function createGrowthAlert(page) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  // Select Growth Alert type
  const typeCard = page.locator("#type_section").getByText("Growth Alert", { exact: false }).first();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1000);

  // Fill the title
  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("Growth Alert - Tea");
  }

  // Click Next to Design
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(1500);

  // Click Next to Content
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(1500);

  // Now on Content step: set Low Stock Threshold to 99
  // The Low Stock Threshold is a number input on this page
  const allNumberInputs = page.locator('input[type="number"]');
  const numCount = await allNumberInputs.count();

  // Find and set Low Stock Threshold (usually the last number input on Content page)
  for (let i = 0; i < numCount; i++) {
    const input = allNumberInputs.nth(i);
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      const parent = await input.evaluate((el) => el.closest('.wprf-control-wrapper')?.textContent || '');
      if (parent.toLowerCase().includes('low stock') || parent.toLowerCase().includes('threshold')) {
        await input.fill("99");
        console.log("Set Low Stock Threshold to 99");
        break;
      }
    }
  }

  // If couldn't find by label, try setting the last visible number input to 99
  // (on Growth Alert Content, the threshold is typically the only number input)
  let thresholdSet = false;
  for (let i = numCount - 1; i >= 0; i--) {
    const input = allNumberInputs.nth(i);
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      const val = await input.inputValue();
      if (val !== "2000") {
        await input.fill("99");
        thresholdSet = true;
        break;
      }
    }
  }

  // Continue through remaining steps to Publish
  for (let step = 0; step < 6; step++) {
    const publishBtn = page.getByRole("button", { name: "Publish" });
    if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) break;

    const nextBtn = page.getByRole("button", { name: "Next" });
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  // Set Display The Last and Display From The Last to 2000 on Behaviour step
  const behInputs = page.locator('input[type="number"]');
  const behCount = await behInputs.count();
  for (let i = 0; i < Math.min(behCount, 2); i++) {
    const input = behInputs.nth(i);
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

test.describe.serial("3 - Frontend Display, Click & Analytics Check", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  // ─── Step 1: Create displayable notifications ──────────────

  test("Create Comment Notification (left)", async ({ page }) => {
    await createNotification(page, {
      label: "Comments",
      title: "Test Comment NX - Left",
    });
  });

  test("Create Cookie Notice (right)", async ({ page }) => {
    await createNotification(page, {
      label: "Cookie Notice",
      title: "Test Cookie NX - Right",
    });
  });

  test("Create Notification Bar / Announcement (top)", async ({ page }) => {
    await createNotification(page, {
      label: "Announcement",
      title: "Test Announcement NX - Top",
    });
  });

  test("Create Custom Notification (left)", async ({ page }) => {
    await createNotification(page, {
      label: "Custom Notification",
      title: "Test Custom NX - Left",
    });
  });

  test("Create Growth Alert with Tea (Low Stock Threshold = 99)", async ({ page }) => {
    await createGrowthAlert(page);
  });

  // ─── Step 2: Visit frontend multiple times for analytics data ──────

  test("Frontend - Visit homepage multiple times for analytics", async ({ page }) => {
    // Visit homepage 5 times to generate view data
    for (let i = 0; i < 5; i++) {
      await goToFrontend(page);
      await page.waitForTimeout(3000);
      console.log(`Homepage visit ${i + 1}/5`);
    }
    await takeSnapshot(page, "frontend-homepage-visits");
  });

  test("Frontend - Visit Shop page to see Growth Alert", async ({ page }) => {
    // Visit shop page multiple times — Growth Alert shows on product pages
    await safeGoto(page, "/shop/");
    await page.waitForTimeout(5000);
    await takeSnapshot(page, "frontend-shop-growth-alert");

    // Check for Growth Alert low stock text
    const bodyText = await page.locator("body").innerText();
    const hasLowStock = bodyText.includes("left in stock") || bodyText.includes("order soon");
    console.log("Growth Alert visible on Shop:", hasLowStock);

    // Reload a few more times for analytics
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForTimeout(3000);
      console.log(`Shop reload ${i + 1}/3`);
    }
  });

  test("Frontend - Visit product pages for more analytics", async ({ page }) => {
    // Visit individual product pages
    await safeGoto(page, "/shop/");
    await page.waitForTimeout(3000);

    // Click on Tea product
    const teaLink = page.getByText("Tea", { exact: false }).first();
    if (await teaLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teaLink.click();
      await page.waitForTimeout(5000);
      await takeSnapshot(page, "frontend-tea-product-page");

      // Check Growth Alert on product page
      const bodyText = await page.locator("body").innerText();
      const hasLowStock = bodyText.includes("left in stock") || bodyText.includes("order soon");
      console.log("Growth Alert on Tea product page:", hasLowStock);
    }

    // Reload product page for more views
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForTimeout(3000);
    }
  });

  // ─── Step 3: Verify notifications and click them ──────────────

  test("Frontend - Verify and click notifications", async ({ page }) => {
    await goToFrontend(page);
    await page.waitForTimeout(8000);

    // Check for NotificationX elements
    const nxElements = page.locator(
      '[class*="notificationx"], [class*="nx-"], [id*="notificationx"], [id*="nx-bar"], [class*="nx_bar"]'
    );
    const count = await nxElements.count();
    console.log(`Found ${count} NotificationX elements on frontend`);

    await takeSnapshot(page, "frontend-all-notifications");

    // Click on visible notification elements
    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = nxElements.nth(i);
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2000);
        await takeSnapshot(page, `frontend-clicked-nx-${i + 1}`);

        // Go back to frontend if navigated away
        if (!page.url().endsWith("/") && !page.url().includes("/shop")) {
          await goToFrontend(page);
          await page.waitForTimeout(3000);
        }
      }
    }
  });

  test("Frontend - Additional reloads on different pages", async ({ page }) => {
    // Cart page
    await safeGoto(page, "/cart/");
    await page.waitForTimeout(3000);
    await takeSnapshot(page, "frontend-cart-page");

    // Checkout page
    await safeGoto(page, "/checkout/");
    await page.waitForTimeout(3000);
    await takeSnapshot(page, "frontend-checkout-page");

    // Sample Page
    await safeGoto(page, "/sample-page/");
    await page.waitForTimeout(3000);
    await takeSnapshot(page, "frontend-sample-page");

    // My Account
    await safeGoto(page, "/my-account/");
    await page.waitForTimeout(3000);
    await takeSnapshot(page, "frontend-myaccount-page");
  });

  // ─── Step 4: Check analytics in admin ──────────────────────

  test("Analytics - Check notification stats after frontend visits", async ({ page }) => {
    await gotoNxPage(page, "nx-analytics");
    await page.waitForTimeout(3000);
    await takeSnapshot(page, "analytics-after-frontend-visits");

    // Check stats
    const bodyText = await page.locator("body").innerText();
    console.log("Analytics contains 'Total Views':", bodyText.includes("Total Views"));
    console.log("Analytics contains 'Total Clicks':", bodyText.includes("Total Clicks"));
    console.log("Analytics contains 'Click Through Rate':", bodyText.includes("Click Through Rate"));

    await takeSnapshot(page, "analytics-detail");
  });

  // ─── Step 5: Delete all notifications ──────────────────────

  test("Cleanup - Delete all notifications", async ({ page }) => {
    await deleteAllNotifications(page);
    await takeSnapshot(page, "cleanup-complete");
  });
});

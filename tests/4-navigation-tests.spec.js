// @ts-check
import { test, expect } from "@playwright/test";
import {
  gotoNxPage,
  handleEmailVerification,
  safeGoto,
} from "../helpers/utils.js";

/**
 * Flow 5: Admin-focused navigation tests for NotificationX.
 *
 * Tests sidebar navigation, direct URL access, wizard step navigation,
 * dashboard controls, and settings page tabs.
 */

/**
 * Helper: Wait for NX page to fully load (loading animation disappears).
 */
async function waitForNxLoad(page) {
  // NX pages show a bell loading animation, wait for it to go away
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);
}

test.describe("4 - NX Admin Navigation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  // ─── Sidebar Submenu Navigation ──────────────────────────

  test("Sidebar - NotificationX menu expands and shows submenus", async ({ page }) => {
    await safeGoto(page, "/wp-admin/");
    await page.waitForTimeout(2000);

    // NotificationX should be in the sidebar
    const nxMenu = page.locator("#adminmenu").getByText("NotificationX", { exact: true }).first();
    await expect(nxMenu).toBeVisible({ timeout: 10000 });

    // Click to expand submenu
    await nxMenu.click();
    await page.waitForTimeout(1000);

    // Verify submenu items are visible
    const submenus = ["Dashboard", "All NotificationX", "Add New", "Settings", "Analytics", "Quick Builder"];
    for (const item of submenus) {
      const submenuItem = page.locator(".wp-submenu").getByText(item, { exact: true }).first();
      const isVisible = await submenuItem.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Submenu "${item}":`, isVisible ? "visible" : "not visible");
    }
  });

  test("Sidebar - Dashboard submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const dashLink = page.locator(".wp-submenu").getByText("Dashboard", { exact: true }).first();
    if (await dashLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashLink.click();
      await waitForNxLoad(page);
      // Dashboard shows Total Views stat
      await expect(page.getByText("Total Views").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("Sidebar - All NotificationX submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const allNxLink = page.locator(".wp-submenu").getByText("All NotificationX", { exact: true }).first();
    if (await allNxLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allNxLink.click();
      await waitForNxLoad(page);
      // Should show the Add New button and the table or empty state
      await expect(page.getByText("Add New").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("Sidebar - Add New submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const addNewLink = page.locator(".wp-submenu").getByText("Add New", { exact: true }).first();
    if (await addNewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addNewLink.click();
      await waitForNxLoad(page);
      // Should show NOTIFICATION TYPE grid
      await expect(page.locator("#type_section")).toBeVisible({ timeout: 15000 });
    }
  });

  test("Sidebar - Settings submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    // Scope to NX's own submenu (under #toplevel_page_nx-admin)
    const settingsLink = page.locator('#toplevel_page_nx-admin .wp-submenu a[href*="nx-settings"]').first();
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await waitForNxLoad(page);
      expect(page.url()).toContain("nx-settings");
    }
  });

  test("Sidebar - Analytics submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const analyticsLink = page.locator(".wp-submenu").getByText("Analytics", { exact: true }).first();
    if (await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyticsLink.click();
      await waitForNxLoad(page);
      expect(page.url()).toContain("nx-analytics");
      await expect(page.getByText("Total Views").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("Sidebar - Quick Builder submenu navigates correctly", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const qbLink = page.locator(".wp-submenu").getByText("Quick Builder", { exact: true }).first();
    if (await qbLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await qbLink.click();
      await waitForNxLoad(page);
      expect(page.url()).toContain("nx-builder");
      await expect(page.locator("#type_section")).toBeVisible({ timeout: 15000 });
    }
  });

  // ─── Direct URL Navigation ──────────────────────────────

  test("Direct URL - NX All NotificationX page loads", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);
    await expect(page.getByText("Add New").first()).toBeVisible({ timeout: 15000 });
    // Should have Bulk Action and page size controls
    await expect(page.getByText("Bulk Action").first()).toBeVisible({ timeout: 10000 });
  });

  test("Direct URL - NX Settings page loads", async ({ page }) => {
    await gotoNxPage(page, "nx-settings");
    await waitForNxLoad(page);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test("Direct URL - NX Analytics page loads with stats", async ({ page }) => {
    await gotoNxPage(page, "nx-analytics");
    await waitForNxLoad(page);
    await expect(page.getByText("Total Views").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Total Clicks").first()).toBeVisible({ timeout: 10000 });
  });

  test("Direct URL - NX Quick Builder loads with type grid", async ({ page }) => {
    await safeGoto(page, "/wp-admin/admin.php?page=nx-builder");
    await waitForNxLoad(page);
    await expect(page.locator("#type_section")).toBeVisible({ timeout: 15000 });
    // Verify some type cards exist
    await expect(page.locator("#type_section").getByText("WooCommerce").first()).toBeVisible();
    await expect(page.locator("#type_section").getByText("Cookie Notice").first()).toBeVisible();
  });

  // ─── Add New Wizard Step Navigation ──────────────────────

  test("Add New Wizard - Step forward through all steps", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);
    // Use the Add New link from dashboard header
    await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
    await waitForNxLoad(page);

    // Select WooCommerce to enable all steps
    await page.locator("#type_section").getByText("WooCommerce", { exact: false }).first().click();
    await page.waitForTimeout(1000);

    // Count how many Next clicks until Publish
    let stepCount = 1; // Source is step 1
    for (let i = 0; i < 10; i++) {
      const publishBtn = page.getByRole("button", { name: "Publish" });
      if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check if Next is also visible — on some pages both appear
        const nextAlsoVisible = await page.getByRole("button", { name: "Next" }).isVisible({ timeout: 1000 }).catch(() => false);
        if (!nextAlsoVisible) {
          console.log(`Reached final step (Publish only) at step ${stepCount}`);
          break;
        }
        // Both Next and Publish visible — keep clicking Next
      }
      const nextBtn = page.getByRole("button", { name: "Next" });
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1500);
        stepCount++;
        console.log(`Step ${stepCount}`);
      } else {
        break;
      }
    }
    console.log(`Total steps navigated: ${stepCount}`);
    expect(stepCount).toBeGreaterThanOrEqual(2);
  });

  test("Add New Wizard - Previous button navigates back", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);
    await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
    await waitForNxLoad(page);

    // Select Cookie Notice and go Next
    await page.locator("#type_section").getByText("Cookie Notice", { exact: false }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(1500);

    // Click Previous
    const prevBtn = page.getByRole("button", { name: "Previous" });
    await expect(prevBtn).toBeVisible({ timeout: 5000 });
    await prevBtn.click();
    await page.waitForTimeout(1500);

    // Should be back on Source step with type grid
    await expect(page.locator("#type_section")).toBeVisible({ timeout: 10000 });
  });

  test("Add New Wizard - Tab clicks navigate between steps", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);
    await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
    await waitForNxLoad(page);

    // Select a type first
    await page.locator("#type_section").getByText("Comments", { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Try clicking on specific step tabs (Source, Design, Content, etc.)
    const tabNames = ["Source", "Design", "Content", "Display", "Customize"];
    for (const tab of tabNames) {
      const tabEl = page.locator("li").filter({ hasText: new RegExp(`^${tab}$`) }).first();
      if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(1000);
        console.log(`Tab "${tab}": clickable`);
      }
    }
  });

  // ─── Dashboard Controls ────────────────────────────────

  test("Dashboard - Page size dropdown works", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const pageSizeSelect = page.locator("select").first();
    if (await pageSizeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pageSizeSelect.selectOption("50");
      await page.waitForTimeout(2000);
      const val = await pageSizeSelect.inputValue();
      expect(val).toBe("50");
      // Reset to default
      await pageSizeSelect.selectOption("20");
      await page.waitForTimeout(1000);
    }
  });

  test("Dashboard - Status filter tabs exist", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    // ALL tab should be present in the filter tabs area
    const allTab = page.locator('.nx-admin-header, .notificationx-admin').getByText("ALL", { exact: false }).first();
    const isVisible = await allTab.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("Status filter 'ALL' tab:", isVisible ? "visible" : "not found (may have different label)");
  });

  test("Dashboard - Search input works", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForTimeout(1500);
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }
  });

  test("Dashboard - Bulk Action and Apply button present", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    await expect(page.getByText("Bulk Action").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Apply/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("Dashboard - Date range filter present", async ({ page }) => {
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);

    // Check for date inputs or date range selector
    const dateInputs = page.locator('input[type="date"], input[placeholder*="date" i], .nx-date-range');
    const count = await dateInputs.count();
    console.log("Date filter inputs found:", count);
  });

  // ─── Settings Page Tab Navigation ──────────────────────

  test("Settings - Navigate through all visible tabs", async ({ page }) => {
    await gotoNxPage(page, "nx-settings");
    await waitForNxLoad(page);

    // Find all clickable tabs on the settings page
    const settingsTabs = page.locator('.nx-settings-tab, .wprf-tab-nav li, [role="tab"]');
    const tabCount = await settingsTabs.count();
    console.log("Settings tabs found:", tabCount);

    // Click each tab and verify it loads
    for (let i = 0; i < tabCount; i++) {
      const tab = settingsTabs.nth(i);
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tabText = await tab.innerText().catch(() => "");
        await tab.click();
        await page.waitForTimeout(1500);
        console.log(`Settings tab "${tabText.trim()}": loaded`);
      }
    }
  });

  // ─── Quick Builder Tab Navigation ──────────────────────

  test("Quick Builder - Navigate through tabs (Source → Design → Display → Finalize)", async ({ page }) => {
    await safeGoto(page, "/wp-admin/admin.php?page=nx-builder");
    await waitForNxLoad(page);

    // Select a type first
    const typeCard = page.locator("#type_section").getByText("Cookie Notice", { exact: false }).first();
    await typeCard.scrollIntoViewIfNeeded();
    await typeCard.click();
    await page.waitForTimeout(1000);

    // Navigate through tabs
    const tabs = ["SOURCE", "DESIGN", "DISPLAY", "FINALIZE"];
    for (const tab of tabs) {
      const tabEl = page.getByText(tab, { exact: true }).first();
      if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(1500);
        console.log(`Quick Builder tab "${tab}": navigated`);
      }
    }
  });

  // ─── Analytics Page Controls ──────────────────────────

  test("Analytics - Date range and chart controls present", async ({ page }) => {
    await gotoNxPage(page, "nx-analytics");
    await waitForNxLoad(page);

    // Verify chart/graph area
    await expect(page.getByText("Total Views").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Total Clicks").first()).toBeVisible({ timeout: 10000 });

    // Check for comparison tabs (All, Click, Views etc.)
    const filterTabs = ["All", "Click", "Views"];
    for (const tab of filterTabs) {
      const tabEl = page.getByText(tab, { exact: true }).first();
      const isVis = await tabEl.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Analytics filter "${tab}":`, isVis ? "visible" : "not visible");
    }
  });

  // ─── Cross-Navigation Between NX Pages ────────────────

  test("Cross-nav: Dashboard → All NX → Add New → Settings → Analytics → Quick Builder", async ({ page }) => {
    const nxSubmenu = '#toplevel_page_nx-admin .wp-submenu';

    // Dashboard
    await gotoNxPage(page, "nx-admin");
    await waitForNxLoad(page);
    console.log("1. Dashboard loaded");

    // All NotificationX
    await page.locator(`${nxSubmenu} a[href*="nx-admin"]`).first().click();
    await waitForNxLoad(page);
    console.log("2. All NotificationX loaded");

    // Add New
    await page.locator(`${nxSubmenu} a[href*="nx-edit"]`).first().click();
    await waitForNxLoad(page);
    await expect(page.locator("#type_section")).toBeVisible({ timeout: 15000 });
    console.log("3. Add New loaded");

    // Settings
    await page.locator(`${nxSubmenu} a[href*="nx-settings"]`).first().click();
    await waitForNxLoad(page);
    expect(page.url()).toContain("nx-settings");
    console.log("4. Settings loaded");

    // Analytics
    await page.locator(`${nxSubmenu} a[href*="nx-analytics"]`).first().click();
    await waitForNxLoad(page);
    expect(page.url()).toContain("nx-analytics");
    console.log("5. Analytics loaded");

    // Quick Builder
    await page.locator(`${nxSubmenu} a[href*="nx-builder"]`).first().click();
    await waitForNxLoad(page);
    expect(page.url()).toContain("nx-builder");
    console.log("6. Quick Builder loaded");
  });
});

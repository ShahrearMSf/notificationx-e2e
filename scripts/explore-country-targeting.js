// @ts-check
import { chromium } from "@playwright/test";
import { config } from "dotenv";

config();

const BASE_URL = process.env.BASE_URL;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

async function exploreType(page, typeName) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nx-edit`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  const typeCard = page.locator("#type_section").getByText(new RegExp(`^${typeName}$`, 'i')).first();
  if (!(await typeCard.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log(`  ${typeName}: type card not found`);
    return;
  }
  await typeCard.click();
  await page.waitForTimeout(1500);

  // Fill title so we can navigate steps
  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(`Explore ${typeName}`);
  }

  // Try Display tab
  const displayTab = page.locator('.wprf-tab-nav li').filter({ hasText: /^Display$/i }).first();
  if (await displayTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await displayTab.click();
    await page.waitForTimeout(2500);

    // Open "Show On" dropdown to see options
    const showOnSelect = page.locator('select').filter({ hasText: /Show Everywhere/i }).first();
    let showOnOptions = [];
    if (await showOnSelect.count() > 0) {
      showOnOptions = await showOnSelect.locator('option').allTextContents();
    } else {
      // Custom dropdown
      const showOnTrigger = page.getByText("Show Everywhere", { exact: false }).first();
      if (await showOnTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await showOnTrigger.click();
        await page.waitForTimeout(800);
        showOnOptions = await page.locator('[role="option"], [class*="option"]:visible')
          .allTextContents();
        // Close by pressing Escape
        await page.keyboard.press('Escape');
      }
    }

    // Look for any country-related field
    const bodyText = await page.locator("body").innerText();
    const hasCountry = /country|specific countries|target.*countries|region/i.test(bodyText);

    // Look for "Restrict Display" or similar toggles
    const restrictFields = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll("label, h4, .wprf-label"));
      return labels.map(l => (l.textContent || "").trim()).filter(t =>
        /country|region|geo|restrict|target/i.test(t) && t.length < 100
      );
    });

    console.log(`  ${typeName}:`);
    console.log(`    Show On options:`, [...new Set(showOnOptions)]);
    console.log(`    Country-related fields:`, restrictFields);
    console.log(`    Body contains 'country' text: ${hasCountry}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  await page.goto(`${BASE_URL}/wp-login.php`);
  await page.getByLabel("Username or Email Address").fill(ADMIN_USER);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const correctEmail = page.locator('a:has-text("correct")').first();
  if (await correctEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await correctEmail.click();
  }

  // Check a variety of types
  const types = [
    "Notification Bar",   // Should have country targeting (baseline)
    "Announcement",       // User said now has themes + country targeting
    "Comments",           // Should have country targeting now
    "WooCommerce",        // Should have country targeting
    "Cookie Notice",      // This IS GDPR-like — user said skip
    "Exit Intent Popup",  // User said skip
    "Discount Alert",     // Check
  ];

  for (const t of types) {
    try {
      await exploreType(page, t);
    } catch (e) {
      console.log(`  ${t}: error ${e.message}`);
    }
  }

  // Take a full page screenshot of Notification Bar's Display step (baseline)
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nx-edit`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  await page.locator("#type_section").getByText(/^Notification Bar$/).first().click();
  await page.waitForTimeout(1500);
  const titleInputBar = page.getByPlaceholder("NotificationX Title");
  if (await titleInputBar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInputBar.fill("Explore Bar Country Targeting");
  }
  await page.locator('.wprf-tab-nav li').filter({ hasText: /^Display$/i }).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "snapshots/nx-bar-display.png", fullPage: true });
  console.log("\nBar display screenshot saved");

  await browser.close();
})();

// @ts-check
import { chromium } from "@playwright/test";
import { config } from "dotenv";

config();

const BASE_URL = process.env.BASE_URL;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

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

  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nx-edit`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  // Pick Announcement
  await page.locator("#type_section").getByText(/^Announcement$/).first().click();
  await page.waitForTimeout(1500);

  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("Explore Announcement Themes");
  }

  // Go to Design step
  await page.locator('.wprf-tab-nav li').filter({ hasText: /^Design$/i }).first().click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "snapshots/announcement-design.png", fullPage: true });
  console.log("Screenshot saved: snapshots/announcement-design.png");

  // Get themes info from DOM
  const themesInfo = await page.evaluate(() => {
    const themeInputs = document.querySelectorAll('input[name="themes"]');
    return Array.from(themeInputs).map((el, i) => ({
      index: i,
      id: el.id,
      value: el.value,
      imgSrc: el.closest('.wprf-input-radio-option')?.querySelector('img')?.src || "",
      classes: el.closest('.wprf-input-radio-option')?.className || "",
    }));
  });

  console.log("\n=== Announcement themes ===");
  themesInfo.forEach(t => console.log(JSON.stringify(t)));

  // Also check the Display step for country targeting
  await page.locator('.wprf-tab-nav li').filter({ hasText: /^Display$/i }).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "snapshots/announcement-display.png", fullPage: true });
  console.log("\nScreenshot saved: snapshots/announcement-display.png");

  const displayFields = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("label, h4, .wprf-label, .wprf-section-title"));
    return labels.map(l => (l.textContent || "").trim()).filter(t => t.length > 0 && t.length < 80);
  });
  console.log("\n=== Display step fields ===");
  const unique = [...new Set(displayFields)];
  unique.slice(0, 30).forEach(t => console.log(`  ${t}`));

  await browser.close();
  console.log("\nDone!");
})();

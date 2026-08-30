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
  page.setDefaultTimeout(90000);

  await page.goto(`${BASE_URL}/wp-login.php`, { timeout: 90000 });
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

  // Click Cart Peek
  await page.locator("#type_section").getByText(/^Cart Peek/i).first().click();
  await page.waitForTimeout(2000);

  // Fill title
  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("Explore Cart Peek");
  }

  // Screenshot each wizard step
  const tabs = ["Source", "Design", "Content", "Display", "Customize"];
  for (const tab of tabs) {
    const tabEl = page.locator('.wprf-tab-nav li').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first();
    if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabEl.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `snapshots/cart-peek-${tab.toLowerCase()}.png`, fullPage: true });
      console.log(`Captured: ${tab}`);
    }
  }

  // Count themes on Design
  const designTab = page.locator('.wprf-tab-nav li').filter({ hasText: /^Design$/i }).first();
  await designTab.click();
  await page.waitForTimeout(2500);
  const themeCount = await page.locator('input[name="themes"]').count();
  console.log(`\nCart Peek themes count: ${themeCount}`);

  // Get theme names
  const themes = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[name="themes"]'));
    return inputs.map(i => i.value);
  });
  console.log("Theme values:", themes);

  // Check what sub-sources exist (if any)
  const sourceTab = page.locator('.wprf-tab-nav li').filter({ hasText: /^Source$/i }).first();
  await sourceTab.click();
  await page.waitForTimeout(2500);

  const sourceInfo = await page.evaluate(() => {
    // Look for source_section
    const src = document.querySelector("#source_section");
    return src ? src.innerText : "(no source section)";
  });
  console.log("\nSource section content:", sourceInfo);

  await browser.close();
  console.log("\nDone");
})();

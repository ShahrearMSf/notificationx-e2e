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
  await page.waitForTimeout(2000);

  // Notification Bar
  await page.locator("#type_section").getByText(/^Notification Bar$/).first().click();
  await page.waitForTimeout(1500);

  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("Find Country Targeting");
  }

  // Check each step for country targeting
  const steps = ["Source", "Design", "Content", "Display", "Customize"];
  for (const step of steps) {
    const tab = page.locator('.wprf-tab-nav li').filter({ hasText: new RegExp(`^${step}$`, 'i') }).first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(2500);

      const info = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              const text = node.textContent || "";
              return /country|target/i.test(text) && node.children.length < 10
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
            }
          }
        );

        const matches = [];
        let node;
        while ((node = walker.nextNode())) {
          const text = (node.textContent || "").trim();
          if (text.length < 200 && text.length > 5) {
            matches.push({
              tag: node.tagName,
              class: (node.className || "").toString().slice(0, 100),
              text: text.slice(0, 100),
            });
          }
        }
        return matches.slice(0, 20);
      });

      console.log(`\n=== ${step} ===`);
      info.forEach(m => console.log(JSON.stringify(m)));
    }
  }

  // Screenshot the Customize step
  await page.locator('.wprf-tab-nav li').filter({ hasText: /^Customize$/i }).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "snapshots/nx-bar-customize.png", fullPage: true });
  console.log("\nCustomize screenshot saved");

  await browser.close();
})();

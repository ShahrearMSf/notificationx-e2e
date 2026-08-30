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
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  await page.getByLabel("Username or Email Address").fill(ADMIN_USER);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const correctEmail = page.locator('a:has-text("correct")').first();
  if (await correctEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await correctEmail.click();
  }

  // 1. Add New — check top-level type cards
  console.log("=== 1. Add New — top-level types ===");
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nx-edit`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  const addNewText = await page.locator("#type_section").innerText().catch(() => "");
  console.log(addNewText);

  const hasCartPeekTopLevel = /cart\s*peek/i.test(addNewText);
  console.log(`Cart Peek appears as top-level type in Add New: ${hasCartPeekTopLevel}`);

  // 2. Add New — pick WooCommerce and check sub-sources
  console.log("\n=== 2. Add New — after clicking WooCommerce ===");
  const wooCard = page.locator("#type_section").getByText(/^WooCommerce$/).first();
  if (await wooCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await wooCard.click();
    await page.waitForTimeout(2000);

    const sourceSection = page.locator("#source_section");
    if (await sourceSection.count() > 0) {
      const sourceText = await sourceSection.innerText().catch(() => "");
      console.log(sourceText);
      console.log(`Cart Peek as WooCommerce sub-source: ${/cart\s*peek/i.test(sourceText)}`);
    } else {
      console.log("(no #source_section — checking whole page)");
      const bodyText = await page.locator("body").innerText();
      const cartPeekInBody = /cart\s*peek/i.test(bodyText);
      console.log(`Cart Peek anywhere on page: ${cartPeekInBody}`);
    }
  }

  // 3. Quick Builder — top-level types
  console.log("\n=== 3. Quick Builder — top-level types ===");
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nx-builder`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  const qbText = await page.locator("#type_section").innerText().catch(() => "");
  console.log(qbText);
  console.log(`Cart Peek as Quick Builder top-level: ${/cart\s*peek/i.test(qbText)}`);

  await browser.close();
})();

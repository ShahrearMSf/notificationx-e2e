// @ts-check
import { chromium } from "@playwright/test";
import { config } from "dotenv";

config();

const BASE_URL = process.env.BASE_URL;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

async function listTypes(page, pageSlug) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${pageSlug}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  const types = await page.evaluate(() => {
    const section = document.querySelector("#type_section");
    if (!section) return [];
    // Type cards are typically buttons or divs with a name/label
    const cards = section.querySelectorAll('[class*="type-item"], [class*="type-card"], .wprf-radio-card-item, .wprf-input-radio-option, label');
    const seen = new Set();
    const out = [];
    for (const c of cards) {
      const text = (c.textContent || "").trim().replace(/\s+/g, " ");
      if (!text || text.length > 60) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      // Also check for PRO badge/lock indicator inside this card
      const hasPro = /pro|premium|lock/i.test(c.className) ||
                     !!c.querySelector('[class*="pro" i], [class*="lock" i], [class*="premium" i], [class*="badge" i]');
      out.push({ name: text, hasPro });
    }
    return out;
  });
  return types;
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

  console.log("=== Add New (nx-edit) ===");
  const addNewTypes = await listTypes(page, "nx-edit");
  addNewTypes.forEach(t => console.log(`  ${t.hasPro ? "[PRO]" : "     "} ${t.name}`));

  console.log(`\nTotal Add New types: ${addNewTypes.length}`);

  console.log("\n=== Quick Builder (nx-builder) ===");
  const qbTypes = await listTypes(page, "nx-builder");
  qbTypes.forEach(t => console.log(`  ${t.hasPro ? "[PRO]" : "     "} ${t.name}`));
  console.log(`\nTotal Quick Builder types: ${qbTypes.length}`);

  // Diff with known set
  const KNOWN = [
    "WooCommerce", "Sales Notification", "Cookie Notice", "eLearning",
    "Notification Bar", "Announcement", "Exit Intent Popup", "Reviews",
    "Contact Form", "Download Stats", "Comments", "Discount Alert",
    "Donations", "Flashing Tab", "Growth Alert", "Custom Notification",
    "Video", "Email Subscription", "Page Analytics"
  ];

  console.log("\n=== NEW types not in known list ===");
  const allNames = new Set(addNewTypes.map(t => t.name.replace(/[🚀]/g, "").trim()));
  for (const name of allNames) {
    const stripped = name.replace(/[🚀\s]+/g, " ").trim();
    if (!KNOWN.some(k => stripped.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(stripped.toLowerCase()))) {
      console.log(`  UNKNOWN: ${name}`);
    }
  }

  await browser.close();
})();

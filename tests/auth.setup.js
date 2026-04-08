// @ts-check
import { test as setup, expect } from "@playwright/test";
import { handleEmailVerification } from "../helpers/utils.js";

const loginUrl = "/wp-login.php";
const adminFile = "playwright/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto(loginUrl);
  await page.waitForLoadState("domcontentloaded");

  await page.getByLabel("Username or Email Address").fill(process.env.ADMIN_USER);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_PASS);
  await page.getByLabel("Remember Me").check();
  await page.getByRole("button", { name: "Log In" }).click();

  await page.waitForLoadState("domcontentloaded");

  // Handle "Administration email verification" if it appears
  await handleEmailVerification(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 30000,
  });

  await page.context().storageState({ path: adminFile });
});

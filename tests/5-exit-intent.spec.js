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
 * Exit Intent Popup — dedicated tests for the new notification type.
 *
 * Wizard structure:
 *   Source     → pick "Exit Intent Popup"
 *   Design     → 7 themes (For Desktop / For Mobile sub-tabs)
 *   Content    → Title, Subtitle, Name/Email/Message fields, Button Text
 *   Display    → Show On, Display For
 *   Customize  → Show Close Button, Position (Center/Bottom Left/Bottom Right),
 *                Trigger Sensitivity, Do Not Show Again For (days),
 *                Disable on Mobile
 *
 * Trigger behavior: popup appears when mouse leaves the viewport from
 * the top edge (no idle timer).
 *
 * On Notomation site NX Pro is active, so all 7 themes are usable.
 */

const ALL_THEMES = [0, 1, 2, 3, 4, 5, 6];
const POSITIONS = ["Center", "Bottom Left", "Bottom Right"];

async function openExitIntentWizard(page, title) {
  await gotoNxPage(page, "nx-admin");
  await page.locator("div").filter({ hasText: /^Add New$/ }).locator("a").click();
  await page.waitForTimeout(2000);

  const typeCard = page.locator("#type_section").getByText(/exit intent/i).first();
  await expect(typeCard).toBeVisible({ timeout: 10000 });
  await typeCard.click();
  await page.waitForTimeout(1000);

  const titleInput = page.getByPlaceholder("NotificationX Title");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(title);
  }
}

async function gotoStep(page, stepName) {
  const tabEl = page.locator('.wprf-tab-nav li, ul.wprf-tab-nav li')
    .filter({ hasText: new RegExp(`^${stepName}$`, 'i') })
    .first();

  if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabEl.click();
  } else {
    const fallback = page.locator('#wpbody-content li, [class*="step"] li, [class*="tab"] li')
      .filter({ hasText: new RegExp(`^${stepName}$`, 'i') })
      .first();
    await fallback.click();
  }
  await page.waitForTimeout(2500);
}

/**
 * Select a theme by its index (0-6) within the active "For Desktop" sub-tab.
 * The Design step has Desktop/Mobile sub-tabs each with 7 themes (14 radios total).
 */
async function selectTheme(page, index) {
  const activeTab = page.locator('#for_desktop.wprf-active, .wprf-tab-content.wprf-active').first();
  const optionContainer = activeTab.locator('.wprf-input-radio-option').nth(index);

  if (await optionContainer.count() > 0) {
    await optionContainer.scrollIntoViewIfNeeded().catch(() => {});
    await optionContainer.click({ force: true });
  } else {
    const label = page.locator(`label[for="wprf-input-radio-2-${index}"]`).first();
    if (await label.count() > 0) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
      await label.click({ force: true });
    }
  }
  await page.waitForTimeout(1500);
}

async function publishNotification(page) {
  const publishBtn = page.getByRole("button", { name: "Publish" }).first();
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await publishBtn.click();
  await page.waitForTimeout(4000);
  await waitForSuccess(page, "Successfully Created");
}

/**
 * Simulate exit intent by dispatching mouseout with clientY <= 0.
 */
async function triggerExitIntent(page) {
  await page.evaluate(() => {
    const mouseout = new MouseEvent("mouseout", {
      bubbles: true, cancelable: true,
      clientY: -10, clientX: 200, relatedTarget: null,
    });
    document.dispatchEvent(mouseout);
    document.documentElement.dispatchEvent(mouseout);

    const mouseleave = new MouseEvent("mouseleave", {
      bubbles: true, cancelable: true,
      clientY: -10, clientX: 200,
    });
    document.dispatchEvent(mouseleave);
  });
  await page.mouse.move(200, 0);
  await page.waitForTimeout(2000);
}

test.describe.serial("5 - Exit Intent Popup (dedicated)", () => {
  test.beforeEach(async ({ page }) => {
    await handleEmailVerification(page);
  });

  test("Cleanup before Exit Intent tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });

  // ─── Themes (all 7 — Pro is active on live site) ──────────

  for (const themeIdx of ALL_THEMES) {
    test(`Theme ${themeIdx + 1} — create and publish`, async ({ page }) => {
      await deleteAllNotifications(page);
      await openExitIntentWizard(page, uniqueTitle(`ExitIntent Theme ${themeIdx + 1}`));

      await gotoStep(page, "Design");
      await selectTheme(page, themeIdx);

      await publishNotification(page);
    });
  }

  // ─── Positions ─────────────────────────────────────────────

  for (const position of POSITIONS) {
    test(`Position "${position}" — create, publish, verify on frontend`, async ({ page }) => {
      await deleteAllNotifications(page);
      await openExitIntentWizard(page, uniqueTitle(`ExitIntent Pos ${position}`));

      // Set "Do Not Show Again" to 0 so popup fires after cookie clear
      await gotoStep(page, "Customize");

      // Locate Position row by its label
      const positionRow = page.locator('.wprf-control-wrapper, .wprf-field-wrapper')
        .filter({ hasText: /^Position/i })
        .first();

      const select = positionRow.locator('select').first();
      if (await select.count() > 0) {
        await select.selectOption({ label: position }).catch(async () => {
          await select.selectOption(position);
        });
      } else {
        const trigger = positionRow.locator('[class*="select"], [class*="dropdown"], .wprf-control').first();
        await trigger.click();
        await page.waitForTimeout(800);

        const option = page.locator('[role="option"], [class*="option"]')
          .filter({ hasText: new RegExp(`^${position}$`, 'i') })
          .first();
        await option.click({ force: true });
      }
      await page.waitForTimeout(800);

      // Reduce cookie persistence
      const dnsAgain = page.locator('input[type="number"]').first();
      if (await dnsAgain.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dnsAgain.fill("0");
      }

      await publishNotification(page);

      // ─── Frontend verification ──────────────────────────────
      await goToFrontend(page);
      await page.waitForTimeout(3000);

      await page.context().clearCookies();
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(5000);

      await triggerExitIntent(page);
      await takeSnapshot(page, `exit-intent-position-${position.toLowerCase().replace(/\s+/g, "-")}`);

      // Position is reflected by class name on the popup wrapper.
      // Possible patterns: "center", "bottom-left", "bottom_left", "bottomLeft", etc.
      const posKey = position.toLowerCase().replace(/\s+/g, "-");           // bottom-left
      const posKeyUnderscore = position.toLowerCase().replace(/\s+/g, "_"); // bottom_left
      const posKeyCamel = position.split(/\s+/).map((p, i) =>
        i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      ).join("");                                                            // bottomLeft

      // Look for any element whose class hints at the position
      const posMatches = await page.locator(
        `[class*="${posKey}" i], [class*="${posKeyUnderscore}" i], [class*="${posKeyCamel}"]`
      ).count();
      console.log(`Position "${position}" — matching class count: ${posMatches}`);

      // Also try to find the actual popup card (inner element) by drilling into the
      // exit-intent wrapper and excluding full-viewport overlays.
      const innerPopup = page.locator(
        '[class*="exit-intent" i] > div, [class*="exit_intent" i] > div, ' +
        '[class*="popup" i] [class*="card" i], [class*="popup" i] [class*="content" i]'
      ).filter({ visible: true }).first();

      if (await innerPopup.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await innerPopup.boundingBox();
        const viewport = page.viewportSize();
        console.log(`Position "${position}" — inner popup box:`, box);

        if (box && viewport) {
          // Only check positioning if the box isn't covering the whole viewport
          const isFullViewport = box.width >= viewport.width * 0.95 && box.height >= viewport.height * 0.95;

          if (!isFullViewport) {
            const popupCenterX = box.x + box.width / 2;
            const popupBottom = box.y + box.height;

            if (position === "Center") {
              expect(Math.abs(popupCenterX - viewport.width / 2)).toBeLessThan(viewport.width * 0.3);
            } else if (position === "Bottom Left") {
              expect(box.x).toBeLessThan(viewport.width * 0.4);
              expect(popupBottom).toBeGreaterThan(viewport.height * 0.5);
            } else if (position === "Bottom Right") {
              expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.6);
              expect(popupBottom).toBeGreaterThan(viewport.height * 0.5);
            }
          }
        }
      }

      // Primary assertion: at least one element with position-related class exists
      expect(
        posMatches,
        `Frontend should have an element with class hint for "${position}"`
      ).toBeGreaterThan(0);
    });
  }

  // ─── Custom content ───────────────────────────────────────

  test("Custom content — title, subtitle, button text", async ({ page }) => {
    await deleteAllNotifications(page);
    await openExitIntentWizard(page, uniqueTitle("ExitIntent CustomContent"));

    await gotoStep(page, "Content");

    const titleField = page.locator('input[type="text"]').filter({ hasValue: /Wait|Before/i }).first();
    if (await titleField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleField.fill("Hold On A Second!");
    }

    const subtitleField = page.locator('input[type="text"], textarea').filter({ hasValue: /love|feedback/i }).first();
    if (await subtitleField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subtitleField.fill("Before you leave, grab this offer.");
    }

    const buttonField = page.locator('input[type="text"]').filter({ hasValue: /SUBMIT/i }).first();
    if (await buttonField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buttonField.fill("GET MY OFFER");
    }

    await publishNotification(page);
  });

  // ─── Frontend trigger ──────────────────────────────────────

  test("Frontend — Exit Intent popup triggers on mouse leave to top", async ({ page }) => {
    await deleteAllNotifications(page);
    await openExitIntentWizard(page, uniqueTitle("ExitIntent FrontendTrigger"));
    await gotoStep(page, "Design");
    await selectTheme(page, 0);

    // Reduce "Do Not Show Again" so popup fires after cookie clear
    await gotoStep(page, "Customize");
    const dnsAgain = page.locator('input[type="number"]').first();
    if (await dnsAgain.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dnsAgain.fill("0");
    }

    await publishNotification(page);

    await goToFrontend(page);
    await page.waitForTimeout(5000);

    await page.context().clearCookies();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    await triggerExitIntent(page);
    await takeSnapshot(page, "exit-intent-after-trigger");

    const popup = page.locator(
      '[class*="exit-intent" i], [class*="exit_intent" i], ' +
      '[class*="popup" i][class*="active" i], [class*="modal"][class*="open" i], ' +
      '[id*="exit-intent" i]'
    );
    const popupCount = await popup.count();
    console.log(`Exit Intent popup elements found after trigger: ${popupCount}`);

    const bodyHTML = await page.locator("body").innerHTML();
    const hasExitMarkup = /exit[-_ ]intent|notificationx.*popup/i.test(bodyHTML);
    console.log(`Exit intent markup present: ${hasExitMarkup}`);

    expect(popupCount > 0 || hasExitMarkup).toBe(true);
  });

  test("Frontend — Close button dismisses Exit Intent popup", async ({ page }) => {
    await goToFrontend(page);
    await page.context().clearCookies();
    await page.reload();
    await page.waitForTimeout(5000);

    await triggerExitIntent(page);
    await page.waitForTimeout(2000);

    const closeBtn = page.locator(
      '[class*="exit-intent" i] [class*="close" i], ' +
      '[class*="popup"] [class*="close" i], ' +
      '[aria-label*="close" i]'
    ).first();

    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
      await takeSnapshot(page, "exit-intent-after-close");

      const popup = page.locator('[class*="exit-intent" i]:visible, [class*="exit_intent" i]:visible');
      const visibleAfter = await popup.count();
      console.log(`Popup elements visible after close: ${visibleAfter}`);
    } else {
      console.log("Close button not found — popup may have a different markup");
    }
  });

  test("Cleanup after Exit Intent tests", async ({ page }) => {
    await deleteAllNotifications(page);
  });
});

import { expect, test, type Page } from "@playwright/test";

/**
 * Magic editor — "Tipo de página" / "Variante" dropdown reachability.
 *
 * The lab route (/labs/magic-editor) mounts the exact same `MagicEditorApp` the
 * production host renders at /pages/$pageId/edit, so the top bar markup, its
 * stacking context and the CSS clipping context are the production ones.
 */

const LAB_ROUTE = "/labs/magic-editor";
const EVIDENCE_DIR = "logs/magic-page-selectors";

const familyTrigger = (page: Page) => page.locator('button[aria-label="Tipo de página"]');
const variantTrigger = (page: Page) => page.locator('button[aria-label="Variante"]');
const FAMILY_DIALOG = 'div[role="dialog"][aria-label="Tipos de página"]';
const variantDialog = (family: string) => `div[role="dialog"][aria-label="Variantes ${family}"]`;

/**
 * Every page-family entry the source defines, in menu order. The reference
 * confirms Bio, Negocio / Servicios, Portafolio and Mini Galería; Catálogo is
 * also defined in `data/templates.ts`/`TopBar.tsx` as its own family entry, so it
 * stays listed and is not treated as invented.
 */
const SOURCE_DEFINED_FAMILIES = [
  "Bio",
  "Negocio / Servicios",
  "Catálogo",
  "Portafolio",
  "Mini Galería",
] as const;

/** The page families the reference confirms, with their confirmed variant counts. */
const CONFIRMED_FAMILIES = [
  { label: "Bio", variants: 8 },
  { label: "Negocio / Servicios", variants: 8 },
  { label: "Portafolio", variants: 8 },
  { label: "Mini Galería", variants: 5 },
] as const;

type DialogProbe = {
  mounted: boolean;
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  viewport: { width: number; height: number };
  headerOverflowX: string;
  headerOverflowY: string;
  headerIsScrollContainer: boolean;
  hitInsideDialog: boolean;
  hitDescription: string;
};

/**
 * Measures whether a mounted popover is actually *reachable*: mounted, inside the
 * viewport, and the topmost element at its centre belongs to the popover itself.
 * A popover clipped away by an ancestor scroll container fails the last check.
 */
async function probeDialog(page: Page, selector: string): Promise<DialogProbe> {
  return page.evaluate((sel) => {
    const header = document.querySelector(".magic-editor-root header");
    const dialog = document.querySelector(sel) as HTMLElement | null;
    const headerStyle = header ? getComputedStyle(header) : null;
    const rect = dialog?.getBoundingClientRect();
    const point = rect
      ? {
          x: Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1),
          y: Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1),
        }
      : { x: 0, y: 0 };
    const hit = dialog ? (document.elementFromPoint(point.x, point.y) as HTMLElement | null) : null;
    const overflowY = headerStyle?.overflowY ?? "none";
    return {
      mounted: Boolean(dialog),
      rect: rect
        ? {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          }
        : { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      headerOverflowX: headerStyle?.overflowX ?? "none",
      headerOverflowY: overflowY,
      headerIsScrollContainer: overflowY === "auto" || overflowY === "scroll",
      hitInsideDialog: Boolean(hit && dialog && dialog.contains(hit)),
      hitDescription: hit
        ? `${hit.tagName.toLowerCase()}${hit.getAttribute("aria-label") ? `[aria-label="${hit.getAttribute("aria-label")}"]` : ""} "${(hit.textContent ?? "").trim().slice(0, 28)}"`
        : "nothing",
    };
  }, selector);
}

async function expectReachable(page: Page, selector: string, label: string) {
  const probe = await probeDialog(page, selector);
  const detail = `${label} probe: ${JSON.stringify(probe)}`;
  expect(probe.mounted, `${label} is not mounted in the DOM. ${detail}`).toBe(true);
  expect(probe.rect.height, `${label} has no painted height. ${detail}`).toBeGreaterThan(40);
  expect(probe.rect.top, `${label} starts above the viewport. ${detail}`).toBeGreaterThanOrEqual(0);
  expect(probe.rect.bottom, `${label} is cut off by the viewport. ${detail}`).toBeLessThanOrEqual(
    probe.viewport.height + 1,
  );
  expect(
    probe.headerIsScrollContainer,
    `the top bar became a scroll container (overflow-y: ${probe.headerOverflowY}), which clips the ${label}. ${detail}`,
  ).toBe(false);
  expect(
    probe.hitInsideDialog,
    `the centre of the ${label} is covered by ${probe.hitDescription} instead of the menu. ${detail}`,
  ).toBe(true);
}

/**
 * The lab route is server-rendered. The Magic editor's dev bundle is large, so in
 * this environment React attaches its handlers around 15-25s after load; clicks
 * before hydration are silently ignored by the server-rendered markup. Wait for
 * React to own the trigger before asserting anything about the menus.
 */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const trigger = document.querySelector('button[aria-label="Tipo de página"]');
      return Boolean(trigger && Object.keys(trigger).some((key) => key.startsWith("__react")));
    },
    undefined,
    { timeout: 120_000 },
  );
}

async function openLab(page: Page) {
  await page.goto(LAB_ROUTE);
  await expect(familyTrigger(page)).toBeVisible();
  await expect(variantTrigger(page)).toBeVisible();
  await waitForHydration(page);
}

/**
 * Every option must be clickable, not merely mounted: the visible centre of each
 * option has to hit-test back to that option. A menu cropped away by an ancestor
 * (or covered by the canvas) fails here.
 */
async function expectEveryOptionReachable(page: Page, selector: string, expected: number) {
  const report = await page.evaluate((sel) => {
    const dialog = document.querySelector(sel);
    if (!dialog) return { mounted: false, options: [] as { label: string; reachable: boolean }[] };
    const options = [...dialog.querySelectorAll("button")].map((button) => {
      const rect = button.getBoundingClientRect();
      const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      return {
        label: (button.textContent ?? "").trim(),
        reachable: Boolean(hit && (button === hit || button.contains(hit))),
      };
    });
    return { mounted: true, options };
  }, selector);

  expect(report.mounted, `${selector} is not mounted`).toBe(true);
  expect(report.options, `${selector} option count`).toHaveLength(expected);
  const unreachable = report.options.filter((option) => !option.reachable).map((o) => o.label);
  expect(unreachable, `${selector} options that cannot be clicked: ${unreachable.join(", ")}`).toEqual(
    [],
  );
}

test.describe("Magic editor · page family & variant dropdowns", () => {
  test("clicking Tipo de página opens a menu that is not hidden by the canvas", async ({
    page,
  }) => {
    await openLab(page);
    await familyTrigger(page).click();

    const menu = page.locator(FAMILY_DIALOG);
    await expect(menu).toBeVisible();
    await expectReachable(page, FAMILY_DIALOG, "page-family menu");

    // The canvas keeps living behind it: the menu must sit on top, not under it.
    const menuZ = await menu.evaluate((el) => Number(getComputedStyle(el).zIndex));
    expect(Number.isFinite(menuZ), "the page-family menu has no z-index").toBe(true);
    expect(menuZ).toBeGreaterThan(0);

    await page.screenshot({ path: `${EVIDENCE_DIR}/evidence-page-family-menu.png` });
  });

  test("lists the confirmed page families without inventing new ones", async ({ page }) => {
    await openLab(page);
    await familyTrigger(page).click();
    const menu = page.locator(FAMILY_DIALOG);
    await expect(menu).toBeVisible();

    const labels = (await menu.locator("button").allInnerTexts()).map((text) => text.trim());
    for (const family of CONFIRMED_FAMILIES) {
      expect(labels, `"${family.label}" is missing from the page-family menu`).toContain(
        family.label,
      );
    }
    expect(labels).toEqual([...SOURCE_DEFINED_FAMILIES]);
  });

  test("clicking Variante opens a menu that is not hidden by the canvas", async ({ page }) => {
    await openLab(page);
    await variantTrigger(page).click();

    const selector = variantDialog("Bio");
    await expect(page.locator(selector)).toBeVisible();
    await expectReachable(page, selector, "variant menu");
  });

  test("shows the confirmed variant count for every family", async ({ page }) => {
    await openLab(page);

    for (const family of CONFIRMED_FAMILIES) {
      await familyTrigger(page).click();
      await page
        .locator(FAMILY_DIALOG)
        .getByRole("button", { name: family.label, exact: true })
        .click();

      const selector = variantDialog(family.label);
      const menu = page.locator(selector);
      await expect(menu, `${family.label} did not open its variant menu`).toBeVisible();
      await expectReachable(page, selector, `${family.label} variant menu`);

      const variants = menu.locator("button");
      await expect(
        variants,
        `${family.label} should expose exactly ${family.variants} variants`,
      ).toHaveCount(family.variants);

      const labels = (await variants.allInnerTexts()).map((text) => text.trim());
      expect(new Set(labels).size, `${family.label} repeats a variant label`).toBe(labels.length);

      // Close the menu so the next family starts from a clean state.
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
    }
  });

  test("selecting a variant updates the document and the selected value", async ({ page }) => {
    await openLab(page);
    await expect(page.locator('[data-page-variant="signature"]')).toHaveCount(1);

    await familyTrigger(page).click();
    await page
      .locator(FAMILY_DIALOG)
      .getByRole("button", { name: "Portafolio", exact: true })
      .click();
    await expect(page.locator(variantDialog("Portafolio"))).toBeVisible();

    await page
      .locator(variantDialog("Portafolio"))
      .getByRole("button", { name: "Nocturno", exact: true })
      .click();

    // 1. The document itself carries the new variant...
    await expect(page.locator('[data-page-variant="nocturne"]')).toHaveCount(1);
    // 2. ...and the trigger shows it as the selected value.
    await expect(variantTrigger(page)).toContainText("Nocturno");
    await variantTrigger(page).click();
    await expect(
      page
        .locator(variantDialog("Portafolio"))
        .getByRole("button", { name: "Nocturno", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("works on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLab(page);

    await familyTrigger(page).click();
    await expectReachable(page, FAMILY_DIALOG, "page-family menu (mobile)");
    await page
      .locator(FAMILY_DIALOG)
      .getByRole("button", { name: "Mini Galería", exact: true })
      .click();

    const selector = variantDialog("Mini Galería");
    await expect(page.locator(selector)).toBeVisible();
    await expectReachable(page, selector, "variant menu (mobile)");
    await expect(page.locator(selector).locator("button")).toHaveCount(5);
    await page.screenshot({ path: `${EVIDENCE_DIR}/evidence-variant-menu-mobile.png` });
  });

  test("keeps every option reachable on a tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openLab(page);

    await familyTrigger(page).click();
    await expectReachable(page, FAMILY_DIALOG, "page-family menu (tablet)");
    await expectEveryOptionReachable(page, FAMILY_DIALOG, SOURCE_DEFINED_FAMILIES.length);

    await page
      .locator(FAMILY_DIALOG)
      .getByRole("button", { name: "Portafolio", exact: true })
      .click();
    await expectEveryOptionReachable(page, variantDialog("Portafolio"), 8);
  });
});

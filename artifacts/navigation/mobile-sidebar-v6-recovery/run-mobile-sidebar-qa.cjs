const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const dir = "artifacts/navigation/mobile-sidebar-v6-recovery";
  fs.mkdirSync(`${dir}/screenshots`, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  const errors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      errors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  const goto = async (path) => {
    await page.goto(`http://127.0.0.1:4195${path}`, {
      timeout: 90000,
      waitUntil: "domcontentloaded",
    }).catch(() => {});
    await page.waitForTimeout(1500);
  };

  const state = async () =>
    page.evaluate(() => {
      const trigger = document.querySelector("[data-testid=mobile-sidebar-trigger]");
      const nav = document.querySelector("#premium-mobile-nav-drawer");
      const main = document.querySelector("main");
      const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
      return {
        hasTrigger: Boolean(trigger),
        expanded: trigger && trigger.getAttribute("aria-expanded"),
        hidden: nav && nav.getAttribute("aria-hidden"),
        transform: main ? getComputedStyle(main).transform : null,
        radius: main ? getComputedStyle(main).borderTopLeftRadius : null,
        mainInert: main ? main.inert : null,
        menuInert: nav ? nav.inert : null,
        bottomNav: Boolean(bottomNav),
        privateMenuText: nav ? nav.textContent : null,
        scrollY: window.scrollY,
      };
    });

  await goto("/");
  const publicHome = await state();

  await goto("/d/test-public");
  const publicD = await state();

  await goto("/editor");
  const closed = await state();
  await page.screenshot({ path: `${dir}/screenshots/closed-390.png`, fullPage: true });

  await page.mouse.move(2, 360);
  await page.mouse.down();
  await page.mouse.move(82, 362, { steps: 6 });
  await page.waitForTimeout(120);
  const drag25 = await state();
  await page.screenshot({ path: `${dir}/screenshots/drag-25-390.png`, fullPage: true });
  await page.mouse.up();
  await page.waitForTimeout(450);
  const snapClosed = await state();

  await page.mouse.move(2, 360);
  await page.mouse.down();
  await page.mouse.move(152, 361, { steps: 8 });
  await page.waitForTimeout(120);
  const drag50 = await state();
  await page.screenshot({ path: `${dir}/screenshots/drag-50-390.png`, fullPage: true });
  await page.mouse.up();
  await page.waitForTimeout(550);
  const snapOpen = await state();
  await page.screenshot({ path: `${dir}/screenshots/open-390.png`, fullPage: true });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(450);
  const escapeClosed = await state();

  await page.mouse.move(2, 360);
  await page.mouse.down();
  await page.mouse.move(6, 520, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const vertical = await state();

  await page.getByTestId("mobile-sidebar-trigger").click();
  await page.waitForTimeout(450);
  await page.locator("button[aria-label='Cerrar navegación']").click();
  await page.waitForTimeout(450);
  const scrimClosed = await state();

  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId("mobile-sidebar-trigger").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  const repeatClosed = await state();

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await goto("/editor");
    await page.getByTestId("mobile-sidebar-trigger").click();
    await page.waitForTimeout(450);
    await page.screenshot({
      path: `${dir}/screenshots/open-${viewport.width}.png`,
      fullPage: true,
    });
  }

  const touchResults = {
    drag25,
    snapClosed,
    drag50,
    snapOpen,
    escapeClosed,
    vertical,
    scrimClosed,
    repeatClosed,
  };
  const routeResults = { publicHome, publicD, privateEditor: closed };
  const result = { routeResults, touchResults, errors };

  fs.writeFileSync(`${dir}/touch-gesture-results.json`, JSON.stringify(touchResults, null, 2));
  fs.writeFileSync(`${dir}/route-isolation-results.json`, JSON.stringify(routeResults, null, 2));
  fs.writeFileSync(`${dir}/playwright-results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

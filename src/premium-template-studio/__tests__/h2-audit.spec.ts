import { test, expect } from "@playwright/test";
import { createDemoConfig } from "../templates/definitions";

function createViewportContractConfig() {
  const config = createDemoConfig();
  const sourceBlock = config.blocks[0]!;
  const buttons = Array.from({ length: 6 }, (_, index) => ({
    id: `viewport-button-${index}`,
    label: `Button ${index + 1}`,
    url: `https://example.com/${index + 1}`,
  }));

  config.theme.background = {
    ...config.theme.background,
    type: "image",
    imageUrl: "https://example.com/background.jpg",
    blur: 8,
  };
  config.theme.texture = { preset: "grain", opacity: 0.18, scale: 16 };
  config.profile.avatar.align = "right";
  config.blocks = [
    {
      ...sourceBlock,
      id: "viewport-buttons",
      type: "buttonGroup",
      variant: "row",
      content: { items: buttons },
      layout: { ...sourceBlock.layout, columns: 2 },
      style: { ...sourceBlock.style, frame: "luxury" },
    },
    {
      ...sourceBlock,
      id: "viewport-media",
      type: "links",
      variant: "stacked",
      content: {
        items: [
          {
            id: "viewport-media-left",
            label: "Left media",
            url: "https://example.com/left",
            presentation: "media-card",
            mediaPosition: "left",
            imageUrl: "https://example.com/left.jpg",
          },
          {
            id: "viewport-media-right",
            label: "Right media",
            url: "https://example.com/right",
            presentation: "media-card",
            mediaPosition: "right",
            imageUrl: "https://example.com/right.jpg",
          },
        ],
      },
      style: { ...sourceBlock.style, frame: "double" },
    },
    {
      ...sourceBlock,
      id: "viewport-sticky",
      type: "text",
      variant: "default",
      content: { body: "Sticky contract" },
      layout: { ...sourceBlock.layout, sticky: { enabled: true, top: 12 } },
    },
    {
      ...sourceBlock,
      id: "viewport-floating",
      type: "text",
      variant: "default",
      content: { body: "Floating contract" },
      layout: {
        ...sourceBlock.layout,
        floating: { enabled: true, anchor: "bottom-right", offset: 16 },
      },
    },
  ];

  return config;
}

for (const width of [390, 320]) {
  test(`Power Editor remains usable at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    const config = createViewportContractConfig();
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((serializedConfig) => {
      window.localStorage.setItem("pts:published:v2-contract", JSON.stringify(serializedConfig));
    }, config);
    await page.goto("http://127.0.0.1:8085/p/v2-contract");
    await page.locator(".pts-page").waitFor();

    await expect(page.locator('[data-button-columns="2"]')).toBeVisible();
    await expect(page.locator('[data-media-position="left"]')).toBeVisible();
    await expect(page.locator('[data-media-position="right"]')).toBeVisible();

    const result = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".pts-page");
      const interactive = Array.from(document.querySelectorAll<HTMLElement>("a, button"));
      const visibleInteractive = interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        rootOverflowX: root ? getComputedStyle(root).overflowX : "",
        stickyCount: Array.from(document.querySelectorAll<HTMLElement>("*")).filter(
          (element) => getComputedStyle(element).position === "sticky",
        ).length,
        floatingCount: Array.from(document.querySelectorAll<HTMLElement>("*")).filter(
          (element) => getComputedStyle(element).position === "fixed",
        ).length,
        hasFrame: Array.from(document.querySelectorAll<HTMLElement>("section")).some(
          (section) => getComputedStyle(section).borderStyle !== "none",
        ),
        hasTexture: Array.from(document.querySelectorAll<HTMLElement>("[aria-hidden]")).some(
          (layer) => getComputedStyle(layer).backgroundImage.includes("data:image/svg+xml"),
        ),
        clippedInteractive: visibleInteractive.some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < 0 || rect.right > window.innerWidth || rect.top < 0;
        }),
      };
    });

    expect(result.documentWidth).toBeLessThanOrEqual(result.viewportWidth);
    expect(result.rootOverflowX).toBe("clip");
    expect(result.stickyCount).toBeGreaterThan(0);
    expect(result.floatingCount).toBeGreaterThan(0);
    expect(result.hasFrame).toBe(true);
    expect(result.hasTexture).toBe(true);
    expect(result.clippedInteractive).toBe(false);
  });
}

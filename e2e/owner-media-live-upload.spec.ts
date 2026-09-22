import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { qaEnv } from "./helpers/phase6-qa";

function qaImage(role: string): string {
  // Use the repo's own PNG brand asset as the real local QA file.
  const path = resolve("public/brand-assets/cripqer-mark.png");
  expect(existsSync(path), `missing QA image ${path}`).toBe(true);
  void role;
  return path;
}

async function loginToEditor(page: Page): Promise<void> {
  await page.goto("/editor");
  const email = page.getByLabel("Correo electrónico");
  // Either the login form or an already-authenticated editor surface.
  await email
    .or(page.getByRole("button", { name: /Guardar|Publicar|Exportar/ }).first())
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  if (await email.isVisible().catch(() => false)) {
    await email.fill(qaEnv("QA_EMAIL"));
    await page.getByLabel("Contraseña").fill(qaEnv("QA_PASSWORD"));
    await page.getByRole("button", { name: "Entrar al editor" }).click();
  }
  // Authenticated editor indicator (Power Editor shows "Guardar"/"Publicar").
  await page
    .getByRole("button", { name: /Guardar|Publicar|Exportar/ })
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
}

async function reachImagesStep(page: Page): Promise<void> {
  await page.goto("/onboarding-test");
  // The Generation Inspector floating "Diagnóstico" button overlaps the footer
  // CTA on this QA route; hide it so real clicks reach "Continuar".
  await page.addStyleTag({ content: ".gi-floating-btn { display: none !important; }" });
  // Gate resolves to the single QA profile.
  await expect(page.getByText(/Cuéntanos sobre tu negocio|Tu negocio/).first()).toBeVisible({
    timeout: 60_000,
  });

  await page.getByPlaceholder("Ej. Estudio Norte").fill("Estudio Smoke");
  await page.getByPlaceholder("Ej. Fotografía de bodas").fill("Belleza");
  await page.getByRole("radio", { name: /Negocio local/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: /Quiero que me escriban/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir servicio" }).click();
  await page.getByLabel("Servicio nombre").fill("Sesión inicial");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: /WhatsApp/ }).click();
  await page.getByPlaceholder("+56 9 1234 5678").fill("+56912345678");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText(/Tu negocio debe sentirse tuyo/)).toBeVisible({ timeout: 30_000 });
}

test("owner cover: real browser upload reaches Supabase and returns a durable URL", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await loginToEditor(page);

  await reachImagesStep(page);

  const coverCard = page.locator(".premium-onboarding__media-card").filter({ hasText: "Portada" });
  await expect(coverCard).toBeVisible();

  // setInputFiles drives the <input type=file> directly (no fileChooser dialog).
  await coverCard.locator('input[type="file"]').setInputFiles(qaImage("cover"));

  // Real upload state, then the durable reference is rendered as an <img>.
  await expect(page.getByText("Imagen subida")).toBeVisible({ timeout: 60_000 });
  const coverImg = coverCard.locator("img");
  await expect(coverImg).toBeVisible({ timeout: 60_000 });
  const src = (await coverImg.getAttribute("src")) ?? "";
  expect(src.startsWith("blob:")).toBe(false);
  expect(src.startsWith("data:")).toBe(false);
  expect(src).toContain("/storage/v1/object/public/");
  await page.screenshot({
    path: "cripqer-owner-media-live-upload/cover-uploaded.png",
    fullPage: false,
  });
  console.log(`[OWNER_MEDIA] cover_url=${src}`);
});

test("failure smoke: unsupported file type does not create a fake reference", async ({ page }) => {
  test.setTimeout(240_000);
  await loginToEditor(page);
  await reachImagesStep(page);

  const coverCard = page.locator(".premium-onboarding__media-card").filter({ hasText: "Portada" });
  await coverCard.locator('input[type="file"]').setInputFiles({
    name: "not-an-image.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a", "binary"),
  });

  // Truthful failure UI; never a fake "uploaded" state.
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Imagen subida")).toHaveCount(0);
  // The cover card still has no rendered durable image.
  await expect(coverCard.locator("img")).toHaveCount(0);
  console.log("[OWNER_MEDIA] failure_smoke=truthful-error no-fake-reference");
});

async function openCatalogContentStep(page: Page): Promise<void> {
  await page.goto("/onboarding-test");
  await page.addStyleTag({ content: ".gi-floating-btn { display: none !important; }" });
  await expect(page.getByText(/Cuéntanos sobre tu negocio|Tu negocio/).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByPlaceholder("Ej. Estudio Norte").fill("Norte Concept");
  await page.getByPlaceholder("Ej. Fotografía de bodas").fill("Tienda de ropa");
  await page.getByRole("radio", { name: /Tienda o productos/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Quiero mostrar mis productos/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/¿Qué productos quieres mostrar?/)).toBeVisible({ timeout: 30_000 });
}

test("product media: real upload reaches the catalog product", async ({ page }) => {
  test.setTimeout(240_000);
  await loginToEditor(page);
  await openCatalogContentStep(page);

  await page.getByRole("button", { name: "Añadir producto" }).click();
  await page.getByLabel("Producto nombre").fill("Chaqueta Urbana");
  await page.getByLabel("Producto precio opcional").fill("$49.990");
  await page.getByLabel("Producto enlace opcional").fill("https://store.example/jacket");

  const productCard = page.locator(".premium-offer-card").first();
  await productCard.locator('input[type="file"]').setInputFiles(qaImage("product"));
  await expect(productCard.getByText("Imagen subida")).toBeVisible({ timeout: 60_000 });
  const img = productCard.locator("img");
  await expect(img).toBeVisible({ timeout: 60_000 });
  const src = (await img.getAttribute("src")) ?? "";
  expect(src.startsWith("blob:")).toBe(false);
  expect(src.startsWith("data:")).toBe(false);
  expect(src).toContain("/storage/v1/object/public/");
  await page.screenshot({
    path: "cripqer-owner-media-live-upload/product-uploaded.png",
    fullPage: false,
  });
  console.log(`[OWNER_MEDIA] product_url=${src}`);
});

async function openPortfolioContentStep(page: Page): Promise<void> {
  await page.goto("/onboarding-test");
  await page.addStyleTag({ content: ".gi-floating-btn { display: none !important; }" });
  await expect(page.getByText(/Cuéntanos sobre tu negocio|Tu negocio/).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByPlaceholder("Ej. Estudio Norte").fill("Luz Norte");
  await page.getByPlaceholder("Ej. Fotografía de bodas").fill("Fotografía");
  await page.getByRole("radio", { name: /Creador o artista/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Quiero mostrar mi trabajo/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/¿Qué trabajos quieres mostrar?/)).toBeVisible({ timeout: 30_000 });
}

test("portfolio media: real upload reaches the portfolio item", async ({ page }) => {
  test.setTimeout(240_000);
  await loginToEditor(page);
  await openPortfolioContentStep(page);

  await page.getByRole("button", { name: "Añadir trabajo" }).click();
  await page.getByLabel("Trabajo nombre").fill("Editorial Nocturna");
  await page.getByLabel("Trabajo enlace opcional").fill("https://luz.example/night");

  const portfolioCard = page.locator(".premium-offer-card").first();
  await portfolioCard.locator('input[type="file"]').setInputFiles(qaImage("portfolio"));
  await expect(portfolioCard.getByText("Imagen subida")).toBeVisible({ timeout: 60_000 });
  const img = portfolioCard.locator("img");
  await expect(img).toBeVisible({ timeout: 60_000 });
  const src = (await img.getAttribute("src")) ?? "";
  expect(src.startsWith("blob:")).toBe(false);
  expect(src.startsWith("data:")).toBe(false);
  expect(src).toContain("/storage/v1/object/public/");
  await page.screenshot({
    path: "cripqer-owner-media-live-upload/portfolio-uploaded.png",
    fullPage: false,
  });
  console.log(`[OWNER_MEDIA] portfolio_url=${src}`);
});

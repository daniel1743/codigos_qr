/**
 * PAGES_7B — runtime verification for the new canonical PageTypes
 * (services / catalog / portfolio) plus QR, alias, mobile, Bio→child and
 * regression checks. Part 1/6: environment, constants, helpers, sign-in.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const BASE = "http://localhost:8080";
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = {
  apikey: sr,
  Authorization: "Bearer " + sr,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const STAMP = Date.now();
const COVER = "https://picsum.photos/seed/cripqer-p7b-cover/1200/800";
const IMG = (seed) => `https://picsum.photos/seed/cripqer-p7b-${seed}/800/600`;
const WHATSAPP = "+56912345678";
const PROFILE_PUBLIC_ID = "sY9wHGm";
const EXISTING_CHILD_PUBLIC_ID = "yfLEdka";

const OBJECTIVES = [
  {
    key: "services",
    index: 0,
    title: `QA PAGES_7B Servicios ${STAMP}`,
    button: "Generar servicios",
    cover: "",
    cta: { name: "WhatsApp", value: WHATSAPP },
    items: [
      { title: "Corte clásico", description: "Máquina y tijera", price: "$8.000" },
      { title: "Perfilado de barba" },
    ],
  },
  {
    key: "catalog",
    index: 1,
    title: `QA PAGES_7B Catálogo ${STAMP}`,
    button: "Generar catálogo",
    cover: COVER,
    cta: { name: "Sitio web", value: "https://qa-cripqer.example/catalogo" },
    items: [
      {
        title: "Cinturón de cuero",
        price: "$19.990",
        imageUrl: IMG("cinturon"),
        url: "https://qa-cripqer.example/cinturon",
      },
      { title: "Billetera de cuero", price: "$24.990", imageUrl: IMG("billetera") },
    ],
  },
  {
    key: "portfolio",
    index: 2,
    title: `QA PAGES_7B Portafolio ${STAMP}`,
    button: "Generar portafolio",
    cover: COVER,
    cta: { name: "WhatsApp", value: WHATSAPP },
    items: [
      {
        title: "Boda en Valparaíso",
        description: "Reportaje completo",
        imageUrl: IMG("boda"),
        url: "https://qa-cripqer.example/boda",
      },
    ],
  },
];

const CONTENT_EXPECTATIONS = {
  services: { must_include: ["Corte clásico", "Perfilado de barba", "$8.000"] },
  catalog: { must_include: ["Cinturón de cuero", "$19.990", "Billetera de cuero"] },
  portfolio: { must_include: ["Boda en Valparaíso"] },
};

async function rest(path, options = {}) {
  const response = await fetch(base + "/rest/v1" + path, { headers: srH, ...options });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

async function pageByPublicId(publicId) {
  return (await rest(`/pages?select=*&public_id=eq.${publicId}`)).payload?.[0] ?? null;
}

async function profileByPublicId(publicId) {
  const select = "id,public_id,slug,published_revision,template_config";
  return (await rest(`/profiles?select=${select}&public_id=eq.${publicId}`)).payload?.[0] ?? null;
}

function digest(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.waitForSelector("#email", { timeout: 30000 });
  } catch {}
  if (await page.locator("#email").isVisible().catch(() => false)) {
    await page.locator("#email").fill(env.QA_EMAIL);
    await page.locator("#password").fill(env.QA_PASSWORD);
    await page.getByRole("button", { name: "Entrar al editor" }).click();
  }
  let authed = false;
  try {
    await page.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 });
    authed = true;
  } catch {}
  await page.close();
  return authed;
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const QA_PROFILE_ALIAS = "sy9whgm";
const QA_PROFILE_SLUG = "qa-dual-editor-test";
const QA_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
const QA_BASELINE = {
  display_name: "QA Dual Editor Test",
  profession: "Jardinero",
  bio: "Perfil temporal para pruebas del editor dual.",
};
const ONBOARDING_STORAGE_KEY = "cripqer.onboarding.draft.v2";

// JSON is intentionally opaque in this persistence harness.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonRecord = Record<string, any>;
type BrowserSupabase = { url: string; anonKey: string };
type BrowserRequest = {
  path: string;
  method?: "GET" | "PATCH" | "DELETE";
  body?: unknown;
};

function loadEnvFile(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]),
    );
  } catch {
    return {};
  }
}

function env(name: string): string | undefined {
  return process.env[name] || loadEnvFile()[name];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertRecord(value: unknown, label: string): asserts value is JsonRecord {
  expect(value, label).toBeTruthy();
  expect(typeof value, label).toBe("object");
  expect(Array.isArray(value), label).toBe(false);
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableJson(nested)]),
    );
  }
  return value;
}

async function browserSupabaseRequest(
  page: Page,
  supabase: BrowserSupabase,
  request: BrowserRequest,
): Promise<unknown> {
  return page.evaluate(
    async ({ supabase, request }) => {
      function parseSessionValue(raw: string): { access_token?: string } | null {
        const candidates = [raw, decodeURIComponent(raw)];
        if (raw.startsWith("base64-")) candidates.push(raw.slice("base64-".length));
        for (const candidate of [...candidates]) {
          try {
            const decoded = atob(candidate.replace(/-/g, "+").replace(/_/g, "/"));
            candidates.push(decoded);
          } catch {
            // The value may already be JSON.
          }
        }
        for (const candidate of candidates) {
          try {
            const parsed = JSON.parse(candidate) as { access_token?: string };
            if (parsed.access_token) return parsed;
          } catch {
            // Try the next storage representation.
          }
        }
        return null;
      }

      function accessToken(): string | null {
        const storageValues: string[] = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key?.includes("auth-token")) {
            const value = localStorage.getItem(key);
            if (value) storageValues.push(value);
          }
        }
        for (const value of storageValues) {
          const session = parseSessionValue(value);
          if (session?.access_token) return session.access_token;
        }

        const cookies = document.cookie
          .split("; ")
          .map((item) => item.split("="))
          .filter((parts): parts is [string, string] => parts.length >= 2)
          .filter(([name]) => name.includes("auth-token"));
        const groups = new Map<string, string[]>();
        for (const [name, value] of cookies) {
          const baseName = name.replace(/\.\d+$/, "");
          const values = groups.get(baseName) ?? [];
          values.push(`${name}\u0000${value}`);
          groups.set(baseName, values);
        }
        for (const values of groups.values()) {
          const combined = values
            .sort()
            .map((entry) => entry.slice(entry.indexOf("\u0000") + 1))
            .join("");
          const session = parseSessionValue(combined);
          if (session?.access_token) return session.access_token;
        }
        return null;
      }

      const token = accessToken();
      if (!token) throw new Error("BLOCKED: authenticated browser session token unavailable.");
      const headers: Record<string, string> = {
        apikey: supabase.anonKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };
      const init: RequestInit = { method: request.method ?? "GET", headers };
      if (request.body !== undefined) {
        headers["Content-Type"] = "application/json";
        headers.Prefer = "return=representation";
        init.body = JSON.stringify(request.body);
      }

      let response: Response;
      try {
        response = await fetch(`${supabase.url.replace(/\/$/, "")}/${request.path}`, init);
      } catch (error) {
        const message = error instanceof Error ? error.message : "browser fetch failed";
        throw new Error(`BLOCKED: browser Supabase request failed (${message}).`);
      }
      const raw = await response.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }
      if (!response.ok) {
        const detail =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message?: unknown }).message)
            : `HTTP ${response.status}`;
        throw new Error(`Browser Supabase request failed (${detail}).`);
      }
      return data;
    },
    { supabase, request },
  );
}

async function readOwnedProfiles(
  page: Page,
  supabase: BrowserSupabase,
  userId: string,
): Promise<JsonRecord[]> {
  const data = await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profiles?select=id,user_id,slug,display_name,profession,bio,template_config&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
  });
  if (!Array.isArray(data)) throw new Error("QA profile set response was not an array.");
  return data as JsonRecord[];
}

async function readQaProfile(
  page: Page,
  supabase: BrowserSupabase,
  userId: string,
): Promise<JsonRecord> {
  const profiles = await readOwnedProfiles(page, supabase, userId);
  const matches = profiles.filter((profile) => profile.slug === QA_PROFILE_SLUG);
  if (matches.length !== 1) {
    throw new Error(
      `BLOCKED: ${QA_PROFILE_ALIAS} lookup expected one QA profile; found ${matches.length}.`,
    );
  }
  const profile = matches[0];
  assertRecord(profile, "Authenticated QA profile");
  expect(profile.user_id).toBe(userId);
  expect(userId).toBe(QA_USER_ID);
  return profile;
}

async function readLinks(
  page: Page,
  supabase: BrowserSupabase,
  profileId: string,
): Promise<JsonRecord[]> {
  const data = await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profile_links?select=id,profile_id,platform,label,url,enabled,sort_order&profile_id=eq.${encodeURIComponent(profileId)}&order=sort_order.asc`,
  });
  if (!Array.isArray(data)) throw new Error("QA profile links response was not an array.");
  return data as JsonRecord[];
}

async function deleteLink(page: Page, supabase: BrowserSupabase, linkId: string): Promise<void> {
  await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profile_links?id=eq.${encodeURIComponent(linkId)}`,
    method: "DELETE",
  });
}

async function restoreQaProfile(
  page: Page,
  supabase: BrowserSupabase,
  profileId: string,
  userId: string,
  baseline: JsonRecord,
  baselineLinks: JsonRecord[],
): Promise<void> {
  await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(userId)}`,
    method: "PATCH",
    body: {
      display_name: baseline.display_name,
      profession: baseline.profession,
      bio: baseline.bio,
      template_config: baseline.template_config,
    },
  });
  const currentLinks = await readLinks(page, supabase, profileId);
  const baselineIds = new Set(baselineLinks.map((link) => String(link.id)));
  for (const link of currentLinks) {
    if (!baselineIds.has(String(link.id))) await deleteLink(page, supabase, String(link.id));
  }
  const restored = await readQaProfile(page, supabase, userId);
  expect(restored.display_name).toBe(baseline.display_name);
  expect(restored.profession).toBe(baseline.profession);
  expect(restored.bio).toBe(baseline.bio);
  expect(stableJson(restored.template_config)).toEqual(stableJson(baseline.template_config));
  expect((await readLinks(page, supabase, profileId)).map((link) => link.id)).toEqual(
    baselineLinks.map((link) => link.id),
  );
}

async function startOnboarding(page: Page): Promise<void> {
  console.log("[Phase5] onboarding:start");
  await page.evaluate((key) => window.sessionStorage.removeItem(key), ONBOARDING_STORAGE_KEY);
  await page.goto("/onboarding-preview");
  await page.waitForFunction(() => Boolean(window.__TSS_START_OPTIONS__), null, {
    timeout: 60_000,
  });
  // The dev SSR stream can expose the first screen before React has attached
  // handlers; wait for the hydrated route before filling controlled fields.
  await page.waitForTimeout(5_000);
  await expect(page.getByText(/Onboarding V2 · Paso 1 de 8/)).toBeVisible();
}

async function continueOnboarding(page: Page): Promise<void> {
  const progress = page.getByRole("progressbar", { name: "Progreso del onboarding V2" });
  const current = Number(await progress.getAttribute("aria-valuenow"));
  const target = String(current + 1);
  await expect
    .poll(
      async () => {
        await page
          .locator("footer")
          .getByRole("button", { name: "Continuar", exact: true })
          .click();
        return progress.getAttribute("aria-valuenow");
      },
      { timeout: 30_000, intervals: [250, 500, 1_000] },
    )
    .toBe(target);
}

async function completeSimpleOnboarding(page: Page): Promise<void> {
  await startOnboarding(page);
  await page.getByLabel("Nombre o nombre de marca").fill("Jardinería Verde");
  await page.getByLabel("Actividad o profesión").fill("Jardinero");
  await page.getByLabel("Descripción breve").fill("Cuido jardines y espacios verdes.");
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step2");
  console.log(`[Phase5] business-options=${await page.getByRole("radio").allTextContents()}`);
  await page.getByRole("radio", { name: "Negocio local", exact: true }).click();
  console.log("[Phase5] onboarding:simple-business-selected");
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step3");
  await page.getByRole("radio", { name: "Recibir mensajes por WhatsApp", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step4");
  await page.getByRole("radio", { name: /Que Cripqer decida/ }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step5");
  await page.getByRole("button", { name: "Enlaces importantes", exact: true }).click();
  await page.getByRole("button", { name: "Redes sociales", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step6");
  await page.getByRole("radio", { name: /WhatsApp/ }).click();
  await page.getByLabel("Destino de la acción principal").fill("+56912345678");
  await page.getByLabel("Tipo de acción secundaria").selectOption("follow");
  await page.getByLabel("Destino de acción secundaria").fill("@jardineriaverde");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:simple-step7");
  await page.getByRole("radio", { name: /Prefiero algo con poco material/ }).click();
  await continueOnboarding(page);
  await page.getByRole("radio", { name: /Sencilla/ }).click();
  console.log("[Phase5] onboarding:simple-review");
  await expect(
    page.getByRole("button", { name: "Guardar mis respuestas", exact: true }),
  ).toBeVisible();
}

async function completeRichOnboarding(page: Page): Promise<void> {
  await startOnboarding(page);
  await page.getByLabel("Nombre o nombre de marca").fill("Clínica Vet Vida");
  await page.getByLabel("Actividad o profesión").fill("Veterinaria");
  await page
    .getByLabel("Descripción breve")
    .fill("Atención veterinaria cercana para cada etapa de tu mascota.");
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step2");
  await page.getByRole("radio", { name: "Servicios profesionales", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step3");
  await page.getByRole("radio", { name: "Recibir reservas o citas", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step4");
  await page.getByRole("radio", { name: /Profesional/ }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step5");
  for (const label of [
    "Servicios",
    "Equipo",
    "Galería de fotos",
    "Testimonios",
    "Reservas o agenda",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step6");
  await page.getByRole("radio", { name: /Reservar/ }).click();
  await page
    .getByLabel("Destino de la acción principal")
    .fill("https://agenda.vetvida.example/reservas");
  await page.getByLabel("Tipo de acción secundaria").selectOption("whatsapp");
  await page.getByLabel("Destino de acción secundaria").fill("+56987654321");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await continueOnboarding(page);
  console.log("[Phase5] onboarding:rich-step7");
  await page.getByRole("radio", { name: /Tengo mis propias fotos o videos/ }).click();
  await page.getByLabel("Tengo fotos propias").check();
  await page.getByLabel("Tengo material para portafolio o galería").check();
  await continueOnboarding(page);
  await page.getByRole("radio", { name: /Completa/ }).click();
  console.log("[Phase5] onboarding:rich-review");
  await expect(
    page.getByRole("button", { name: "Guardar mis respuestas", exact: true }),
  ).toBeVisible();
}

async function saveOnboardingAndExpectBasic(page: Page, profileId: string): Promise<void> {
  console.log("[Phase5] onboarding:submit");
  await page
    .getByRole("button", { name: "Guardar mis respuestas", exact: true })
    .evaluate((button) => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  await expect(page.getByRole("status")).toContainText(/Generando|Guardando|Perfil persistido/, {
    timeout: 10_000,
  });
  await expect(page).toHaveURL(new RegExp(`/editor\\?profileId=${profileId}`), { timeout: 45_000 });
  console.log("[Phase5] onboarding:basic-landed");
  await openMobileProfilePanel(page);
  await expect(page.locator("#display_name:visible")).toBeVisible({ timeout: 30_000 });
}

async function openMobileProfilePanel(page: Page): Promise<void> {
  if ((await page.evaluate(() => window.innerWidth)) >= 768) return;
  await page.waitForFunction(() => Boolean(window.__TSS_START_OPTIONS__), null, {
    timeout: 60_000,
  });
  await page.waitForTimeout(5_000);
  const mobileNav = page.getByRole("navigation", { name: "Navegación móvil del editor básico" });
  await expect(mobileNav).toBeVisible({ timeout: 30_000 });
  await mobileNav.getByRole("button", { name: "Perfil", exact: true }).click();
}

test("executes isolated Phase 5 Onboarding V2 -> Basic Editor handoff", async ({ page }) => {
  const supabaseUrl = env("VITE_SUPABASE_URL");
  const supabaseAnonKey = env("VITE_SUPABASE_ANON_KEY");
  const qaEmail = env("QA_EMAIL");
  const qaPassword = env("QA_PASSWORD");
  test.skip(
    !supabaseUrl || !supabaseAnonKey || !qaEmail || !qaPassword,
    "BLOCKED: browser QA variables are incomplete; credentials are never printed or committed.",
  );
  const supabase: BrowserSupabase = { url: supabaseUrl!, anonKey: supabaseAnonKey! };
  let userId = "";
  let profileId = "";
  let baseline: JsonRecord | null = null;
  let baselineLinks: JsonRecord[] = [];

  try {
    page.on("pageerror", (error) => console.log(`[Phase5] pageerror=${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") console.log(`[Phase5] console-error=${message.text()}`);
    });
    page.on("requestfailed", (request) => {
      console.log(`[Phase5] request-failed=${request.url()} ${request.failure()?.errorText ?? ""}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().includes("localhost:8080")) {
        console.log(`[Phase5] response-error=${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/editor");
    const loginForm = page.getByLabel("Correo electrónico");
    const profileNameField = page.getByLabel("Nombre para mostrar");
    await expect(loginForm.or(profileNameField)).toBeVisible({ timeout: 45_000 });
    if (await loginForm.isVisible()) {
      await loginForm.fill(qaEmail!);
      await page.getByLabel("Contraseña").fill(qaPassword!);
      await page.getByRole("button", { name: "Entrar al editor" }).click();
    }
    await openMobileProfilePanel(page);
    await expect(page.locator("#display_name:visible")).toBeVisible({ timeout: 30_000 });
    const userData = await browserSupabaseRequest(page, supabase, { path: "auth/v1/user" });
    assertRecord(userData, "authenticated browser user");
    userId = String(userData.id);
    expect(userId).toBe(QA_USER_ID);
    console.log("[Phase5] auth:pass");
    const beforeProfiles = await readOwnedProfiles(page, supabase, userId);
    expect(beforeProfiles).toHaveLength(1);
    baseline = clone(await readQaProfile(page, supabase, userId));
    expect(baseline.display_name).toBe(QA_BASELINE.display_name);
    expect(baseline.profession).toBe(QA_BASELINE.profession);
    expect(baseline.bio).toBe(QA_BASELINE.bio);
    profileId = String(baseline.id);
    baselineLinks = clone(await readLinks(page, supabase, profileId));
    console.log(
      `[Phase5] baseline:captured profiles=${beforeProfiles.length} links=${baselineLinks.length}`,
    );

    const failureRoute = `${supabase.url.replace(/\/$/, "")}/rest/v1/rpc/set_profile_canonical_editor_config`;
    const failCanonicalPersistence = async (route: import("@playwright/test").Route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"message":"QA forced failure"}',
      });
    };
    await page.route(failureRoute, failCanonicalPersistence);
    console.log("[Phase5] failure:route-installed");
    await completeSimpleOnboarding(page);
    await page.getByRole("button", { name: "Guardar mis respuestas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No pudimos completar tu página" })).toBeVisible(
      {
        timeout: 30_000,
      },
    );
    await expect(page.getByRole("status")).toContainText("Canonical persistence failed.");
    await expect(page).toHaveURL(/\/onboarding-preview/);
    await expect(page.getByRole("button", { name: "Abrir Basic Editor", exact: true })).toHaveCount(
      0,
    );
    expect((await readOwnedProfiles(page, supabase, userId)).map((profile) => profile.id)).toEqual([
      profileId,
    ]);
    const afterFailure = await readQaProfile(page, supabase, userId);
    expect(stableJson(afterFailure.template_config)).toEqual(stableJson(baseline.template_config));
    await page.unroute(failureRoute, failCanonicalPersistence);

    await completeSimpleOnboarding(page);
    await saveOnboardingAndExpectBasic(page, profileId);
    await expect(page.locator("#display_name:visible")).toHaveValue("Jardinería Verde");
    await expect(page.locator("#profession:visible")).toHaveValue("Jardinero");
    await expect(page.locator("#bio:visible")).toHaveValue("Cuido jardines y espacios verdes.");
    const simpleProfile = await readQaProfile(page, supabase, userId);
    expect(simpleProfile.id).toBe(profileId);
    expect(simpleProfile.template_config?.schemaVersion).toBe(1);
    assertRecord(simpleProfile.template_config?.editorConfig, "simple handoff editorConfig");
    const simpleCanonicalBeforeBasic = clone(simpleProfile.template_config);
    const simpleLinks = await readLinks(page, supabase, profileId);
    expect(simpleLinks.map((link) => link.url)).toEqual(
      expect.arrayContaining([
        "https://wa.me/56912345678",
        "https://www.instagram.com/jardineriaverde/",
      ]),
    );
    const basicProfilesAfterLanding = await readOwnedProfiles(page, supabase, userId);
    expect(basicProfilesAfterLanding.map((profile) => profile.id)).toEqual([profileId]);

    await page.locator("#bio:visible").fill("Cambio Basic después de Engine V2.");
    await page.getByRole("button", { name: "Guardar borrador", exact: true }).first().click();
    await expect(page.getByText("Borrador guardado").last()).toBeVisible({ timeout: 15_000 });
    const simpleAfterBasic = await readQaProfile(page, supabase, userId);
    expect(simpleAfterBasic.bio).toBe("Cambio Basic después de Engine V2.");
    expect(stableJson(simpleAfterBasic.template_config)).toEqual(
      stableJson(simpleCanonicalBeforeBasic),
    );
    await page.reload();
    await openMobileProfilePanel(page);
    await expect(page.locator("#bio:visible")).toHaveValue("Cambio Basic después de Engine V2.");
    const simpleAfterReload = await readQaProfile(page, supabase, userId);
    expect(stableJson(simpleAfterReload.template_config)).toEqual(
      stableJson(simpleCanonicalBeforeBasic),
    );

    await page.goBack();
    await expect(page).toHaveURL(/\/onboarding-preview/);
    await expect(page.getByText(/Onboarding V2 · Paso 1 de 8/)).toBeVisible();
    expect(
      await page.getByRole("button", { name: "Guardar mis respuestas", exact: true }).count(),
    ).toBe(0);

    await page.goForward();
    await expect(page).toHaveURL(/\/editor\?profileId=/);
    await openMobileProfilePanel(page);
    await expect(page.locator("#display_name:visible")).toBeVisible({ timeout: 30_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/onboarding-preview/);
    await expect(page.getByText(/Onboarding V2 · Paso 1 de 8/)).toBeVisible();

    await completeRichOnboarding(page);
    await saveOnboardingAndExpectBasic(page, profileId);
    await expect(page.locator("#display_name:visible")).toHaveValue("Clínica Vet Vida");
    await expect(page.locator("#profession:visible")).toHaveValue("Veterinaria");
    await expect(page.locator("#bio:visible")).toHaveValue(
      "Atención veterinaria cercana para cada etapa de tu mascota.",
    );
    const richProfile = await readQaProfile(page, supabase, userId);
    expect(richProfile.id).toBe(profileId);
    expect(richProfile.template_config?.schemaVersion).toBe(1);
    assertRecord(richProfile.template_config?.editorConfig, "rich handoff editorConfig");
    expect(richProfile.template_config.editorConfig.theme).toBeTruthy();
    expect(richProfile.template_config.editorConfig.blocks).toEqual(expect.any(Array));
    expect(richProfile.template_config.editorConfig.blocks.length).toBeGreaterThan(0);
    const richLinks = await readLinks(page, supabase, profileId);
    expect(richLinks.map((link) => link.url)).toEqual(
      expect.arrayContaining([
        "https://agenda.vetvida.example/reservas",
        "https://wa.me/56987654321",
      ]),
    );
    await page.goto(`/internal/power-editor?profile=${encodeURIComponent(QA_PROFILE_SLUG)}`);
    await expect(page.getByTestId("internal-power-editor")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("power-editor-profile")).toContainText(QA_PROFILE_SLUG);
    await expect(page.getByTestId("power-editor-basic-bio")).toHaveText(
      "Atención veterinaria cercana para cada etapa de tu mascota.",
    );
    expect((await readOwnedProfiles(page, supabase, userId)).map((profile) => profile.id)).toEqual([
      profileId,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("browser Supabase request failed") || message.includes("certificate")) {
      throw new Error(
        `BLOCKED: browser HTTPS/Supabase request failed; TLS was not bypassed. ${message}`,
      );
    }
    throw error;
  } finally {
    if (baseline && profileId && userId) {
      await restoreQaProfile(page, supabase, profileId, userId, baseline, baselineLinks);
    }
    console.log(`[Phase5] QA_PROFILE=${QA_PROFILE_ALIAS} SLUG=${QA_PROFILE_SLUG}`);
    console.log("[Phase5] service-role=NO TLS-bypass=NO non-QA-profile=NO");
  }
});

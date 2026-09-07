# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\dual-editor-persistence.spec.ts >> executes browser-only isolated Basic ↔ Power ↔ Engine V2 persistence gate
- Location: e2e\dual-editor-persistence.spec.ts:320:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/editor", waiting until "load"

```

# Test source

```ts
  251 |           .filter(
  252 |             (candidate): candidate is JsonRecord =>
  253 |               typeof candidate === "object" && candidate !== null,
  254 |           )
  255 |           .map((candidate) => String(candidate.slug ?? ""))
  256 |           .join(",")
  257 |       : "";
  258 |     throw new Error(
  259 |       `BLOCKED: QA profile lookup did not return exactly one profile (owned=${ownedCount}; slugs=${ownedSlugs}).`,
  260 |     );
  261 |   }
  262 |   const profile = matches[0];
  263 |   assertRecord(profile, "Authenticated QA profile");
  264 |   expect(profile.slug).toBe(PROFILE_SLUG);
  265 |   expect(profile.user_id).toBe(userId);
  266 |   expect(userId).toBe(QA_USER_ID);
  267 |   return profile;
  268 | }
  269 | 
  270 | async function readLinks(
  271 |   page: Page,
  272 |   supabase: BrowserSupabase,
  273 |   profileId: string,
  274 | ): Promise<JsonRecord[]> {
  275 |   const data = await browserSupabaseRequest(page, supabase, {
  276 |     path: `rest/v1/profile_links?select=id,platform,label,url,enabled,sort_order&profile_id=eq.${encodeURIComponent(profileId)}&order=sort_order.asc`,
  277 |   });
  278 |   if (!Array.isArray(data)) throw new Error("Browser profile links response was not an array.");
  279 |   return data as JsonRecord[];
  280 | }
  281 | 
  282 | async function saveCanonical(
  283 |   page: Page,
  284 |   supabase: BrowserSupabase,
  285 |   profileId: string,
  286 |   editorConfig: JsonRecord,
  287 | ): Promise<void> {
  288 |   await browserSupabaseRequest(page, supabase, {
  289 |     path: "rest/v1/rpc/set_profile_canonical_editor_config",
  290 |     method: "POST",
  291 |     body: { p_profile_id: profileId, p_editor_config: editorConfig },
  292 |   });
  293 | }
  294 | 
  295 | async function restoreProfile(
  296 |   page: Page,
  297 |   supabase: BrowserSupabase,
  298 |   profileId: string,
  299 |   userId: string,
  300 |   bio: unknown,
  301 |   templateConfig: unknown,
  302 | ): Promise<void> {
  303 |   await browserSupabaseRequest(page, supabase, {
  304 |     path: `rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(userId)}`,
  305 |     method: "PATCH",
  306 |     body: { bio, template_config: templateConfig },
  307 |   });
  308 | }
  309 | 
  310 | async function saveBasicThroughUi(page: Page, bio: string): Promise<void> {
  311 |   await page.goto("/editor");
  312 |   await expect(page.getByLabel("Nombre para mostrar")).toHaveValue(QA_NAME, { timeout: 15_000 });
  313 |   await page.locator("#bio").fill(bio);
  314 |   const save = page.getByRole("button", { name: "Guardar borrador", exact: true }).first();
  315 |   await expect(save).toBeEnabled();
  316 |   await save.click();
  317 |   await expect(page.getByText("Borrador guardado").last()).toBeVisible({ timeout: 15_000 });
  318 | }
  319 | 
  320 | test("executes browser-only isolated Basic ↔ Power ↔ Engine V2 persistence gate", async ({
  321 |   page,
  322 | }) => {
  323 |   const supabaseUrl = env("VITE_SUPABASE_URL");
  324 |   const supabaseAnonKey = env("VITE_SUPABASE_ANON_KEY");
  325 |   const qaEmail = env("QA_EMAIL");
  326 |   const qaPassword = env("QA_PASSWORD");
  327 |   const results = {
  328 |     LOGIN: "FAIL",
  329 |     BASIC_SAVE: "FAIL",
  330 |     BASIC_TO_POWER: "FAIL",
  331 |     POWER_READS_BASIC_DATA: "FAIL",
  332 |     POWER_SAVE: "FAIL",
  333 |     POWER_TO_BASIC: "FAIL",
  334 |     DATA_PRESERVATION: "FAIL",
  335 |     ENGINE_V2_TO_BASIC: "NOT_TESTABLE",
  336 |   };
  337 | 
  338 |   test.skip(
  339 |     !supabaseUrl || !supabaseAnonKey || !qaEmail || !qaPassword,
  340 |     "BLOCKED: local Supabase/browser QA variables are incomplete; credentials are never printed or committed.",
  341 |   );
  342 |   const supabase: BrowserSupabase = { url: supabaseUrl!, anonKey: supabaseAnonKey! };
  343 |   let profileId = "";
  344 |   let userId = "";
  345 |   let originalBio: unknown;
  346 |   let originalTemplateConfig: unknown;
  347 |   let originalLinks: JsonRecord[] = [];
  348 |   let cleanupRequired = false;
  349 | 
  350 |   try {
> 351 |     await page.goto("/editor");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  352 |     const loginForm = page.getByLabel("Correo electrónico");
  353 |     const profileNameField = page.getByLabel("Nombre para mostrar");
  354 |     await expect(loginForm.or(profileNameField)).toBeVisible({ timeout: 45_000 });
  355 |     if (await loginForm.isVisible()) {
  356 |       await loginForm.fill(qaEmail!);
  357 |       await page.getByLabel("Contraseña").fill(qaPassword!);
  358 |       await page.getByRole("button", { name: "Entrar al editor" }).click();
  359 |     }
  360 |     await expect(page).toHaveURL(/\/editor/);
  361 |     await expect(profileNameField).toHaveValue(QA_NAME, { timeout: 30_000 });
  362 |     userId = await authenticatedUserId(page, supabase);
  363 |     results.LOGIN = "PASS";
  364 |     const uiSlug = await page
  365 |       .locator("#public_alias")
  366 |       .inputValue()
  367 |       .catch(() => "");
  368 |     console.log(`[Gate] UI_PROFILE_SLUG=${uiSlug || "<empty>"}`);
  369 |     const profile = await readProfile(page, supabase, userId);
  370 |     profileId = profile.id as string;
  371 |     originalBio = profile.bio;
  372 |     originalTemplateConfig = clone(profile.template_config ?? null);
  373 |     originalLinks = await readLinks(page, supabase, profileId);
  374 |     expect(originalLinks.length).toBeGreaterThanOrEqual(3);
  375 |     cleanupRequired = true;
  376 | 
  377 |     const generatedBase = engineConfigFromEntrypoint();
  378 |     const powerA = advancedPowerConfig(generatedBase);
  379 |     // This canonical seed is performed by browser fetch only so Basic's real
  380 |     // UI save can prove it retains premium/unknown fields. It is not reported
  381 |     // as a Power Editor save because the current host has no Power route.
  382 |     await saveCanonical(page, supabase, profileId, powerA);
  383 |     const seeded = await readProfile(page, supabase, userId);
  384 |     assertRecord(seeded.template_config, "browser canonical seed");
  385 |     expect(seeded.template_config.schemaVersion).toBe(1);
  386 |     assertRecord(seeded.template_config.editorConfig, "browser canonical seed editorConfig");
  387 | 
  388 |     await saveBasicThroughUi(page, "Basic QA browser edit A — canonical fields survive.");
  389 |     results.BASIC_SAVE = "PASS";
  390 |     const afterBasic = await readProfile(page, supabase, userId);
  391 |     expect(afterBasic.bio).toBe("Basic QA browser edit A — canonical fields survive.");
  392 |     assertRecord(afterBasic.template_config?.editorConfig, "after Basic editorConfig");
  393 |     expect(powerSignature(afterBasic.template_config.editorConfig)).toBe(powerSignature(powerA));
  394 |     results.DATA_PRESERVATION = "PASS";
  395 | 
  396 |     await page.goto(`/internal/power-editor?profile=${encodeURIComponent(PROFILE_SLUG)}`);
  397 |     await expect(page.getByTestId("internal-power-editor")).toBeVisible({ timeout: 30_000 });
  398 |     await expect(page.getByTestId("power-editor-profile")).toContainText(PROFILE_SLUG);
  399 |     await expect(page.getByTestId("power-editor-basic-bio")).toHaveText(
  400 |       "Basic QA browser edit A — canonical fields survive.",
  401 |     );
  402 |     results.BASIC_TO_POWER = "PASS";
  403 |     results.POWER_READS_BASIC_DATA = "PASS";
  404 | 
  405 |     const powerBeforeUiSave = await readProfile(page, supabase, userId);
  406 |     expect(powerSignature(powerBeforeUiSave.template_config.editorConfig)).toBe(
  407 |       powerSignature(powerA),
  408 |     );
  409 | 
  410 |     // Change a reversible Power-owned value through the real Studio UI.
  411 |     await page.getByRole("button", { name: "Design", exact: true }).click();
  412 |     await page.locator("select").last().selectOption("mesh");
  413 |     await page.keyboard.press("Control+s");
  414 |     await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  415 | 
  416 |     const afterPower = await readProfile(page, supabase, userId);
  417 |     expect(afterPower.bio).toBe("Basic QA browser edit A — canonical fields survive.");
  418 |     assertRecord(afterPower.template_config?.editorConfig, "after Power editorConfig");
  419 |     expect(afterPower.template_config.editorConfig.theme.texture.preset).toBe("mesh");
  420 |     expect(powerSignature(afterPower.template_config.editorConfig)).not.toBe(
  421 |       powerSignature(powerA),
  422 |     );
  423 |     results.POWER_SAVE = "PASS";
  424 | 
  425 |     await page.goto("/editor");
  426 |     await expect(page.getByLabel("Nombre para mostrar")).toHaveValue(QA_NAME, {
  427 |       timeout: 30_000,
  428 |     });
  429 |     await expect(page.locator("#bio")).toHaveValue(
  430 |       "Basic QA browser edit A — canonical fields survive.",
  431 |     );
  432 |     results.POWER_TO_BASIC = "PASS";
  433 | 
  434 |     await saveBasicThroughUi(page, "Basic QA browser edit B — Power fields survive.");
  435 |     const afterSecondBasic = await readProfile(page, supabase, userId);
  436 |     expect(afterSecondBasic.bio).toBe("Basic QA browser edit B — Power fields survive.");
  437 |     expect(powerSignature(afterSecondBasic.template_config.editorConfig)).toBe(
  438 |       powerSignature(afterPower.template_config.editorConfig),
  439 |     );
  440 |     results.DATA_PRESERVATION = "PASS";
  441 | 
  442 |     const engineConfig = engineConfigFromEntrypoint();
  443 |     await saveCanonical(page, supabase, profileId, engineConfig);
  444 |     const engineSnapshot = await readProfile(page, supabase, userId);
  445 |     assertRecord(engineSnapshot.template_config?.editorConfig, "Engine V2 editorConfig");
  446 |     const engineSignature = powerSignature(engineSnapshot.template_config.editorConfig);
  447 |     await saveBasicThroughUi(page, "Basic QA browser edit C — Engine V2 fields survive.");
  448 |     const engineAfterBasic = await readProfile(page, supabase, userId);
  449 |     expect(engineAfterBasic.bio).toBe("Basic QA browser edit C — Engine V2 fields survive.");
  450 |     expect(engineAfterBasic.template_config.schemaVersion).toBe(1);
  451 |     expect(powerSignature(engineAfterBasic.template_config.editorConfig)).toBe(engineSignature);
```
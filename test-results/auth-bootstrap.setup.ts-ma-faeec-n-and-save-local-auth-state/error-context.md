# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-bootstrap.setup.ts >> manual login and save local auth state
- Location: e2e\auth-bootstrap.setup.ts:7:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Guardar|Publicar|Exportar/ }).first()
Expected: visible
Timeout: 540000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 540000ms
  - waiting for getByRole('button', { name: /Guardar|Publicar|Exportar/ }).first()
    - waiting for "http://localhost:8080/onboarding-preview" navigation to finish...
    - navigated to "http://localhost:8080/onboarding-preview"

```

```yaml
- paragraph: Necesitamos revisar un dato
- heading "No pudimos crear tu página todavía" [level=1]
- paragraph: No encontramos el perfil activo para guardar tu página.
- button "Volver a revisar"
- button "Intentar de nuevo"
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { mkdir } from "node:fs/promises";
  2  | import { dirname, resolve } from "node:path";
  3  | import { expect, test as setup } from "@playwright/test";
  4  | 
  5  | const storageState = resolve("e2e/.auth/qa-storage-state.json");
  6  | 
  7  | setup("manual login and save local auth state", async ({ page }) => {
  8  |   setup.setTimeout(10 * 60 * 1000);
  9  |   await page.goto("/editor");
  10 | 
  11 |   // The user completes the real login in the visible browser window.
  12 |   // We only continue after an authenticated editor surface is observable.
  13 |   await expect(
  14 |     page.getByRole("button", { name: /Guardar|Publicar|Exportar/ }).first(),
> 15 |   ).toBeVisible({ timeout: 9 * 60 * 1000 });
     |     ^ Error: expect(locator).toBeVisible() failed
  16 | 
  17 |   await mkdir(dirname(storageState), { recursive: true });
  18 |   await page.context().storageState({ path: storageState });
  19 |   console.log("[AUTH_BOOTSTRAP] authenticated surface verified; local storageState saved");
  20 | });
  21 | 
```
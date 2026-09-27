# C2B8_IMPLEMENTATION_REPORT — Production UI + Real Data Validation (Intelligent Analytics V1.1)

Fase: **C2B8** · Estado: **IMPLEMENTADO · GATES LOCALES PASS · VALIDACIÓN EN VIVO PENDIENTE (requiere navegador + DB)**
Worktree: `C:\Users\Lenovo\AppData\Local\Temp\cripqer-c2b8-analytics` · Rama: `feat/analytics-c2b8-production-ui`
Base SHA: **`9e33d86`** (`origin/feat/basic-editor-editorial-canvas-ui`) · SHA final (código + tests): **`2e51a69`** · commit de reportes: commit siguiente en `feat/analytics-c2b8-production-ui` (sin push)

---

## 1. Mecanismo de canary elegido (Step 2)

**Reutilización del patrón ya existente en el repo** (no se crea infraestructura nueva):

| Aspecto | Valor |
|---|---|
| Flag | `VITE_ANALYTICS_CANONICAL_ENABLED` (ya definido en producción) |
| Allowlist | `VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST` — CSV de **`public_id`** (ya definido en producción) |
| Clave de gate | `public_id` de la fila **owner-scoped** de `pages` (nunca query params) |
| Default | `legacy` en producción (fail-closed) |
| Canary | la página cuyo `public_id` esté allowlisted + flag en `"true"` |
| Rollback | vaciar la allowlist o poner el flag en `false` (mismo interruptor del writer canónico) — sin código ni datos |

Semántica (`isAnalyticsDashboardRealModeEnabled`, idéntica a `isCanonicalAnalyticsEnabled`):
QA runtime → permitido · producción → flag + allowlist · proyecto desconocido o sin `public_id` → **denegado**.

> Un solo interruptor para escritura canónica y dashboard V1.1: activar/desactivar el canary una vez afecta a ambos y el rollback no toca datos.
> **Pendiente de confirmación del usuario**: hoy la allowlist de producción contiene `VvUsngW` (canary de escritura). Si C2B8 debe canarizar otra página/owner, hay que acordarlo antes del deploy.

## 2. Archivos modificados (4) y creados (3)

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/routes/pages.$pageId.analytics.tsx` | modificado | gate + modo `pending` + fallback legacy controlado |
| `src/lib/analytics/feature-gate.ts` | modificado | `+ isAnalyticsDashboardRealModeEnabled()` (alias documentado del gate existente) |
| `src/lib/analytics/index.ts` | modificado | exporta el gate nuevo + `dashboard-mode` |
| `src/lib/analytics/dashboard-mode.ts` | **nuevo** | resolver puro del modo (`fixtures/real/legacy/pending`) |
| `src/lib/analytics/dashboard-mode.test.ts` | **nuevo** | 10 tests (MODE-01..04, DEV, pending, fail-closed) |
| `src/lib/analytics/feature-gate.test.ts` | modificado | +4 tests del gate del dashboard |
| `src/routes/__tests__/analytics-canary-gate.test.ts` | **nuevo** | 7 invariantes de ruta (source-level) |


## 3. Cambios realizados (Step 3 + Step 4)

### `dashboard-mode.ts` (lógica pura, testeable)
- **DEV** → `?analytics=real|legacy`; default `fixtures` (igual que antes).
- **Producción** → fila de página aún no cargada ⇒ `pending`; gate ON + `public_id` allowlisted ⇒ **`real`**; cualquier otro caso ⇒ **`legacy`**.
- **Nunca lee la query string en producción** ⇒ imposible abrir V1.1 desde la URL.

### `pages.$pageId.analytics.tsx`
- `initialMode()` ya **no** fuerza legacy: en producción arranca `pending` (estado de carga) y se resuelve **una sola vez** tras `pageService.getOwnPageById` (owner-scoped), con `canaryResolved` (`useRef`) ⇒ el veredicto no puede recalcularse ni forzarse por recargas.
- El fetch de datos reales quedó envuelto en su propio `try/catch` ⇒ un fallo de V1.1 **no** rompe la página: estado controlado con el mensaje del error (sin stack) + botón **“Ver dashboard anterior”** que cambia a legacy (el gate ya no re-resuelve, así que el fallback es estable).
- `pending` mantiene el estado “Cargando estadísticas…” (sin pantalla blanca) y no dispara consultas innecesarias; el server fn de plan/tier solo se llama para `fixtures`/`real`.
- **Intacto**: guard de sesión/ownership, mensajes de error, selector QA DEV-only, dashboard legacy, dashboard real (90 días, ≤2000 filas), banner de disponibilidad de datos.

### Compatibilidad y exclusiones
- **Fixtures**: siguen siendo DEV-only (bloque QA y modo inicial). Producción nunca puede seleccionarlas (test MODE-03).
- **`/analytics-visual-qa`**: sin cambios, sigue `notFound()` fuera de DEV (MODE-04).
- **Legacy**: sigue operativo y es el fallback por defecto (no se eliminó `analyticsService` ni componentes legacy).
- **Navegación**: sin cambios; se sigue entrando desde `/pages` → “Estadísticas” con `page.id` real (no se inventan UUID).

## 4. Resultados de gates locales (ejecutados en el worktree C2B8)

| Gate | Comando | Resultado |
|---|---|---|
| Tests nuevos | `npx vitest run src/lib/analytics/dashboard-mode.test.ts src/lib/analytics/feature-gate.test.ts src/routes/__tests__/analytics-canary-gate.test.ts` | **3 archivos / 33 tests PASS** |
| Suites Analytics existentes | `npx vitest run src/lib/analytics src/components/intelligent-analytics src/services/__tests__/analytics.page.test.ts src/services/__tests__/analyticsRealData.test.ts src/features/magic-page-editor-production src/routes/__tests__` | **21 archivos / 137 tests PASS · EXITCODE=0** |

## 5. Evidencia cruda (archivos de gate)

- Baseline typecheck (base limpia, antes de cambios): `%TEMP%\c2b8-tsc-baseline.txt` → **666 errores** (deuda preexistente del repo, idéntica en el worktree del usuario).
- Post-cambio: `%TEMP%\c2b8-tsc-after.txt` → comparación por conjunto (archivo + código + mensaje) contra el baseline.
- Build: `%TEMP%\c2b8-build.txt` → `EXITCODE=0` (nitro `vercel`), sin errores (`error|failed|ERR_` sin coincidencias).
- Tests: `%TEMP%\c2b8-analytics-tests.txt` → 21 archivos / 137 tests PASS / `EXITCODE=0`.

## 6. Lo que NO se pudo ejecutar aquí (y por qué)

Steps **6, 7, 8, 9, 10** (contraste UI vs `qr_analytics`, widgets, historial insuficiente, aislamiento cross-user en runtime, QA mobile/desktop) y el **deploy + canary en producción (Step 11)** requieren **navegador con sesión real** y **acceso read-only a la base**: este entorno no tiene automatización de navegador ni credenciales/consulta SQL. No se inventan resultados.

### Runbook exacto para completar la validación (Steps 6-11)

**A) Preparación local canary (sin tocar DB ni Vercel)**
```powershell
# en el worktree C2B8
$env:VITE_ANALYTICS_CANONICAL_ENABLED="true"
$env:VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST="<public_id_canary>"
npm run dev   # http://localhost:8080
```
- Canary: abrir `http://localhost:8080/pages/<pageId del owner>/analytics` (entrar por `/pages` → “Estadísticas”).
- No-canary: la misma URL con una página cuyo `public_id` esté fuera de la allowlist ⇒ debe verse el **dashboard legacy**.

**B) Contraste de números (Step 6)** — ventana fija (p. ej. 7 días) y `page_id` de la página canary:
```sql
-- expected en DB (read-only)
select event_type, count(*)
from public.qr_analytics
where page_id = '<pageId>' and created_at >= now() - interval '7 days'
group by event_type order by 2 desc;
```
Comparar 1:1 con el banner y las tarjetas del dashboard real: visitas = `page_view`, sesiones = `session_id` distintos, WhatsApp = `whatsapp_click`, links = `external_link_click`, QR = `qr_scan`, devices = `device_type`, fuentes = `source`/`utm_*`. Registrar `evento · cantidad DB · cantidad UI · PASS/FAIL · explicación`.

**C) Seguridad (Step 9)**: `AUTH-01` owner OK · `AUTH-02` sin sesión ⇒ “Debes iniciar sesión para ver estadísticas.” · `AUTH-03` UUID ajeno ⇒ “No se encontró esta página o no tienes acceso a ella.” Refresh directo y `?analytics=real` sobre página no allowlisted deben seguir en legacy.

**D) Mobile/desktop (Step 10)**: cards, charts, overflow horizontal, touch targets, textos cortados, consola sin errores, refresh y navegación desde `/pages`.

**E) Deploy canary (Step 11)** — desde el worktree C2B8, con el linkage del proyecto `codigos-qr` (la config de Vercel ya tiene `VITE_ANALYTICS_CANONICAL_ENABLED` y la allowlist) y **sin** cambiar variables de entorno:
```powershell
vercel deploy --prod --yes
```
Rollback: vaciar `VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST` (o flag a `false`) ⇒ **todo vuelve a legacy** sin revertir datos ni migraciones; opcionalmente `vercel rollback <deployment-anterior>`.

## 7. Riesgos / notas de diseño

1. **Canary acoplado**: dashboard y writer comparten flag+allowlist. Si se necesitara desactivar solo la UI, el cambio futuro es 1 línea dentro de `isAnalyticsDashboardRealModeEnabled`.
2. `pending` es un estado transitorio nuevo: se muestra como “Cargando estadísticas…”. Solo ocurre en producción y desaparece cuando responde el fetch owner-scoped (no aplica a DEV).
3. El gate lee `import.meta.env[…]` en el bundle cliente; los `public_id` de la allowlist son datos **públicos** (van en la URL pública) y la autorización real sigue siendo **RLS + ownership**. No se muestran IDs en la UI.
4. El worktree original del usuario tiene WIP no incluido en esta rama (ver baseline report §1). No se toca.
5. `C2B8A` (español latino + lenguaje humano) **no** se inició, según instrucción.

| Build | `npm run build` | **EXITCODE=0** (nitro `vercel`) |
| Typecheck | `npx tsc --noEmit` | **666 errores en baseline y 666 después, conjunto IDÉNTICO** (`Compare-Object` por archivo+código+mensaje) ⇒ **0 errores nuevos** |
| Higiene git | `git status --short`, `git diff --check` | solo archivos C2B8 · `diff --check` limpio |

Sin cambios en: pipeline canónico (`canonical-writer`, `session`, `browser`, `trackAnalyticsEvent`), `analyticsService` (legacy), `analyticsRealDataService`, componentes `intelligent-analytics`, migraciones, RLS, RPCs, `.env*`, textos/traducciones.

# C2B8_BASELINE_REPORT — Production UI + Real Data Validation (Intelligent Analytics V1.1)

Fase: **C2B8** · Estado: **BASELINE CONFIRMADO** · Fecha: 2026-09-25
Worktree C2B8: `C:\Users\Lenovo\AppData\Local\Temp\cripqer-c2b8-analytics` (limpio, separado del worktree sucio del usuario)
Rama de trabajo: `feat/analytics-c2b8-production-ui`
Rama base: `origin/feat/basic-editor-editorial-canvas-ui`

| Campo | Valor |
|---|---|
| Base SHA | `9e33d86` — *Merge pull request #4 from hotfix/analytics-v1-1-production-canary* |
| Commit C2B8 (código + tests) | `2e51a69` |
| HEAD del worktree C2B8 al crear | `9e33d86` |
| `git status --short` (C2B8, antes de tocar código) | **vacío (limpio)** |
| Upstream de la rama | `origin/feat/basic-editor-editorial-canvas-ui` |
| Worktree original del usuario | `…\generador de QR` @ `d5248da` — **solo lectura, no modificado** |

---

## 1. Confirmación de base y seguridad de la rama

```
git rev-list --count origin/feat/basic-editor-editorial-canvas-ui..HEAD   → 0   (local no tiene nada que origin no tenga)
git rev-list --count HEAD..origin/feat/basic-editor-editorial-canvas-ui   → 2   (origin está ADELANTE)
```

`origin/…@9e33d86` **ya contiene** el trabajo desplegado que se hizo antes (verificado con `git cat-file` / `git grep` sobre el objeto de origin):

- `src/isolated/magic-page-editor/utils/publicLinkTracking.ts` **existe** en origin (exit 0).
- `src/routes/pg.$publicId.tsx:155` y `src/routes/pg.a.$slug.tsx:147` contienen `onTrack={useCanonical ? handleTrack : undefined}` (gating estricto del canary QR).
- `src/lib/analytics/feature-gate.ts`, `qa-runtime-guard.ts`, `canonical-writer.ts` **existen** en origin.
- El merge incorporó también: `.env.example` (+8), `src/client.tsx`, `magic-public-analytics.test.tsx`, `publicLinkTracking.test.ts`, `magic-public-analytics-wiring.test.ts` y cambios en migraciones de la fase C2B (ya aplicadas).

**Conclusión:** usar `origin/feat/basic-editor-editorial-canvas-ui` como base es correcto y **no pierde** el trabajo de Analytics ya en producción. El worktree temporal usado para el deploy (`…\Temp\cripqer-analytics-release-d5248da`) **ya no existe en disco** y ya no figura en `git worktree list`; su contenido está committeado en origin (`ee2c9d6` + merge `9e33d86`), por lo que **no se perdió nada**.

### Trabajo del usuario que NO está en la base (no se toca, solo se reporta)

---

## 2. Ruta de Analytics (baseline exacto)

Archivo: `src/routes/pages.$pageId.analytics.tsx`
`export const Route = createFileRoute("/pages/$pageId/analytics")({ component: PageAnalytics });` (L28)

| Elemento | Línea | Estado en la base |
|---|---|---|
| Tipo de modo | L57 | `type AnalyticsMode = "fixtures" \| "real" \| "legacy";` |
| `initialMode()` | **L59-68** | `if (!import.meta.env.DEV) return "legacy";` → **producción siempre legacy (confirmado)**; DEV: `?analytics=real` / `?analytics=legacy`, default `fixtures` |
| Estado del modo | L82 | `useState<AnalyticsMode>(initialMode)` (la URL solo se lee una vez) |
| Carga de datos | L106-144 | `supabase.auth.getUser()` → `pageService.getOwnPageById(supabase, pageId, auth.user.id)` → **guard de ownership**; luego `analyticsService.getPageAnalytics` (legacy) o `analyticsRealDataService.getRealPageEvents` (real, 90 días) |
| Plan/tier | L146-166 | `getAnalyticsEffectiveTierFn()` (server fn) con fail-closed `free` |
| Selector QA | L201-243 | bloque completo dentro de `import.meta.env.DEV ? … : null` (botones Fixtures / Datos reales / Dashboard anterior + selector de escenario) |
| Dashboard real | L278-313 | `<AnalyticsDashboard events={realEvents} availability={realAvailability} …>` + banner `Datos reales · solo lectura · N eventos cargados (máx. 90 días)` |
| Dashboard legacy | L315-424 | botones Hoy/7/30 días + tarjetas Visitas/Clics/WhatsApp/Interés + `Visitas por día` + `Interés por producto o servicio` |
| Estado vacío legacy | L362-370 | “Todavía no hay visitas” |
| Estado error | L181-186 | tarjeta controlada con `{error ?? "No se encontró esta página."}` (sin stack traces) |

### Seguridad de datos (confirmada en la base)

- `pageService.getOwnPageById` → `.from("pages").select("*").eq("id", pageId).eq("owner_user_id", userId).maybeSingle()` → si no es del usuario, `null` ⇒ mensaje **“No se encontró esta página o no tienes acceso a ella.”**
- `src/services/analyticsRealDataService.ts` (L10-76): read-only, `.eq("page_id", pageId)`, ventana `90d`, `REAL_ANALYTICS_ROW_LIMIT = 2000`, `REAL_ANALYTICS_MAX_DAYS = 90`; documenta RLS *“Users can read their own analytics”* como segunda barrera.
- `Page` incluye `public_id` (L186) y el fetch trae la fila completa → **el gate del canary puede decidirse con el `public_id` de la fila de DB, nunca con parámetros de URL.**
- Sin autenticación: `“Debes iniciar sesión para ver estadísticas.”`

## 3. QA visual y fixtures (DEV-only, confirmado)

- `/analytics-visual-qa` → `src/routes/analytics-visual-qa.tsx:125-128`: `beforeLoad: () => { if (!import.meta.env.DEV) throw notFound(); }` + `robots: noindex` (L137-142). Sin enlaces en la navegación.
- Fixtures del dashboard: solo alcanzables vía `import.meta.env.DEV` (modo inicial y selector). No hay fixtures en producción.

## 4. Patrón de canary ya existente en el repo (a reutilizar en Step 2)

`src/lib/analytics/feature-gate.ts` — patrón canary ya establecido y en uso en producción:

```
CANONICAL_ANALYTICS_ENABLED_KEY        = "VITE_ANALYTICS_CANONICAL_ENABLED"
CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY = "VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST"   // CSV de public_id
isCanonicalAnalyticsEnabled({ supabaseUrl, publicId, environment })
  · QA runtime        → true
  · production        → requiere flag === "true" Y publicId ∈ allowlist
  · unknown project   → false (deny)
classifyRuntime()     → qa ref "tjigzcyoogmvdkivypym" · production ref "mlinfiuhkxdhlveflbkj" · desconocido
```

- Documentado en `.env.example` (L8-14) y con tests en `feature-gate.test.ts`.
- En el proyecto Vercel `codigos-qr` (producción) existen (nombres visibles, valores cifrados): `VITE_ANALYTICS_CANONICAL_ENABLED`, `VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
- **Decisión de diseño (Step 2)**: reutilizar este mismo gate para la UI (mismo flag + misma allowlist por `public_id`), sin crear variables, tablas ni infraestructura nueva. El canary de UI coincide con el canary de escritura ya autorizado, y el rollback es el mismo interruptor.

## 5. Estado de calidad de la base (gates)

- `npx tsc --noEmit` sobre la base limpia: ejecutado antes de cualquier cambio (evidencia en `%TEMP%\c2b8-tsc-baseline.txt`); resultado comparado en el reporte de implementación.
- `node_modules` del worktree C2B8: junction al `node_modules` del repo original (`vite` y `vitest` resolubles); no se copian ni agregan dependencias.

## 6. Riesgos / pendientes detectados en el baseline

1. **Identidad del canary pendiente de confirmación**: el gate reutiliza la allowlist existente, hoy `VvUsngW` (canary de escritura QR). Si C2B8 debe canarizar **otra** página/owner, hay que acordarlo antes del deploy (no se inventan UUID).
2. **Validaciones que requieren navegador + DB (Steps 6-10 y 11)**: contraste UI vs `qr_analytics`, mobile/desktop, aislamiento cross-user en runtime y deploy de producción **no** son ejecutables desde este entorno (sin automatización de navegador ni acceso a DB). Runbook exacto en el reporte de implementación.
3. WIP del usuario fuera de la base (§1) — no se toca; tenerlo presente si se compara local vs producción.
4. Los 10 reportes `.md` y las 2 migraciones sin commitear del worktree original **no** forman parte de C2B8.


El worktree original tiene WIP sin commitear (no incluido en C2B8 por diseño): `MyProfilePage.tsx`, `MagicPublicRenderer.tsx`, `magic-document.ts`, `CardBody.tsx`, `FamilyCard.tsx`, `cardActions.tsx`, `useSelectionActions.tsx`, `routeTree.gen.ts`, `$alias.tsx`, `editor.tsx`, `p.$publicId.tsx`, **`pg.$publicId.tsx`**, **`pg.a.$slug.tsx`**, `pages.new.tsx`, `magic-page.service.ts`, `profile.service.ts`, `types/database.ts`, + 10 reportes `.md`, 2 migraciones sin commitear en `supabase/migrations/` (`20260924000000_permanent_public_identity_contract.sql`, `20260924000001_legacy_profile_magic_bridge.sql`), `src/routes/pages.$pageId.catalog.tsx` y `src/services/__tests__/legacy-profile-bridge.service.test.ts`.

> ⚠️ Riesgo a tener presente (no es un cambio de C2B8): `pg.$publicId.tsx` y `pg.a.$slug.tsx` están **modificados localmente** en el worktree del usuario, distinto de lo committeado en origin. Cualquier deploy desde ese worktree incluiría ese WIP; C2B8 se construye sobre origin.

# Plan — Bot del dueño (multi‑inquilino) para bio landing / portafolio

> Estado: **aprobado**. F1 (free) en implementación.
> Decisión de guardado (opción 2): campo dedicado y tipado `bot` dentro del documento
> (`PageDoc` + `MagicPageDocumentV1`), NO `props` con strings.

## Objetivo
Un bot genérico, **uno por landing**, alimentado por su dueño con su propia info;
se activa/desactiva con un **badge en el editor**; al activarse se **configura/enriquece**;
responde en el landing público en base a esa info; opcionalmente ofrece **WhatsApp** y **precios**.

## Modelo de datos
```ts
// types/editor.ts
export interface LandingBotConfig {
  enabled: boolean;
  persona: 'generic' | 'custom';        // icono
  avatarUrl?: string;                    // PRO (subida)
  avatarIcon?: string;                   // PRO (librería de iconos)
  name: string;                          // nombre del asistente
  about: string;                         // quién es / qué hace  (FREE)
  tone: 'cercano' | 'formal' | 'profesional';
  whatsapp?: string;                     // FREE
  whatsappEnabled: boolean;              // FREE
  // — PRO (llenables más adelante) —
  services?: string;
  hours?: string;
  address?: string;
  faq?: string;
  social?: { instagram?: string; tiktok?: string; youtube?: string; facebook?: string };
  stores?: string;
  prices?: { enabled: boolean; currency: string; items?: { name: string; price: string }[] };
}
// PageDoc y MagicPageDocumentV1 ganan: bot?: LandingBotConfig
```
Retrocompatible: `isMagicPageDocument` valida existencia de claves, no prohíbe extras → `version` sigue en 1.

## Matriz de planes (free / pro)
Resolver existente: `EffectiveTier = free | pro | business | enterprise`
(`src/server/billing/entitlements.ts`). UI lee el tier con `getAnalyticsEffectiveTierFn`.

| Capacidad | Free | Pro+ |
|---|---|---|
| Activar/desactivar bot (badge) | ✅ | ✅ |
| Nombre, quién es/qué hace, tono | ✅ | ✅ |
| WhatsApp (número + mostrar) | ✅ | ✅ |
| Cuota gratis de mensajes | ✅ (N/mes) | ✅ (mayor/sin tope) |
| Precios / catálogo | ❌ | ✅ |
| Redes sociales | ❌ | ✅ |
| Tiendas | ❌ | ✅ |
| Horario / dirección / FAQ | ❌ | ✅ |
| Cambiar rostro/icono del bot | ❌ (genérico) | ✅ (subir/librería) |

Cuota y candados se **enforcan en el servidor** (nunca con flags del cliente).

## Cuota gratis (server-side)
Tabla `landing_bot_usage` (contador por `public_id`/mes) o reuso de contador de analytics. Reset mensual.

## Proveedores IA (server-side)
`askLandingBotFn` (DeepSeek **principal** → OneProvider **fallback**), claves **sin `VITE_`**.
System prompt desde `bot` (about/servicios/horario/faq/tono) + reglas de formato + WhatsApp/precios si habilitados.

## UI editor (badge)
Acción de página "Bot" en `useSelectionActions.tsx` (caso `page`): `active` = `doc.bot?.enabled`,
label "Activar bot"/"Desactivar", `panel` = `LandingBotPanel`. Aparece en `FloatingToolbar` (escritorio)
y `MobileSheet` (móvil).

## Render público
`MagicPublicRenderer` recibe `publicId` y monta `<LandingBot publicId config />` si `document.bot?.enabled`.
`LandingBot` reutiliza solo la UI de chat del `FuxionAssistant` (sin conocimiento de FuXión).

## Archivos
1. `src/isolated/magic-page-editor/types/editor.ts` — `LandingBotConfig` + `PageDoc.bot?`.
2. `src/features/magic-page-editor-production/magic-document.ts` — serialize/hydrate `bot`.
3. `src/isolated/magic-page-editor/contexts/EditorContext.tsx` — helper `setBot(patch)`.
4. `src/isolated/magic-page-editor/components/editor/useSelectionActions.tsx` — acción "Bot".
5. NUEVO `.../components/editor/controls/LandingBotPanel.tsx`.
6. NUEVO `src/components/landing-bot/LandingBot.tsx`.
7. NUEVO `src/lib/landing-bot/server.ts` — `askLandingBotFn`.
8. NUEVO `src/lib/landing-bot/quota.server.ts`.
9. `src/features/magic-page-editor-production/MagicPublicRenderer.tsx`.
10. `src/routes/pg.$publicId.tsx` + `src/routes/pg.a.$slug.tsx`.
11. `src/server/billing/*` — mapear `EffectiveTier` → capacidades del bot.
12. Supabase — migración `landing_bot_usage` (+ bucket si avatar).

## Fases
- **F1 (free):** `bot` en doc + badge/acción + `LandingBotPanel` (nombre, about, tono, WhatsApp) +
  `LandingBot` público + `askLandingBotFn` (DeepSeek→OneProvider) + cuota server-side + gating free/pro.
- **F2 (pro):** precios, redes, tiendas, horario/dirección/FAQ + avatar/rostro (subida/librería).
- **F3:** métricas de uso, ampliación de iconos/servicios, herencia desde el perfil.

## Testing / riesgos
- Tests: system prompt (server) desde `bot`; cuota; gating; render ON/OFF; respetar tests de
  `pg.$publicId` (SEO/analytics) y `MagicPublicRenderer`.
- Riesgos: coste/abuso → cuota + rate limit; gating siempre en servidor; avatar → límites/moderation.

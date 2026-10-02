# CRIPQER — Analytics Production Repair V1

Fecha: 2026-10-01 UTC  
Estado: `PARTIAL`

## Alcance

Se repararon únicamente los fallos de UTM y entrega de clics. No se desplegó,
no se hizo commit, no se aplicaron migraciones y no se cambiaron variables
remotas, dominios, aliases ni políticas de Supabase.

La validación local se ejecutó contra el proyecto Supabase de producción
`mlinfiuhkxdhlveflbkj`, usando únicamente los marcadores autorizados. La
producción pública `https://www.cripqer.dev` no fue modificada y sigue sirviendo
el bundle anterior.

## Causa raíz confirmada

1. Las rutas públicas no extraían `utm_source` ni `utm_campaign` de
   `window.location.search`, por lo que el writer canónico recibía esos campos
   vacíos.
2. Los callbacks de clic iniciaban una escritura asíncrona y dejaban que la
   navegación terminara sin esperar su finalización.
3. La página fixture usa `MagicPublicRenderer`, pero ambas rutas públicas lo
   montaban sin pasar `handleTrack`; por ello sus clics no tenían callback de
   analytics.

## Archivos modificados

- `src/lib/analytics/session.ts`: captura, normaliza y conserva UTM en el
  contexto de sesión.
- `src/lib/analytics/index.ts`: exporta el contexto UTM.
- `src/routes/pg.$publicId.tsx` y `src/routes/pg.a.$slug.tsx`: propagan UTM a
  `session_start`, `page_view` y eventos canónicos; esperan el tracking de
  clic; conectan `MagicPublicRenderer` con `handleTrack`.
- `src/routes/q.$publicId.tsx`: conserva UTM durante el flujo QR sin
  sobrescribir `source=qr` ni `qr_id`.
- `src/components/direct-page-editor/DirectBlockRegistry.tsx`: espera el
  tracking antes de navegación same-tab.
- `src/features/magic-page-editor-production/MagicPublicRenderer.tsx`:
  espera el tracking en navegación same-tab y conserva target blank.
- `src/premium-template-studio/engine/RenderContext.tsx`,
  `src/premium-template-studio/engine/TemplateRenderer.tsx`,
  `src/premium-template-studio/components/blocks/primitives.tsx`: soportan el
  resultado asíncrono del callback.
- `src/lib/analytics/session.test.ts`: pruebas de captura, normalización y
  persistencia de contexto UTM.

No se implementó geografía, `source=direct`, seguridad ni cambios de schema.

## Evidencia de datos

Antes de la reparación: 35 filas para la página fixture; 0 filas con los
marcadores UTM de reparación.

Después de la primera pasada canónica local: 39 filas observadas y 2 filas con
marcadores, ambas correctas:

| Evento | Device | UTM source | UTM campaign |
|---|---|---|---|
| `session_start` | `desktop` | `cripqer_qa` | `analytics_repair_desktop_20261001` |
| `page_view` | `desktop` | `cripqer_qa` | `analytics_repair_desktop_20261001` |

Esto confirma el flujo URL → contexto de sesión → writer canónico → RPC →
`qr_analytics` para UTM en desktop. No se hicieron inserts manuales ni deletes.

## Smoke matrix

| Escenario | Resultado | Evidencia |
|---|---|---|
| UTM desktop `session_start` | PASS | fila persistida con ambos UTM |
| UTM desktop `page_view` | PASS | fila persistida con ambos UTM |
| QR + UTM coexistencia | NOT VERIFIED AFTER PATCH | la ruta conserva `source=qr`/`qr_id` por código y requiere nueva pasada estable |
| WhatsApp click | BLOCKED | la primera pasada descubrió el wiring ausente; se corrigió después, pero la instancia Vite quedó inestable antes de repetir DB verification |
| External link click | NOT VERIFIED | misma razón |
| Mobile UTM/device | NOT VERIFIED | la instancia local no completó una segunda sesión móvil estable |
| Production domain | NOT RUN | no hubo deploy; producción sigue sin el parche |

La primera página local renderizó correctamente y abrió el destino WhatsApp en
nueva pestaña. La segunda instancia Vite requirió optimización prolongada y
tuvo problemas de hidratación entre puertos durante el reinicio, por lo que no
se presenta esa interacción como PASS de persistencia.

## Validación automática

- Tests focalizados de analytics: **44/44 PASS**.
- `git diff --check`: **PASS**.
- Build client/SSR-Nitro: **INCONCLUSO/BLOCKED**; Vite inició la compilación
  Nitro/Vercel y la optimización, pero no terminó de forma observable dentro
  del entorno de validación. No se interpreta como PASS.

## Estado restante

- Seguridad: `SECURITY_NOT_VERIFIED`; no se inspeccionaron grants, policies ni
  `security_invoker` en esta reparación.
- Geografía: `DEFERRED_NOT_IMPLEMENTED`; `country` y `city` siguen sin
  implementarse.
- `VITE_APP_URL`: no se cambió. La corrección remota requiere aprobación
  separada y no es causa demostrada de UTM/clics.
- Allowlist: se mantuvo `VvUsngW`; no se amplió rollout.

## Recomendación

No desplegar todavía. Repetir en una única instancia limpia el smoke desktop y
móvil, verificando después de cada acción las filas `session_start`, `page_view`,
`whatsapp_click` y `link_click`, además de QR. Solo si esas filas pasan y el
build client + SSR/Nitro termina correctamente, revisar manualmente y preparar
un despliegue allowlisted.

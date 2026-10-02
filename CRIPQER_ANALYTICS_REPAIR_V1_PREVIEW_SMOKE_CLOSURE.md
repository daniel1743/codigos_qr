# CRIPQER — Analytics Repair V1 Preview Smoke Closure

Fecha: 2026-10-01 UTC  
Estado: `BLOCKED_RUNTIME`

## Preview

- Proyecto confirmado: `daniels-projects-29fb139e/codigos-qr`.
- `projectId`: `prj_q2gxKT0Mt2sikvcnNdzHZleDE416`.
- Deployment Preview: `dpl_3qRhhqGQtDcxNc6qshVuk5iLPmgh`.
- URL: https://codigos-o2jj4g2wx-daniels-projects-29fb139e.vercel.app
- Target: Preview; no `--prod`, no alias ni dominio modificados.

El deployment remoto terminó `READY` y Vercel ejecutó correctamente el build
client, SSR y Nitro/Vercel en su build machine.

## Bloqueo de runtime

El Preview tiene Deployment Protection activa. Las solicitudes anónimas desde
Playwright redirigen a `https://vercel.com/login` antes de llegar a la app:

```text
GET /                 -> 200, redirect a Vercel Login
GET /pg/VvUsngW       -> 200, redirect a Vercel Login
GET /q/VvUsngW?...    -> 200, redirect a Vercel Login
```

El navegador Chrome disponible tampoco proporcionó una sesión autenticada para
ese Preview. No se desactivó la protección ni se generó un bypass persistente.

## Smoke matrix

| Caso | Resultado | Motivo |
|---|---|---|
| Preview root | BLOCKED_RUNTIME | Deployment Protection |
| `/pg/VvUsngW` | BLOCKED_RUNTIME | Deployment Protection |
| `/q/VvUsngW` → `/pg/VvUsngW` | NOT RUN | no se alcanzó la app |
| `qr_scan`, `qr_id`, `source=qr` | NOT VERIFIED | no hubo navegación de app |
| WhatsApp → `whatsapp_click` | NOT RUN | no se alcanzó la app |
| External link → `link_click` | NOT RUN | no se alcanzó la app |
| Mobile `device_type=mobile` | NOT RUN | no se alcanzó la app |

## DB read-only

La consulta a `qr_analytics` para page id
`1c4aa062-a012-47e4-b0f1-99ca8e80d1ec` devolvió 45 filas históricas.

Filas con `utm_source=cripqer_qa` y campaña `analytics_preview_*`: **0**.

No se generaron eventos sintéticos porque el Preview no fue accesible. No se
hizo ningún insert manual ni delete.

## Diff checks

- Analytics-only `git diff --check`: **PASS**.
- Global `git diff --check`: **FAIL** por whitespace no relacionado en
  `diff.txt:7,99,101` y `PalettePicker.tsx:44-46`.
- No se modificaron esos archivos ajenos.

## Estado de código y build

No hubo cambios de código durante esta pasada de cierre.

- Build local client/SSR/Nitro: PASS.
- Build remoto Vercel Preview: PASS.
- Tests focalizados previos: 44/44 PASS.

## Recomendación

No aprobar todavía `PASS_READY_FOR_LIMITED_PRODUCTION_DEPLOY`. El bloqueo es
de acceso al Preview protegido, no una regresión funcional demostrada. Para
cerrar la validación hace falta una sesión autorizada para el deployment
Preview o una configuración temporal de Preview que permita smoke anónimo,
sin cambiar producción. Después deben repetirse QR, WhatsApp, enlace externo y
móvil verificando las filas persistidas.

No se desplegó a producción y no se modificaron Supabase, migraciones,
policies, variables, aliases, dominios, Catalog, Affiliate ni ButtonGroup.

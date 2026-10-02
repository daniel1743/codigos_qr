# CRIPQER — Analytics Repair V1 Final Validation

Fecha: 2026-10-01 UTC  
Estado: `PARTIAL_NEEDS_FIX`

## Resultado ejecutivo

La reparación compila correctamente, pero no queda aprobada para despliegue
limitado porque el smoke final no pudo producir evidencia válida de QR, clics
y móvil, y el `git diff --check` global está contaminado por archivos ajenos al
parche.

No se desplegó, no se aplicaron migraciones, no se cambiaron variables remotas
y no se modificó Supabase.

## Build

Comando:

```text
node node_modules/vite/bin/vite.js build
```

Resultado: **PASS**.

- Client build: PASS.
- SSR build: PASS.
- Nitro/Vercel build: PASS.
- `.vercel/output/functions/__server.func/index.mjs` generado correctamente.

Solo hubo warnings existentes de `@theme`, tamaño de chunks y un archivo de
test bajo `src/routes/__tests__` sin export `Route`; no fueron errores de build.

## Smoke final

Los marcadores autorizados fueron:

- `analytics_final_qr_20261001`
- `analytics_final_whatsapp_20261001`
- `analytics_final_link_20261001`
- `analytics_final_mobile_20261001`

El preview Vite no sirvió la aplicación: respondió HTTP 500 con
`ERR_MODULE_NOT_FOUND` buscando `dist/server/server.js`, aunque el build
TanStack/Nitro generó `.vercel/output`. El servidor dev único tampoco completó
una sesión navegable estable antes de la validación. Por eso no se clasifican
como PASS los siguientes casos:

| Caso | Resultado |
|---|---|
| QR `/q/VvUsngW` → `/pg/VvUsngW` | NOT VERIFIED |
| `qr_scan`, `qr_id=VvUsngW`, `source=qr` | NOT VERIFIED AFTER PATCH |
| WhatsApp → `whatsapp_click` | NOT VERIFIED |
| Link externo → `link_click` | NOT VERIFIED |
| Mobile `device_type=mobile` | NOT VERIFIED |

## Evidencia DB read-only

Consulta de lectura sobre la página fixture: 45 filas observadas.

| Evento | Cantidad |
|---|---:|
| `page_view` | 23 |
| `session_start` | 12 |
| `qr_scan` | 3 |
| `view` | 4 |
| `whatsapp_click` | 2 |
| `external_link_click` | 1 |

Filas con cualquiera de los cuatro marcadores `analytics_final_*`: **0**.

La evidencia previa de UTM desktop sigue siendo válida: `session_start` y
`page_view` persistieron `utm_source=cripqer_qa` y su campaña autorizada. No se
hicieron inserts manuales ni deletes.

## Tests y diff

- Tests focalizados de analytics: **44/44 PASS**.
- `git diff --check`: **FAIL global**, por cambios ajenos al parche:
  - `diff.txt:7,99,101` trailing whitespace.
  - `src/isolated/magic-page-editor/components/editor/controls/PalettePicker.tsx:44-46` trailing whitespace.

El fallo global no proviene de los archivos de la reparación Analytics V1.
No se corrigió porque esta fase es solo validación y prohíbe refactors o
limpieza ajena.

Durante el servidor dev también apareció `useEditor must be used inside
EditorProvider` desde `QuickProfileInfo`, asociado a cambios no relacionados en
`src/isolated/magic-page-editor`; no se modificó.

## Decisión

`PARTIAL_NEEDS_FIX`.

No recomendar despliegue todavía. Antes del deploy se necesita un entorno de
smoke estable que pueda servir el artefacto SSR correcto, limpiar o aislar los
archivos ajenos que hacen fallar `git diff --check`, y repetir QR, WhatsApp,
link externo y móvil verificando las filas persistidas.

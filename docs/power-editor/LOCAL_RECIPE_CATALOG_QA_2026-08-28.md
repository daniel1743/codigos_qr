# QA — Catálogo local de 12 recetas V6

**Fecha:** 2026-08-28
**Worktree:** `/home/ubuntu/codigos_qr-power-editor-isolated`
**Alcance:** integración local de las doce recetas V6 dentro del Power Editor aislado.

## Cambio realizado

Se añadió el comando `templates:power:catalog`, que ejecuta `scripts/build-power-editor-client-catalog.mjs`. El script toma las doce recetas desde `createTemplatePack()` y produce el módulo cliente `src/power-editor/client/src/lib/generatedRecipeCatalog.ts`. El módulo contiene únicamente metadatos de receta y `pageConfig` V6; no contiene datos de proyectos, usuarios, tokens ni lógica de red.

El editor añade una acción **Recetas**. Al abrirla, el inspector muestra las doce opciones locales con su categoría y macrofamilia. Al pulsar **Aplicar al canvas**, el editor hidrata la configuración mediante el mecanismo V6 existente, reemplaza el estado visible del canvas y reinicia los historiales de Undo/Redo para que el nuevo documento se trate como punto inicial. La acción cierra el catálogo y muestra un aviso explícito de que guardar sigue siendo decisión del usuario.

## Evidencia de verificación

| Verificación | Resultado |
|---|---|
| Generación del catálogo | Comando exitoso; `generatedRecipeCatalog.ts` declara versión `diversity-v2` y doce IDs desde `power-golden-atelier` hasta `power-emerald-journal`. |
| Pruebas unitarias | `./node_modules/.bin/vitest run`: **9 archivos, 63 pruebas correctas**. Incluye dos pruebas nuevas que validan las doce recetas V6 únicas y su hidratación local. |
| Catálogo visible | El preview aislado enumeró los doce botones **Aplicar al canvas** dentro del inspector. |
| Aplicación local | Se aplicó **Golden Atelier**; el canvas pasó a su composición V6 con banner, perfil, título, CTAs y bloques propios. El aviso mostró: “se aplicó sólo al canvas. Guarda cuando decidas conservarlo”. |
| Llamadas remotas | Tras aplicar una receta, el filtro sobre los recursos del navegador para `mlinfiuhkxdhlveflbkj.supabase.co` devolvió `[]`. |
| Errores de navegador | No se registraron errores de consola durante la apertura o aplicación de la receta. |

## Salvaguardas confirmadas

| Área | Estado |
|---|---|
| Supabase | El catálogo no consulta ni escribe Supabase. |
| Guardado | Aplicar una receta no invoca Guardar, `onSaveDraft` ni `localStorage` de manera automática. |
| Publicación | No invoca Finalizar, publicación ni sincronizador. |
| Sincronización administrativa | `sync-power-editor-template-pack.mjs --apply` no se ejecutó y permanece fuera de la UI. |
| Editor heredado, QR y rutas públicas | No se modificaron. |
| Git | No se hizo commit, push, merge, rebase ni despliegue. |

## Limitaciones y siguiente prueba

La comprobación autenticada del borrador real sigue pendiente de una sesión del propietario. La ruta privada ya presenta el formulario de acceso existente cuando no hay sesión; no se intentó almacenar contraseñas ni utilizar `service_role`.

Antes de cualquier sincronización administrativa, publicación o integración de rama, el usuario debe probar el catálogo aislado y aprobar este incremento.

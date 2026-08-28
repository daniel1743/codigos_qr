# Preparación de Vercel — Power Editor V6

**Fecha:** 2026-08-28
**Alcance:** verificación de sólo lectura previa a despliegue. No se desplegó ni se modificó Vercel, GitHub, Supabase o secretos.

## Resultado ejecutivo

El worktree aislado que contiene el Power Editor V6 **sí compila correctamente** con `vite build`. Sin embargo, el commit remoto indicado por el usuario (`3cf567095ee4a52413d8c25af9a2383201311193`) está en otra rama, `feat/editor-three-panel-restructure-09`, y no contiene los archivos de la promoción V6 (`PowerEditorMainEntry`, `EditorCandidate`, catálogo de recetas, ruta de borrador o el cambio de `/editor`). Por tanto, ese commit no es una fuente válida para desplegar el Power Editor V6.

## Evidencia técnica

| Verificación | Resultado |
|---|---|
| Build del worktree V6 | Correcto: `NODE_OPTIONS=--max-old-space-size=2048 ./node_modules/.bin/vite build`. Generó `.vercel/output` y Nitro indicó que el artefacto está listo para despliegue preconstruido. |
| Pruebas más recientes | Correctas: 10 archivos y 65 pruebas. |
| Commit remoto `3cf5670` | 29 archivos, 181 775 líneas añadidas y 123 eliminadas; mensaje `script corriendo`. |
| Rama del commit remoto | `feat/editor-three-panel-restructure-09`. |
| Relación con la rama aislada V6 | `diverged`; base común `b8c1998b35102650d6cd7d858751c25a32ee2f48`, 11 commits por delante y 2 por detrás según comparación remota. |
| Contenido del commit remoto | Incluye artefactos masivos bajo `out/` y ficheros de otro generador; no incluye el Power Editor V6 promovido como `/editor`. |

## Variables de entorno

La captura de Vercel confirma que están definidas las claves `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_APP_URL` para Production y Preview. El editor cliente usa sólo las variables `VITE_*`.

| Variable | Requisito de despliegue |
|---|---|
| `VITE_SUPABASE_URL` | Debe contener la URL HTTPS del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Debe contener una clave de cliente válida `anon` o publishable; nunca `service_role`. |
| `VITE_APP_URL` | Debe ser la URL HTTPS final de Vercel o del dominio configurado, no `http://localhost:3000`. |
| `SUPABASE_SERVICE_ROLE_KEY` | No es requerida por el Power Editor cliente. Puede existir sólo para código servidor estrictamente necesario; jamás debe prefijarse como `VITE_` ni importarse al navegador. |

Los valores no fueron leídos ni expuestos en esta auditoría. La captura no permite confirmar que `VITE_APP_URL` ya tenga el dominio final, por lo cual ese punto necesita validación en Vercel antes de producción.

## Bloqueadores antes de desplegar V6

1. Respaldar los cambios locales del worktree V6 en una rama remota dedicada. Aún no hay commit ni push de la promoción V6.
2. No mezclar ni desplegar directamente `3cf5670`: pertenece a una línea divergente y lleva artefactos de tamaño muy elevado, incluidos ficheros con nombre de registros privados. Debe revisarse y separarse antes de cualquier uso.
3. Configurar `VITE_APP_URL` con el dominio que Vercel asignará al proyecto o con su dominio personalizado HTTPS.
4. Desplegar desde la rama que contenga el Power Editor V6 respaldado, no desde la rama externa indicada.
5. Tras el primer preview de Vercel, comprobar `/editor` autenticado, `/admin/template-studio`, la carga/guardado de borrador y las rutas públicas existentes.

## Secuencia recomendada

La siguiente secuencia evita mezclar el generador externo con el Power Editor V6: crear commits de respaldo desde la rama aislada; hacer push a una rama dedicada; abrir Pull Request contra la rama que Vercel despliega; revisar los cambios; desplegar primero un preview; y sólo después promover a producción. Cada paso requiere autorización explícita independiente.

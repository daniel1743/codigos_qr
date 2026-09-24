# CRIPQER_MAGIC_PERSISTENCE_TEMPLATE_LEGACY_BRIDGE_P0_V2

## Resultado

**PARTIAL — MANUAL_RUNTIME_REQUIRED**

Se implementaron las correcciones de persistencia del editor Magic y el
cambio de plantilla no destructivo. No se certifica el puente público Legacy
→ Magic porque el proyecto no expone una consulta pública segura que resuelva
una página publicada por `profile_id`, y la tarea prohíbe agregar un cambio de
esquema/RPC durante este gate.

## Cambios implementados

- `EditorContext` ya no simula `Guardado` con un temporizador local.
- `MagicProductionEditorHost` devuelve la promesa del `saveDraft` real,
  conserva el debounce existente y resuelve el estado solo después de una
  persistencia exitosa.
- Se añadió estado visual de error de guardado sin crear un segundo sistema de
  persistencia.
- El cambio de plantilla conserva el documento actual, agrega únicamente los
  bloques iniciales que falten y sincroniza el documento vigente entre las
  historias para que volver a una plantilla no restaure contenido antiguo.

## Causas corregidas

### Persistencia

La causa era un `setTimeout` en `EditorContext` que cambiaba el estado a
`saved` después de 700 ms sin conocer el resultado de `magicPageService.saveDraft`.
Ahora el estado se deriva de la promesa de guardado real.

### Cambio de plantilla

La causa era que `setTemplateId` solo cambiaba el identificador y la historia
de destino podía contener el documento inicial de esa plantilla. Ahora se
parte del documento actual y se completa de forma no destructiva.

## Puente Legacy → Magic

El route `/p/$publicId` actualmente resuelve el perfil Legacy mediante
`profiles.public_id`. Los únicos RPC públicos existentes para `pages` son:

- `get_public_page_by_public_id(text)`
- `get_public_page_by_slug(text)`

Ninguno acepta `profile_id`. Además, las políticas de `pages` solo permiten
`SELECT` autenticado del propietario. Por ello no se agregó un `SELECT` anónimo
directo ni una consulta REST alternativa: sería inseguro y no cumpliría el
contrato de render público. Para completar este punto se requiere una
capacidad pública explícita (RPC seguro o equivalente) que devuelva únicamente
la identidad publicada de la página asociada al perfil.

## Verificación

- `npm run build`: **OK** para client, SSR y Nitro.
- `git diff --check`: sin errores de whitespace; solo warnings de conversión
  LF/CRLF del working tree.
- Runtime autenticado, segunda pestaña/dispositivo, base de datos y
  redirección Legacy → Magic: **pendientes de ejecución manual**. No se
  declara PASS sin esa evidencia.

## Sistemas protegidos

No se modificaron Supabase, SQL, RLS, rutas canónicas existentes, navegación
móvil, Power Editor, Direct Editor, Engine V2, catálogo, variantes Hero ni
autenticación.

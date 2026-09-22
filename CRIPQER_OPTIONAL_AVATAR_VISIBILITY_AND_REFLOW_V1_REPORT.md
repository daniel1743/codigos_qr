# Cripqer — Optional Avatar Visibility and Reflow V1

**Modo:** `TARGETED_PRODUCTIZATION_FIX`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_OPTIONAL_AVATAR_VISIBILITY_AND_REFLOW_V1`

## Implementación

Se agregó `profile.showAvatar?: boolean` como control independiente del asset
`profile.avatarUrl`.

- `showAvatar = false` elimina el avatar, su placeholder y su wrapper del
  render; no deja hueco ni aplica el offset de overlap.
- El asset y su referencia se conservan al ocultar.
- La ausencia de `showAvatar` mantiene el comportamiento legacy: avatar visible.
- El control `Mostrar avatar` está disponible junto a los controles existentes
  del avatar y se registra mediante el reducer normal, por lo que undo/redo
  conserva el asset y revierte la visibilidad.
- Full Hero no fue alterado.

## Starters

Los defaults de páginas nuevas quedan definidos así:

| Tipo | `showAvatar` |
|---|---:|
| menu, catalog, promotion, campaign, event | `false` |
| services, portfolio | `true` |
| landing | sin campo, conserva comportamiento legacy |

No se modificaron Publish, routing, `public_id`, Bio, QR, RPC ni la
propagación previa del título de página.

## Verificación de código

Suite focalizada:

```text
6 test files passed
37 tests passed
```

Se cubrieron render público, ausencia de placeholder/wrapper, preservación del
asset, compatibilidad legacy, persistencia del campo, undo/redo, defaults de
starter y regresiones de templates existentes.

`git diff --check` no reportó errores.

El lint conserva un error preexistente `no-explicit-any` en
`Inspector.tsx:1133` y advertencias preexistentes de Fast Refresh; no apareció
un error nuevo relacionado con avatar. El typecheck global del repositorio no
queda limpio por errores baseline fuera de este cambio.

## Runtime

No se ejecutó todavía la certificación runtime de fixtures frescas en
`/pages/new`. La automatización del editor ya estaba bloqueada en ejecuciones
anteriores por la pestaña no vinculable; por tanto no se afirma PASS de
runtime, hard reload, desktop/mobile ni parity editor-pública.

## Resultado

`OPTIONAL_AVATAR_CODE_PASS_RUNTIME_CERTIFICATION_PENDING`

El gate congelado de producto no se emite hasta observar runtime con las
fixtures nuevas requeridas por la tarea.

**STOP_AFTER:** `true`

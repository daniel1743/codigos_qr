# QA — Borrador autenticado con receta V6

**Fecha:** 2026-08-28
**Entorno:** preview temporal del worktree aislado `codigos_qr-power-editor-isolated`
**Proyecto de prueba:** `0459b9b5-371b-4493-b683-2ce6905b3e13`
**Alcance:** carga y guardado de un único borrador propio. No se publicó contenido.

## Contexto y corrección de datos de prueba

El borrador fue creado inicialmente con el `page_config` mínimo `{"version":5,"profile":"premium","blocks":[]}`. La ruta privada, la autenticación y el inspector funcionaban, pero el canvas se veía vacío porque ese JSON no contiene bloques editables. No era un defecto de las paletas ni una pérdida de sesión.

La prueba se completó aplicando **Golden Atelier**, una receta completa V6 del catálogo local, y usando el botón **Guardar** del editor autenticado. Esta acción actualizó el `page_config` del mismo borrador; no se creó otra fila.

## Evidencia de flujo real

| Paso | Resultado observado |
|---|---|
| Identidad y propiedad | La sesión del propietario abrió la ruta privada del proyecto de prueba. La relación `profiles.user_id → auth.users.id` fue comprobada previamente mediante consultas de sólo lectura. |
| Carga inicial | El proyecto mostró el canvas vacío coherente con sus bloques vacíos. |
| Aplicación local | Se eligió **Golden Atelier** desde Recetas. El canvas mostró banner, avatar, encabezado, texto, CTAs, vídeo, servicios, reserva, adornos, redes y footer. |
| Persistencia | Tras la confirmación expresa del propietario, el botón Guardar mostró el aviso **“Borrador guardado.”** |
| Recarga | Al volver a cargar la misma URL, el editor recuperó Golden Atelier y los bloques V6; por lo tanto, no dependía sólo del estado de memoria del navegador. |
| Pruebas automatizadas | `./node_modules/.bin/vitest run`: **9 archivos, 63 pruebas correctas**. |

## Campos y operaciones preservadas

El bridge de borrador envía una clonación de `PageConfig` al servicio de actualización de borrador. La operación ejecutada fue Guardar sobre el proyecto de prueba; no se invocó Finalizar, exportación ni sincronización administrativa.

| Área | Estado de esta prueba |
|---|---|
| `page_config` | Actualizado con la receta V6 Golden Atelier. |
| `status` | Se mantuvo como `draft`; no se solicitó publicación. |
| `owner_user_id`, `profile_id`, `template_id` | No se editaron desde la UI ni por SQL durante el guardado. |
| `published_page_config`, `published_at` | No se enviaron a la operación de guardado ni se comprobó ninguna página publicada. |
| Editor heredado, QR, slugs, `public_id`, rutas públicas | No se modificaron. |
| Sincronizador de templates | No se ejecutó, especialmente no con `--apply`. |
| Git | No se creó commit, push, merge, rebase ni despliegue. |

## Limitaciones honestas

No se realizó una consulta administrativa posterior para mostrar columnas protegidas, porque no se utilizó ni se debe utilizar una credencial administrativa en el navegador. La evidencia de recuperación tras recarga, el mensaje de éxito y el contrato del servicio confirman la ruta del borrador propio; la verificación independiente de políticas contra un proyecto ajeno sigue siendo una prueba separada y no debe ejecutarse contra datos reales sin un fixture y autorización específicos.

La receta Golden Atelier queda almacenada deliberadamente en el único borrador de prueba indicado. Puede eliminarse de forma manual si se desea retirarla:

```sql
DELETE FROM public.power_editor_projects
WHERE id = '0459b9b5-371b-4493-b683-2ce6905b3e13'::uuid
  AND status = 'draft';
```

Esta reversión elimina sólo el borrador creado para QA; no revierte ni afecta otros proyectos.

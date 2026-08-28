# QA — Promoción del Power Editor V6 como editor principal

**Fecha:** 2026-08-28
**Worktree autorizado:** `/home/ubuntu/codigos_qr-power-editor-isolated`
**Alcance:** reasignar `/editor` al Power Editor V6 y conservar el editor heredado exclusivamente en `/admin/template-studio`.

## Cambio de rutas

La ruta pública autenticada `/editor` ahora monta `PowerEditorMainEntry`. Esta entrada resuelve la sesión existente, busca el perfil propio, selecciona primero un borrador `draft` y, si no existe, muestra una acción explícita para crear un borrador privado nuevo con una receta V6 completa. Nunca selecciona un proyecto `archived`.

El componente heredado se mantiene como `LegacyEditorPage`. La ruta `/admin/template-studio` continúa protegida por `AdminRouteGuard` y monta solamente ese componente. Por tanto, el editor anterior no fue eliminado ni convertido; fue preservado detrás del acceso administrativo preexistente.

| Ruta | Resultado verificado |
|---|---|
| `/editor` | Abre Power Editor V6 y recupera el borrador propio Golden Atelier. |
| `/admin/template-studio` | Mantiene el editor heredado con Perfil, Enlaces, Apariencia, QR y su guard administrativo. |
| Landing y enlaces existentes a `/editor` | No se modificaron; ahora resuelven la entrada V6 por la reasignación de la ruta. |
| QR, perfil público, `public_id`, slug y documentos seguros | No se modificaron. |

## Flujo de entrada principal

| Condición | Comportamiento |
|---|---|
| Sin sesión | Muestra el componente de autenticación existente. |
| Sin perfil propio | Muestra explicación y enlace a `/profile`; no crea perfiles. |
| Con perfil y borrador `draft` | Reutiliza el borrador propio más reciente. |
| Con perfil y sólo proyecto `published` | Reutiliza el proyecto publicado existente, sin publicar nada nuevo. |
| Sin proyecto | Ofrece una acción explícita para crear `Mi Power Editor` con la primera receta V6 completa. |
| Sólo proyectos archivados | No selecciona ninguno; ofrece crear un borrador nuevo. |

La creación está protegida por la sesión del usuario y se realiza mediante el servicio ya existente. La persistencia posterior permanece limitada al `page_config` del proyecto seleccionado mediante el bridge de borrador. El botón Finalizar no se conectó a publicación; continúa con su comportamiento local preexistente.

## Evidencia ejecutada

| Verificación | Resultado |
|---|---|
| Pruebas unitarias | `./node_modules/.bin/vitest run`: **10 archivos, 65 pruebas correctas**. |
| Nueva prueba de entrada | Verifica prioridad `draft` sobre `published`, exclusión de `archived` y clonación de una receta V6 no vacía. |
| Ruta principal autenticada | `/editor` cargó Golden Atelier desde el borrador propio y mostró el canvas V6 completo. |
| Ruta administrativa | `/admin/template-studio` cargó el editor heredado bajo su guard, con controles QR y Publicar Cambios heredados intactos. |
| Consola de navegador | No se registraron errores durante la prueba de ambas rutas. |

## Límites y operaciones no realizadas

No se creó un segundo borrador desde el flujo principal, porque el usuario ya tenía un borrador de QA propio y no se deben introducir registros adicionales sin necesidad. El flujo se cubre mediante pruebas unitarias y el contrato existente del servicio.

No se ejecutó un empaquetado completo en esta fase debido a la presión de memoria del sandbox; no debe afirmarse que el build de producción fue validado. Tampoco se hicieron commits, push, Pull Request, merge, rebase, despliegue, publicación ni sincronización administrativa de templates.

Antes de promoción a la rama principal, se requiere cerrar el preview temporal, reintentar el build con memoria disponible y realizar una revisión humana de los cambios locales agrupados.

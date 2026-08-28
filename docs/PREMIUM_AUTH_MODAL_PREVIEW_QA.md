# QA visual — Preview temporal del modal premium

**Fecha:** 2026-08-28
**Ruta temporal de revisión:** preview independiente en puerto 4181.

La vista de inicio de sesión cargó correctamente con el sello QR Cripqer, correo, contraseña, botón de ojo, casilla Mantener sesión iniciada, recuperación y cambio a Crear cuenta.

La acción Crear cuenta cambió correctamente al formulario de registro. Se verificó que aparecieron Nombre completo, correo, contraseña, Repetir contraseña, los dos controles de visibilidad, aceptación de términos, el botón Registrarse y el retorno a Iniciar sesión. Ninguna vista realizó navegación, petición de red o autenticación real durante la verificación.

El control de ojo de la contraseña se verificó en registro: el campo cambió de `password` a `text` y su etiqueta accesible pasó de “Mostrar contraseña” a “Ocultar contraseña”. Al volver a Iniciar sesión se recuperó la vista original, incluidos el checkbox Mantener sesión iniciada y el enlace de recuperación.

La revisión se hizo sobre el preview estático temporal preparado fuera de las rutas de producto, debido a que el worktree aislado no tiene dependencias instaladas por instrucción de alcance. La ruta creada para la demostración no se incluirá en la fusión; el modal queda como componente independiente para que Codex el integre donde corresponda.

# Project TODO

- [x] Auditar los componentes, estilos y flujo de autenticación existentes sin instalar dependencias.
- [x] Crear un modal independiente premium de inicio de sesión con correo, contraseña, ojo mostrar/ocultar, Mantener sesión, recuperación y acceso a registro.
- [x] Crear una vista de registro en el mismo modal con nombre, correo, contraseña, confirmación, términos y botón Registrarse.
- [x] Mantener los botones como interacciones locales sin crear sesiones, cuentas, rutas, peticiones ni cambios de Supabase.
- [x] Usar un símbolo QR minimalista alineado con Cripqer en lugar del avatar genérico de la referencia.
- [ ] Verificar accesibilidad, interacción, responsividad y no regresión antes de solicitar aceptación.
- [ ] Ejecutar build y pruebas del modal cuando la rama se abra en un entorno con dependencias existentes, sin instalar paquetes durante esta fase aislada.
- [x] Documentar el modal aislado y el contrato de integración futura sin modificar autenticación real.
- [ ] Crear una ruta temporal exclusiva de demostración del modal, sin integrarlo en navegación, autenticación ni rutas reales.
- [ ] Levantar y verificar el preview aislado del modal en escritorio y móvil antes de solicitar aceptación.
- [ ] Respaldar, revisar y fusionar el modal independiente en `main` sin montar su ruta demo ni reemplazar `Auth.tsx`.
- [ ] Entregar a Codex el handoff para conectar el modal a la autenticación real en un incremento posterior.
- [x] Preparar y revisar un preview estático temporal fuera de rutas de producto; la ruta demo no se incorporará a `main`.

# Modal premium de acceso y registro — Handoff

**Rama aislada:** `feat/premium-auth-modal`
**Worktree:** `/home/ubuntu/codigos_qr-auth-modal`
**Alcance:** componente independiente de interfaz; no está montado en rutas ni conectado a Supabase.

## Entregable

Se crearon dos componentes independientes dentro de `src/components/`.

| Archivo | Uso |
|---|---|
| `PremiumAuthModal.tsx` | Modal controlado y reutilizable de inicio de sesión y registro. |
| `PremiumAuthModalDemo.tsx` | Contenedor de demostración no montado que permite previsualizar el componente en una futura ruta temporal o Storybook. |

El diseño adopta el lenguaje de la referencia: fondo teal oscuro con gradientes suaves, contenedor de líneas finas, título ligero, botón destacado y composición centrada. El icono genérico se reemplazó por un **QR minimalista** dentro de un sello circular con la etiqueta Cripqer.

## Funcionalidad local incluida

| Vista | Controles |
|---|---|
| Inicio de sesión | Correo, contraseña, botón de ojo para mostrar/ocultar, casilla “Mantener sesión iniciada”, “¿Olvidaste tu contraseña?”, botón “Iniciar sesión” y acceso a “Crear cuenta”. |
| Registro | Nombre completo, correo, contraseña, repetir contraseña, ojos independientes para ambos campos, aceptación de términos y botón “Registrarse”. |
| Validaciones locales | Contraseñas coincidentes y aceptación de términos antes de continuar el registro. |
| Accesibilidad | Etiquetas asociadas, tipos de campo apropiados, `autocomplete`, nombres de botones de ojo, foco visible y avisos de estado mediante `aria-live`. |

Los botones de Iniciar sesión, Registrarse y Recuperar contraseña cambian el estado local o emiten callbacks opcionales. Si no se les entrega callback, muestran un aviso que indica claramente que la conexión real no está activa.

## Contrato de integración futura

El componente se controla desde su padre, por lo que puede montarse más adelante dentro de una barra superior, el sidebar móvil o una ruta protegida:

```tsx
const [authOpen, setAuthOpen] = useState(false);

<PremiumAuthModal
  open={authOpen}
  onOpenChange={setAuthOpen}
  onLogin={({ email, password, rememberMe }) => {
    // Integrar aquí la autenticación aprobada.
  }}
  onRegister={({ name, email, password, termsAccepted }) => {
    // Integrar aquí el registro aprobado.
  }}
  onForgotPassword={(email) => {
    // Integrar aquí el envío de recuperación aprobado.
  }}
/>
```

> No se debe copiar lógica de `Auth.tsx` dentro de este modal ni importar `getBrowserSupabaseClient` directamente. La integración debe ocurrir desde una capa contenedora autorizada, con manejo de carga, error, sesión y navegación definido como un incremento separado.

## Salvaguardas respetadas

| Área | Estado |
|---|---|
| Supabase | No hay importación ni llamada de Supabase. |
| Red | No hay `fetch`, Axios ni peticiones HTTP. |
| Sesiones y cuentas | No se crea sesión, no se registra usuario y no se envía contraseña. |
| Rutas | No se añadió ni modificó ruta. |
| Dependencias | No se instalaron paquetes; se usaron Dialog y Lucide ya disponibles en el repositorio. |
| Componentes existentes | `Auth.tsx` permanece sin modificaciones. |
| Datos y QR | No se modificaron tablas, QR ni contenido público. |

## Validación realizada y limitación

Se comprobó la higiene del diff y se verificó estáticamente que los dos componentes nuevos no contienen llamadas a `getBrowserSupabaseClient`, `supabase.auth`, `fetch` ni Axios.

El worktree restaurado desde `main` no contiene `node_modules`; los binarios locales `vite`, `vitest` y `tsc` no están disponibles. Dado que la instrucción fue no instalar dependencias ni crear un proyecto adicional, no se ejecutaron build ni pruebas automatizadas. Sí se revisó un preview estático temporal, fuera de las rutas de producto, para comprobar el diseño y las interacciones locales. Esta limitación debe cerrarse en un entorno con dependencias instaladas antes de conectar la autenticación real.

## Checklist de continuación

1. Ejecutar build y pruebas en un entorno con las dependencias existentes.
2. Montar temporalmente `PremiumAuthModalDemo` sólo para revisión visual, o integrarlo desde el sidebar cuando ese trabajo esté aprobado. La ruta de demostración creada para la inspección no se incluirá en `main`.
3. Revisar en viewport móvil que el modal mantenga scroll interno y que todos los controles sean alcanzables.
4. Definir el flujo real de Supabase en un contenedor separado y pedir autorización antes de habilitar cualquier envío de credenciales.
5. Tras aceptación, crear commit y push de la rama `feat/premium-auth-modal`; no mezclarla con la rama del Power Editor V6 salvo que se solicite expresamente.

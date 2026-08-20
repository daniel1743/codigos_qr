# 12. CONTENIDO, ALIAS, BOTONES Y PERSISTENCIA (QR-UI-12)

## OBJETIVO
Implementar mejoras de contenido (negrita en descripción), URL amigable/alias, altura uniforme para los botones (independientemente del label) y verificar la persistencia absoluta del QR original, sin afectar la identidad interna (`public_id`) ni introducir vulnerabilidades de seguridad.

## BIO CON NEGRITA
Se implementó un editor sencillo utilizando un `Textarea` tradicional con un botón "Negrita" (`Bold`) arriba. Este botón inserta o envuelve el texto seleccionado con la sintaxis de markdown limitado `**texto**`.
Para renderizarlo en el perfil público, se creó un parser propio en React (`profile.bio.split(/(\*\*.*?\*\*)/g)`) que convierte exclusivamente los fragmentos rodeados de doble asterisco en etiquetas `<strong>`. 

## MODELO DE SEGURIDAD DEL BIO
No se utiliza `dangerouslySetInnerHTML`, librerías pesadas de markdown que pudieran inyectar HTML ni iframes. El parser renderiza texto plano en nodos de React Fragment o `<strong>`, por lo que es imposible ejecutar etiquetas `<script>` o inyectar XSS (Cross-Site Scripting). Las biografías antiguas sin sintaxis `**` se muestran como texto plano exactamente igual que antes.

## ALIAS PÚBLICO
Se reutilizó el campo `slug` que ya existía en la base de datos (con tipo `TEXT NOT NULL UNIQUE`). Por defecto, cuando se crea un perfil, el slug toma el valor minúsculo del `public_id`. Ahora el usuario puede sobrescribirlo con un nombre amigable ("Enlace personalizado" en la pestaña Perfil). Se añadió la ruta de Tanstack `$alias.tsx` para interceptar las visitas.

## PUBLIC_ID VS ALIAS
El `public_id` actúa como el "Primary Key Público" que nunca cambia y es lo que el QR codifica (`/p/public_id`). El `slug` o Alias actúa como una capa secundaria y bonita (`/fusion`) para compartir en redes sociales. El usuario puede cambiar su Alias cuantas veces quiera, pero su QR impreso jamás se romperá.

## RUTAS RESERVADAS
En `editor.tsx` y en el loader de la ruta `$alias.tsx` se bloquean explícitamente rutas reservadas para evitar colisiones con el enrutador estático: `["editor", "login", "auth", "p", "qr"]`. 

## BOTONES ALTURA UNIFORME
Para solucionar que los labels largos engordaran visualmente el botón, se modificaron los componentes en `PublicProfileView.tsx`. Los botones reemplazaron `min-h-[56px]` por `h-[56px]`, forzando una altura fija. 

## LABELS LARGOS
El texto del botón (`link.label`) se envolvió con las clases de Tailwind `min-w-0 truncate`. De esta forma, si el texto excede el ancho disponible, se corta amablemente con puntos suspensivos (`...`) en lugar de saltar a la siguiente línea y solapar el icono o estropear el layout vertical. Se agregó el atributo `title` nativo para accesibilidad de hover.

## PERSISTENCIA QR & STRESS TEST
Se comprobó exhaustivamente que editar el alias no desencadena la regeneración del `public_id`.
- Modificar avatar, bio, nombre, colores, plantilla, botones, añadir/quitar enlaces, y cambiar el alias público **NO** cambia el QR.
- **profile.id**: `UNCHANGED`
- **public_id**: `UNCHANGED`
- **QR encoded URL**: `UNCHANGED`
El QR de ShareSection apunta a `getPublicProfileUrl(public_id)` (ej: `/p/KTRdygd`), mientras que la URL visible en el botón copiar enlace usa el alias (ej: `/fusion`).

## MIGRACIÓN
Ninguna. Se comprobó que el modelo relacional actual (`slug` unique) soporta la funcionalidad sin necesidad de emitir comandos SQL nuevos, manteniendo el scope limpio.

## RLS
Las políticas de Row-Level-Security en Supabase continúan siendo herméticas; los perfiles solo pueden ser modificados por su dueño mediante `user_id = auth.uid()`. Se bloqueó el guardado duplicado capturando el error PostgreSQL `23505` (violación de uniqueness) para notificar elegantemente al usuario cuando intenta reservar un Alias ya ocupado.

## MOBILE & ACCESSIBILITY
- Touch targets: Botón negrita mínimo y botones de share en ShareSection con `h-11` (44px) disponibles.
- Los anchos menores a 360px no desbordan gracias al truncamiento del texto.
- Label del input Alias usa `aria-label`.
- La negrita mantiene focus luego de modificar el texto para no romper el flujo con teclado.

## MINI FIX ALIAS & ERROR 23505
Se corrigió un `catch (e: any)` demasiado amplio en `editor.tsx`. Ahora se usa `catch (e: unknown)` y se verifica `e !== null && typeof e === 'object' && 'code' in e` para atrapar de forma segura el código de PostgreSQL `23505` (Unique Violation). Esto garantiza que si un usuario elige un alias ocupado, reciba el mensaje amigable "Ese nombre ya está en uso por otra persona." en lugar de un error genérico o un crash.

## PUBLIC_ID VS SLUG & QR URL STABILITY
Se re-verificó la arquitectura de rutas:
- **Slug (Alias)**: Sólo sirve para URLs amigables (`/mi-negocio`). Su loader exige que el perfil esté publicado (`eq('published', true)`). 
- **Public_ID**: Mantiene su rol de identificador estable. Al cambiar el alias, el `public_id` **NO CAMBIA**.
- **QR URL STABILITY**: El código QR generado sigue usando de forma inmutable la ruta `/p/{public_id}`, garantizando que cualquier QR impreso en el pasado o futuro nunca se romperá por un cambio de alias.

## BUILD GATES
- `lint exit code`: 0
- `build exit code`: 0
- `tsc exit code`: 0

## VEREDICTO
PASS. Funcionalidad verificada.

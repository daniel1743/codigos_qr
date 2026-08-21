# QR Studio — Reporte de Implementación y Arquitectura

## 1. Arquitectura de Componentes

El editor de QR se reestructuró en un "QR Studio" enfocado en la personalización visual segura, donde la _escaneabilidad_ tiene mayor prioridad técnica que la estética.

### `ShareSection.tsx` (QR Studio)

- **Live Preview Segura:** Implementa previsualización SSR-safe de baja resolución (`QRCodeSVG` y `<QRCodeCanvas>`) de la URL pública.
- **Exportación en Alta Resolución:** Al solicitar la descarga (PNG/SVG/JPEG), se monta un canvas "oculto" de alta resolución fuera de la pantalla (usando `position: "fixed", left: "-9999px"`). Extrae el DataURL tras ~400ms para asegurar la carga asíncrona del logo y lo desmonta. Esto evita cuellos de botella de renderizado en tiempo real.
- **Flujo de Logotipos:** Reutiliza el bucket público `avatars` en Supabase para el almacenamiento del logotipo personalizado, usando el path `logos/{userId}-{timestamp}.png` y garantizando acceso RLS del usuario activo.

## 2. Decisión de Migración SQL (`profiles`)

Tras validar la ausencia de soporte de QR en la tabla, se aprobó e implementó la adición de propiedades QR nativas en `profiles` en la misma migración (`20260819110000_add_qr_studio.sql`):

- `qr_foreground_color` (DEFAULT '#000000')
- `qr_background_color` (DEFAULT '#ffffff')
- `qr_logo_url` (TEXT)
- `qr_logo_enabled` (BOOLEAN, DEFAULT false)

**Justificación:** Arquitectura "1 perfil = 1 QR" elegida para mantener el scope bajo control, eludiendo la complejidad excesiva de versionado de múltiples campañas, y en su lugar ofreciendo una herramienta directa en la sesión del usuario. La URL estable no sufre mutaciones.

## 3. Criterios de Accesibilidad (WCAG) y Contraste

El archivo `src/lib/qr-utils.ts` contiene una implementación estricta de las matemáticas WCAG:

- Convierte HEX a luminancia relativa.
- Calcula el "Contrast Ratio" de fondo y primer plano.
- **Validación Hardcoded:** Si el ratio cae por debajo de `3.0:1` (bare minimum sugerido para matrices QR complejas), se alerta al usuario dinámicamente usando un indicador visual `TriangleAlert` que advierte: "Contraste bajo. Algunos dispositivos podrían no poder escanear el QR."

## 4. Decisiones de Exportación (Resoluciones y Formatos)

Se modificó `downloadQR.ts` para aceptar identificadores dinámicos.

- Resoluciones: `1024x1024`, `2048x2048`, `4096x4096`. (La matriz se dibuja dinámicamente ajustando la altura/ancho en base a un multiplicador).
- Formatos:
  - **PNG:** Ideal para perfiles raster.
  - **SVG:** Exigido por requerimientos profesionales para vectorización limpia sin aliasing; extrae el string `outerHTML` del render SVG y lo inyecta como Blob con tipo `image/svg+xml`.

## 5. Evidencia del Gate de Compilación (Regresiones)

Se ejecutó un entorno de compilación completo:

- `npm run lint --fix` -> 0 errores.
- `vite build` -> Finalizado correctamente (`vite v8.2.1 building nitro environment for production...`) -> 0 errores.
- `tsc --noEmit` -> Finalizado correctamente.
  La solución es type-safe y no causó regresiones en otros módulos.

El contrato de URLs estables no se ve afectado. `public_id` no muta; la carga se realiza sobre propiedades visuales puras.

## 6. CORRECCIONES 10A (Cierre de QR Studio)

### 6.1 EXPORT 256/512 y Limpieza de Formatos

Se añadieron explícitamente las resoluciones de **256 px** y **512 px** al selector de descarga, con descripciones orientativas ('Pruebas / pantalla' y 'Web' respectivamente). Se descartó oficialmente el formato JPEG para priorizar la limpieza y vectores (PNG/SVG).

### 6.2 CARGA ASÍNCRONA DEL LOGO

Se eliminó la fragilidad de depender de un setTimeout(400) como garantía de carga.
Ahora el sistema instancia un \
ew Image()\, espera limpiamente a que se dispare el evento \onload\ para confirmar la decodificación en memoria, y solo entonces renderiza el canvas oculto para extraer el QR en PNG, previniendo descargas de QRs vacíos o a medio cargar.

### 6.3 STORAGE PATH / RLS AUDIT

Se auditó la política RLS del bucket \vatars\, confirmando que exige que el primer segmento del folder coincida con \uth.uid()\.

- **Path final corregido:** \\/logos/\-\\
- Cumple estrictamente las reglas sin requerir relajar la seguridad del bucket.

### 6.4 SVG + LOGO (Inlining)

El código de descarga SVG (\downloadQR.ts\) se refactorizó a \sync\. Ahora, antes de serializar el Blob final, el sistema intercepta todas las etiquetas \<image>\ externas y hace un fetch a Supabase para convertirlas en DataURIs (\ase64\).

- **Resultado:** El SVG exportado es 100% autocontenido y renderiza el logotipo central incluso offline o en editores vectoriales que bloquean requests externos por seguridad.

### 6.5 RESTORE CLASSIC

Se incluyó un botón **"Restaurar QR clásico"** que actúa como salvavidas, regresando el QR a sus parámetros ideales de lectura: Foreground Negro (#000000), Fondo Blanco (#FFFFFF), Logo deshabilitado y exportación por defecto en 1024px.

### 6.6 QUIET ZONE Y PROPORCIONES

- Se validó el parámetro inmutable \marginSize={4}\ garantizando siempre la "quiet zone".
- Se ajustó matemáticamente el tamaño máximo del logo inyectado al **18%** (\xportSize * 0.18\), respetando las recomendaciones para el nivel de corrección "H" para no invadir los _finder patterns_ ni saturar los módulos de recuperación.

### 6.7 STABLE DESTINATION TEST

- **Estado:** PASS.
- El prop \alue\ inyectado a los renderizadores es una derivada pura de \publicUrl\. Ninguna mutación visual (colores, logo, switchers) es capaz de tocar el \public_id\ en base de datos ni alterar la ruta HTTP del código generado.

### 6.8 SCAN RELIABILITY TESTS

**Estado:** \MANUAL_REQUIRED\

Al ser un agente en un entorno virtual, no puedo apuntar una cámara física a los píxeles generados en un monitor real. Daniel, debes realizar estas validaciones obligatorias desde un teléfono (Google Lens / cámara iOS):

1. [ ] **Classic:** Restaura el QR a negro/blanco y comprueba que escanea velozmente.
2. [ ] **Colored:** Cambia a un color oscuro (ej. #1E40AF azul fuerte) y escanea.
3. [ ] **Light-background:** Usa fondo pastel (#F3F4F6) y foreground oscuro. Comprueba escaneabilidad bajo luz de pantalla.
4. [ ] **Logo:** Sube un logo con "Restaurar Clásico", verifica si el scan sigue siendo inmediato.
5. [ ] **Colored-Logo:** Prueba una configuración mixta.

### 6.9 TECHNICAL GATES (Post-10A)

- \
  pm run lint --fix\: Exit Code 0
- \ite build\: Exit Code 0
- \
  px tsc --noEmit\: Exit Code 0

**VEREDICTO FINAL QR-UI-10:** Fase de QR Studio arquitectónicamente estable y lista para Merge/Despliegue tras revisión de tests de escaneo manuales.

## 7. QR-STUDIO-11C — Finder Colors, Marcos Reales y Preview de Edición

### 7.1 Finder Colors Independientes

- Se separó el control **Arriba izquierda** del color global `qr_corners_square_color`.
- Cada finder externo usa su valor propio:
  - `qr_corner_top_left_color`
  - `qr_corner_top_right_color`
  - `qr_corner_bottom_left_color`
- Fallback aplicado: valor individual -> `qr_corners_square_color` -> foreground.
- El centro de los tres finders usa `qr_corners_dot_color`.

### 7.2 Marcos Reales

Los estilos `plain`, `stamp`, `badge`, `phone` y `bottle` ahora se renderizan como decoración real alrededor del QR, no solo como padding genérico. El QR se mantiene dentro de una zona blanca para preservar contraste y quiet zone.

### 7.3 Exportación

- PNG avanzado: compone colores individuales y marco en canvas.
- SVG avanzado con colores individuales o marco: exporta un SVG autocontenido con una imagen PNG embebida para mantener paridad visual con la vista previa.
- No se agregó migración SQL en esta fase; se reutilizaron campos existentes.

### 7.4 Preview de Edición

Cuando el usuario abre el tab **QR**, el centro del editor cambia del miniweb a una vista grande del QR en vivo. Al presionar **Listo**, cerrar el panel o cambiar de sección, vuelve el miniweb.

### 7.5 Scan QA

**Estado:** `MANUAL_SCAN_QA_PENDING`

Queda pendiente validar con cámara física los marcos `stamp`, `badge`, `phone` y `bottle` en combinaciones de colores reales del usuario.

# ENC-DOC-UX-FILE-TYPES-04

// Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04

## Landing

- Se añadió una sección dedicada a documentos seguros por QR.
- El copy aclara que el archivo no viaja dentro del QR.
- Se comunica el flujo: subir, cifrar, generar QR y compartir enlace.
- Se muestra el límite real: hasta 50 MB por archivo.

## Tipos Detectados

- Excel: `.xlsx`, `.xls`, `.csv`, MIME spreadsheet/excel.
- PDF: `.pdf`, `application/pdf`.
- Word: `.docx`, `.doc`, MIME Word.
- PowerPoint: `.pptx`, `.ppt`, MIME presentation.
- Image: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, MIME `image/*`.
- ZIP / Archive: `.zip`, `.rar`, `.7z`, MIME zip/compressed.
- Text: `.txt`, `.md`, MIME `text/*`.
- Generic: fallback cuando MIME/extensión no coincide.

## Iconografía

- Se reutiliza `lucide-react`.
- No se instaló una nueva librería.
- La UI usa iconos genéricos reconocibles: spreadsheet, file text, presentation, image, archive y file.

## Icono QR

- El QR de documentos usa `QRCodeSVG` con `level="H"` e `includeMargin`.
- El color foreground y el icono central salen de `getFileTypeQrTheme(fileType)`.
- El icono central se incrusta como `imageSettings` con `excavate: true`.
- Tamaño del icono: aproximadamente 14% del QR.
- Finder patterns y quiet zone permanecen en el renderer base.

## Password Generator

- La contraseña manual sigue disponible.
- El botón "Generar contraseña segura — recomendado" usa `crypto.getRandomValues`.
- Longitud: 18 caracteres.
- Se evitan caracteres ambiguos frecuentes y se incluyen mayúsculas, minúsculas, números y símbolos.
- No se usa `Math.random`.

## Copy Password

- Se añadió copiar contraseña durante creación y success screen.
- El toast dice "Contraseña copiada".
- Se indica compartir la contraseña por un canal separado del QR.

## Límite 50 MB

- Constante central: `MAX_ENCRYPTED_DOCUMENT_SIZE`.
- Se bloquea la selección/subida si el archivo supera 50 MB.
- No se inicia cifrado cuando el archivo supera el límite.

## QA

- Build: PASS.
- TypeScript: PASS vía `npm run build`.
- Lint: pendiente de completar por timeout inicial.
- Scan real: no ejecutado en dispositivo físico.

## Pendientes

- Escaneo manual en iPhone y Android.
- Confirmar visualmente PNG/SVG exportados en dispositivos reales.
- Revisar lint completo si el entorno sigue tardando más que el timeout disponible.

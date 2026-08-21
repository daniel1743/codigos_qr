# Cambios Importantes en el Menú del Editor (Reorganización UX)

Este documento detalla la reorganización del menú del editor para dispositivos móviles (de 6 a 5 botones) y la integración del nuevo módulo de seguridad. Guarda este archivo para referencia futura.

---

## 1. Resumen del Cambio
Anteriormente, el menú inferior en teléfonos móviles mostraba **6 accesos directos**. Para mejorar la usabilidad, evitar que los textos colisionaran y limpiar la interfaz en pantallas pequeñas, se simplificó el menú a **5 accesos directos** agrupando las funciones de personalización bajo la pestaña única de **Apariencia**.

---

## 2. Equivalencias: ¿Dónde están las funciones antiguas?

| Botón / Pestaña Antigua | Nueva Ubicación en el Editor | ¿Qué incluye? |
| :--- | :--- | :--- |
| **1. Datos** | ➔ **Perfil** | Nombre para mostrar, Biografía, Enlace (slug) y Pie de página. |
| **2. Enlaces** | ➔ **Enlaces** | Lista de redes, enlaces personalizados, descripciones Pro y fotos por enlace. |
| **3. Diseño** | ➔ **Apariencia** -> *Personalizar* | Elección de plantillas, color/tipo de Fondo, colores de Botones y forma de Avatar. |
| **4. Texto** | ➔ **Apariencia** -> *Tipografía* | Familia de fuentes, tamaños, peso y alineación de textos de la página. |
| **5. Elementos** | ➔ **Apariencia** -> *Decoración* | Formas de fondo flotantes (círculos, líneas, cuadrados) y partículas en movimiento. |
| **6. QR** | ➔ **QR** | Vista previa, patrones de puntos del QR, logotipos del QR y opciones de descarga (PNG/SVG). |

> [!NOTE]
> Para editar **Tipografía (Texto)** o **Decoración (Elementos)** manualmente, solo debes tocar la pestaña **Apariencia**, abrir el menú desplegable **"Personalizar manualmente"** y allí verás estas subsecciones listas para editar.

---

## 3. Nueva Integración: "Documentos Seguros"
Se ha añadido un nuevo acceso directo al menú lateral (escritorio) y barra inferior (móvil):
* **Ícono:** Candado azul (`Lock`).
* **Nombre:** **Docs Seguros**.
* **Función:** Permite subir archivos (PDF, Excel, Word, ZIP, imágenes) con encriptación local en el navegador (AES-256) y generar un QR protegido para compartirlos de manera privada.

---
*Documento creado el 21 de agosto de 2026 para el control de versiones de QR-UI.*

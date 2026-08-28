# QA — Alineación y enlaces de tarjetas

## Funcionalidad comprobada

| Capacidad | Resultado |
|---|---|
| Alineación de título | El selector `Alineación Título` ofrece izquierda, centro, derecha y justificado; se aplicó `Centro` al canvas. |
| Alineación de descripción | El inspector expone un selector independiente para descripción con los cuatro valores. |
| Alineación de CTA | El inspector expone un selector independiente para CTA; el botón se posiciona según el valor configurado. |
| Tarjeta clicable | Activar `Hacer tarjeta clicable` revela `URL de tarjeta`. En edición continúa seleccionando la tarjeta; en preview pasa a semántica de enlace. |
| CTA opcional | `Mostrar botón CTA` habilita o elimina el botón visual. Sus campos de texto y URL sólo se muestran cuando el CTA está activo. |
| Navegación aislada a preview | Con la URL de prueba `https://example.com/card-preview-test`, al activar vista previa y pulsar la tarjeta, el navegador llegó a la URL de prueba. No se ejecuta navegación desde el modo de edición. |
| Accesibilidad | La tarjeta es accionable con Enter/Espacio cuando funciona como botón de selección en edición. En preview con URL obtiene rol link y foco visible. |

## Pruebas

`richCards.test.ts` pasó con seis pruebas, incluyendo creación, imagen 75/25, compatibilidad anterior, actualización inmutable, alineaciones independientes y enlace opcional.

## Límites

La prueba de destino usa Example Domain como URL neutral. No se creó ruta pública, no se añadió publicación ni se modificó el renderer público del producto. La configuración permanece únicamente dentro de `PageConfig` del Power Editor aislado.

# QA — Zoom exclusivo del canvas

## Hallazgo

La escala de zoom ya se calculaba en `EditorCandidate.tsx` y se aplicaba a `.ep-canvas-scale`, pero el shell no tenía un aislamiento explícito de altura, overflow y transformación. En pantallas grandes o tras varios acercamientos podía percibirse como si la interfaz completa acompañara al canvas, y la página podía permitir desplazamiento no deseado.

## Corrección localizada

La corrección se limita a `editor-candidate-fixes.css`. El editor ahora ocupa `100dvh` y oculta overflow global; su layout conserva altura y overflow local. Header, rail, inspector, toolbar y sheet reciben una regla explícita de tamaño fijo y `transform: none; zoom: 1`. El único elemento que declara `will-change: transform` y recibe la matriz de zoom continúa siendo `.ep-canvas-scale` dentro de `.ep-workspace`.

## Medición posterior a zoom visible

Se pulsó el control `+` del editor y el estado visible indicó `135% · desktop`.

| Región medida | Resultado | Interpretación |
|---|---:|---|
| Transformación de canvas | `matrix(1.35, 0, 0, 1.35, 0, 0)` | El zoom llegó a la capa del canvas. |
| Template | `527 × 932 px` | Corresponde a `390 × 690 px` escalado 1,35. |
| Header | `1280 × 58 px` | Sin cambio de tamaño ni posición. |
| Rail de herramientas | `196 × 1042 px`, `x=0` | Sin cambio de tamaño ni posición. |
| Inspector | `312 × 1042 px`, `x=968` | Sin cambio de tamaño ni posición. |
| Workspace | `772 × 1042 px`, `x=196` | Contiene y recorta el template aumentado. |
| Overflow global de editor | `hidden` | No existe scroll global provocado por el zoom. |

La captura de QA está en `/home/ubuntu/screenshots/4174-iy9ysjmlbgdd9z0_2026-08-27_22-55-55_8703.webp` y muestra canvas al 135% con rail e inspector completos y estáticos.

Como control adicional, se seleccionó el enlace `Explorar trabajos` mientras el canvas seguía a 135%. El inspector cambió a `Color`, abrió sus controles completos y conservó las dimensiones del rail e inspector. Por tanto, la selección continúa funcionando dentro de la capa escalada sin trasladar la escala a la interfaz.

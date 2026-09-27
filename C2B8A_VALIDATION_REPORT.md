# C2B8A · Reporte de validación — Español latino + lenguaje humano

**Fase:** `CRIPQER — C2B8A`
**Base SHA:** `f1cf3544a63a39b882b3f277fdd930fdab516748`
**Rama:** `feat/analytics-c2b8a-es-latam` (worktree limpio: `…\generador de QR - c2b8a-es-latam`)
**SHA final:** `c1de81d2e17b3e4c9c7a2ec9b66c24790087451b` (commit único de la fase en `feat/analytics-c2b8a-es-latam`; 18 archivos, +1690 / −334; **sin push y sin merge**)
**Canary protegido:** `VvUsngW` · page `1c4aa062-a012-47e4-b0f1-99ca8e80d1ec`

> **Alcance de esta validación.** Todo lo que se puede comprobar en este entorno se comprobó
> y está abajo con su evidencia. Dos gates **no** se pudieron ejecutar aquí y se declaran
> explícitamente como **PENDIENTES** con el procedimiento exacto: la **QA visual móvil/escritorio**
> (no hay navegador en este entorno) y la **QA del canary en producción** (requiere deploy
> autorizado y credenciales de Supabase). No se reportan como PASS.

---

## 1. Matriz de pruebas

### 1.1 Idioma

| ID | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| LANG-01 | No queda inglés visible en Analytics productivo | **PASS** | 3 pruebas automáticas: corpus de los 11 escenarios (widgets, insights, brief, metas) + etiquetas estáticas + guardia de código sobre 5 archivos de presentación y la ruta |
| LANG-02 | No queda jerga técnica como título principal | **PASS** | 76 tokens prohibidos (`ctr`, `engagement`, `funnel`, `baseline`, `traffic`, `insight`, `performance`, `hot window`, `signals`, `attribution`, `unique users`, `session`…) verificados por palabra completa sobre todas las cadenas de primera capa |
| LANG-03 | Términos técnicos solo como capa secundaria | **PASS** | Test que exige que los 7 términos técnicos de `METRIC_COPY` empiecen con `(` y terminen con `)` |
| LANG-04 | Español latino neutral, sin traducciones literales | **PASS** | Revisión 1:1 de las 265 cadenas (ver inventario) + decisiones de significado §4 del reporte de implementación |

### 1.2 Significado

| ID | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| SEM-01 | Views sigue significando visitas, no visitantes únicos | **PASS** | `Visitas (vistas)` ≠ `Personas distintas que visitaron (visitantes únicos)`; test explícito |
| SEM-02 | WhatsApp click no se describe como mensaje enviado | **PASS** | `Entró a WhatsApp`; test que prohíbe “mensaje”, “envió”, “escribió”, “habló contigo” en todo el copy visible |
| SEM-03 | Interaction no se describe como persona única | **PASS** | `Acciones realizadas (interacciones)` sin la palabra “personas” |
| SEM-04 | Conversion conserva el contrato actual | **PASS** | `Personas que completaron una acción (conversión)`; mensaje derivado de `conversionRate` (`lead_created / views`), sin cambios de fórmula |
| SEM-05 | Traducir no altera ningún número | **PASS** | Test que verifica que `devicesEs`/`sourcesEs`/`funnelEs` conservan `value`, `previousValue`, `deltaPct`, `share`, `stepRate`, `dropOff` y solo cambian `label` |
| SEM-06 | Coma decimal sin cambio de valor | **PASS** | `decimalEs(0.25) === "0,25"`, `rateEs(0.123) === "12,3%"` |

### 1.3 Honestidad

| ID | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| VER-01 | Sin números sintéticos | **PASS** | El brief de aprendizaje cita `metrics.totals.views` y `metrics.totals.interactions` reales (escenario `no_data` → 0 y 0) |
| VER-02 | Sin `baseline` en el modo aprendizaje | **PASS** | El texto visible no contiene la palabra y el umbral honesto `LEARNING_THRESHOLD = 25` no se tocó |
| TRU-01 | Nunca se afirma mensaje, compra o cliente | **PASS** | Lista de afirmaciones prohibidas verificada sobre todo el copy y sobre el corpus completo |

### 1.4 Regresión

| ID | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| REG-01 | Canary `VvUsngW` sigue cargando V1.1 real | **PENDIENTE** | Requiere producción + deploy autorizado (no ejecutado aquí). Ver §5 |
| REG-02 | Los eventos del canary siguen produciendo los mismos números | **PENDIENTE** | Requiere lectura de producción. Ver §5 |
| REG-03 | Página ajena continúa bloqueada | **PASS** | `analytics-no-session.test.tsx` (3 pruebas) + guardia de propiedad intacta en la ruta |
| REG-04 | Sin sesión continúa mostrando CTA de login | **PASS** | Mismo test: `Debes iniciar sesión para ver estadísticas.` + `a[href="/login"]` con “Iniciar sesión” |
| REG-05 | Learning mode continúa activo bajo el mismo threshold | **PASS** | `LEARNING_THRESHOLD` sin cambios; test VER-01 lo comprueba en el escenario sin datos |
| REG-06 | Gate C2B8 (`feature-gate` + `dashboard-mode`) intacto | **PASS** | `analytics-canary-gate.test.ts` (7 pruebas) + `dashboard-mode.test.ts` |
| REG-07 | Allowlist sin ampliar, sin migraciones, sin RLS/RPC | **PASS** | `git diff --stat`: 13 archivos de UI/copy + 2 nuevos; 0 archivos en `supabase/` |
| REG-08 | Wiring de tracking público intacto | **PASS** | `magic-public-analytics-wiring.test.ts` + `magic-public-analytics.test.tsx` |

### 1.5 Responsive

| ID | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| UI-01 | Escritorio sin overflow, cortes ni textos ilegibles | **PENDIENTE (QA visual)** | Revisión estática PASS; QA visual real no ejecutada (§6) |
| UI-02 | Móvil sin overflow, cortes ni tarjetas rotas | **PENDIENTE (QA visual)** | Revisión estática PASS; QA visual real no ejecutada (§6) |

---

## 2. Pruebas ejecutadas

Comando base (Vitest 4.1.11, sin config adicional; `--dir src` evita que el escáner entre en el
proyecto anidado del repositorio):

```
node node_modules/vitest/vitest.mjs run --dir src <rutas> --reporter=dot
```

| Suite | Archivos | Pruebas | Resultado |
| --- | --- | --- | --- |
| `src/components/intelligent-analytics` + `src/lib/analytics` + `analyticsRealData.test.ts` | 16 | **116** | ✅ PASS |
| ↳ de las cuales **nuevas de C2B8A** (`human-language.test.ts`) | 1 | 13 | ✅ PASS |
| `src/routes/__tests__/analytics-canary-gate.test.ts` | 1 | 7 | ✅ PASS |
| `src/routes/__tests__/magic-public-analytics-wiring.test.ts` | 1 | 8 | ✅ PASS |
| `src/routes/__tests__/analytics-no-session.test.tsx` | 1 | 3 | ✅ PASS |
| `src/routes/__tests__/pages.routing.test.ts` | 1 | 5 | ✅ PASS |
| **Total ejecutado** | **20** | **139** | ✅ **PASS** |

Comparación contra la línea base previa a los cambios (misma base `f1cf3544`):

| Momento | Archivos | Pruebas | Fallos |
| --- | --- | --- | --- |
| Antes (baseline C2B8) | 15 | 103 | 0 |
| Después (C2B8A) | 16 | 116 | 0 |
| Delta | +1 archivo de contrato nuevo | **+13 pruebas** | **0 regresiones** |

### 2.1 Verificaciones estáticas

| Chequeo | Resultado |
| --- | --- |
| `tsc --noEmit` | ✅ Sin salida (0 errores) |
| `git diff --check` | ✅ Sin problemas de espacio en blanco |
| Escaneo de inglés residual en la capa de presentación | ✅ 29 frases de C2B8 protegidas por test |
| Escaneo de inglés/jerga en la salida de los motores | ✅ 76 tokens, 11 escenarios |
| Escaneo de la ruta (`Analytics QA`, `Intelligent Analytics`, `session_id`, `QA fixtures`) | ✅ Sin coincidencias |
| Revisión manual del diff | ✅ 13 archivos + 2 nuevos; ningún archivo de cálculo, migración o gate |

---

## 3. Build

| Comando | Resultado |
| --- | --- |
| `npm run build` (`vite build` + nitro · preset `vercel`) | ✅ **PASS** |

Salida relevante:

- Cliente: `✓ built in 17.31s`
- SSR: `673 modules transformed` → `.vercel/output/functions/__server.func/index.mjs 8,143.37 kB │ gzip: 1,610.95 kB` → `✓ built in 15.47s`
- Nitro: `✓ Generated .vercel/output/nitro.json`
- Sin errores. Los *warnings* `lightningcss: Unknown at rule: @theme` y el aviso de tamaño de chunk son **preexistentes** (Tailwind 4) y no dependen de esta fase.
- Los artefactos temporales de validación (`build.out`, `routes.out`, `tsc.out`/`tsc.err`) se eliminaron del worktree.

---

## 4. Regresiones encontradas

**Ninguna.** Detalle de lo verificado:

| Aspecto | Antes | Después | Veredicto |
| --- | --- | --- | --- |
| Eventos de entrada (`event_type`, contratos) | C2B8 | idénticos | ✅ sin cambios |
| Resultados numéricos de los motores | C2B8 | idénticos (mismos 103 tests de motor/comportamiento) | ✅ sin cambios |
| Gates (C2B8 canary gate + `dashboard-mode`) | C2B8 | idénticos | ✅ sin cambios |
| Planes y candados | C2B8 | mismos planes y mismas reglas; solo cambia el texto | ✅ sin cambios |
| Permisos / propiedad de la página | C2B8 | idénticos | ✅ sin cambios |
| Allowlist del canary | C2B8 | intacta, no ampliada | ✅ sin cambios |
| Canary de producción | `VvUsngW` | pendiente de QA en producción (§5) | ⏳ PENDIENTE |

Incidencias de entorno (no del producto), documentadas para trazabilidad:

1. El `git worktree add` inicial excedió el límite de 30 s del shell y dejó el índice del worktree nuevo vacío + un `index.lock` obsoleto. Se reparó con `git read-tree HEAD` y eliminando **solo** ese lock del worktree recién creado. El worktree original nunca se tocó.
2. Las primeras ejecuciones de Vitest agotaron los 30 s por arranque en frío (escaneo del proyecto anidado del repositorio). Se resolvió con `--dir src`; todas las suites corren en 6–17 s.

---

## 5. QA del canary en producción — PENDIENTE (no ejecutada)

No se ejecutó porque requiere **deploy autorizado** y **credenciales de producción**; la fase
prohíbe abrir rollout global y exige autorización antes de tocar producción. Procedimiento exacto
para validarlo (solo lectura):

| Paso | Acción | Resultado esperado |
| --- | --- | --- |
| 1 | Verificar que el flag sigue en `VITE_ANALYTICS_CANONICAL_ENABLED=true` y que la allowlist contiene **solo** `VvUsngW` | Igual que C2B8 (sin ampliar) |
| 2 | Abrir `/pages/1c4aa062-a012-47e4-b0f1-99ca8e80d1ec/analytics` con sesión del dueño | Carga la V1.1 real (modo `real`), banner “Datos reales · solo lectura” en español |
| 3 | Leer las tarjetas de resumen | Mismos números que C2B8 si no entraron eventos nuevos: **8 visitas**, **2 desde QR**, **2 acciones** (y `0,25` acciones por visita, `0,0%` conversión) — ahora con etiquetas humanas y término técnico entre paréntesis |
| 4 | Abrir la misma URL con una cuenta que **no** es dueña | Sigue bloqueada (“No se encontró esta página o no tienes acceso a ella.”) |
| 5 | Abrir sin sesión (incógnito) | “Debes iniciar sesión para ver estadísticas.” + botón “Iniciar sesión” |
| 6 | Abrir otra página cualquiera | Sigue en dashboard legacy en español (gate cerrado) |
| 7 | Comprobar que la actividad reciente dice “Entró a WhatsApp” (nunca “envió un mensaje”) | Honestidad de eventos |
| 8 | Si entraron eventos nuevos, comparar contra la tabla `qr_analytics` | Los números deben coincidir con la base |

Rollback si algo falla: vaciar la allowlist (sin tocar código ni datos).

---

## 6. QA móvil y escritorio — PENDIENTE (QA visual)

Revisión **estática** completada (PASS):

- `analytics.css` **no se modificó** (`git diff` no lo incluye): no hay cambios de layout, tamaños, grid ni breakpoints.
- No se añadió ningún elemento nuevo: los textos nuevos van en los mismos nodos (`cq-kpi__label`, `cq-card__title`, `cq-card__hint`, `cq-empty`, `cq-badge`).
- Longitudes: la etiqueta principal más larga es `Escribieron la dirección o la tenían guardada` (44 caracteres) y `Personas que completaron una acción (conversión)` (46); la cadena inglesa más larga que reemplazaron tenía 87 caracteres (`Computed from the events already loaded in this session — no live socket is claimed.`). Los estados vacíos nuevos están en el rango de los anteriores.
- El estado bloqueado usaba una frase de 124 caracteres y ahora usa dos líneas (76 + 60) en un contenedor con `margin: 0`, es decir, **menos** presión de ancho que antes.
- Todos los `aria-label` nuevos están en español y ningún estado depende solo del color (se mantienen los textos).

QA visual real (no ejecutada aquí, sin navegador). Procedimiento de 5 minutos con el resultado esperado:

| Paso | Acción | Resultado esperado |
| --- | --- | --- |
| 1 | `npm run dev` en `…generador de QR - c2b8a-es-latam` | Servidor arriba |
| 2 | Abrir `/pages/<pageId>/analytics?analytics=fixtures` (DEV) | Dashboard V1.1 con datos de prueba, todo en español |
| 3 | Recorrer los 11 escenarios del selector “QA de estadísticas” | Sin inglés, sin overflow horizontal, sin tarjetas rotas |
| 4 | DevTools a **360 px** y **320 px** | Etiquetas y estados vacíos legibles, sin corte de texto ni scroll lateral |
| 5 | DevTools a **1280/1440 px** | KPIs y tarjetas alineados, sin desbordes |
| 6 | Abrir el panel de avisos en móvil | “Avisos”, “Marcar todo como leído”, severidades en español, cierre correcto |

---

## 7. Resultado final

| Gate | Estado |
| --- | --- |
| Tests (20 archivos / 139 pruebas) | ✅ PASS |
| Build (`npm run build`) | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `git diff --check` | ✅ PASS |
| Escaneos de idioma / jerga / inglés residual | ✅ PASS |
| Regresiones C2B8 (eventos, números, gates, planes, permisos) | ✅ PASS |
| QA visual móvil / escritorio (UI-01, UI-02) | ⏳ PENDIENTE (procedimiento en §6) |
| QA del canary `VvUsngW` (REG-01, REG-02) | ⏳ PENDIENTE (procedimiento en §5) |

**Veredicto:** ✅ **PASS técnico completo** en todo lo ejecutable en este entorno, **sin regresiones**,
con 0 cambios en cálculos, eventos, base de datos, RLS, RPC, canonical writer, feature gate y allowlist.
La fase queda **lista para QA visual y de canary**; esos dos pasos son de aprobación humana.

**Token de fase:** `CRIPQER_ANALYTICS_C2B8A_ES_LATAM_HUMAN_LANGUAGE_PASS`
*(válido una vez completados los pasos §5 y §6; hasta entonces el estado es PASS con reserva de QA visual/canary)*

**Próximo paso:** no iniciar Business OS hasta que C2B8A esté validado en producción y el usuario autorice continuar. Sin merge y sin push desde esta fase.



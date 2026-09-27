# C2B8A · Reporte de validación — Español latino + lenguaje humano

**Fase:** `CRIPQER — C2B8A`
**Base SHA:** `f1cf3544a63a39b882b3f277fdd930fdab516748`
**Rama:** `feat/analytics-c2b8a-es-latam` (worktree limpio: `…\generador de QR - c2b8a-es-latam`)
**SHA final:** `c1de81d2e17b3e4c9c7a2ec9b66c24790087451b` (commit único de la fase en `feat/analytics-c2b8a-es-latam`; 18 archivos, +1690 / −334; **sin push y sin merge**)
**Canary protegido:** `VvUsngW` · page `1c4aa062-a012-47e4-b0f1-99ca8e80d1ec`
**Cierre pre-canary:** `2026-09-27` · copy `best_hour` aprobado + **QA visual PASS del owner** (escritorio y 360 px) · tests/build/`diff --check` re-ejecutados — detalle en **§8** (incluye el SHA del commit de cierre).

> **Alcance de esta validación.** Todo lo que se puede comprobar en este entorno se comprobó
> y está abajo con su evidencia. Dos gates no se podían ejecutar en este entorno y se declararon
> **PENDIENTES** con el procedimiento exacto: la **QA visual móvil/escritorio** y la **QA del canary
> en producción**. Estado al cierre pre-canary (2026-09-27): la **QA visual quedó en PASS** por
> revisión manual del owner (escritorio y **360 px**, ver §6) y la **QA del canary sigue PENDIENTE**
> hasta que se autorice el deploy y se disponga de credenciales de producción (§5).

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
| UI-01 | Escritorio sin overflow, cortes ni textos ilegibles | **PASS** | QA visual **manual del owner** (escritorio) al cierre pre-canary; revisión estática PASS (§6) |
| UI-02 | Móvil sin overflow, cortes ni tarjetas rotas | **PASS** | QA visual **manual del owner** a **360 px**; revisión estática PASS (§6) |

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

> **Nota de cierre (2026-09-27):** el commit de *QA Round 1* (`09a3b66`) sumó 4 pruebas al contrato
> `human-language.test.ts`; la suite ejecutada en el cierre pre-canary queda en **20 archivos / 143 pruebas** (§8.2).

### 2.1 Verificaciones estáticas

| Chequeo | Resultado |
| --- | --- |
| `tsc --noEmit` | ⚠️ **667 errores TypeScript preexistentes en baseline; 0 errores nuevos atribuibles a C2B8A** (medido con el ajuste de copy aplicado: 667 errores, mismo conjunto `archivo + código + mensaje`; ninguno en los archivos de la fase — ver §8.2) |
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

## 6. QA móvil y escritorio — ✅ PASS (QA visual manual del owner)

**Cierre pre-canary (2026-09-27).** El owner revisó la interfaz manualmente: **escritorio PASS** y
**móvil 360 px PASS**. No se solicitan más capturas: los pasos de abajo quedan como registro
reproducible de esa revisión, **no** como un pendiente.

Revisión **estática** completada (PASS):

- `analytics.css` **no se modificó** (`git diff` no lo incluye): no hay cambios de layout, tamaños, grid ni breakpoints.
- No se añadió ningún elemento nuevo: los textos nuevos van en los mismos nodos (`cq-kpi__label`, `cq-card__title`, `cq-card__hint`, `cq-empty`, `cq-badge`).
- Longitudes: la etiqueta principal más larga es `Escribieron la dirección o la tenían guardada` (44 caracteres) y `Personas que completaron una acción (conversión)` (46); la cadena inglesa más larga que reemplazaron tenía 87 caracteres (`Computed from the events already loaded in this session — no live socket is claimed.`). Los estados vacíos nuevos están en el rango de los anteriores.
- El estado bloqueado usaba una frase de 124 caracteres y ahora usa dos líneas (76 + 60) en un contenedor con `margin: 0`, es decir, **menos** presión de ancho que antes.
- Todos los `aria-label` nuevos están en español y ningún estado depende solo del color (se mantienen los textos).

Registro reproducible de la revisión (5 minutos), por si hay que repetirla:

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
| Tests (20 archivos / **143** pruebas al cierre) | ✅ PASS |
| Build (`npm run build`) | ✅ PASS |
| `tsc --noEmit` | ⚠️ Sin cambio respecto al baseline: **667 errores preexistentes**, **0 nuevos atribuibles a C2B8A** (no es un gate verde; el gate verde de construcción es el build, §8.2) |
| `git diff --check` | ✅ PASS |
| Escaneos de idioma / jerga / inglés residual | ✅ PASS |
| Regresiones C2B8 (eventos, números, gates, planes, permisos) | ✅ PASS |
| QA visual móvil / escritorio (UI-01, UI-02) | ✅ **PASS** (manual del owner: escritorio + 360 px; §6) |
| Ajuste de copy aprobado del insight `best_hour` | ✅ **PASS** (tests + build + `git diff --check`; §8) |
| QA del canary `VvUsngW` (REG-01, REG-02) | ⏳ PENDIENTE (requiere el **deploy autorizado**; §5) |

**Veredicto:** ✅ **PASS técnico completo** y **QA visual PASS** (revisión manual del owner).
Sin regresiones y con **0 cambios** en cálculos, eventos, base de datos, RLS, RPC, canonical writer,
feature gate y allowlist. La fase queda **cerrada en local** y lista para el **deploy controlado del
canary** (requiere autorización explícita del owner).

**Token de fase:** `CRIPQER_ANALYTICS_C2B8A_ES_LATAM_HUMAN_LANGUAGE_PASS`
*(§6 cumplido con la QA visual del owner; §5 sigue pendiente hasta que el deploy del canary sea autorizado)*

**Próximo paso:** deploy controlado del canary `VvUsngW` (§5) con autorización del owner. No iniciar Business OS hasta que C2B8A esté validado en producción y el usuario autorice continuar. Sin merge y sin push desde esta fase.

---

## 8. Cierre pre-canary (2026-09-27)

### 8.1 Único cambio de código: copy del insight `best_hour`

| | |
| --- | --- |
| Insight | `best_hour` — tipo `opportunity`, categoría *horario con más actividad* |
| ANTES | `Tus visitantes se conectan a una hora parecida` |
| DESPUÉS | `Hay una hora en que tu página recibe más actividad` |
| Texto secundario | **sin cambios** (`hourWindow()` intacto): `Entre {11:00–12:00} está tu mayor actividad. Puede ser buen momento para compartir tu página.` |

Ocurrencias de la misma cadena actualizadas (2, para que el texto anterior no quede en ninguna superficie):

| Archivo | Línea | Superficie |
| --- | --- | --- |
| `src/components/intelligent-analytics/intelligence-engine.ts` | 237 | insight `best_hour` real (producción) |
| `src/routes/analytics-visual-qa.tsx` | 63 | fixture **DEV** del mismo aviso (Centro de avisos de la ruta de QA visual, inalcanzable en producción) |

**Nota de precisión (sin cambio aplicado).** La cadena vigente del texto secundario es
“**Puede ser buen momento** para compartir tu página.”, mientras que la cita del owner dice
“**Puede ser un buen momento** para compartir tu página.”. Son equivalentes en significado; la
instrucción pedía **conservar el texto secundario actual**, así que **no** se añadió la palabra “un”.
Queda identificado como micro-ajuste de 1 palabra si el owner lo quiere en una fase posterior.

### 8.2 Gates ejecutados en el cierre

| Gate | Detalle | Resultado |
| --- | --- | --- |
| Tests afectados + contrato de lenguaje | `node node_modules/vitest/vitest.mjs run --dir src src/components/intelligent-analytics src/lib/analytics src/services/__tests__/analyticsRealData.test.ts src/routes/__tests__/analytics-canary-gate.test.ts src/routes/__tests__/magic-public-analytics-wiring.test.ts src/routes/__tests__/analytics-no-session.test.tsx src/routes/__tests__/pages.routing.test.ts --reporter=dot` | ✅ **20 archivos / 143 pruebas PASS · 0 fallos** (100,42 s) |
| Verificación directa del copy nuevo | chequeo temporal sobre los 11 escenarios: `insight.title === "Hay una hora en que tu página recibe más actividad"` y `message` conserva “Entre … está tu mayor actividad. Puede ser buen momento para compartir tu página.” | ✅ **10 insights `best_hour`** (los 10 escenarios con datos; `no_data` queda en modo aprendizaje) **todos con la cadena nueva** (archivo temporal **eliminado**, no versionado) |
| Contrato C2B8A (`human-language.test.ts`) | incluido en la suite de arriba: tokens de jerga/inglés (76) y afirmaciones prohibidas | ✅ PASS — el título nuevo no dispara ningún token |
| Build de producción | `npm run build` (`vite build` + nitro · preset `vercel`) | ✅ cliente + SSR + `.vercel/output/nitro.json` generados, **sin errores** |
| Typecheck | `tsc --noEmit` | ⚠️ **667 errores TypeScript preexistentes en baseline; 0 errores nuevos atribuibles a C2B8A** (ninguno en `intelligence-engine.ts` ni en `analytics-visual-qa.tsx`) |
| Higiene git | `git diff --check` | ✅ limpio |

### 8.3 Alcance respetado (sin cambios)

- **No** se tocó: base de datos, migraciones, RLS, RPC, canonical writer, eventos/tracking,
  feature gate, `dashboard-mode`, allowlist del canary ni ningún cálculo de métricas.
- La allowlist **no** se amplió: sigue con el canary `VvUsngW` únicamente.
- **Sin push**, **sin merge** y **sin deploy**: el cierre es un commit **local** en
  `feat/analytics-c2b8a-es-latam`.
- Worktree limpio al cierre (los artefactos de validación se escribieron fuera del repositorio, en `%TEMP%`).

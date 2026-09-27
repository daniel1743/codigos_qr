# C2B8A · Reporte de implementación — Español latino + lenguaje humano

**Fase:** `CRIPQER — C2B8A`
**Área:** Intelligent Analytics V1.1
**Base (branch/SHA):** `feat/basic-editor-editorial-canvas-ui` @ `f1cf3544a63a39b882b3f277fdd930fdab516748` (C2B8 — PASS)
**Rama de trabajo:** `feat/analytics-c2b8a-es-latam`
**Worktree:** `…\Desktop\proyectos desplegados importante\generador de QR - c2b8a-es-latam` (limpio, creado desde `origin`)
**Locale:** `es-419`
**Canary protegido:** `VvUsngW` · `1c4aa062-a012-47e4-b0f1-99ca8e80d1ec`

**Commit de la fase:** `c1de81d2e17b3e4c9c7a2ec9b66c24790087451b` — 18 archivos, +1690 / −334, en la rama `feat/analytics-c2b8a-es-latam` (worktree `…generador de QR - c2b8a-es-latam`). **Sin push, sin merge.**

---

## 1. Estrategia de workspace

| Acción | Detalle |
| --- | --- |
| Worktree nuevo | `git worktree add -b feat/analytics-c2b8a-es-latam <ruta> f1cf3544…` |
| Estado inicial | `git status` limpio; el índice se reparó con `git read-tree HEAD` porque el checkout inicial fue interrumpido por el límite de 30 s del shell y dejó el índice vacío + un `index.lock` obsoleto (se eliminó **solo** ese lock del worktree recién creado) |
| Worktree original | **intacto**: nunca se ejecutó `git reset`, `git clean`, `git add .` ni se tocó su índice |
| Dependencias | `node_modules` enlazado por *junction* al del worktree original (no se instaló ni modificó nada) |
| Commits | Solo locales en la rama de fase. **Sin push, sin merge** (el merge requiere autorización del usuario) |

---

## 2. Arquitectura de la solución

Se añadió **una capa de idioma** y se reescribieron las plantillas de los motores. Los cálculos no se tocaron.

```
src/components/intelligent-analytics/
├── copy.es-419.ts                  ← NUEVO · único lugar del idioma visible
├── analytics.types.ts              ← solo CHANNEL_LABEL.other: "Other links" → "Otros enlaces"
├── daily-brief.ts                  ← plantillas reescritas (no traducidas)
├── intelligence-engine.ts          ← títulos/mensajes/etiquetas/CTA reescritos
├── goals-engine.ts                 ← mensajes + etiquetas de meta reescritos
├── widget-registry.ts              ← títulos, estados vacíos y candado de plan en español
├── real-data-capability.ts         ← degradación honesta sin jerga
├── analytics.fixtures.ts           ← QA DEV en español
├── components/
│   ├── AnalyticsDashboard.tsx      ← períodos, cabecera, welcome, aria-labels
│   ├── widgets.tsx                 ← 17 widgets + estado bloqueado
│   ├── charts.tsx                  ← leyendas, tooltips, aria, días de semana
│   ├── NotificationCenter.tsx      ← avisos, severidades, estados
│   └── NotificationToasts.tsx      ← aria del toast
└── human-language.test.ts          ← NUEVO · 13 pruebas de contrato de idioma y significado
src/routes/pages.$pageId.analytics.tsx ← banners, errores, estados de carga, QA DEV
```

### 2.1 `copy.es-419.ts` — qué centraliza

| Export | Contenido |
| --- | --- |
| `PERIOD_LABEL`, `GRANULARITY_LABEL` | `Hoy`, `7 días`, `30 días`, `90 días`; `cada hora` / `cada día` |
| `METRIC_COPY` | Capa 1 humana + capa 2 técnica entre paréntesis para las 7 métricas clave |
| `PLAN_NAME`, `planLockReason`, `upgradeCta`, `lockedWidgetValue`, `LOCKED_WIDGET_HONESTY` | Candados de plan, sin números ficticios |
| `EVENT_COPY` | Copy de actividad (visita, entrada, enlace…) |
| `relativeTimeEs` | `hace un momento`, `hace 2 min`, `hace 2 h`, `hace 2 días` |
| `WEEKDAY_SHORT` | `Lun … Dom` |
| `MOMENTUM_LABEL`, `MOMENTUM_COPY`, `ROLLING_STATE_COPY`, `GOAL_STATUS_LABEL`, `SEVERITY_LABEL`, `GOAL_NOUN` | Estados y sustantivos de meta |
| `devicesEs`, `sourcesEs`, `funnelEs` | Traducción **por `id` canónico** (no por texto) de dispositivos, origen y embudo |
| `decimalEs`, `rateEs` | Coma decimal latina (`0,25`, `12,3%`) |
| `LEARNING_HEADLINE`, `greeting`, `liveLastHour`, `liveLastHourUnit` | Encabezado del dashboard |

### 2.2 Por qué se traduce por `id` (y no por texto)

`metrics-engine.ts` sigue entregando sus etiquetas canónicas (`Mobile`, `Direct`, `QR scan`). La traducción ocurre en la capa de presentación usando `item.id`, de modo que:

- los tests existentes del motor siguen midiendo **exactamente** lo mismo (`devices.test.ts` sigue esperando `label: "Mobile"`);
- un enlace real (`linkLabel`) o una campaña UTM **conservan su texto** (son datos del usuario);
- el único texto que se reescribe es el que el producto decide mostrar.

---

## 3. Ejecución del plan de implementación (paso a paso)

| Paso | Estado | Evidencia |
| --- | --- | --- |
| 1 · Inventario completo de textos | ✅ | `C2B8A_TEXT_INVENTORY.md` — 312 cadenas: 241 EN · 38 JARGON · 14 AMBIG · 47 OK |
| 2 · Revisión semántica antes de traducir | ✅ | Cada etiqueta se asoció a su métrica real (visita ≠ sesión ≠ persona ≠ acción ≠ conversión). Ver §4 |
| 3 · Vocabulario consistente | ✅ | `copy.es-419.ts`: una sola fuente para métricas, períodos, estados, eventos y planes. “Visitas” ya no compite con “Vistas” |
| 4 · Interfaz estática traducida | ✅ | dashboard, widgets, charts, notificaciones, estados vacíos, bloqueos, banners y ruta |
| 5 · Intelligence / Daily Brief / notificaciones humanizados | ✅ | plantillas reescritas completas (no palabra por palabra) en `intelligence-engine`, `daily-brief`, `goals-engine` |
| 6 · Estados con pocos datos | ✅ | el modo aprendizaje explica que Cripqer necesita más actividad y **no** menciona `baseline`, `signals` ni estadística |
| 7 · Bloqueos por plan humanizados | ✅ | valor + CTA claro + honestidad (“verás únicamente tus datos reales”), sin números de ejemplo |
| 8 · Regresión | ✅ | `C2B8A_VALIDATION_REPORT.md` (mismos eventos, mismos números, mismos gates) |

---

## 4. Decisiones de significado (lo que **no** se dijo)

| Riesgo | Decisión aplicada |
| --- | --- |
| `Views` podía leerse como “personas” | Se mantiene `Visitas (vistas)`; las personas viven en `Personas distintas que visitaron (visitantes únicos)`: etiquetas distintas para métricas distintas |
| `whatsapp_click` podía parecer un mensaje | `Entró a WhatsApp` (nunca “envió un mensaje”, “te escribió” ni “habló contigo”). Verificado por test |
| `interactions` podía parecer personas únicas | `Acciones realizadas (interacciones)`, nunca “personas” |
| `conversion` podía parecer una venta | `Personas que completaron una acción (conversión)` y el mensaje explica “12 de cada 100 visitas completaron una acción”. El contrato (`lead_created / views`) no se tocó |
| `session` en el banner real | `session_id disponible` → `visitas con sesión identificada: sí/no` |
| `baseline`, `signals`, `hot window`, `unique users`, `attribution` | Eliminados como primera capa; cuando un término técnico aporta, queda entre paréntesis |
| Números sintéticos | Prohibidos: los estados vacíos/aprendizaje citan contadores reales (`buildScenarioEvents("no_data")` → `0 visitas y 0 acciones`) |
| Sobre-afirmar con pocas muestras | El umbral honesto existente (`LEARNING_THRESHOLD = 25`) no cambió; solo cambió cómo se explica |
| Proyecciones | Se enuncian como proyección (“La proyección es…”, “Si mantienes el ritmo…”), nunca como hecho |

---

## 5. Lo que NO se modificó

- ❌ Cálculos de Analytics (`metrics-engine`, `rolling-window`, `timezone`): **0 cambios**.
- ❌ Contratos de eventos y tipos (`AnalyticsEventV1`, `AnalyticsEventType`): **0 cambios**.
- ❌ Migraciones, Supabase, RLS, RPC y vistas de lectura: **0 cambios**.
- ❌ Canonical writer (`canonical-writer.ts`, `browser.ts`): **0 cambios**.
- ❌ Feature gate C2B8 (`feature-gate.ts`, `dashboard-mode.ts`): **0 cambios**; allowlist intacta y sin ampliar.
- ❌ Entitlements, pricing y planes: **0 cambios** (solo etiquetas de plan para mostrar).
- ❌ Métricas nuevas: **0**. CRM / Leads / Forms / Business OS: no iniciados.
- ❌ Dashboard legacy y textos compartidos fuera de alcance: intactos.
- ✅ Único cambio dentro de un módulo de contrato: `CHANNEL_LABEL.other` (`"Other links"` → `"Otros enlaces"`), pedido explícitamente por el diccionario canónico de la fase. No cambia claves ni valores numéricos.

---

## 6. Archivos (13 modificados + 2 nuevos)

| Archivo | Δ | Rol |
| --- | --- | --- |
| `src/components/intelligent-analytics/copy.es-419.ts` | **nuevo** | capa de idioma |
| `src/components/intelligent-analytics/human-language.test.ts` | **nuevo** | 13 pruebas de contrato (LANG/SEM/VER/TRU) |
| `src/components/intelligent-analytics/components/widgets.tsx` | 228 líneas | 17 widgets |
| `src/components/intelligent-analytics/intelligence-engine.ts` | 192 líneas | insights |
| `src/components/intelligent-analytics/widget-registry.ts` | 57 líneas | títulos/estados/candados |
| `src/components/intelligent-analytics/daily-brief.ts` | 50 líneas | Daily Brief |
| `src/components/intelligent-analytics/analytics.fixtures.ts` | 40 líneas | QA DEV |
| `src/components/intelligent-analytics/components/AnalyticsDashboard.tsx` | 27 líneas | shell |
| `src/components/intelligent-analytics/components/charts.tsx` | 21 líneas | primitivas |
| `src/components/intelligent-analytics/goals-engine.ts` | 20 líneas | metas |
| `src/components/intelligent-analytics/components/NotificationCenter.tsx` | 19 líneas | avisos |
| `src/routes/pages.$pageId.analytics.tsx` | 28 líneas | ruta/banners |
| `src/components/intelligent-analytics/analytics.types.ts` | 2 líneas | etiqueta de canal |
| `src/components/intelligent-analytics/real-data-capability.ts` | 2 líneas | estado honesto |
| `src/components/intelligent-analytics/components/NotificationToasts.tsx` | 2 líneas | aria |
| Reportes | nuevos | inventario, implementación, validación |


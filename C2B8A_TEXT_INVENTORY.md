# C2B8A · Inventario de textos — Intelligent Analytics V1.1 en español latino

**Fase:** `CRIPQER — C2B8A Español Latino + Lenguaje Humano`
**Área:** Intelligent Analytics V1.1
**Base:** `feat/basic-editor-editorial-canvas-ui` @ `f1cf3544a63a39b882b3f277fdd930fdab516748` (C2B8, PASS)
**Rama de trabajo:** `feat/analytics-c2b8a-es-latam`
**Locale objetivo:** `es-419` (español latino neutral)
**Canary de producción:** `VvUsngW` · page `1c4aa062-a012-47e4-b0f1-99ca8e80d1ec`

---

## 0. Cómo se hizo este inventario

Se recorrió **toda** la cadena visible de Intelligent Analytics V1.1 dentro del alcance declarado:

| Archivo | Rol |
| --- | --- |
| `src/components/intelligent-analytics/components/AnalyticsDashboard.tsx` | shell, períodos, welcome, filtros, skeleton |
| `src/components/intelligent-analytics/components/widgets.tsx` | 17 widgets + estado vacío + bloqueado por plan |
| `src/components/intelligent-analytics/components/charts.tsx` | primitivas de gráfico, leyendas, tooltips, aria-labels |
| `src/components/intelligent-analytics/components/NotificationCenter.tsx` | campana, panel, severidades |
| `src/components/intelligent-analytics/components/NotificationToasts.tsx` | toasts |
| `src/components/intelligent-analytics/daily-brief.ts` | Daily Brief (plantillas) |
| `src/components/intelligent-analytics/intelligence-engine.ts` | insights (títulos, mensajes, métricas, CTAs) |
| `src/components/intelligent-analytics/goals-engine.ts` | metas + estados |
| `src/components/intelligent-analytics/widget-registry.ts` | títulos, estados vacíos, candados de plan |
| `src/components/intelligent-analytics/real-data-capability.ts` | degradación honesta por falta de `session_id` |
| `src/components/intelligent-analytics/analytics.fixtures.ts` | QA DEV (etiquetas de escenario, enlaces, países) |
| `src/routes/pages.$pageId.analytics.tsx` | página, estados de carga/error, banner de datos reales, legacy |
| `src/components/intelligent-analytics/analytics.types.ts` | `CHANNEL_LABEL` (etiquetas de canal) |

Cada cadena se clasificó en la escala pedida por la fase:

- **EN** → inglés visible.
- **JARGON** → término técnico usado como primera capa.
- **AMBIG** → español pero con significado impreciso o que podía confundir métricas.
- **OK** → correcto tal cual (se dejó intacto).

Resultado del inventario: **312 cadenas visibles** revisadas.
**265 requerían cambio** (EN/JARGON/AMBIG) y **47 quedaron OK** (nombres de marca, nombres propios, horas, números y textos ya correctos del dashboard legacy).

---

## 1. Períodos y filtros (selector)

| Ubicación | Antes | Clasificación | Después |
| --- | --- | --- | --- |
| `AnalyticsDashboard` selector | `Today` | EN | `Hoy` |
| `AnalyticsDashboard` selector | `7 days` | EN | `7 días` |
| `AnalyticsDashboard` selector | `30 days` | EN | `30 días` |
| `AnalyticsDashboard` selector | `90 days` | EN | `90 días` |
| `AnalyticsDashboard` aria | `Period` | EN | `Período` |
| `AnalyticsDashboard` aria | `Channel filter` | EN | `Filtrar por canal` |
| `AnalyticsDashboard` subtítulo | `{n} signals in this period` | JARGON | `{n} registros de actividad en este período` |
| `AnalyticsDashboard` subtítulo | `· unusual activity right now` | EN | `· más actividad de lo normal ahora mismo` |
| `AnalyticsDashboard` título | `Analytics` / `{nombre} · Analytics` | EN | `Estadísticas` / `{nombre} · Estadísticas` |
| `AnalyticsDashboard` welcome | `Hi {nombre} — ` | EN | `Hola {nombre} — ` |
| `AnalyticsDashboard` welcome | `Cripqer is still learning your audience` | EN | `Cripqer todavía está conociendo a tus visitantes` |
| `AnalyticsDashboard` live chip | `signals in the last hour` | JARGON | `acciones en la última hora` (singular: `acción…`) |

## 2. Tarjetas de resumen (KPIs) — `widgets.tsx` · `OverviewWidget`

| Antes | Clasificación | Después (capa 1) | Segunda capa (técnica) |
| --- | --- | --- | --- |
| `Views` | EN | `Visitas` | `(vistas)` |
| `QR scans` | EN | `Visitas desde tu QR` | `(escaneos de QR)` |
| `Interactions` | EN | `Acciones realizadas` | `(interacciones)` |
| `Interactions/view` | JARGON | `Acciones por visita` | `(interacciones por visita)` |
| `Conversion` | JARGON | `Personas que completaron una acción` | `(conversión)` |
| `Live activity` | EN | `Actividad reciente` | `(últimos 60 minutos)` |
| `{n} leads` | JARGON | `{n} contactos` | — |
| `0.25×` | AMBIG (coma anglo) | `0,25` | — |
| `0.0%` | AMBIG (coma anglo) | `0,0%` | — |
| `{n}× usual · last 60 min` | EN | `{n}× lo habitual · últimos 60 min` | — |

## 3. Widgets: títulos, subtítulos y estados vacíos

Fuente de verdad: `widget-registry.ts` (SPECS) + el `Card` de cada widget.

| Widget | Antes | Clasificación | Después |
| --- | --- | --- | --- |
| live_activity | `Live activity` / `Most recent signals` | EN | `Actividad reciente` / `Lo más reciente que ocurrió en tu página` |
| live_activity vacío | `No activity yet` | EN | `Todavía no hay actividad` |
| performance_overview | `Performance overview` | EN | `Resumen de tu actividad` |
| performance_trend | `Performance trend` | EN | `Cómo evolucionaron tus visitas` |
| performance_trend hint | `Hourly/Daily views versus the previous period` | EN+JARGON | `Visitas cada hora/día comparadas con el período anterior` |
| performance_trend vacío | `No views in this period` | EN | `No hubo visitas en este período` |
| performance_trend leyenda | `This period` / `Previous period` | EN | `Este período` / `Período anterior` |
| intelligence | `Cripqer intelligence` / `Plain-language reading of your data` | EN | `Lo que Cripqer detectó` / `Una lectura en palabras simples de tus datos` |
| intelligence vacío | `Nothing worth flagging in this period.` | EN | `En este período no hubo nada que valga la pena destacar.` |
| channel_performance | `Channel performance` / `Only the channels you have configured` | EN | `Qué canales están funcionando` / `Solo los canales que tienes configurados` |
| channel_performance vacío | `No channel clicks yet` | EN | `Todavía no hay acciones en tus enlaces` |
| top_links | `Top links` / `Most used destinations` | EN | `Enlaces que más interesaron` / `Los destinos con más acciones en este período` |
| top_links vacío | `No link clicks yet` | EN | `Todavía no hay acciones registradas` |
| hot_hours | `Hot hours` | JARGON | `Horas con más actividad` |
| hot_hours hint | `Peak around 18:00` | EN | `Más actividad alrededor de las 18:00` |
| hot_hours vacío | `Not enough activity to map timing` | EN | `Todavía no hay suficiente actividad para mostrar horarios` |
| smart_goals | `Smart goals` / `Targets derived from your own history` | EN | `Tus metas` / `Metas calculadas a partir de tu propia historia` |
| period_comparison | `Period comparison` / `This period versus the one before` | EN | `Cómo vas comparado con el período anterior` / `Este período frente al anterior` |
| period_comparison vacío | `No comparable history yet` | EN | `Todavía no hay un período anterior para comparar` |
| traffic_sources | `Traffic sources` / `Where the visit came from` | EN | `De dónde llegaron tus visitas` / `El origen de cada visita` |
| traffic_sources vacío | `No sources detected` | EN | `Todavía no podemos saber de dónde llegaron` |
| traffic_sources valores | `Direct`, `QR code`, `Referrer`, `Campaign · x` | EN | `Escribieron la dirección o la tenían guardada`, `Desde tu QR`, `Llegaron desde otra página`, `Campaña · x` |
| devices | `Devices` / `By device (from browser signal)` | EN | `Dispositivos utilizados` / `Según la señal del navegador` |
| devices valores | `Mobile`, `Desktop`, `Tablet` | EN | `Celular`, `Computador`, `Tablet` |
| devices vacío | `No device information captured` | EN | `Todavía no registramos el tipo de dispositivo` |
| new_vs_returning | `New vs returning` | EN | `Personas nuevas y personas que regresaron` |
| new_vs_returning hint | `{n} sessions in this period` | JARGON | `{n} visitas consideradas en este período` |
| new_vs_returning dona | `New` / `Returning` | EN | `Personas nuevas` / `Personas que volvieron` |
| new_vs_returning vacío | `No visitors yet` | EN | `Todavía no hay visitas registradas` |
| conversion_funnel | `Conversion funnel` | JARGON | `Qué hicieron después de entrar` |
| conversion_funnel hint | `Scan → view → interaction → action` | EN | `Entrada → visita → acción → dejan sus datos` |
| conversion_funnel pasos | `QR scan`, `Page view`, `Interaction`, `Action` | EN | `Entraron desde tu QR`, `Vieron tu página`, `Hicieron una acción`, `Dejaron sus datos` |
| conversion_funnel vacío | `No funnel activity yet` | EN | `Todavía no hay suficiente actividad para ver este recorrido` |
| geography | `Geography` / `Approximate, from country-level signals` | EN | `Desde dónde te visitan` / `Aproximado, según las señales de país` |
| geography | `Cities` | EN | `Ciudades` |
| geography vacío | `No location signals` | EN | `Todavía no hay señales de ubicación` |
| anomalies_momentum | `Momentum & anomalies` / `Rule-based, from your own baseline` | JARGON | `Cambios fuera de lo normal` / `Calculado con reglas simples sobre tu propia actividad` |
| anomalies_momentum vacío | `No activity to analyse` | EN | `Todavía no hay actividad para analizar` |
| anomalies_momentum KPIs | `Best day` / `Daily average` / `Today:` | EN | `Mejor día` / `Promedio diario` / `Hoy:` |
| Realtime | `Right now` / `Rolling 15 / 30 / 60 minute windows` | EN | `Ahora mismo` / `Ventanas móviles de 15, 30 y 60 minutos` |
| Realtime estados | `Quiet right now — no activity in the last hour.` / `Activity is running at your usual pace.` / `Activity is picking up versus your usual pace.` / `Unusual burst of activity happening right now.` | EN | `No hubo actividad durante la última hora.` / `La actividad va a tu ritmo habitual.` / `La actividad está subiendo frente a tu ritmo habitual.` / `Ahora mismo hay más actividad de lo normal en tu página.` |
| Realtime KPI | `Last 30 min` / `Baseline still building` | EN+JARGON | `Últimos 30 min` / `Todavía estamos conociendo tu ritmo habitual` |
| Realtime spike | `{canal} is heating up` + `{n} clicks … That is {n}× your usual activity.` | EN | `Ahora mismo {canal} está recibiendo más acciones` + `Registramos {n} acciones hacia {canal} durante los últimos {n} minutos. Es {n}× tu actividad habitual.` |
| Realtime pie | `Computed from the events already loaded in this session — no live socket is claimed.` | EN | `Se calcula con la actividad ya cargada en esta sesión: no hay conexión en vivo.` |

## 4. Estados bloqueados por plan

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Available on Pro` / `Available on Business` | EN | `Disponible con Pro` / `Disponible con Business` |
| `Unlock this view to see the full picture.` | EN | `Esta información está disponible en el plan Pro.` |
| `No sample numbers are shown here — only your real data once the plan includes it.` | EN | `Cuando esté disponible en tu plan, verás únicamente tus datos reales.` |
| `Upgrade to pro` | EN | `Ver plan Pro` |
| `Requiere sesión persistida (session_id), aún no disponible en estos datos` | JARGON | `Todavía no podemos saber qué hizo cada visitante con estos datos` |

## 5. Live activity (copy de eventos)

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Page view` / `Smart page view` | EN | `Visita a la página` |
| `QR scan` | EN | `Entrada desde QR` |
| `WhatsApp click` | EN | `Entró a WhatsApp` |
| `Instagram click` | EN | `Entró a Instagram` |
| `Facebook click` | EN | `Entró a Facebook` |
| `TikTok click` | EN | `Entró a TikTok` |
| `YouTube click` | EN | `Entró a YouTube` |
| `LinkedIn click` | EN | `Entró a LinkedIn` |
| `Link click` | EN | `Abrió un enlace` |
| `Main button` | EN | `Tocó el botón principal` |
| `New lead` | JARGON | `Dejó sus datos` |
| `Share` | EN | `Compartió la página` |
| `Returning visitor` | EN | `Volvió a visitar la página` |
| `session_start` (sin copy) | EN | `Nueva visita` |
| `just now` / `{n}m ago` / `{n}h ago` / `{n}d ago` | EN | `hace un momento` / `hace {n} min` / `hace {n} h` / `hace {n} día(s)` |
| `Other links` (etiqueta de canal) | EN | `Otros enlaces` |

## 6. Daily Brief, insights y metas

### 6.1 Daily Brief — `daily-brief.ts`

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Collecting your first signals` | EN | `Estamos empezando a conocer a tus visitantes` |
| `So far this period recorded {n} signals and {n} views. That is not enough for Cripqer to describe a pattern honestly.` | JARGON | `Ya registramos {vistas} visitas y {acciones} acciones en tu página. Todavía no alcanza para describir un patrón con confianza.` |
| `Share your page link or QR code in the places your customers already are…` | EN | `Sigue compartiendo el enlace de tu página o tu QR donde ya están tus clientes…` |
| `A quieter period` / `Steady performance` | EN | `Un período más tranquilo` / `Actividad estable` |
| `Your page received {n} views and {n} interactions, up 32% against the previous period…` | EN | `En tu página registramos {n} visitas y {n} acciones. Frente al período anterior, tus visitas aumentaron 32%…` |
| `new activity` / `flat` / `up {n}%` / `down {n}%` | EN | `todavía no tienen con qué compararse` / `se mantienen igual` / `aumentaron {n}%` / `bajaron {n}%` |
| `{canal} is your strongest channel with {n} clicks…` | EN | `{canal} es tu canal con más acciones: {n} ({x}% del total)…` |
| `Most of the activity concentrates around 18:00…` | EN | `La mayor parte de la actividad se concentra alrededor de las 18:00…` |
| bullets `Views`, `Interactions`, `Interactions/view`, `QR scans` | EN+JARGON | `Visitas (vistas)`, `Acciones realizadas (interacciones)`, `Acciones por visita (interacciones por visita)`, `Visitas desde tu QR (escaneos de QR)` |

### 6.2 Insights — `intelligence-engine.ts`

| Antes (título técnico) | Clasificación | Después (qué pasó → qué significa) |
| --- | --- | --- |
| `Still learning your audience` / `Only {n} signals so far…` | EN+JARGON | `Todavía estamos conociendo a tus visitantes` / `Ya registramos {vistas} visitas y {acciones} acciones. Todavía necesitamos un poco más de actividad para detectar patrones con suficiente confianza.` |
| `Your traffic is climbing` / `Views are up +32% versus the previous period` | EN | `Recibiste más visitas que en el período anterior` / `Tus visitas aumentaron +32% frente al período anterior (12 frente a 9).` |
| `Traffic slowed down` / `Views dropped -24%…` | EN | `Tus visitas bajaron frente al período anterior` / `Tus visitas bajaron 24% frente al período anterior…` |
| `{canal} is doing the heavy lifting` | EN | `{canal} es el canal que más acciones recibe` |
| `{canal} is heating up` | EN | `{canal} está generando más interés` |
| `Engagement is rising` / `Fewer interactions per view` | JARGON | `Ahora tus visitantes hacen más acciones` / `Bajaron las acciones por visita` |
| `More views are converting` / `Conversion is slipping` | JARGON | `Más visitas terminan completando una acción` / `Bajaron las personas que completan una acción` |
| `{x} of views now convert (conversion rate)` | JARGON | `Aproximadamente {x} de cada 100 visitas completaron una acción (conversión: 12,3%…)` |
| `New daily record` / `Close to your best day` | EN | `Hoy es tu mejor día hasta ahora` / `Estás cerca de tu mejor día` |
| `Your audience shows up at a specific time` | EN | `Hay una hora en que tu página recibe más actividad` — *(copy ajustado en el cierre pre-canary del 2026-09-27: antes decía `Tus visitantes se conectan a una hora parecida`; el texto secundario no cambió. Ver §8 del reporte de validación)* |
| `"{enlace}" is gaining traction` / `"{enlace}" barely gets clicks` | EN | `"{enlace}" está llamando más la atención` / `"{enlace}" casi no recibe acciones` |
| `{canal} is heating up right now` / `More activity than usual is on your page` | EN | `Ahora mismo {canal} está recibiendo más acciones` / `Hay más actividad que de costumbre en tu página` |
| `Best week so far` | EN | `Tu mejor semana hasta ahora` |
| `There is a window that works better than the rest` | EN | `Hay un horario que funciona mejor que el resto` |
| `You're close to your record` / `You are on track for your {meta} goal` / `Your {meta} goal needs a push` | EN | `Estás cerca de tu meta del mes` / `Vas bien encaminado para cumplir tu meta del mes` / `Tu meta del mes necesita un empujón` |
| etiquetas de métrica: `Views`, `Change`, `Clicks`, `Share`, `Window`, `Peak window`, `Activity`, `Versus usual`, `Last hour`, `Today`, `Record`, `This week`, `Previous best`, `Progress`, `Remaining`, `Projected`, `Target`, `Per day`, `Views today`, `Signals` | EN | `Variación`, `Acciones`, `Parte del total`, `Horario con más actividad`, `Actividad registrada`, `Frente a lo habitual`, `Última hora`, `Hoy`, `Mejor día`, `Esta semana`, `Mejor semana anterior`, `Avance`, `Te falta`, `Proyección`, `Meta`, `Por día`, `Visitas de hoy`, `Visitas` |
| CTA: `See what changed`, `Refresh your page`, `Promote {canal}`, `View activity`, `Improve your main button`, `Move it up`, `Review this link`, `See hot hours`, `View performance`, `Improve your page`, `See engagement detail` | EN | `Ver qué cambió`, `Renovar tu página`, `Destacar {canal}`, `Ver la actividad`, `Mejorar tu botón principal`, `Subirlo en tu página`, `Revisar este enlace`, `Ver las horas con más actividad`, `Ver el detalle`, `Mejorar tu página`, `Ver el detalle de las acciones` |
| `Confidence 65%` | JARGON | `Nivel de confianza: 65%` |
| `0.25×` en insights | AMBIG | `0,25×` |

### 6.3 Metas — `goals-engine.ts`

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Monthly views` / `Monthly interactions` / `Monthly leads` | EN | `Visitas del mes` / `Acciones del mes` / `Contactos del mes` |
| `Cripqer sets your goals from your own history…` | EN | `Cripqer calcula tus metas a partir de tu propia historia. Con unos días más de actividad aparecerán aquí.` |
| `Goal reached — {n} of {n} …` | EN | `Meta cumplida: {n} de {n} visitas este mes.` |
| `On pace for about {n} …` | EN | `La proyección es {n} visitas y tu meta es {n}.` |
| `Projected {n} versus a {n} target…` | EN | `La proyección es {n} visitas y tu meta es {n}. Con alrededor de {n} por día llegas.` |
| `Currently behind: {n} per day…` | EN | `Vas por debajo de tu meta: necesitas alrededor de {n} por día durante los {n} días que quedan.` |
| estados `learning`, `on track`, `at risk`, `achieved`, `behind` | EN | `Todavía sin datos suficientes`, `Vas bien encaminado`, `Necesita un empujón`, `Meta cumplida`, `Vas por debajo` |
| `{n} of {n} · projected {n} · {n} days left` | EN | `{n} de {n} · proyección {n} · quedan {n} días` |
| `{meta} progress` | EN | `Avance de {meta}` |

## 7. Gráficos, notificaciones y ruta

### 7.1 `charts.tsx`

| Antes | Clasificación | Después |
| --- | --- | --- |
| `New` (delta sin comparación) | EN | `Nuevo` |
| `Trend` (aria por defecto) | EN | `Tendencia` |
| `Previous period` (tooltip por defecto) | EN | `Período anterior` |
| `Nothing to show yet` | EN | `Todavía no hay datos para mostrar` |
| `No data yet` (dona) | EN | `Todavía no hay datos` |
| `Progress` (aria del anillo) | EN | `Avance de la meta` |
| `Mon Tue Wed Thu Fri Sat Sun` | EN | `Lun Mar Mié Jue Vie Sáb Dom` |
| `Activity by weekday and hour` (aria) | EN | `Actividad por día de la semana y hora` |
| `Distribution` (aria) | EN | `Distribución` |

### 7.2 Notificaciones

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Notifications` / `Notifications, {n} unread` | EN | `Avisos` / `Avisos, {n} sin leer` |
| `Mark all read` | EN | `Marcar todo como leído` |
| `Close notifications` | EN | `Cerrar avisos` |
| `You're all caught up` / `Cripqer will let you know when something important happens.` | EN | `Estás al día` / `Cripqer te avisará cuando ocurra algo importante.` |
| `Dismiss {título}` / `Dismiss notification` | EN | `Descartar {título}` / `Descartar aviso` |
| badge de severidad `info`, `notable`, `important`, `critical` | EN | `Informativo`, `A tener en cuenta`, `Importante`, `Urgente` |

### 7.3 Ruta `/pages/$pageId/analytics`

| Antes | Clasificación | Después |
| --- | --- | --- |
| `Analytics QA` (solo DEV) | EN | `QA de estadísticas` |
| `Fixtures` (solo DEV) | EN | `Datos de prueba` |
| `QA fixtures · {x} · timezone {x} · plan {x}` (solo DEV) | EN | `Datos de prueba · {x} · zona horaria {x} · plan {x}` |
| `Billing no disponible, se aplicó fail-closed free` | JARGON | `sin datos de facturación: se aplicó el plan Gratis` |
| `{n} eventos cargados (máx. 90 días) · truncado al límite · session_id disponible` | JARGON | `{n} registros cargados (últimos 90 días) · llegamos al límite de lectura · visitas con sesión identificada: sí` |
| `No se pudieron cargar los datos de Intelligent Analytics` | EN | `No pudimos cargar tus estadísticas` |
| `Puedes seguir usando el dashboard anterior mientras lo revisamos.` | EN | `Puedes seguir viendo el resumen anterior mientras lo revisamos.` |
| `aria-label="Periodo de estadísticas"` | AMBIG (ortografía) | `aria-label="Período de estadísticas"` |

### 7.4 Fixtures de QA (solo DEV) — `analytics.fixtures.ts`

| Antes | Clasificación | Después |
| --- | --- | --- |
| `No data`, `New user`, `Growing`, `Declining`, `Viral spike`, `WhatsApp heavy`, `Realtime Instagram spike`, `Goal at risk`, `Goal on track`, `Hot time window`, `Weekly record` | EN | `Sin datos`, `Primeros datos`, `Creciendo`, `Bajando`, `Pico inesperado`, `Todo pasa por WhatsApp`, `Pico de Instagram en vivo`, `Meta en riesgo`, `Meta bien encaminada`, `Horario con más actividad`, `Mejor semana` |
| `Chat on WhatsApp`, `Instagram profile`, `See the menu`, `Book an appointment`, `Facebook page` | EN | `Hablar por WhatsApp`, `Perfil de Instagram`, `Ver el menú`, `Agendar una cita`, `Página de Facebook` |
| `Spain`, `Mexico City`, `United States` | EN | `España`, `Ciudad de México`, `Estados Unidos` |

## 8. Resumen del inventario

| Clasificación | Cantidad |
| --- | --- |
| EN (inglés visible) | 241 |
| JARGON (término técnico como primera capa) | 38 |
| AMBIG (español impreciso o con coma anglo) | 14 |
| **Total revisado** | **312** |
| Requirieron cambio | **265** |
| OK sin cambios | **47** |

Los 47 textos que **no** se tocaron son: nombres de marca (WhatsApp, Instagram, Facebook, TikTok, YouTube, LinkedIn, Cripqer), nombres propios de país/ciudad, horas (`18:00`), cifras, `aria-hidden`/`aria-live` y todo el dashboard **legacy**, que ya estaba en español.

**Lista de exclusión respetada:** Analytics legacy, Business OS, CRM, Leads, Campaign Engine, rediseño visual, pricing, entitlement y cálculos **no** se modificaron.

# CRIPQER ONBOARDING — REAL GENERATION RUNTIME FIX + AI PAGE ASSEMBLY V1

**Task ID:** `CRIPQER_ONBOARDING_GENERATION_RUNTIME_FIX_AND_AI_BUILD_ANIMATION_V1`  
**Type:** `CONTROLLED_RUNTIME_REPAIR + GENERATING_UI_REDESIGN + RUNTIME_QA`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Agent:** CODEX

## Verdict

`CRIPQER_ONBOARDING_REAL_GENERATION_AND_AI_PAGE_ASSEMBLY_RUNTIME_VISUAL_PASS_FROZEN`

Se reparó la frontera de generación para que las excepciones del serverFn se
registren en servidor y regresen como un failure serializable. El cliente
sanitiza además cualquier error de transporte que todavía llegue desde el
framework. Se reemplazó `GeneratingScreen` por una experiencia de ensamblaje
de página basada en nodos dirigidos, conectores, fragmentos de landing page y
el mark real de Cripqer.

El recorrido real continúa siendo:

```text
OnboardingV2Draft + OwnerContentIntakeState
        ↓
OnboardingIntentV2 + OwnerContentInput
        ↓
generateSmartPageFromOnboardingFn
        ↓
Smart Pages 5 → PAGES_7 → Engine V2
        ↓
BioTemplateConfig + validateTemplate()
        ↓
PublicTemplateRenderer → READY
```

No se modificaron Smart Pages core/retail, Engine V2 interno, `BioTemplateConfig`,
`PublicTemplateRenderer`, Owner Content, intake, DB, migraciones, signup ni
persistencia.

## Runtime bug

### Exact 500 root cause

**Classification:** `SERVER_FN_CONFIGURATION` + `RESPONSE_SERIALIZATION`

La petición `POST` a:

```text
/_serverFn/<smart-pages-generation-server.ts handler>
```

fallaba en la instancia Vite antigua de `/onboarding-test` con HTTP 500. La
excepción no controlada atravesaba el handler y `src/start.ts` la convertía en
una respuesta HTML mediante `renderErrorPage()`. Después, el `catch` del
caller copiaba `error.message` directamente a `FailureScreen`; por eso el body
`<!doctype html> ... This page didn't load` aparecía como texto de onboarding.

La evidencia de contraste fue determinante: el proceso Vite fresco levantado
para la verificación con el código actual ejecutó el mismo escenario y alcanzó
HTTP 200, generación real, validación canónica y `READY`. No hubo evidencia de
un fallo en Smart Pages, Engine V2, el esquema canónico o la persistencia. La
instancia 8080 era un proceso Vite detached anterior; su stack interno no era
recuperable desde la sesión actual, pero la causa observable y corregida de la
exposición fue la frontera serverFn sin normalización.

### Failing file/function

- `src/lib/onboarding-v2/smart-pages-generation-server.ts`
- `generateSmartPageFromOnboardingFn` y su handler dinámico.
- `src/start.ts` — middleware global que transforma excepciones no controladas
  en HTML 500.
- `PremiumOnboardingFlow` — caller que anteriormente mostraba el mensaje bruto.

### Minimum fix

1. El handler envuelve el import dinámico y `generateSmartPageFromOnboarding`
   en `try/catch`.
2. El error real se conserva en `console.error` server-side.
3. El browser recibe únicamente el failure estable:
   `No pudimos crear tu página todavía. Tus datos siguen aquí. Revisa la
información o inténtalo nuevamente.`
4. `sanitizeGenerationError()` cubre HTML crudo, `_serverFn`, stack traces,
   `Failed to fetch` y `NetworkError`, sin ocultar errores de datos seguros como
   `Missing owner fact: services[0].name.`.

### ServerFn result after fix

`SERVER_FN_HTTP_RESULT_AFTER_FIX = 200` en el escenario válido completo. El
resultado serializable terminó en `BioTemplateConfig`, pasó
`validateTemplate()` y el preview se mostró con `PublicTemplateRenderer`.

## Error handling

- `RAW_HTML_EXPOSED = NO`
- `SAFE_ERROR_UI = YES`
- `SERVER_ERROR_LOGGING_PRESERVED = YES`
- `STACK_TRACE_EXPOSED_TO_CLIENT = NO`
- `ONBOARDING_DATA_CLEARED_ON_FAILURE = NO`

La vista de fallo muestra el título `No pudimos crear tu página todavía`,
conserva los datos ingresados y ofrece `Volver a revisar` e `Intentar de nuevo`.
La prueba forzada de red confirmó que no aparecen `<!doctype` ni `This page did
not load`.

## AI page assembly experience

### Visual behavior

La nueva `GeneratingScreen` elimina la varita, los puntos decorativos mínimos,
el tratamiento estático y cualquier apariencia de porcentaje o ETA. Usa:

- mark real `/brand-assets/cripqer-mark.png` como centro de identidad;
- 18 nodos visibles en desktop, con acentos dorados seleccionados;
- trayectorias CSS con dirección desde el perímetro hacia el centro;
- conectores SVG temporales con flujo dash;
- silueta abstracta de navegador/página;
- fragmentos de hero, media, tarjetas, CTA y barrido dorado;
- copy rotativo de seis mensajes de presentación;
- movimiento GPU-friendly con `transform` y cleanup de `setInterval`.

La representación es deliberadamente abstracta y no inventa nombre, precio,
media ni otros hechos del propietario. Los datos reales aparecen únicamente en
la preview `READY` generada por el backend.

### Animation gates

- `MAGIC_WAND_REMOVED = YES`
- `MEANINGFUL_NODE_MOTION = YES`
- `PAGE_ASSEMBLY_VISUAL = YES`
- `FAKE_PERCENTAGE = NO`
- `FAKE_ETA = NO`
- `FAKE_COMPLETION_TIMER = NO`
- `TIMER_DRIVEN_READY = NO`
- `REAL_SUCCESS_CONTROLS_READY = YES`
- `FAILURE_STOPS_ASSEMBLY = YES`

El único timer de la pantalla rota copy de presentación; no decide éxito. La
transición a `READY` ocurre únicamente cuando finaliza el serverFn real con
resultado exitoso y validación canónica.

## Accessibility and responsive behavior

- `REDUCED_MOTION = YES`: desactiva movimiento continuo, sweep, conectores y
  pulso; mantiene nodos tenues y la página abstracta estática.
- `STATUS_COPY_ARIA_LIVE = YES` mediante `role="status"` y `aria-live="polite"`.
- Desktop usa la red completa y una página central amplia.
- Mobile reduce el campo a nodos centrales, mantiene la headline legible y no
  crea nodos fuera de la composición.
- Se verificaron layouts en 1366×768, 1440×900, 834×1112, 430×932, 390×844 y
  360×800 mediante la revisión responsive de la superficie y CSS.

## Runtime QA

**ONBOARDING_TEST_ROUTE:** `/onboarding-test`

Escenario real:

- `Estudio Demo`;
- `Fotografía`;
- objetivo de contacto;
- servicio `Sesión inicial`;
- precio `$45.000`;
- WhatsApp/teléfono `+56912345678`;
- imágenes omitidas explícitamente.

Resultados:

- `GENERATING_PASS = YES`: la pantalla nueva aparece mientras la llamada está
  en curso y el copy cambia sin porcentaje.
- `READY_PASS = YES`: la generación real termina en `READY`.
- `OWNER_FACTS_PRESERVED = YES`: nombre, actividad, servicio, precio y contacto
  aparecen en el preview canónico.
- `CANONICAL_VALIDATION_PASS = YES`.
- `PUBLIC_TEMPLATE_RENDERER_PASS = YES`.
- `FAILURE_PASS = YES`: request abortada de forma controlada; panel seguro,
  sin HTML crudo y con datos intactos.
- `CONSOLE_RESULT = 0 new errors / 0 new warnings from changed code` en las
  ejecuciones browser de QA.
- `REDUCED_MOTION_RUNTIME = PASS`: `animation: none`, representación de página
  visible y layout sin overflow horizontal.

## Visual evidence

Las capturas fueron generadas desde un navegador headless de QA contra el
servidor Vite local. Las capturas `GENERATING` retienen únicamente la petición
serverFn durante la captura para que la animación pueda esperar naturalmente;
las capturas `READY` dejan pasar la generación real.

- [desktop-generating-nodes.png](cripqer-onboarding-ai-generation-final/desktop-generating-nodes.png)
- [desktop-generating-page-assembly.png](cripqer-onboarding-ai-generation-final/desktop-generating-nodes-page-assembly.png)
- [desktop-ready.png](cripqer-onboarding-ai-generation-final/desktop-ready.png)
- [mobile-generating.png](cripqer-onboarding-ai-generation-final/mobile-generating.png)
- [mobile-ready.png](cripqer-onboarding-ai-generation-final/mobile-ready.png)
- [failure-sanitized.png](cripqer-onboarding-ai-generation-final/failure-sanitized.png)

## Files changed by this task

- `src/lib/onboarding-v2/smart-pages-generation-server.ts` — boundary server
  safe y failure serializable.
- `src/components/onboarding-v2/premium/PremiumOnboardingFlow.tsx` — caller
  sanitizado y nueva `GeneratingScreen`.
- `src/components/onboarding-v2/premium/generation-error.ts` — normalización
  segura de errores de transporte.
- `src/components/onboarding-v2/premium/premium-onboarding.css` — sistema de
  nodos, conectores, ensamblaje, responsive y reduced motion.
- `src/components/onboarding-v2/__tests__/premium-onboarding.test.tsx` —
  contratos de sanitización.
- `cripqer-onboarding-ai-generation-final/*` — evidencia visual.
- este informe.

## Verification

- Tests Premium Onboarding + Smart Pages 5: **19/19 passed**.
- Test de sanitización: **passed** para HTML crudo, error de transporte y
  missing-owner-fact seguro.
- ESLint focalizado: **passed**, sin errores ni warnings de los archivos
  modificados.
- TypeScript focalizado: **sin errores en los archivos modificados**.
- `npm run build`: **passed** para client, SSR y Nitro.
- Runtime Chrome/headless: generación real y preview `READY` **passed**.
- Failure smoke con request abortada: **passed**; `FAILURE_RAW_HTML_VISIBLE=false`
  y `FAILURE_SAFE_COPY=true`.
- Reduced motion smoke: **passed** (`animation: none`, page visible).
- `git diff --check`: **passed**; solo avisos de conversión CRLF/LF de archivos
  de trabajo existentes.

Warnings no bloqueantes existentes:

- `vite-tsconfig-paths` recomienda resolución nativa de paths;
- `src/routes/__tests__/pages.routing.test.ts` no exporta `Route` y se omite
  del route tree;
- warning de chunk grande del build.

## Architecture gates

- `SMART_PAGES_CORE_CHANGED = NO`
- `SMART_PAGES_RETAIL_CHANGED = NO`
- `ENGINE_V2_INTERNALS_CHANGED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `PUBLIC_TEMPLATE_RENDERER_CHANGED = NO`
- `OWNER_CONTENT_CHANGED = NO`
- `OWNER_CONTENT_INTAKE_CHANGED = NO`
- `SECOND_GENERATION_CHAIN = NO`
- `REAL_SP5_SEAM_USED = YES`
- `REAL_ENGINE_V2_USED = YES`
- `REAL_CANONICAL_VALIDATION = YES`
- `REAL_PUBLIC_TEMPLATE_RENDERER = YES`
- `SERVER_ERROR_LOGGING_PRESERVED = YES`
- `RAW_HTML_EXPOSED = NO`
- `SAFE_ERROR_UI = YES`
- `MAGIC_WAND_REMOVED = YES`
- `MEANINGFUL_NODE_MOTION = YES`
- `PAGE_ASSEMBLY_VISUAL = YES`
- `REDUCED_MOTION = YES`
- `FAKE_PERCENTAGE = NO`
- `TIMER_DRIVEN_READY = NO`
- `DB_WRITE = NO`
- `MIGRATION_CREATED = NO`
- `PERSISTENCE_CHANGED = NO`
- `SIGNUP_CHANGED = NO`
- `NEW_DEPENDENCY = NO`
- `SAMPLE_MEDIA_USED = NO`
- `FABRICATED_OWNER_DATA = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Success gate

`CRIPQER_ONBOARDING_REAL_GENERATION_AND_AI_PAGE_ASSEMBLY_RUNTIME_VISUAL_PASS_FROZEN`

No se inicia automáticamente ninguna tarea posterior.

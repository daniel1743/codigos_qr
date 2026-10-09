# CRIPQER — MERCADO PAGO · MICROFASE MP-M1
## SUBSCRIPTION FOUNDATION + AUTHORITATIVE FETCHER V1

**MODO: IMPLEMENTACIÓN TÉCNICA LIMITADA.**

No se creó UI. No se creó checkout funcional. No se creó endpoint de webhook. No se hizo
deploy ni push. No se tocó Cover Palette, Magic Editor visual, landing, Power Editor,
Analytics, entitlements, Billing Core ni B0. No se aplicó ninguna migración. No se creó
ningún plan remoto en Mercado Pago.

Estado: **PASS_WITH_LIMITATION** (§10, §11).

---

## 1. Archivos tocados

**Nuevos** — `src/server/billing/mercadopago/`

| Archivo | Líneas | Qué es |
| --- | --- | --- |
| `types.ts` | 145 | Formas de los recursos MP + contrato comercial de plan |
| `client.ts` | 218 | Cliente HTTP mínimo, server-side, sin SDK |
| `resource-fetcher.ts` | 195 | `ProviderResourceFetcher` real + la costura que cierra el dead-end |
| `plan.ts` | 111 | Contrato PRO (7.990 CLP / mensual / trial 10 días) + resolver fail-closed |
| `__tests__/client.test.ts` | 277 | 27 tests |
| `__tests__/resource-fetcher.test.ts` | 477 | 19 tests |
| `__tests__/entitlement-boundary.test.ts` | 158 | 6 tests |

**Modificados** — 3 archivos, 54 líneas añadidas, 1 eliminada

| Archivo | Cambio | Líneas |
| --- | --- | --- |
| `src/server/billing/webhooks.ts` | `isMercadoPagoPreapprovalResource` + 3 líneas en `normalizeMercadoPagoResource` | +24 / −1 |
| `src/server/billing/adapters/index.ts` | Comentario de estado MP-M1 (sin cambio de código) | +11 |
| `.env.example` | 3 nombres server-side documentados | +20 |

**No tocado, verificado por `git diff` filtrado:** ningún archivo de `src/features`,
`src/isolated`, `src/components`, `src/routes`, `supabase/migrations` ni
`premium-template-studio` contiene una sola referencia a Mercado Pago, `MP-M1` o
`MERCADOPAGO_`. Los archivos modificados que aparecen en `git status` son trabajo previo de
otras fases (el más reciente, `BusinessTemplate.tsx`), ajenos a esta microtarea.

---

## 2. Arquitectura final

La pieza de MP-M1 encaja en el contrato congelado, no al lado:

```
  notificación MP (thin: topic + resource id)
        │
        ▼
  intakeMercadoPagoNotification()            [ya existía]
        │  { kind: "lookup_required", lookup }
        ▼
  resolveMercadoPagoLookup(fetcher, lookup)  ←── NUEVO (resource-fetcher.ts)
        │
        ├─ webhookLookupFetchInput(lookup)   [ya existía, providers.ts:198]
        │
        ├─ fetcher.fetchResource(provider, type, id)   ←── NUEVO
        │     │
        │     ├─ GET /preapproval/{id}                (directo)
        │     ├─ GET /authorized_payments/{id} → GET /preapproval/{preapproval_id}
        │     └─ GET /v1/payments/{id}         → GET /preapproval/{preapproval_id}
        │            (createMercadoPagoClient, timeout, errores tipados)
        │
        └─ normalizeAuthoritativeResource(lookup, resource)   [ya existía]
              └─ normalizeMercadoPagoResource   [+3 líneas: reconoce el preapproval]
                    │
                    ▼
              NormalizedBillingEvent  (status real, requiresAuthoritativeLookup: false)
                    │
                    ▼
              applyNormalizedEvent()  →  billing_subscriptions  →  resolveUserPlan()
```

**Nada nuevo se inventó.** No hay segundo registry, ni segundo normalizador, ni segundo
cliente de eventos. `ProviderResourceFetcher` es el contrato que ya estaba declarado en
`webhooks.ts:116`; esta microtarea entrega su primera implementación real.

---

## 3. Env names

Nombres explícitos, server-side, sin `VITE_`:

| Variable | Uso | Estado |
| --- | --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | Bearer para `api.mercadopago.com` | Consumido por el cliente |
| `MERCADOPAGO_WEBHOOK_SECRET` | Firma del webhook | **Declarado, no consumido** (MP-M2) |
| `MERCADOPAGO_PRO_PLAN_ID` | Id del `preapproval_plan` de PRO | Consumido por el resolver de plan |

Se usó la convención propuesta en la directiva sin desviación. La convención existente en el
repo (`.env.example` agrupa por proveedor con prefijo en mayúsculas y sin `VITE_` para
secretos — `DEEPSEEK_*`, `FALLBACK_*`) es compatible, así que no hubo nada que justificar.

**Garantizado por test** (`client.test.ts`, describe "environment configuration"):
- los tres nombres son exactamente los declarados;
- ninguno empieza por `VITE_`;
- `VITE_MERCADOPAGO_ACCESS_TOKEN` se ignora explícitamente;
- ausente, vacío y solo-espacios resuelven al mismo estado "no configurado".

No se escribió ningún valor real. No se imprimió ninguna credencial.

---

## 4. HTTP client

`createMercadoPagoClient(config)` → `{ getJson(path) }`. Sin SDK: las tres lecturas de esta
fase son GET autenticados, y una dependencia que trae sus propios reintentos, logging y
telemetría es más superficie que auditar que las ~80 líneas propias.

| Requisito de la directiva | Cómo se cumple |
| --- | --- |
| Base URL | `MERCADOPAGO_API_BASE_URL = "https://api.mercadopago.com"`, sobreescribible |
| `GET /preapproval/{id}` | `MERCADOPAGO_RESOURCE_PATHS.preapproval` |
| `GET /authorized_payments/{id}` | `MERCADOPAGO_RESOURCE_PATHS.authorized_payment` |
| `GET /v1/payments/{id}` | `MERCADOPAGO_RESOURCE_PATHS.payment` |
| `Authorization: Bearer` | Cabecera fija; el token vive en el closure |
| Timeout explícito | `AbortController` + `DEFAULT_MERCADOPAGO_TIMEOUT_MS = 8000` |
| Errores tipados | `MercadoPagoError` con 9 códigos |
| No loggear token | El módulo no escribe en consola; hay test que lo prueba |
| No loggear respuestas | El cuerpo del error nunca se lee |
| No retries agresivos | Cero reintentos, por diseño |
| No fallback inseguro | No existe camino "si falla, asumir activo" |
| JSON validado mínimamente | Se rechaza no-JSON y JSON que no sea objeto |

**Errores tipados:** `MISSING_ACCESS_TOKEN` · `UNAUTHORIZED` · `NOT_FOUND` · `TIMEOUT` ·
`NETWORK_ERROR` · `INVALID_JSON` · `HTTP_ERROR` · `WRONG_PROVIDER` ·
`UNSUPPORTED_RESOURCE_TYPE` · `UNLINKED_PAYMENT`.

**Una decisión que conviene señalar:** el token ausente falla **antes** de cualquier
`fetch`. Un despliegue a medio configurar no puede producir una llamada sin autenticar.

---

## 5. Fetcher

`createMercadoPagoResourceFetcher(client)` implementa el contrato congelado
`ProviderResourceFetcher.fetchResource(provider, resourceType, resourceId)`.

**Resuelve autoritativamente las tres familias:**

| Tipo | Camino | Devuelve |
| --- | --- | --- |
| `preapproval` (y alias `subscription`) | `GET /preapproval/{id}` | El preapproval |
| `authorized_payment` | `GET /authorized_payments/{id}` → `GET /preapproval/{preapproval_id}` | El preapproval |
| `payment` | `GET /v1/payments/{id}` → `GET /preapproval/{preapproval_id}` | El preapproval |

**Sigue SOLO la relación documentada.** `payment.preapproval_id` y
`authorized_payment.preapproval_id` son los únicos vínculos que se recorren — un salto, no un
grafo. No hay lógica especulativa.

**Falla cerrado en cinco ejes, sin excepción:** proveedor ajeno (`WRONG_PROVIDER`), tipo sin
ruta (`UNSUPPORTED_RESOURCE_TYPE`, cubre `invoice`/`sale`/`unknown`), id vacío, pago sin
`preapproval_id` (`UNLINKED_PAYMENT`) y cualquier fallo de transporte. Los tres primeros se
rechazan **antes** de emitir una petición — hay tests que lo comprueban con un cliente que
registra llamadas.

**Por qué `UNLINKED_PAYMENT` lanza en vez de devolver el pago crudo:** un pago sin
`preapproval_id` no es un pago de suscripción, así que no hay estado de suscripción que
aplicar. Devolverlo dejaría al llamador con un evento que solo puede volver a ser
`LOOKUP_REQUIRED` — exactamente el bucle que esta fase existe para romper.

---

## 6. Cómo se resolvió el dead-end

**El dead-end, según la auditoría:** `payment` y `authorized_payment` no traen estado de
suscripción —solo un `preapproval_id`—, así que `normalizeMercadoPagoResource` forzaba
`status: null` con `requiresAuthoritativeLookup: true` (`webhooks.ts:342,388`), y
`applyNormalizedEvent` respondía `LOOKUP_REQUIRED` sin escribir (`application.ts:210`).
Nadie producía nunca el segundo evento resuelto.

**La pieza que faltaba no era el normalizador: era el fetch.** MP-M1 la construye, y luego
resuelve el segundo problema —que el normalizador no reconocía lo que el fetch devuelve.

Eran **dos** cambios, y el segundo es el que no se ve:

1. **El fetch** (`resource-fetcher.ts`): sigue `preapproval_id` hasta el preapproval.
2. **El reconocimiento** (`webhooks.ts`): el normalizador decidía "¿es preapproval?" mirando
   `lookup.resourceType`, es decir **lo que apuntaba la notificación**. Con
   `resourceType: "payment"`, seguía diciendo que no — y marcaba
   `requiresAuthoritativeLookup: true` **sobre un preapproval ya autoritativo**, dejando el
   bucle intacto. Ahora la pregunta se responde mirando **el recurso que volvió**, vía
   `isMercadoPagoPreapprovalResource(resource)`.

**El marcador es `auto_recurring`, no el status.** Es el bloque que todo preapproval lleva y
ningún payment tiene. Se descartó usar el status deliberadamente: `pending` es un estado
legal **para ambos** tipos de recurso, así que el status no puede discriminar. Hay un test
que fija exactamente eso.

**Verificado empíricamente, no argumentado.** Revertí temporalmente la línea del normalizador
y corrí la suite: **3 tests fallan** (los dos de "el dead-end está cerrado" y el de
`authorized_payment`). Restaurado, 111/111 verdes. El cambio es portante, no cosmético.

**El resultado, medido de punta a punta en test 12:**

```
payment crudo  →  LOOKUP_REQUIRED, 0 escrituras      (test 12b, control negativo)
payment + lookup →  APPLIED, 1 suscripción 'active', plan 'pro'   (test 12)
```

---

## 7. Mapping de recursos

| Recurso MP | Estado crudo | Estado canónico | Tipo de evento |
| --- | --- | --- | --- |
| `preapproval` | `authorized` | `active` | `SUBSCRIPTION_ACTIVATED` |
| `preapproval` | `pending` | `pending` | `SUBSCRIPTION_CREATED` |
| `preapproval` | `paused` | `paused` | `SUBSCRIPTION_PAUSED` |
| `preapproval` | `cancelled` | `cancelled` | `SUBSCRIPTION_CANCELLED` |
| `preapproval` | `finished` | `expired` | `SUBSCRIPTION_EXPIRED` |
| `payment` | `approved` / `accredited` | `null` (se sigue al preapproval) | `PAYMENT_SUCCEEDED` |
| `payment` | `refunded` | `null` | `PAYMENT_REFUNDED` |
| `payment` | `rejected` / `cancelled` | `null` | `PAYMENT_FAILED` |
| desconocido | cualquiera | **`null`** | — |

`MERCADO_PAGO_STATUS` (`webhooks.ts:137`) **no se tocó**: ya era correcto. Lo que cambió es
que ahora es alcanzable en runtime.

**Plan mapping.** `createMercadoPagoPlanResolver({ proPlanId })` mapea
`MERCADOPAGO_PRO_PLAN_ID` → `"pro"` y **nada más**. Un plan desconocido, un plan vacío, un
plan nulo y un proveedor ajeno devuelven `null`, que el core convierte en
`PLAN_MAPPING_REQUIRED` sin escribir. Con `proPlanId: null` —el estado real de hoy— el
resolver falla cerrado para toda entrada. **No hay fallback que mapee un plan desconocido a
PRO.** Business y enterprise están ausentes, no aproximados.

**Nada de esto permite un status inventado**, un status de query, un status de body no
verificado, ni entitlement directo: el único camino de escritura sigue siendo
`applyNormalizedEvent`, y su primera regla es rechazar lo que requiere lookup.

---

## 8. Seguridad

| Regla dura | Cumplida | Evidencia |
| --- | --- | --- |
| Access Token solo servidor | ✅ | `import "@tanstack/react-start/server-only"` en los 4 módulos |
| No `VITE_` | ✅ | Test: ningún nombre empieza por `VITE_`; el lookalike se ignora |
| No localStorage | ✅ | No se importa ni se menciona |
| No frontend | ✅ | Marcador server-only; nada lo importa desde un componente |
| No exponer la respuesta completa | ✅ | `fetchResource` devuelve solo el recurso pedido |
| No entitlement directo | ✅ | El adaptador no puede alcanzar la UI ni `resolveUserPlan` |
| No confiar en redirect | ✅ | Test 15: `handleCheckoutReturn` lee y no escribe |
| No confiar en webhook sin lookup | ✅ | Un `payment` crudo sigue siendo `LOOKUP_REQUIRED` |
| Fail-closed | ✅ | 10 códigos de error, todos sin camino a acceso |
| Provider errors no abren acceso | ✅ | Un error tipado no produce evento; sin evento no hay escritura |

**Tres tests que no son de forma sino de garantía:**

1. **El token nunca se filtra** (`client.test.ts`): se recorre cada camino de error —401,
   404, 503, body no-JSON— y se afirma que el token no aparece en `error.message` ni en una
   serialización del error. Más un test que verifica que el **cuerpo del proveedor** no se
   propaga.
2. **Nada se escribe en consola** (`client.test.ts`): se espían los cinco métodos de
   `console` en el camino feliz y en el de 401. Cero llamadas.
3. **El redirect no puede conceder Pro** (`entitlement-boundary.test.ts`): con un checkout
   persistido como `success`, se ejecuta el flujo de retorno y se afirma que las llamadas
   fueron **exactamente** `requireUser` + `getCheckoutForUser` — y que
   `updateCheckoutStatus` y `createCheckout` (ambos armados para lanzar si se tocan) nunca se
   invocaron.

**Sobre `handleCheckoutReturn` hay dos garantías independientes, a propósito:** la
conductual (lee y no escribe) y la estructural —su firma tiene dos parámetros y ninguno puede
transportar un `?success=true`—. Y el tipo `CheckoutStore` que recibe no expone ningún
escritor de suscripción ni de grant: convertirse en Pro exige un webhook verificado que
llegue a `applyNormalizedEvent`, y esa costura no está a su alcance.

---

## 9. Tests

```
npx vitest run src/server/billing
  Test Files  6 passed (6)
      Tests  111 passed (111)
```

52 nuevos (3 archivos) + 59 preexistentes (3 archivos), **0 regresiones**.

Cobertura de los 15 casos obligatorios:

| # | Caso pedido | Test |
| --- | --- | --- |
| 1 | fetch preapproval válido | `resource-fetcher` · "fetches a preapproval directly and does not chain" |
| 2 | fetch authorized_payment válido | idem · "follows an authorized_payment to its preapproval" |
| 3 | fetch payment válido | idem · "follows a payment to its preapproval" |
| 4 | 401/403 falla cerrado | `client` · UNAUTHORIZED (×2) |
| 5 | 404 recurso inexistente | `client` NOT_FOUND + `resource-fetcher` "propagates NOT_FOUND" |
| 6 | timeout | `client` · TIMEOUT |
| 7 | JSON inválido | `client` · INVALID_JSON (×2: no-JSON y array) |
| 8 | token ausente | `client` · MISSING_ACCESS_TOKEN (ausente y solo-espacios) |
| 9 | nunca imprime secret | `client` · 4 tests de fuga + 1 de consola |
| 10 | payment crudo requiere lookup | `resource-fetcher` · test 10 |
| 11 | authorized_payment crudo requiere lookup | idem · test 11 |
| 12 | tras lookup ya no termina en LOOKUP_REQUIRED | idem · test 12 + control 12b |
| 13 | preapproval sigue funcionando | idem · test 13 + reconocimiento por `auto_recurring` |
| 14 | mapping desconocido no concede Pro | idem · 14, 14b, 14c |
| 15 | ninguna query/redirect puede mutar entitlement | `entitlement-boundary` · 15, 15b, 15c, 15d |

**§12 — Self-checks.** No se convirtió ninguno. Se identificó que
`providers.selfcheck.ts` (líneas 137-462) cubre esta microfase con adaptadores mock y
`application.selfcheck.ts` cubre el core de aplicación. **Ninguno de sus casos críticos se
portó**, y la razón es concreta: lo que MP-M1 aporta es la primera implementación REAL de
`ProviderResourceFetcher`, y los selfchecks solo ejercitan mocks de ese contrato. Portarlos
habría duplicado la cobertura de los mocks, no la del código nuevo. Los 15 casos de la
directiva ya cubren lo que estos selfchecks no podían cubrir. Cero refactor de
infraestructura de tests.

**QA (§16):**

| Gate | Resultado |
| --- | --- |
| Tests nuevos MP | ✅ 52/52 |
| Tests billing existentes | ✅ 59/59 — sin regresión |
| Typecheck filtrado por scope | ✅ **0 errores** en `mercadopago/**`, `webhooks.ts`, `adapters/index.ts` |
| Lint de archivos tocados | ✅ 0 problemas (6 de prettier corregidos con `--fix`, re-lint limpio) |
| `git diff --check` | ✅ limpio (solo avisos LF→CRLF del repo, preexistentes) |

**Errores globales preexistentes, reportados por separado y NO arreglados:**
`npx tsc --noEmit -p tsconfig.json` reporta **1220 errores** en ~200 archivos de todo el
repo (rutas, `premium-template-studio`, `isolated/magic-page-editor`, servicios). Son el
estado del repositorio en esta rama, ajenos a esta microtarea. Un error TS que sí era mío
(`TS4111` en `client.test.ts`, acceso por índice) se corrigió; tras eso, **cero errores en
el scope tocado**. No se tocó ningún error ajeno.

---

## 10. Limitaciones

1. **`MERCADOPAGO_PRO_PLAN_ID` no existe todavía**, así que el resolver de plan devuelve
   `null` para toda entrada y ninguna suscripción se aplica. Es el comportamiento correcto
   hoy —fail-closed— pero significa que **el camino a `APPLIED` de los tests solo funciona
   con un `proPlanId` inyectado**. En producción, hasta que el plan remoto exista y la
   variable se configure, un preapproval autorizado real no concedería Pro.
2. **El adaptador NO está registrado.** `createProductionProviderRegistry()` sigue
   devolviendo el registro vacío, y el test `b0-security-contract.test.ts:178-190` —que se
   ejecuta— lo fija. Es deliberado: `createSession`, `cancel`, `reactivate`, `changePlan` y
   `verifier` son MP-M2/M3 y dependen de decisiones del dueño. Lo que aterrizó es la
   fontanería, no el interruptor.
3. **El fetcher no se ejercita contra Mercado Pago real.** Todos los tests usan un cliente
   falso. No hay credenciales, ni cuenta, ni sandbox. La forma de los recursos se tomó de la
   documentación de MP y del normalizador existente; **no se ha verificado contra una
   respuesta real**. Un campo que MP devuelva con otro nombre se manifestaría como un
   `UNLINKED_PAYMENT` o un `status: null`, nunca como un acceso concedido por error — pero
   sí como una falla silenciosa hasta que exista sandbox.
4. **`MERCADOPAGO_WEBHOOK_SECRET` se declara y no se consume.** No hay `WebhookVerifier`
   todavía (MP-M2). Una variable declarada y sin uso es inerte; se incluyó para que la
   superficie de configuración esté completa y el nombre quede fijado.
5. **El dead-end se cierra a nivel de unidad, no de endpoint.** `resolveMercadoPagoLookup`
   demuestra la propiedad y los tests la fijan, pero **nadie la llama en producción**: no hay
   endpoint de webhook. El bucle está roto en el código; el cableado que lo aprovecha es
   MP-M2.
6. **No se implementó `getSubscription`/`getCheckoutStatus`** del `ProviderAdapter`. El
   fetcher resuelve recursos por id; el adaptador completo necesita además la consulta por
   checkout, que pertenece a MP-M3.
7. **`buildProAutoRecurring` es contrato, no petición.** Devuelve el bloque `auto_recurring`
   que MP espera y no lo envía a ningún sitio. El trial de 10 días está escrito como valor
   verificable, no ejecutado: crear el plan remoto es trabajo posterior.
8. **Los selfchecks siguen sin ejecutarse** por ningún runner (§9 de la auditoría). MP-M1 no
   lo cambió: era una tarea opcional y fuera de alcance. Los 9 archivos siguen siendo
   artefactos inertes.

---

## 11. Qué NO se implementó

Explícitamente ausente, por instrucción:

- **Endpoint de webhook público** — ninguna ruta, ninguna server function de webhook.
- **`WebhookVerifier`** — el contrato sigue sin implementación; `MERCADOPAGO_WEBHOOK_SECRET`
  se declara y no se lee.
- **Checkout funcional** — sin botón, sin server function, sin `createCheckout` invocado.
- **UI / página de precios** — ninguna.
- **Creación de suscripción** (`POST /preapproval`, `POST /preapproval_plan`) — no existe la
  pieza; `startProviderSession` sigue sin adaptador que lo reciba.
- **Plan remoto en Mercado Pago** — no se creó nada; no se inventó ningún id.
- **Deploy, push, commit** — ninguno.
- **Migraciones** — ninguna creada ni aplicada; B0 solo se leyó.
- **Tocar Cover Palette, Magic Editor visual, landing, Power Editor, Analytics,
  entitlements, Billing Core, BasicEditorShell, templates, save/publish, AI Prime, auth** —
  ninguno.
- **Rutas públicas nuevas** — ninguna.

---

## 12. Siguiente microfase recomendada

**MP-M2 — `WebhookVerifier` + endpoint de webhook, en ese orden.**

La razón es de secuencia, no de comodidad: hoy el sistema es seguro **por ausencia** —no hay
endpoint, así que no hay nada que falsificar. En el momento en que exista uno sin verificación
de firma, aparece un camino para conceder Pro con un POST fabricado. Por eso la verificación
va **primero**, y el endpoint **después**, en el mismo cambio.

Orden concreto:

1. **`WebhookVerifier` de Mercado Pago** — firma `x-signature` / `x-request-id` sobre el
   cuerpo crudo, comparación timing-safe, secreto en `MERCADOPAGO_WEBHOOK_SECRET`.
2. **El endpoint** — verificar → `intakeWebhookEvent` → `resolveMercadoPagoLookup` (ya
   existe) → idempotencia (`claim_billing_event`, ya existe) → `applyNormalizedEvent` (ya
   existe). Todas las piezas menos la verificación están construidas.
3. **El `ProviderAdapter`** (MP-M3) — `createSession`, `cancel`, `reactivate`, `changePlan`,
   `getSubscription`, y el registro en `createProductionProviderRegistry()`. Requiere el plan
   remoto y las credenciales.

**Prerrequisito que sigue bloqueando a MP-M3 y que no es código:** que el dueño cree el plan
remoto y configure `MERCADOPAGO_PRO_PLAN_ID`, sin el cual el resolver falla cerrado y ningún
pago concedería Pro. MP-M1 se diseñó para que ese sea el único cambio necesario para
activarlo.

---

## 13. Git diff summary

**Sin commit** (§18: no commit salvo autorización posterior).

```
 Nuevos:      src/server/billing/mercadopago/            7 archivos, 1638 líneas
 Modificados: src/server/billing/webhooks.ts             +24 / −1
              src/server/billing/adapters/index.ts       +11 (comentario)
              .env.example                               +20
              ─────────────────────────────────────────────────────
              3 archivos tracked, 54 inserciones, 1 borrado

 Fuera de scope modificado por esta fase: ninguno
```

`git status --short` muestra además archivos modificados y sin trackear de fases anteriores
(landing conversacional, Magic Editor, migración de octubre). **No fueron tocados por MP-M1**:
la verificación es que ninguno contiene una referencia a Mercado Pago, y que esta fase solo
escribió en `src/server/billing/mercadopago/`, `webhooks.ts`, `adapters/index.ts` y
`.env.example`.

---

## Declaración

**PASS_WITH_LIMITATION.**

Cumplido y verificado:

- **El dead-end está cerrado, y se probó que el cierre es real.** `payment` y
  `authorized_payment` ahora llegan a `APPLIED` tras el lookup autoritativo (test 12), y el
  control negativo prueba que sin lookup siguen siendo `LOOKUP_REQUIRED` con cero escrituras
  (test 12b). Revertir la línea del normalizador rompe 3 tests — el cambio es portante.
- **La pieza que faltaba era el fetch, no el normalizador.** Se construyó el
  `ProviderResourceFetcher` real siguiendo solo la relación documentada
  (`preapproval_id`), con fallo cerrado en cinco ejes.
- **Cliente HTTP sin SDK**, con timeout explícito, errores tipados, cero reintentos, cero
  logging y cero fallback. El token no aparece en ningún mensaje, en ninguna serialización ni
  en la consola — medido, no asumido.
- **La frontera de entitlement no se movió.** `handleCheckoutReturn` lee y no escribe, no
  puede recibir un query param, y el store que se le entrega no expone ningún escritor de
  suscripción o grant (test 15, cuatro variantes).
- **Env names explícitos y server-side**, sin `VITE_`, con el lookalike ignorado por test.
- **52 tests nuevos, 111/111 en billing, 0 regresiones, 0 errores TS en el scope, lint
  limpio.**

Las limitaciones son las del §10. La que conviene que decidas tú: **`MERCADOPAGO_PRO_PLAN_ID`
no existe todavía**, así que el resolver de plan falla cerrado y hoy ningún pago real
concedería Pro. MP-M1 dejó ese camino construido y probado, esperando un id.

**No se implementó webhook endpoint. No se implementó checkout. No se creó plan remoto. No
se hizo deploy. No se hizo commit.**

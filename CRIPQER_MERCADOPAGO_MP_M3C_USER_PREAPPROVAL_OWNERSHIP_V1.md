# CRIPQER — MERCADO PAGO MP-M3C — USER PREAPPROVAL + OWNERSHIP CORRELATION V1

**Microfase:** MP-M3C — USER PREAPPROVAL + OWNERSHIP CORRELATION V1
**Fecha:** 2026-10-11
**Worktree:** `C:\Users\Lenovo\Desktop\worktrees\cripqer-mp-m2`
**Branch:** `billing/mercadopago-mp-m2-webhook-verifier`
**HEAD base:** `1de740a` (feat(billing): add Mercado Pago Pro plan creation support)
**Naturaleza:** IMPLEMENTACIÓN + QA LOCAL. Sin red, sin deploy, sin push, sin suscripción real.
**Veredicto:** `MP-M3C_PASS_WITH_LIMITATIONS`

---

## 1. Preauditoría (read-only, 14 puntos, revalidada contra el código actual)

| # | Punto | Resultado verificado | Ubicación |
|---|---|---|---|
| 1 | `requireBillingUser()` | Existe; lanza el error canónico `code === "BILLING_UNAUTHORIZED"` (401). Devuelve `{ userId, email }`. | `src/server/billing/auth.ts` |
| 2 | `CheckoutUserSource.requireUser()` | Es el seam canónico de identidad del host de Checkout: `requireUser(): Promise<{ userId, email: string \| null }>`. **Se reutiliza tal cual**, no se inventa otro. | `src/server/billing/checkout.ts` |
| 3 | `ResolvedOffer` / `providerOfferReference` | `{ planId, billingInterval, provider, currency, amount, providerOfferReference: string \| null }`. La oferta PRO se construye server-side desde el contrato congelado. | `src/server/billing/checkout.ts` |
| 4 | `billing_subscriptions` | Columnas reales: `id, user_id, plan_id (CHECK pro/business/enterprise), provider, billing_customer_id, provider_customer_id, provider_subscription_id, billing_interval, currency, status (CHECK pending/active/past_due/paused/cancelled/expired), current_period_start, current_period_end, cancel_at_period_end, payment_method_label, created_at, updated_at`. **NO existe columna `provider_plan_id`.** | `supabase/migrations/20260915000000_restore_canonical_billing_persistence.sql` |
| 5 | `getSubscriptionByProviderId()` | **NO filtra por status** (persistence.ts:51-70). Por tanto una fila `pending` **sí** prueba ownership ante `resolveOwner`. Revalidado: sigue sin filtro. | `src/server/billing/persistence.ts` |
| 6 | `upsertNormalizedSubscription()` | Único writer canónico de suscripciones. Re-lee por `(provider, provider_subscription_id)`; ante `23505` re-lee y reintenta; si no, lanza. Nunca hace clobber silencioso. | `src/server/billing/persistence.ts` |
| 7 | `getCanonicalSubscriptionForUser()` | Lookup canónico por usuario con **filtro de status vivo** (pending/active/past_due/paused) — el mismo conjunto que exige el índice parcial único. Es el guard anti-duplicado correcto. | `src/server/billing/persistence.ts` |
| 8 | `billing_customers` | Upsert sólo dentro de `applyNormalizedEvent` cuando hay `provider_customer_id`. **MP-M3C no crea customer**: un preapproval aún no autorizado no tiene customer identity. | `src/server/billing/application.ts:263-271` |
| 9 | Persistencia B0 | Roles de navegador revocados; sólo `service_role`. Índices únicos parciales: `(provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL` y `(user_id) WHERE status IN ('pending','active','past_due','paused')` → **una sola fila viva por usuario**. | migración B0 (arriba) |
| 10 | Tipos canónicos | `BillingSubscriptionRecord`, `NormalizedSubscriptionInput`, `BILLING_SUBSCRIPTION_STATUSES`, `BILLING_PLAN_IDS`, `BillingInterval`. | `src/lib/billing/billing.types.ts` |
| 11 | Status aceptados y semántica de `"pending"` | `status` acepta `pending` (CHECK de DB y unión TS). `PAID_GRANTING_STATUS = new Set(["active"])` → **`pending` NO otorga Pro**: `resolveEntitlement` devuelve `effectiveTier: "free"`, `hasPaidAccess: false`, `reason: "PENDING"`. | `src/server/billing/entitlements.ts:133,205-215` |
| 12 | Cliente Mercado Pago actual | `MercadoPagoClient` (GET) y `MercadoPagoWriteClient` (+`postJson`) comparten un `requestJson`; sin retries, sin logs, sin leer el body de error. `MISSING_ACCESS_TOKEN` se lanza **antes** de cualquier fetch. | `src/server/billing/mercadopago/client.ts` |
| 13 | `plan-creation.ts` (MP-M3B) | `MERCADOPAGO_PREAPPROVAL_PLAN_PATH = "/preapproval_plan"`, `buildProPlanCreationRequestBody`, `readProPlanId`, `createMercadoPagoProPlan`. **No se toca**; el plan remoto ya existe y **no se crea otro**. | `src/server/billing/mercadopago/plan-creation.ts` |
| 14 | Config reader | `MERCADOPAGO_ENV_KEYS = { accessToken: MERCADOPAGO_ACCESS_TOKEN, webhookSecret: MERCADOPAGO_WEBHOOK_SECRET, proPlanId: MERCADOPAGO_PRO_PLAN_ID }`; `readMercadoPagoConfigFromEnv()` resuelve `""`/espacios a `null` (un solo estado "no configurado"). `MERCADOPAGO_PRO_PLAN_ID` ya estaba en `.env.example:64` (MP-M3B) — **no se agregó ninguna variable nueva**. | `src/server/billing/mercadopago/client.ts` |
| 15 | Resolución de ownership en webhook | `applyNormalizedEvent` → `resolveOwner`: P1 `trustedUserId`, P2 `getSubscriptionByProviderId` (sin filtro de status). Un webhook **no** aporta `trustedUserId` (test estructural existente lo prohíbe). | `src/server/billing/application.ts:150-168` |

### Confirmación explícita exigida por la directiva

> ¿Puede existir una fila `provider = mercado_pago`, `provider_subscription_id = PREAPPROVAL_ID`, `user_id = USUARIO_AUTENTICADO`, `status = pending` **sin otorgar Pro**?

**SÍ — revalidado contra el código actual, no asumido:**

- La fila es escribible: `pending` está en el CHECK de `billing_subscriptions.status` y en `BILLING_SUBSCRIPTION_STATUSES`, y `upsertNormalizedSubscription` acepta cualquier status canónico.
- La fila **prueba ownership**: `resolveOwner` (application.ts:160-165) busca por `(provider, provider_subscription_id)` **sin filtrar status**, y el índice único parcial cubre esa búsqueda. El webhook que llegue después con `status = authorized` resuelve el owner y aplica.
- La fila **no concede Pro**: `PAID_GRANTING_STATUS` sólo contiene `"active"` (entitlements.ts:133); `pending` cae en `reasonForNonActiveStatus` → `"PENDING"` con `hasPaidAccess: false` (entitlements.ts:205-215).
- `plan_id` debe ser canónico (`pro`) porque el CHECK de DB no admite otra cosa y `resolveEntitlement` no infiere plan nunca.

### Desviación detectada respecto de la forma sugerida en la directiva

La directiva sugería persistir `provider_plan_id = MERCADOPAGO_PRO_PLAN_ID`. **Esa columna no existe** en `billing_subscriptions` y B0 SQL está congelado ("NO tocar B0 SQL salvo necesidad demostrada"). No se inventó una columna ni una migración. En su lugar:

- El vínculo con el plan queda **en el proveedor** (`preapproval_plan_id` dentro del preapproval), que es la fuente autoritativa para el webhook.
- El mapeo a plan canónico ya existe y no se duplica: `createMercadoPagoPlanResolver({ proPlanId }).resolvePlan("mercado_pago", MERCADOPAGO_PRO_PLAN_ID) === "pro"` (probado en MP-M3C).
- Se persiste `plan_id = "pro"` (contrato comercial congelado) en la fila de correlación.

Consecuencia práctica: si algún día se cambia `MERCADOPAGO_PRO_PLAN_ID` en el entorno, las filas históricas siguen resolviendo por el plan **del proveedor** (el id real viaja en el recurso), no por el valor de entorno actual. Es la dirección más segura.

---

## 2. Arquitectura encontrada (y respetada)

```
POST /api/billing/mercadopago/start-pro        ← src/routes/api.billing.mercadopago.start-pro.ts (transporte puro)
        │  dynamic import dentro del handler
        ▼
handleStartProSubscription(request)            ← pro-subscription-start.ts:581
        │
        ▼
startProSubscription(deps)                     ← pro-subscription-start.ts:289  (EL FLUJO SECUENCIADO)
        │
        ├─ deps.userSource.requireUser()        ← CheckoutUserSource (producción → requireBillingUser())
        ├─ resolveMercadoPagoProOffer()         ← CRIPQER_PRO_PLAN_CONTRACT + MERCADOPAGO_PRO_PLAN_ID
        ├─ deps.store.getLiveSubscriptionForUser()  ← getCanonicalSubscriptionForUser() (guard anti-duplicado)
        ├─ createMercadoPagoUserPreapproval()   ← preapproval-creation.ts:229 (UNA llamada POST /preapproval)
        ├─ deps.store.upsertNormalizedSubscription() ← writer canónico, status "pending"
        └─ correlationIsEstablished()           ← VERIFICACIÓN antes de devolver nada
```

No hay camino paralelo: identidad, oferta, lookup y escritura son los primitives canónicos que ya existían. Lo nuevo es **el orden, los guards y las clasificaciones**.

`src/routes/api.billing.mercadopago.start-pro.ts` es transporte puro (44 líneas): import dinámico dentro del handler (para que el módulo `server-only` no entre al bundle de cliente), handler `POST` + `ANY`, cero decisiones.

---

## 3. Contrato oficial de Mercado Pago utilizado (investigado, no supuesto)

Endpoint: `POST https://api.mercadopago.com/preapproval` (Subscriptions API — mismo origen y mismo prefijo sin `/v1` que `/preapproval_plan` del MP-M3B).

Campos **documentados** usados, y sólo éstos:

| Campo | Uso en Cripqer | Fundamento |
|---|---|---|
| `preapproval_plan_id` | id del plan remoto PRO ya existente | Documentado como vínculo al plan; con plan, los términos recurrentes **provienen del plan** |
| `payer_email` | email de la **sesión autenticada** | Marcado **REQUIRED** por la referencia |
| `back_url` | opcional; en producción `null` (se omite y aplica el del plan) | Documentado como opcional; debe ser https absoluta |

Campos que la referencia menciona y que **deliberadamente NO se envían**:

- `status` — `authorized` exige método de pago; sin `card_token_id` el resultado real es `pending`. Es una transición de MP, no una afirmación nuestra.
- `card_token_id` — el servidor nunca ve datos de tarjeta; el pagador autoriza en el checkout de MP.
- `auto_recurring` — repetir el precio aquí crearía un segundo lugar donde vive el monto (riesgo de drift con el plan).
- `external_reference` — el ownership de Billing es `billing_subscriptions.provider_subscription_id`, escrita inmediatamente. Ningún metadata del proveedor es autoridad de ownership (ver `applyNormalizedEvent`).

Respuesta: se leen `id` e `init_point`. **`init_point` no se asumió**: se leyó de la referencia y, además, se trata defensivamente (sólo https absoluta, si no, es `null` y el flujo falla cerrado). El tipo canónico `MercadoPagoPreapprovalResource` no declara `init_point` y **no se ensanchó**: el módulo lo lee por una vista local estrecha (`PreapprovalCreationResponseView`).

**Idempotencia: NO documentada.** No existe idempotency key para este endpoint. Un retry crea una segunda suscripción. Por eso el módulo hace exactamente **una** request y una respuesta ilegible lanza un error tipado en vez de invitar a reintentar.

Errores documentados: 400 / 401 / 403 / 500 — clasificados por el cliente existente (`UNAUTHORIZED`, `HTTP_ERROR`, `TIMEOUT`, `NETWORK_ERROR`, `MISSING_ACCESS_TOKEN`). El body de error del proveedor nunca se lee ni se propaga.

Fuentes cruzadas (ninguna basta sola; las tablas de la referencia se renderizan colapsadas):
- `https://www.mercadopago.com.mx/developers/en/reference/online-payments/subscriptions/create-preapproval/post`
- `https://www.mercadopago.com.uy/developers/en/reference/online-payments/subscriptions/create-preapproval/post`
- guía oficial de MP en GitHub (`mercadopago/mercadopago-claude-marketplace`)

---

## 4. Archivos modificados / creados

| Archivo | Estado | Líneas | Qué es |
|---|---|---|---|
| `src/server/billing/mercadopago/preapproval-creation.ts` | **NUEVO** | 266 | Mitad proveedor: body, lecturas defensivas, UNA llamada a `POST /preapproval` |
| `src/server/billing/mercadopago/pro-subscription-start.ts` | **NUEVO** | 584 | Flujo secuenciado + handler HTTP + clasificaciones + sink crítico + wiring de producción |
| `src/routes/api.billing.mercadopago.start-pro.ts` | **NUEVO** | 44 | Transporte: `POST /api/billing/mercadopago/start-pro` |
| `src/server/billing/mercadopago/__tests__/preapproval-creation.test.ts` | **NUEVO** | 472 | 31 tests del contrato del proveedor |
| `src/server/billing/mercadopago/__tests__/pro-subscription-start.test.ts` | **NUEVO** | 1049 | 41 tests del flujo, del handler y de estructura |
| `src/routeTree.gen.ts` | **MODIFICADO (generado)** | +22 / −0 | Registro aditivo de la ruta nueva (regenerado por el build) |

**No se modificó ningún archivo preexistente de lógica.** El diff sobre archivos tracked es exclusivamente la línea/registro generado de la ruta: 22 inserciones, 0 borrados, sin reordenamientos.

Archivos **NO tocados** (respetando la lista NO TOCAR): `webhook-verifier`, `metadata` signing, `webhook-endpoint.ts`, `webhook.ts`/`webhooks.ts`, `application.ts`, `entitlements.ts`, `persistence.ts`, `checkout.ts`, `auth.ts`, `plan.ts`, `plan-creation.ts`, `client.ts`, migraciones B0, Cover Palette, Magic Editor, Analytics, landing, renderer público, navbar, PayPal, Stripe, BUSINESS.

---

## 5. Flujo final (implementado)

```
1. request.method !== "POST"                → 405 METHOD_NOT_ALLOWED (+ Allow: POST). No se lee el body.
2. deps.userSource.requireUser()            → sin sesión: 401 UNAUTHENTICATED (error canónico propagado)
3. resolveMercadoPagoProOffer(config)       → sin MERCADOPAGO_PRO_PLAN_ID: 500 UNCONFIGURED
4. email de la sesión                       → vacío/ausente: 422 PAYER_EMAIL_REQUIRED
5. getLiveSubscriptionForUser(userId)       → fila viva: 409 ALREADY_IN_PROGRESS
6. createMercadoPagoUserPreapproval()       → rechazo de MP: 502 PROVIDER_ERROR (código cerrado)
                                            → respuesta ilegible: 500 CRITICAL (PREAPPROVAL_RESPONSE_UNUSABLE)
7. upsertNormalizedSubscription(pending)    → fallo: 500 CRITICAL (OWNERSHIP_WRITE_FAILED)
8. correlationIsEstablished(written)        → no verifica: 500 CRITICAL (OWNERSHIP_WRITE_FAILED)
9.                                                    200 READY { redirectUrl }
```

El paso 9 es el único que devuelve una URL. Ningún paso posterior a la autenticación lanza hacia afuera: todas las salidas son resultados clasificados.

Resultados (`ProSubscriptionStartResult`, unión cerrada):

| Resultado | HTTP | Significado |
|---|---|---|
| `READY` | 200 | Correlación persistida y **verificada**; se entrega la URL de checkout |
| `UNCONFIGURED` | 500 | Falta `MERCADOPAGO_PRO_PLAN_ID` |
| `PAYER_EMAIL_REQUIRED` | 422 | La sesión no trae email y MP lo exige |
| `ALREADY_IN_PROGRESS` | 409 | Ya hay suscripción viva para este usuario |
| `PROVIDER_ERROR` | 502 | MP rechazó o falló; **nada** persistido |
| `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` | 500 | **CRÍTICO**: puede existir una suscripción remota sin dueño canónico |
| `UNAUTHENTICATED` | 401 | Sin sesión |
| `METHOD_NOT_ALLOWED` | 405 | Método distinto de POST |
| `INTERNAL_ERROR` | 500 | Fallo no clasificado; sin detalles |

---

## 6. Modelo de ownership

Fila escrita (`buildProSubscriptionOwnership`, pro-subscription-start.ts:238):

```json
{
  "user_id": "<usuario de la sesión autenticada>",
  "plan_id": "pro",
  "provider": "mercado_pago",
  "billing_customer_id": null,
  "provider_customer_id": null,
  "provider_subscription_id": "<id REAL devuelto por MP>",
  "billing_interval": "monthly",
  "currency": "CLP",
  "status": "pending",
  "current_period_start": null,
  "current_period_end": null,
  "cancel_at_period_end": false,
  "payment_method_label": null
}
```

- **`user_id`** sale exclusivamente de `CheckoutUserSource.requireUser()`. No hay parámetro, body, query, email ni `external_reference` que pueda sustituirlo.
- **`provider_subscription_id`** es el id real devuelto por MP en esa misma request. Nunca el plan id (confundirlos permitiría almacenar un plan como suscripción).
- **`plan_id = "pro"`**: valor del contrato comercial congelado, no del navegador.
- **Sin `billing_customer_id`**: un preapproval recién creado no tiene customer identity; inventarlo sería fabricar datos.
- La escritura usa **`upsertNormalizedSubscription`** — el writer canónico — sobre `(provider, provider_subscription_id)`, así que un webhook que llegue después actualiza **esta** fila y no crea otra.

**Verificación obligatoria antes de entregar la URL** (`correlationIsEstablished`, pro-subscription-start.ts:269): la fila devuelta debe coincidir exactamente en `user_id`, `provider`, `provider_subscription_id` y tener un status **vivo** canónico. Un writer que devuelva la fila equivocada, o una fila ya muerta, no autoriza a entregar nada. Cubierto por 7 casos en el test 13.

---

## 7. Comportamiento de `pending` (probado contra los cores reales)

Con la fila que este flujo escribe:

| Pregunta | Respuesta | Prueba |
|---|---|---|
| ¿El webhook puede atribuirla a un usuario? | **SÍ** — `applyNormalizedEvent` con el store real devuelve `APPLIED` y `userId = <usuario>` | test 11 |
| ¿Y sin la correlación? | **NO** — el mismo evento devuelve `OWNER_REQUIRED`, `userId: null` | test 11b |
| ¿Otorga Pro? | **NO** — `resolveEntitlement` → `free`, `hasPaidAccess: false`, `reason: "PENDING"` | test 12 |
| ¿El flujo toca entitlement? | **NO** — el módulo no menciona grants/entitlement y no escribe `"active"` | test 12b |

**No se tocó la semántica del entitlement.** El único status que otorga Pro sigue siendo `"active"`, y sólo un webhook verificado puede aplicarlo.

---

## 8. Estrategia anti-duplicado (auditada, sin inventar garantías)

**Lo que MP ofrece:** nada. No hay idempotency key documentada para `POST /preapproval`. Cualquier afirmación de "idempotencia" sería inventada.

**Lo que ya existía en Billing (auditado antes de diseñar nada):**

- `getCanonicalSubscriptionForUser(userId)` — lookup por usuario con filtro de status vivo.
- `upsertNormalizedSubscription()` — re-lectura por `(provider, provider_subscription_id)`.
- Índice único parcial `(provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL`.
- **Índice único parcial `(user_id) WHERE status IN ('pending','active','past_due','paused')`** → la base de datos garantiza **una sola fila viva por usuario**.
- No existe tabla `billing_checkouts` usada por este camino ni checkout attempt para suscripciones (es del flujo de Checkout Pro one-time, que la directiva prohíbe).

**Protección mínima implementada (sin sistema nuevo):**

1. **Guard previo al POST**: `getLiveSubscriptionForUser()` — si hay fila viva, 409 y **no se llama a MP**. Es el caso normal del doble click.
2. **Backstop de base de datos**: si dos requests pasan el guard simultáneamente, el índice único `(user_id) WHERE status vivo` hace que la segunda escritura falle con `23505`. Esa falla **no** se reintenta ni se fuerza: se clasifica como CRÍTICO y no se entrega URL.
3. **Regla explícita**: un 409 no bloquea para siempre — cuando la fila viva pase a `cancelled`/`expired`, el guard deja de verla y el usuario puede reintentar (por eso el guard es el lookup canónico y no un "lock" propio).

**Ventana residual honesta:** entre el guard y la escritura pueden crearse **dos** preapprovals remotos, y sólo el segundo queda sin correlación. No se elimina con lo que MP ofrece; se **detecta y clasifica** (`REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED`) y se recupera a mano. Lo que la protección sí garantiza: **jamás se persiste una segunda fila viva ni se entrega una segunda URL de checkout**.

No se implementó cancelación automática (la directiva la prohíbe explícitamente en esta microfase, previa auditoría y autorización).

---

## 9. Failure matrix

| # | Situación | Antes del POST | POST a MP | Persistencia | Respuesta | Clasificación |
|---|---|---|---|---|---|---|
| 1 | Sin sesión | Fallo antes del POST | No | No | 401 | `UNAUTHENTICATED` |
| 2 | Falta `MERCADOPAGO_ACCESS_TOKEN` | Fallo antes del POST | **No** (el cliente se niega antes del fetch) | No | 502 | `PROVIDER_ERROR` / `MISSING_ACCESS_TOKEN` |
| 3 | Falta `MERCADOPAGO_PRO_PLAN_ID` | Fallo antes del POST | No | No | 500 | `UNCONFIGURED` |
| 4 | Sesión sin email | Fallo antes del POST | No | No | 422 | `PAYER_EMAIL_REQUIRED` |
| 5 | Ya hay suscripción viva | Fallo antes del POST | No | No | 409 | `ALREADY_IN_PROGRESS` |
| 6 | MP rechaza (4xx/5xx/timeout/red) | — | 1 intento | **No** (ninguna fila ficticia) | 502 | `PROVIDER_ERROR` + código |
| 7 | MP responde 2xx sin id usable | — | 1 intento | No | 500 | CRÍTICO / `PREAPPROVAL_RESPONSE_UNUSABLE`, `preapprovalId: null` |
| 8 | MP responde 2xx con id pero sin `init_point` https | — | 1 intento | No | 500 | CRÍTICO / `PREAPPROVAL_RESPONSE_UNUSABLE`, con id |
| 9 | Se crea remoto pero falla la escritura | — | 1 intento | Falla | 500 | CRÍTICO / `OWNERSHIP_WRITE_FAILED`, con id |
| 10 | La escritura devuelve una fila que no es la correlación | — | 1 intento | Fila ajena/muerta | 500 | CRÍTICO / `OWNERSHIP_WRITE_FAILED`, con id |
| 11 | Carrera contra el índice único | — | 1 intento | `23505` | 500 | CRÍTICO / `OWNERSHIP_WRITE_FAILED` |
| 12 | Método ≠ POST | Nada ocurre | No | No | 405 + `Allow: POST` | `METHOD_NOT_ALLOWED` |
| 13 | Fallo interno inesperado | — | — | — | 500 | `INTERNAL_ERROR` (sin detalles) |

Invariantes en **todas** las filas: no hay retry automático del POST, no se crea un segundo preapproval, no se devuelve `init_point`, no se concede Pro, y la respuesta nunca incluye token, secreto, body del proveedor ni objetos completos de MP.

### Procedimiento de recuperación (`REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED`)

Cuando esto ocurre puede existir una suscripción en Mercado Pago **sin dueño canónico**. El operador debe:

1. **NO reintentar** la request (crearía una segunda suscripción) y **no** crear un preapproval manual.
2. Abrir el panel de Mercado Pago y localizar el preapproval por el `preapprovalId` reportado (el log crítico lo emite; si es `null`, buscar por `payer_email` + plan PRO + timestamp).
3. Verificar estado del recurso en MP (`pending`/`authorized`) y su `preapproval_plan_id` esperado.
4. Correlacionar a mano con el `userId` reportado: escribir la fila en `billing_subscriptions` con el mismo shape de §6 (`status` = lo que MP reporte para ese recurso) mediante el writer canónico **o** —preferentemente— dejar que el webhook la aplique, que es idempotente por `claim_billing_event`.
5. Si el usuario ya obtuvo acceso por otro camino, cancelar el preapproval huérfano **manualmente**, según la política vigente (no automatizada en esta microfase).

El log crítico está diseñado para esto: emite **una sola línea**, sólo para este estado, construida con campos nombrados (no con el diagnóstico crudo), con `reason`, `preapprovalId`, `userId` y la instrucción de no reintentar. Ningún otro resultado escribe en el log.

---

## 10. Tests (72 nuevos, todos verdes)

`src/server/billing/mercadopago/__tests__/preapproval-creation.test.ts` — **31 tests**
- endpoint `/preapproval` (distinto de `/preapproval_plan`); body exacto de 2 claves (3 con `back_url`).
- no se reenvían términos comerciales (`auto_recurring`, `transaction_amount`, `currency_id`, `frequency`, `free_trial`); no se envía `status`, `card_token_id`, `external_reference`, `payer_id`.
- campos extra "colados" por un caller laxo son ignorados; trim de plan id y email.
- `back_url` ausente/vacía/nula se omite; http/relativa/ftp se rechazan.
- rechazo local (`INVALID_REQUEST`) sin enviar nada; rechazo por falta de token **sin llegar a la red** (cliente real sobre env sin token).
- POST una sola vez con el body exacto; nunca lee (`getJson` prohibido); id numérico coercionado.
- respuesta sin id → error tipado que avisa "MAY have been created" y "before retrying".
- id presente sin `init_point` usable → error que **conserva el id** y dice "EXISTS remotely… must not be retried".
- respuestas no-objeto → fallo cerrado; error del proveedor propagado sin cambios y sin retry.
- marker del body del proveedor nunca aparece en el mensaje; nada se escribe a consola.
- lecturas defensivas de `id` y de `init_point` (sólo https absoluta; `javascript:` rechazado).

`src/server/billing/mercadopago/__tests__/pro-subscription-start.test.ts` — **41 tests**, cubriendo los 25 puntos exigidos:
- **auth requerida** (401, cero efectos, ni siquiera el lookup de duplicados); reconocimiento estructural de `BILLING_UNAUTHORIZED`; cualquier otro error → `INTERNAL_ERROR`.
- **el navegador no puede elegir owner/amount/currency/plan/trial**: body hostil completo (con `user_id`, `plan_id`, `amount`, `currency`, `status`, `provider`) no cambia nada; lo que llega a MP es el body esperado; la fila pertenece al usuario de la sesión. El flujo no tiene dónde recibir un request (`startProSubscription.length === 1`).
- **oferta elegida server-side** desde el contrato congelado + el id de plan usado es el que el resolver canónico mapea a `"pro"`.
- **falta de access token** y **falta de plan id**: rechazo antes del POST, sin fetch, sin escritura.
- **email de pagador ausente** → 422, sin enviar cadena vacía.
- **anti-duplicado**: fila viva → 409 sin POST; orden guard-antes-del-POST; doble click → 1 POST y 1 fila; carrera `23505` → crítico; sin retry.
- **payload correcto**: path y body exactos, claves mínimas, `back_url` sólo si se configura.
- **fallo del proveedor** (4 códigos) → 502, cero filas, diagnóstico con código cerrado.
- **respuesta malformada / sin init_point / init_point no-https** → crítico, sin escritura, sin URL.
- **correlación**: fila exacta con usuario autenticado e ids reales; escrita antes de devolver la URL; **7 formas de fila equivocada** (otro usuario, otra suscripción, otro provider, `cancelled`, `expired`, status no canónico, `null`) → crítico sin URL.
- **pending no otorga Pro** y **pending sí resuelve owner**, probados contra `applyNormalizedEvent` y `resolveEntitlement` reales (incluido el contraste `OWNER_REQUIRED` sin correlación).
- **higiene de respuesta**: sólo `{status}` (+`redirectUrl` en READY); ni id, ni usuario, ni plan, ni token; `cache-control: no-store`.
- **secrets**: ningún diagnóstico contiene token/secreto/marker; el sink de producción emite **una** línea y sólo para el estado crítico; un sink que lanza no rompe el arranque.
- **método** ≠ POST → 405 + `Allow: POST`, cero efectos.
- **estructura**: una sola llamada al provisionamiento tipado, sin bucles/timers/`postJson` directo; runtime (auth + persistencia) en import dinámico sin `from` estático; una sola referencia a `requireBillingUser`; la ruta no contiene decisiones; módulo `server-only`.

**Garantía de no-red:** en ambos archivos `globalThis.fetch` es una mina (`throws`) durante todo el archivo. Ningún test puede crear una suscripción real ni por accidente.

---

## 11. QA ejecutado exactamente

```
npx vitest run src/server/billing/mercadopago/__tests__/preapproval-creation.test.ts
  → 31 passed
npx vitest run src/server/billing/mercadopago/__tests__/pro-subscription-start.test.ts
  → 41 passed
npx vitest run src/server/billing src/routes/__tests__
  → Test Files 12 passed (12) · Tests 393 passed (393)     ← suite billing + rutas completa (incluye webhook MP-M2 verde)
npx tsc --noEmit
  → 0 errores en el scope tocado (preapproval-creation.ts, pro-subscription-start.ts,
    sus 2 tests, api.billing.mercadopago.start-pro.ts, routeTree.gen.ts).
    Los ~1.653 errores restantes son preexistentes, fuera del scope, y no se tocaron.
npx eslint <los 5 archivos nuevos>
  → 0 errores tras un --fix acotado a ESOS archivos (sólo re-envoltura prettier;
    CRLF preservado línea por línea: se verificó que el conteo de CR == conteo de líneas antes y después).
  → NO se ejecutó prettier --fix global. NO se normalizó CRLF de ningún archivo preexistente.
git diff --check
  → limpio.
npx vite build
  → ✓ built in 11.23s · 7138 módulos (baseline 7136; +2 = ruta + módulo de flujo)
  → routeTree.gen.ts regenerado: +22 / −0, sin reordenamientos.
Comprobación de aislamiento server-only sobre el artefacto construido:
  → grep en .vercel/output/static por "preapproval_plan_id" | "pro-subscription-start" | "MERCADOPAGO_ACCESS_TOKEN" → 0 coincidencias
  → el bundle de servidor sí contiene el builder (3 coincidencias)
```

Notas de higiene: ningún archivo preexistente fue reformateado; no se corrigieron errores preexistentes fuera del scope; no se ejecutó prettier global; el documento untracked de MP-M3A **no** se incluyó en el commit.

---

## 12. Limitaciones reales

1. **Ventana de carrera residual**: dos clicks simultáneos pueden crear dos preapprovals remotos; sólo el segundo queda sin correlación y se recupera a mano (§8). No es eliminable con lo que MP ofrece.
2. **Sin idempotencia de proveedor**: no hay idempotency key documentada; un retry de red a nivel de infraestructura (proxy, reintento del cliente HTTP) podría duplicar. El módulo no reintenta; la defensa es el guard + el índice único + la recuperación manual.
3. **`REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` es manual**: no hay reconciliación automática ni barrido de huérfanos (§9 pasos 1-5). Es deliberado en esta microfase.
4. **Sin reanudación de un preapproval existente**: si el usuario cierra el checkout sin autorizar, su fila queda `pending` y un nuevo intento recibe 409 `ALREADY_IN_PROGRESS`. Hoy se resuelve a mano (o esperando a que el recurso pase a estado no vivo). Un camino de "reanudar/autorizar de nuevo" (posiblemente un `GET /preapproval/{id}` para recuperar `init_point`, o la cancelación del pendiente y reinstalación) requiere auditoría previa y queda para la siguiente microfase.
5. **`back_url` no configurado**: el preapproval se crea sin `back_url` propia y aplica la del plan. `config.backUrl` existe en el seam y está probado, pero el wiring de producción pasa `null` porque no hay una env var autorizada para ello; definirla es una decisión de producto.
6. **`payer_email` obligatorio**: Mercado Pago lo marca REQUIRED, así que una sesión sin email no puede suscribirse (422). Se clasifica explícitamente en vez de enviar una cadena vacía.
7. **Sin `provider_plan_id` persistido**: desviación documentada en §1. El vínculo con el plan vive en el recurso del proveedor y en el resolver canónico.
8. **Nada de esto se validó contra el sandbox real de MP**: por directiva, MP-M3C no ejecuta sandbox E2E. El contrato de MP está verificado contra su documentación pública, no contra una respuesta real de `POST /preapproval` (esa es la primera cosa que validará MP-M3D).
9. **Sin UI**: el endpoint existe y está probado, pero ninguna pantalla lo consume todavía.

---

## 13. Qué NO se ejecutó remotamente

- ❌ **No se creó ningún preapproval real de usuario.** Cero llamadas a `POST /preapproval`.
- ❌ **No se usó ninguna tarjeta** ni dato de pago.
- ❌ **No se inició ningún trial real** ni se autorizó ninguna suscripción.
- ❌ **No se cobró nada.**
- ❌ **No se ejecutó ningún sandbox E2E** contra Mercado Pago.
- ❌ **No se creó otro `preapproval_plan`** (el de MP-M3B sigue siendo el único; MP-M3C no lo toca).
- ❌ **No hay deploy.**
- ❌ **No hay push.**
- ❌ **No se tocó la base de datos**: ni migraciones, ni filas, ni el proyecto Supabase remoto.
- ❌ **No se configuró ni se leyó ningún secreto nuevo**: se usaron únicamente las claves de entorno ya definidas en MP-M3B.
- ✅ Se ejecutó sólo: tests locales, typecheck local, lint acotado, `git diff --check` y build local.

---

## 14. Siguiente microfase recomendada

**MP-M3D — VALIDACIÓN REMOTA CONTROLADA DEL FLUJO DE SUSCRIPCIÓN DE USUARIO**, en dos partes separadas y autorizadas por separado:

1. **MP-M3D.1 — Prueba remota controlada y única** (con autorización explícita, una sola vez):
   - crear **un** preapproval con el `MERCADOPAGO_PRO_PLAN_ID` real y un email de prueba, sin tarjeta, y verificar que el flujo devuelve `READY` con una fila `pending` correlacionada;
   - confirmar que el usuario sigue en FREE con esa fila `pending` (lectura de entitlement, no suposición);
   - ejercitar el camino de recuperación **una** vez de forma deliberada (forzar el fallo de escritura) para validar el procedimiento de §9 con un recurso real;
   - **no** cobrar, **no** autorizar con tarjeta, **no** dejar el preapproval huérfano (cancelarlo manualmente si queda pendiente).
2. **MP-M3D.2 — Reanudación y ciclo de vida del pendiente** (diseño + implementación): decidir y auditar el camino para un `pending` abandonado (recuperar `init_point` por lectura, autorizar de nuevo, o cancelar-y-reinstalar), y **sólo entonces** evaluar la cancelación automática, que esta microfase dejó explícitamente fuera.

Después: UI de upgrade consumiendo `POST /api/billing/mercadopago/start-pro`, y la verificación end-to-end del webhook `authorized` → Pro.

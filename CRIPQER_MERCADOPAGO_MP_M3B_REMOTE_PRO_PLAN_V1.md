# CRIPQER — MERCADO PAGO BILLING

## MP-M3B — REMOTE PRO PLAN + PLAN MAPPING V1

**Modo:** implementación controlada. Sin preapproval de usuario, sin checkout UI, sin correlación user↔subscription, sin cancelación, sin reactivación, sin deploy, sin push.
**Base:** worktree `cripqer-mp-m2`, branch `billing/mercadopago-mp-m2-webhook-verifier`, HEAD `706f098`, working tree limpio salvo el entregable MP-M3A (untracked).

---

## §0 — Resumen ejecutivo

MP-M3B cierra `PLAN_MAPPING_REQUIRED` **en código**: el adapter puede construir y enviar el request exacto que crea el plan PRO remoto en Mercado Pago, y sabe leer el id que la respuesta devuelve. Lo que **no** hizo — deliberadamente — es ejecutarlo: **no existe ningún plan remoto creado por esta fase**, ningún preapproval de usuario, ninguna correlación y ningún deploy. El resultado es un sistema listo para que el owner cree el plan **una sola vez** con un comando exacto y verificable, y congele el id en `MERCADOPAGO_PRO_PLAN_ID`.

Lo que cambió:

| Archivo | Cambio |
|---|---|
| `src/server/billing/mercadopago/client.ts` | + `MercadoPagoWriteClient`, `postJson`, código `INVALID_REQUEST`, `requestJson` interno compartido. **GET intacto.** |
| `src/server/billing/mercadopago/plan-creation.ts` | **NUEVO.** Builder del body (contrato congelado) + creador remoto + lectura defensiva del id. |
| `src/server/billing/mercadopago/types.ts` | + `MercadoPagoPreapprovalPlanResource` (forma documental del plan). |
| `src/server/billing/mercadopago/__tests__/plan-creation.test.ts` | **NUEVO.** 25 tests, 100 % con fakes, cero red. |
| `src/server/billing/mercadopago/__tests__/client.test.ts` | +15 tests POST. Los 20 GET existentes siguen verdes. |

Lo que **no** cambió: `plan.ts` (contrato y resolver intactos), `webhook-endpoint.ts`, `resource-fetcher.ts`, `application.ts`, `persistence.ts`, `.env.example`, rutas, UI. Ningún secreto, ningún id real, ningún valor de entorno real entró al repo.

**Veredicto: `READY_TO_CREATE_REMOTE_PLAN`** (ver §Veredicto al final).

---

## §1 — Arquitectura

```
[operador autorizado, una sola vez]
        │  buildProPlanCreationRequestBody({ backUrl })     ← puro, testeado
        ▼
[createMercadoPagoProPlan(client, { backUrl })]              ← único escritor remoto de Billing
        │  client.postJson("/preapproval_plan", body)        ← MercadoPagoWriteClient
        ▼
[POST https://api.mercadopago.com/preapproval_plan]          ← Mercado Pago crea el plan
        │  { id, status: "active", init_point, … }
        ▼
[readProPlanId(response)] → "…"                              ← fail closed si no hay id usable
        │
        ▼
MERCADOPAGO_PRO_PLAN_ID (env, server-side)                   ← paso manual §10/§11
        │
        ▼
createMercadoPagoPlanResolver({ proPlanId }) → "pro"         ← ya existía (MP-M1); sin cambios
```

Tres decisiones de arquitectura, y por qué:

1. **Capacidad de escritura separada por tipo, no por implementación.** `MercadoPagoClient` (solo lectura) queda intacto; el nuevo `MercadoPagoWriteClient extends MercadoPagoClient` añade `postJson`. Un consumidor que solo lee sigue dependiendo del tipo de solo lectura, así que una mutación accidental en un camino de lectura es un error de tipos, no una sorpresa en producción. `createMercadoPagoClient` ahora devuelve el tipo extendido: aditivo para todo consumidor existente (los mocks GET actuales siguen compilando y pasando).
2. **Una sola implementación HTTP.** `getJson` y `postJson` delegan en un `requestJson(method, path, body?)` interno: un solo lugar donde se adjunta el token, un solo timeout, un solo mapeo de errores. El GET resultante es byte a byte el request anterior (sin `body`, sin `Content-Type`) — probado con un test de no-regresión explícito además de los 20 tests GET existentes.
3. **El módulo de creación es inerte por construcción.** `plan-creation.ts` no lo importa ninguna ruta, ninguna server function, ningún barrel: la única referencia en todo `src/` es su propio archivo de tests. No hay auto-ejecución posible (verificado con grep, §9).

---

## §2 — Endpoint de Mercado Pago usado

`POST https://api.mercadopago.com/preapproval_plan`

Contrato verificado contra **dos páginas oficiales** de Mercado Pago (referencia de API "Create subscription plan" y la guía "Subscription with an associated plan"), sin llamar a su API:

- Headers: `Authorization: Bearer <ACCESS_TOKEN>` (requerido) y `Content-Type: application/json`.
- Request documentado: `reason` (requerido), `auto_recurring`, `back_url` (**marcado requerido** por la referencia), `payment_methods_allowed` (opcional).
- Los subcampos de `auto_recurring` (`frequency`, `frequency_type`, `free_trial {frequency, frequency_type}`, `transaction_amount`, `currency_id`) aparecen en el ejemplo oficial; la tabla de parámetros los deja colapsados, por eso el body se construye con la forma del ejemplo y **no** con campos inventados.
- Códigos de error documentados: 400, 401, 404, 500.
- `status` **no** se envía: el plan se crea `active` del lado del proveedor.
- **No hay idempotency key documentada para este endpoint** — ver §7.

Constante en código: `MERCADOPAGO_PREAPPROVAL_PLAN_PATH = "/preapproval_plan"`.

---

## §3 — Request body exacto

El body que se envía, tal cual (generado por el builder y verificado ejecutándolo con Node 24, sin red):

```json
{
  "reason": "Cripqer Pro",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 7990,
    "currency_id": "CLP",
    "free_trial": {
      "frequency": 10,
      "frequency_type": "days"
    }
  },
  "back_url": "https://<dominio-real>/<ruta-de-retorno>"
}
```

Procedencia de cada valor:

| Campo | Origen | ¿El caller puede cambiarlo? |
|---|---|---|
| `reason` | `CRIPQER_PRO_PLAN_REASON = "Cripqer Pro"` (decisión del owner, literal en código) | No |
| `auto_recurring` | `buildProAutoRecurring()` sobre `CRIPQER_PRO_PLAN_CONTRACT` (MP-M1) — la **misma** función que ya estaba pineada por tests | No |
| `transaction_amount` | `CRIPQER_PRO_PLAN_CONTRACT.amount = 7990` (= 7.990 CLP; CLP no tiene unidad menor) | No |
| `currency_id` | `CRIPQER_PRO_PLAN_CONTRACT.currency = "CLP"` | No |
| `frequency` / `frequency_type` | `1` / `"months"` | No |
| `free_trial` | `10` / `"days"` | No |
| `back_url` | Único valor que aporta el caller; validado (https absoluta, no vacío) **antes** de enviar | Sí, pero no es término comercial |

El builder no acepta precio, moneda, frecuencia, trial ni tier: no hay parámetro por donde pasarlos, y un test comprueba que claves extra coladas en el objeto de opciones (`amount: 1`, `currency: "USD"`, `frequency: 12`, `freeTrial: 0`, `planId: "enterprise"`) **se ignoran** y el body sigue siendo el del contrato congelado.

Campos deliberadamente **no** enviados:

- `status` — el contrato oficial no lo lleva en la creación; el proveedor crea el plan `active`.
- `payment_methods_allowed` — omitirlo deja decidir a la configuración de la cuenta, en vez de congelar una lista de medios de pago en código.
- `repetitions` / `billing_day` / `billing_day_proportional` — aparecen solo en el ejemplo de la documentación, no son parte del contrato aprobado; omitidos, el default del proveedor es recurrencia indefinida desde el día de alta.

---

## §4 — Response id

La respuesta documentada de `POST /preapproval_plan` trae `id` (el valor que el resto de Billing conoce como `preapproval_plan_id`), `status` (ejemplo: `"active"`) e `init_point`. El id se lee con `readProPlanId(response)`, defensivo:

- `id` string no vacío → se devuelve **trimmeado**.
- `id` numérico finito → se coerciona a string. Es deliberado: en otras APIs de Mercado Pago los ids son numéricos, y después de un POST exitoso **el plan ya existe remotamente**; reportar "no hay id" sobre un plan que sí se creó es el único fallo con costo real (duplicado remoto).
- Cualquier otra cosa (`{}`, `""`, `null`, arrays, booleanos, `NaN`, respuesta no-objeto) → `null`.

Si el id no es usable, `createMercadoPagoProPlan` **falla cerrado** con `MercadoPagoError` código `INVALID_JSON` y mensaje explícito:

> "Mercado Pago accepted the plan request but returned no usable id. The plan MAY have been created: check the Mercado Pago panel before retrying, so a second plan is not created."

El `status` del plan (`active`) **no se consume** en ningún lugar: el estado de suscripción que Billing lee es el del **preapproval**, no el del plan (establecido en MP-M3A). `init_point` tampoco se persiste: el checkout de usuario es MP-M3C.

---

## §5 — Plan mapping (cadena completa, sin código nuevo)

```
id devuelto por POST /preapproval_plan
        │   (paso manual §10)
        ▼
MERCADOPAGO_PRO_PLAN_ID  (entorno, server-only)
        │   readMercadoPagoConfigFromEnv()  → trim; ausente/vacío/solo-espacios → null
        ▼
MercadoPagoConfig.proPlanId
        │   createMercadoPagoPlanResolver({ proPlanId })   ← MP-M1, SIN CAMBIOS
        ▼
resolvePlan("mercado_pago", <preapproval_plan_id>) → "pro" | null
```

- Solo el **match exacto y trimmeado** contra el id configurado mapea a `"pro"`. Id distinto → `null`. Otro provider → `null`. `proPlanId` vacío → `null` para todo (fail closed → `PLAN_MAPPING_REQUIRED` en el pipeline canónico).
- El normalizador del webhook ya lee `preapproval_plan_id` del recurso autoritativo (MP-M1/M2), así que el mismo id que devuelve la creación es el que entra al resolver vía webhook. Es **un solo id**, en **un solo lugar** (entorno), consumido por **una sola cadena**.
- Evidencia de la cadena completa sin red: test nuevo que crea el plan contra un fake, toma el `preapprovalPlanId` devuelto, lo pasa al resolver real y obtiene `"pro"`; con otro id obtiene `null`; con `proPlanId: null` obtiene `null`.

Nada de esto se activa hasta que el paso manual §10 ocurra: mientras `MERCADOPAGO_PRO_PLAN_ID` esté vacío, la cadena entera sigue fail-closed, exactamente como hoy.

---

## §6 — Error handling

| Situación | Código | ¿Qué se envió/creó? | Respuesta del adapter |
|---|---|---|---|
| `back_url` ausente, vacía, no-https o no-string | `INVALID_REQUEST` (local, nuevo) | **Nada.** Se rechaza antes de tocar el cliente | Error tipado con mensaje que lo dice |
| Token ausente/vacío | `MISSING_ACCESS_TOKEN` | Nada (falla antes del fetch) | Error tipado |
| 401 / 403 | `UNAUTHORIZED` | Nada (request rechazado) | Error tipado con status |
| 404 | `NOT_FOUND` | Nada | Error tipado con status |
| 409 | `HTTP_ERROR` (status 409) | Nada | Sin semántica de conflicto inventada: la documentación de este endpoint no define una, así que no se le atribuye ninguna |
| 429 | `HTTP_ERROR` (status 429) | Nada | Sin retry (política del cliente desde MP-M1) |
| 5xx | `HTTP_ERROR` (status) | Nada | Error tipado |
| Timeout (default 8000 ms) | `TIMEOUT` (status `null`) | Nada | Error tipado |
| Fallo de transporte | `NETWORK_ERROR` | Nada | Error tipado |
| 2xx con body no-JSON / no-objeto | `INVALID_JSON` | Nada | Error tipado |
| 2xx aceptado pero `id` inusable | `INVALID_JSON` + advertencia "MAY have been created" | **El plan pudo crearse** | Falla cerrado y prohíbe el retry ciego (§4) |

Garantías transversales (heredadas del cliente MP-M1 y extendidas a POST por construcción):

- El **token nunca** aparece en mensajes de error, ni en `JSON.stringify(error)`, ni en logs: el cliente no loguea nada por ningún camino (hay tests POST que espían `console`).
- El **body de error del proveedor nunca se surfacea** (no se lee siquiera).
- Sin retries y sin fallback: un fallo se clasifica y se propaga.
- `status` se preserva para 409/429/5xx, lo que permite al operador distinguir causalidad sin que el código invente semántica.

---

## §7 — Límites de idempotencia (limitación real, documentada)

**Hecho verificado:** la documentación oficial de `POST /preapproval_plan` **no documenta ninguna idempotency key ni header de idempotencia** para este endpoint. No se envía ninguno: inventar un header no documentado sería una suposición no verificada, exactamente lo que la directiva prohíbe.

**Hecho verificado:** no hay un lookup documentado del tipo "buscar plan por nombre" que permita un matching seguro. El matching **solo por `reason` está rechazado de raíz**: un nombre no es una identidad; dos planes distintos pueden compartir `"Cripqer Pro"`, y adoptar el primero podría congelar en el entorno un plan equivocado.

Estrategia resultante (disciplina de operador, no de código):

1. La creación se ejecuta **una sola vez por entorno**, de forma deliberada, con el comando exacto de §10.
2. Ningún camino de código crea planes automáticamente: `plan-creation.ts` no está importado por la aplicación (§1, verificado con grep en §9).
3. Los tests **nunca** tocan la red: todos usan fake clients de `MercadoPagoWriteClient`; el resultado es que correr la suite no puede crear nada (§8).
4. Si el POST fuese aceptado y el id no pudiera leerse, el error ordena explícitamente verificar el panel **antes** de reintentar.
5. Si aun así el owner ejecutara el comando dos veces y existieran dos planes remotos: no hay remedio automático ni debe haberlo. El remedio es humano — identificar el id canónico, configurarlo, y desactivar/ignorar el otro plan en el panel de Mercado Pago. Cero cambios de código.

**Limitación L-M3B-1 (declarada):** la creación remota no es idempotente del lado de Cripqer porque el proveedor no ofrece el mecanismo. MP-M3B la mitiga con un solo ejecutor, un comando único y la prohibición explícita del retry ciego, no con una promesa que no se puede cumplir.

---

## §8 — Tests

Números exactos (13-07 / 13-11 local):

- `__tests__/plan-creation.test.ts` (**nuevo**): **25 tests, 25 pasan**.
- `__tests__/client.test.ts`: **35 tests, 35 pasan** (20 preexistentes GET + **15 nuevos POST**; la no-regresión del GET está cubierta por los 20 originales más un pin explícito de "GET sin body y sin Content-Type").
- Suite `src/server/billing/mercadopago` completa: **257 tests / 6 archivos, todos en verde**.
- Suite billing completa (`src/server/billing`): **316 tests / 9 archivos, todos en verde**.

Cobertura nueva (por bloque):

- **Contrato congelado del body**: body exacto como literal; 7990/CLP/1/months/10/days uno por uno; exactamente tres claves top-level (sin `status`, sin `payment_methods_allowed`); `auto_recurring` == `buildProAutoRecurring()`; claves comerciales coladas se ignoran; trim del `back_url`.
- **`back_url` fail-closed**: `""`, espacios, `http://`, sin esquema, `ftp://` → `INVALID_REQUEST`; no-string → error tipado; con `back_url` inválida el cliente **no es llamado**.
- **Creación**: path exacto `/preapproval_plan`; body exacto; devuelve `{ preapprovalPlanId }`; nunca lee (`getJson` no se llama); id inusable → `INVALID_JSON` con la advertencia de "puede existir"; respuesta no-objeto → `INVALID_JSON`; error tipado del cliente se propaga **sin alterar**; el body del proveedor no aparece en mensajes; cero `console`; cadena creación → resolver → `"pro"` / `null`.
- **`readProPlanId` puro**: string trimmeado; número finito coercido; 11 casos inusables → `null` sin lanzar.
- **Cliente POST**: Bearer + `Content-Type: application/json`; body serializado exacto; `MISSING_ACCESS_TOKEN` sin fetch; 401/403 → `UNAUTHORIZED`; 404; 409; 429; 5xx; timeout; `NETWORK_ERROR`; no-JSON; no-objeto; token ausente de todo mensaje; body del proveedor no surfaceado; `console` intacto; GET sin body/`Content-Type` (no-regresión).

**Cero llamadas de red en toda la fase de test:** los 40 tests nuevos inyectan fakes o stubs de `fetch`. Correr la suite no puede crear un plan remoto.

---

## §9 — Qué NO se ejecutó remotamente

- **No se creó ningún plan remoto.** No se llamó a la API de Mercado Pago en ningún momento de MP-M3B.
- No se creó preapproval de usuario, ni checkout, ni correlación user↔subscription, ni cancelación, ni reactivación, ni UI, ni migración.
- No hubo push, no hubo deploy, no hubo cambios de entorno real.

Evidencia:

1. **No existe un `.env` en el worktree** (solo `.env.example`): no hay access token disponible aquí, así que ningún request autenticado era siquiera posible.
2. Los 40 tests nuevos corren contra fakes; los stubs de `fetch` solo existen dentro de tests del cliente.
3. `plan-creation.ts` es inerte: `grep -rn "plan-creation" src` devuelve **solo** su propio test. Nada en la aplicación puede invocarlo.
4. El único comandо Node ejecutado en esta fase solo invoca `buildProPlanCreationRequestBody`, que es **puro** (construye el objeto y lo imprime; no hay ninguna llamada de red en su interior). Su salida es el JSON de §3.
5. El comando `curl` de §10 **no fue ejecutado** en esta fase.

QA de la fase (números exactos):

| Puerto | Resultado |
|---|---|
| Tests nuevos MP-M3B | 40/40 verde (25 + 15) |
| Suite `mercadopago` | 257/257 verde, 6 archivos |
| Suite `billing` | 316/316 verde, 9 archivos |
| `npx tsc --noEmit` (proyecto completo, en background) | exit 2 global por **1185 errores preexistentes** del resto del repo (top: `useSelectionActions.tsx` 114, `page-document.ts` 77, `TemplateValidator.ts` 74 — ninguno en billing); **0 errores en `src/server/billing/mercadopago/`** con el filtro por archivo que exige la nota de typecheck; 0 consumidores del cliente MP fuera del directorio, así que ningún consumidor pudo quedar roto |
| Lint acotado a los 5 archivos tocados | 924 problemas, **924 = `Delete ␍` (CRLF/prettier), 0 hallazgos reales**; 5 hallazgos reales de formato que existían en el código nuevo fueron corregidos a mano (nunca `--fix`: reescribiría los finales de línea de archivos enteros y explotaría el diff). Archivos sin tocar (`plan.ts` + `webhook-endpoint.ts`) dan 111 errores de la misma clase: condición preexistente del repo, no de esta fase |
| `git diff --check` | limpio (exit 0) |
| `npm run build` | verde: 7136 módulos, `✓ built in 11.25s`, Nitro preset vercel generado, exit 0 |

---

## §10 — Paso manual exacto para crear el plan (una sola vez, solo con autorización del owner)

> Ejecutar **solo** con autorización explícita. Una vez por entorno. **No reintentar** si la respuesta no se entiende: revisar primero el panel de Mercado Pago (§4, §7).

**Paso 1 — generar el body exacto con el builder ya probado** (puro; no llama a Mercado Pago; este comando fue ejecutado y verificado en MP-M3B). Sustituir `<DOMINIO_Y_RUTA_REALES>` por la URL de retorno real:

```bash
node --conditions=react-server --input-type=module -e "
import { buildProPlanCreationRequestBody } from './src/server/billing/mercadopago/plan-creation.ts';
console.log(JSON.stringify(buildProPlanCreationRequestBody({ backUrl: 'https://<DOMINIO_Y_RUTA_REALES>' }), null, 2));
"
```

**Paso 2 — enviar el request una sola vez** (token desde el shell; **nunca** al repo). Pegar como `<BODY>` la salida del paso 1:

```bash
curl -sS -X POST "https://api.mercadopago.com/preapproval_plan" \
  -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '<BODY>'
```

Respuesta esperada (forma documentada): `{ "id": "…", "status": "active", "init_point": "…", … }`.

**Paso 3 — guardar el `id`** de la respuesta y configurarlo (§11). Ese `id` es `preapproval_plan_id` y es el único valor que debe ir a `MERCADOPAGO_PRO_PLAN_ID`.

(El comando `curl` no fue ejecutado en esta fase: crear el recurso remoto requiere autorización explícita que todavía no existe.)

---

## §11 — Cómo configurar `MERCADOPAGO_PRO_PLAN_ID`

`.env.example:64` ya lo declara, con su bloque de comentario (`:55-58`) explicando que vacío ⇒ resolver fail-closed. **No requiere ningún cambio de código** — la cadena completa ya existe (§5):

1. En el entorno del servidor (server-only, jamás `VITE_*`, jamás commiteado): `MERCADOPAGO_PRO_PLAN_ID=<id real devuelto por el POST>`.
2. Ausente/vacío/solo-espacios se lee como "no configurado" → `null` → resolver fail-closed → `PLAN_MAPPING_REQUIRED` (comportamiento actual, intacto).
3. Reiniciar/redeployar el proceso servidor para que lea el valor nuevo.
4. Verificación: un webhook de ese plan id pasa a resolver `"pro"`; la suscripción aplica según ownership (MP-M2); el entitlement solo se otorga con estado `active` (MP-M1).

El valor real **no** fue escrito en ningún archivo del repo en esta fase.

---

## §12 — Siguiente fase: MP-M3C

Ya cerrado por MP-M3B: la capacidad de crear el plan remoto existe, probada, con contrato congelado y comando exacto; el mapping del id está listo y sin cambios pendientes.

MP-M3C (`preapproval` de usuario + correlación) deberá, según el audit MP-M3A §9:

1. **Creación de preapproval de usuario** con `preapproval_plan_id` = el id real configurado, `card_token_id`, `payer_email` y `status: "authorized"` (contrato oficial de la suscripción con plan asociado).
2. **Escritura de la correlación en el mismo acto de creación**: fila `pending` en `billing_subscriptions` (provider + provider_subscription_id + user_id del contexto autenticado). El audit demostró que diferirla abre la ventana "el usuario paga y el webhook queda en RETRY 503"; por eso debe viajar con la creación.
3. Respetar la restricción `one_live_per_user_unique` (una sola fila viva por usuario) y la regla de identificadores distintos (preapproval id ≠ plan id ≠ checkout id).
4. Nada de esto toca el camino de lectura/escritura del plan creado en MP-M3B: el plan queda como plantilla inmutable.

Bloqueante externo de MP-M3C: el plan remoto debe existir (paso §10) y su id estar configurado (§11). Hasta entonces el pipeline sigue fail-closed por diseño.

---

## §Veredicto

**`READY_TO_CREATE_REMOTE_PLAN`**

- Código y tests en verde: 40 tests nuevos (40/40), suite `mercadopago` 257/257, suite `billing` 316/316, build exit 0, `git diff --check` limpio.
- El request builder y el cliente están implementados, probados y **no ejecutados contra Mercado Pago**: no existe ningún recurso remoto persistente creado por esta fase.
- El comando exacto para la creación única está preparado y su body es verificable con el propio builder (§10).
- Falta únicamente la **autorización explícita del owner** para ejecutar §10; por la directiva, esta fase se detiene aquí.

## §Commit

`feat(billing): add Mercado Pago Pro plan creation support` — sin push, sin deploy.

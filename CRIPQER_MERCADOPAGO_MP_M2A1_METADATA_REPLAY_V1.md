# CRIPQER — MERCADO PAGO BILLING · MP-M2A.1 — WEBHOOK REQUEST METADATA + REPLAY POLICY

**Microfase:** MP-M2A.1 — Request Metadata + Replay Policy (microajuste pre-endpoint)
**Worktree:** `C:\Users\Lenovo\Desktop\worktrees\cripqer-mp-m2`
**Branch:** `billing/mercadopago-mp-m2-webhook-verifier`
**Base:** `99f6a80` (feat(billing): add Mercado Pago webhook signature verifier)
**Fecha:** 2026-10-09

## VEREDICTO

**PASS**

Las dos limitaciones que esta microfase existía para resolver quedaron resueltas sin abrir
superficie pública, sin tocar el contrato congelado y sin inventar política:

- **L1 (`data.id`)** — RESUELTA. El módulo ya no enruta `data.id` por el header bag ni mira
  ningún header con ese nombre. Es un parámetro de query explícito en la primitiva, y el
  adaptador exige un `resolveDataId` que el host implementa contra su request real.
- **L2 (frescura/replay)** — RESUELTA. `toleranceSeconds` + reloj inyectable, con la semántica
  exacta del SDK oficial (abs, segundos×1000, después de la firma, cota inclusiva, default =
  sin chequeo).

No queda ninguna limitación que permita que una notificación no firmada o mal firmada conceda
acceso. Las limitaciones remanentes (sección 7) son de **verificación empírica** y de **alcance
deliberado**, no de seguridad.

---

## 1. Spec consultada

Se volvió a verificar contra **código fuente oficial**, no contra memoria ni contra prosa. La
documentación publicada de Mercado Pago delega el formato de firma a sus SDKs, así que la
autoridad son los SDK.

| Fuente | Qué se extrajo |
|---|---|
| `mercadopago/sdk-python` → `mercadopago/webhook/validator.py` | `validate(x_signature, x_request_id, data_id, secret, *, tolerance_seconds=None, supported_versions=None, now=None)`; `_build_manifest`; `_parse_signature_header`; orden de comparación |
| `mercadopago/sdk-python` → `tests/test_webhook_signature_validator.py` | fixtures y casos límite (incl. `data_id` omitido) |
| `mercadopago/sdk-nodejs` → `src/utils/webhook/index.ts` (rama `master`) | `buildManifest`; `constantTimeEquals`; chequeo de `/^\d+$/`; orden firma→tolerancia |
| `mercadopago/sdk-nodejs` → `src/utils/webhook/webhook.spec.ts` | casos: hash alterado, `v2`, `ts` faltante, hash faltante, Issues **#458** y **#459** |
| Documentación de Webhooks de Mercado Pago | los **7** ejemplos de SDK leen `data.id` del **query string**; el body lo trae como JSON anidado `"data": { "id": ... }` |

**Confirmación no trivial:** el SDK de Node **re-hashea con el valor RAW en mayúsculas**
(`DATA_ID_RAW = ORD01JQ4S4KY8HWQ6NA5PXB65B3D3`) y verifica — o sea, **no hay normalización de
caso** del `data.id`. Y el caso 11 del SDK pasa `requestId: ''` junto con un `data.id` de solo
espacios `'   '`, dejando únicamente `ts:` en el manifest — o sea, **blanco = ausente**. Ambas
cosas están cubiertas por tests aquí (sección 5).

---

## 2. Decisión sobre `data.id` — A/B/C/D/E

| # | Pregunta | Respuesta | Evidencia |
|---|---|---|---|
| **A** | ¿`data.id` es parte del manifest cuando está presente? | **SÍ** | `buildManifest` empuja `id:${dataId}` cuando el valor es truthy, en ambos SDKs |
| **B** | ¿Se omite cuando está ausente? | **SÍ** | mismo `if (dataId)`; el par simplemente no se agrega |
| **C** | ¿Casing exacto? | **RAW, sin normalizar** | el SDK de Node re-hashea con `DATA_ID_RAW` y pasa; con el lowercased falla |
| **D** | ¿De dónde viene? | **Query params** | los 7 ejemplos oficiales usan `req.query['data.id']`, `$_GET['data_id']`, `request.args.get("data.id")`, `r.URL.Query().Get("data.id")`, `Request.Query["data.id"]`, `request.getParameter("data.id")`, `request.params['data.id']` |
| **E** | ¿El `data.id` del body es equivalente? | **NO** | el body lo trae anidado (`"data": {"id": ...}`) y **no está firmado**; los SDKs nunca lo leen de ahí |

**Nota de honestidad:** la documentación **no afirma en prosa** de dónde sale `data.id`. La
provenance D se determinó por el **uso consistente en los 7 ejemplos de SDK**, no por una frase
de la doc. Queda como el punto exacto que MP-M3 (sandbox) debe confirmar contra una notificación
real — sección 7.

**Lo que NO se hizo**, por instrucción explícita: no se metió `data.id` artificialmente en el
header bag, y no se inventó `data.id` como header HTTP. El código ya no tiene ningún camino que
lea ese nombre de los headers.

---

## 3. Decisión body vs. query

El body **no** es sustituto del `data.id` de query:

1. La firma cubre **metadata** (`data.id`, `x-request-id`, `ts`), no el JSON del body.
2. Un `data.id` tomado del body **no está firmado**: podría diferir del firmado sin que el
   digest lo note, que es exactamente la sustitución que hay que impedir.
3. Por eso `verifyMercadoPagoSignature` **no acepta** un body: no existe parámetro para él.

En el adaptador el `data.id` sale **únicamente** de `resolveDataId`, nunca de `headers` — hay
test de que un `"data.id"`/`"Data.Id"` presente en los headers **no** verifica (caso 11).

---

## 4. Política de timestamp

`MercadoPagoFreshnessPolicy` replica la del SDK oficial, **sin inventar ventana**:

| Aspecto | Comportamiento | Origen |
|---|---|---|
| Default | **sin chequeo** (`null`/`undefined`) | el SDK: `tolerance_seconds=None` ⇒ no chequea |
| Unidad | `ts` en **segundos**, reloj en **ms**; `driftMs = abs(now() - ts * 1000)` | el SDK; el `* 1000` explícito evita el error 1000x de la Issue **#458** |
| Dirección | `abs()` ⇒ futuro y viejo se tratan **igual** | el SDK |
| Orden | **después** de comparar el digest | el SDK |
| Cota | **inclusiva**: exactamente `toleranceSeconds` todavía es fresco | `driftMs > tol*1000` |
| Reloj | **inyectable** (`now`), default `Date.now` | tests deterministas |
| Config inválida | `NaN` / negativo / `Infinity` ⇒ `INVALID_TOLERANCE_CONFIG` | **decisión propia, fail-closed** |

Sobre la última fila: el SDK no documenta qué hacer con una tolerancia basura. Sin guarda,
`driftMs > NaN` es `false` y el chequeo se **saltaría en silencio** — un fail-open que el
llamador nunca pidió. Rechazar es la única lectura segura, así que se agregó la razón
`INVALID_TOLERANCE_CONFIG`. **No es una ventana inventada**: es tratar una configuración
inusable como fallo, no como permiso.

---

## 5. Comportamiento de replay

- Sin `toleranceSeconds` configurado, **no hay protección de replay** — igual que el SDK, y
  documentado como tal. La contención de un reenvío dentro de la ventana de idempotencia
  canónica es responsabilidad de la idempotencia de eventos, no del verifier.
- Con `toleranceSeconds`, un `ts` fuera de ventana produce
  `TIMESTAMP_OUT_OF_TOLERANCE` **solo después** de que el digest coincidió. Un atacante no puede
  sondear la ventana con un `ts` forjado: primero tendría que acertar el HMAC.
- **No** se agregó ninguna env var. `toleranceSeconds` es un parámetro de llamada: MP-M2B decide
  su valor al construir el verifier. No hubo necesidad demostrada de una variable de entorno.

---

## 6. Tests

`src/server/billing/mercadopago/__tests__/webhook-verifier.test.ts` — **100 tests, todos PASS**
(78 preexistentes verdes + 22 nuevos).

Cobertura de los 12 casos obligatorios:

| # | Caso requerido | Tests |
|---|---|---|
| 1 | `data.id` correcto ⇒ VERIFIED | sí |
| 2 | `data.id` faltante cuando el emisor lo firmó ⇒ REJECTED | sí (2) |
| 3 | body `data.id` NO sustituye query `data.id` | sí (2) |
| 4 | `request-id` correcto | sí |
| 5 | timestamp dentro de tolerancia | sí |
| 6 | timestamp demasiado antiguo | sí |
| 7 | timestamp demasiado futuro | sí |
| 8 | borde exacto de tolerancia (inclusivo, ±1 ms) | sí (2, parametrizado) |
| 9 | reloj inyectado determinista (sin `Date.now`) | sí (2) |
| 10 | idempotencia NO sustituye firma/frescura | sí (2) |
| 11 | no headers inventados | sí (2) |
| 12 | no side effects | preexistente + scan de fuente |

**Extra no pedido pero necesario:** un test de **error de unidades 1000x** (tolerancia 3600 s
contra relojes a +1 s, +3599 s y +3601 s), que es la Issue #458 del SDK oficial; y uno de
**tolerancia 0** como chequeo estricto, no como "deshabilitado".

**No vacuidad (mutación).** Reemplazar `driftMs > tolerance * 1000 ? "TIMESTAMP_OUT_OF_TOLERANCE"
: null` por `return null` (frescura deshabilitada) hizo **fallar 6 tests**. Restaurado y
reverificado: 100/100.

**Sobre los vectores.** El formato del manifest sigue pineado por `KAT_FULL` (calculado en Python,
fuera de este código). Los tests de frescura necesitan un digest **válido** en un `ts` distinto —
si fuera inválido, se rechazaría por `SIGNATURE_MISMATCH` **antes** de mirar la frescura y el test
sería vacuo. Por eso usan un helper `sign()` local con `node:crypto`, y la no-vacuidad de ese
camino la demuestra la mutación de arriba, no la auto-consistencia.

---

## 7. Limitaciones remanentes

**R1 — `data.id` desde query no está confirmado empíricamente.** La provenance D sale de los 7
ejemplos oficiales de SDK, no de una frase de la doc ni de una notificación real recibida. **MP-M3
(sandbox) debe confirmarlo.** Dirección del riesgo: si Mercado Pago no enviara `data.id` en el
query, el manifest omitiría el par `id:` y — **solo si el emisor firmó incluyéndolo** — la
notificación se rechazaría. Falla cerrada, pero podría descartar entregas legítimas.

**R2 — Sin ventana por defecto.** Un reenvío de una notificación firmada no se detecta por
frescura salvo que MP-M2B configure `toleranceSeconds`. Deliberado: el SDK no publica una ventana
y elegirla es decisión de política del host (clock skew + reintentos legítimos de MP).

**R3 — El body no se verifica.** Deliberado y documentado: la firma de MP no cubre el body.

**R4 — El seam congelado sigue sin poder expresar query params.** No se deformó: se le agregó un
`resolveDataId` obligatorio. Un host que tenga el request real debería llamar a la primitiva
directo.

---

## 8. Lo que NO se implementó

- **NO endpoint**, no ruta, no server function pública, no `Request` de entrada.
- **NO checkout**, no UI, no plan remoto, no llamada a la API de Mercado Pago.
- **NO toca ApplicationStore**, no persiste, no llama Supabase, no resuelve entitlement, no
  aplica eventos. Un `VERIFIED` **no** es una suscripción.
- **NO registra el adapter completo**; `adapters/index.ts` intacto.
- **NO** se tocó Magic Editor, landing, analytics ni migraciones.
- **NO** se agregó ninguna env var nueva (no hubo necesidad demostrada).
- **NO** se tocó `.gitattributes` ni el contrato congelado `WebhookVerifier`.

---

## 9. Siguiente paso recomendado

**MP-M2B — Webhook endpoint**, que:

1. reciba el POST y lea `x-signature` y `x-request-id` de **headers**;
2. lea `data.id` del **query** (`new URL(req.url).searchParams.get("data.id")`) y lo pase a
   `verifyMercadoPagoSignature`;
3. configure `toleranceSeconds` explícitamente (resuelve R2);
4. `REJECTED` ⇒ 401 sin efectos ni detalle del motivo hacia afuera;
5. `VERIFIED` ⇒ `intakeMercadoPagoNotification` → `resolveMercadoPagoLookup` →
   `applyNormalizedEvent`, con idempotencia canónica.

Antes o junto con MP-M2B, **MP-M3 (sandbox)** debería confirmar R1 contra una notificación real.

---

## QA — resultados finales

| Gate | Resultado |
|---|---|
| Tests MP-M2 verifier | **100/100 PASS** (78 previos + 22 nuevos) |
| Tests MP-M1 (`client.test.ts` + `resource-fetcher.test.ts`) | **46/46 PASS** (20 + 26, sin regresiones) |
| Billing suite | **211/211 PASS** (189 previos + 22 nuevos) |
| B0 test | **32/32 PASS** |
| Typecheck (scope billing) | **0 errores** en `src/server/billing/**` |
| Lint (archivos tocados) | **0 violaciones** |
| Mutación (frescura deshabilitada) | **6 tests fallan** ⇒ suite no vacua |
| `git diff --check` | **PASS** (exit 0) |

Desglose de la suite billing, para que las cifras sean auditables:

| Archivo | Tests |
|---|---|
| `webhook-verifier.test.ts` (MP-M2) | 100 |
| `b0-security-contract.test.ts` | 32 |
| `resource-fetcher.test.ts` (MP-M1) | 26 |
| `client.test.ts` (MP-M1) | 20 |
| `b0-entitlement-grants.test.ts` | 17 |
| `b0-plan-service.test.ts` | 10 |
| `entitlement-boundary.test.ts` | 6 |
| **Total** | **211** |

**Ruido preexistente reportado por separado, NO arreglado:** el typecheck global del worktree
reporta **1185 errores en archivos fuera de alcance** (`src/components/**`, `src/routes/**`, etc.),
ninguno en `src/server/billing/**`. Es el estado conocido del repo en checkout Windows
(`core.autocrlf=true` sin `.gitattributes`), el mismo hallazgo raíz que motivó el microfix
`f065c68`. No es de esta microfase y no se tocó.

`src/routeTree.gen.ts` se regenera en cada corrida de vitest y se restauró
(`git checkout --`) para que no entre en el commit.

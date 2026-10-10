# CRIPQER — MERCADO PAGO BILLING · MP-M2 WEBHOOK SIGNATURE VERIFIER V1

**Microfase:** MP-M2 — Webhook Signature Verifier V1
**Worktree:** `C:\Users\Lenovo\Desktop\worktrees\cripqer-mp-m2`
**Branch:** `billing/mercadopago-mp-m2-webhook-verifier`
**Base:** `f065c68` (test: make B0 security checks CRLF safe) ← `1e1f69e` (MP-M1)
**Fecha:** 2026-10-09

## VEREDICTO

**PASS_WITH_LIMITATION**

El verifier está implementado, probado y es fail-closed. Las limitaciones (sección 11) son
decisiones conscientes y documentadas, no defectos: ninguna permite que una notificación no
firmada o mal firmada conceda acceso, y ninguna introduce superficie pública.

---

## 1. Archivos tocados

| Archivo | Estado | Líneas |
|---|---|---|
| `src/server/billing/mercadopago/webhook-verifier.ts` | nuevo | 329 |
| `src/server/billing/mercadopago/__tests__/webhook-verifier.test.ts` | nuevo | 693 |

**Ningún otro archivo.** No se tocó `adapters/index.ts`, no se creó ninguna ruta, ningún
endpoint, ninguna server function, ningún `.env`, ninguna migración, ni `.gitattributes`.
Cero superficie pública nueva.

---

## 2. Spec oficial usada

La documentación de Mercado Pago **delega explícitamente el formato de firma a sus SDKs
oficiales** — la página de Webhooks nombra el header y el algoritmo ("HMAC-based Webhook
Signature Verification") pero no publica el manifest. Por eso la especificación se obtuvo del
**código fuente del SDK oficial**, no de memoria:

- `mercadopago/sdk-python` → `mercadopago/webhook/validator.py` (rama `master`)
- `mercadopago/sdk-python` → `tests/test_webhook_signature_validator.py` (fixtures y casos)

De ahí se extrajeron, verificados contra código en ejecución y no contra prosa:

- construcción del manifest (`_build_manifest`)
- algoritmo y encoding (`hmac.new(secret, manifest, sha256).hexdigest()`)
- comparación (`hmac.compare_digest`)
- parseo del header (`_parse_signature_header`)
- orden de fallos y casos de omisión (tests del SDK)

Ningún nombre de header fue inventado. No se asumió nada por memoria.

---

## 3. Headers y metadatos exactos

| Pieza | Origen | Uso |
|---|---|---|
| `x-signature` | header | contiene `ts=<unix-segundos>,v1=<hmac-hex>` |
| `x-request-id` | header | parte opcional del manifest |
| `data.id` | **query string de la URL de notificación** | parte opcional del manifest |

Formato del header de firma:

```
x-signature: ts=1700000000,v1=bb10db18a7d869023652e892ccce92b99158d0a25ca891926418160f931de52b
```

**`data.id` NO es un header.** Es un parámetro de query. Esto importa para el adaptador al seam
congelado — ver sección 10 y limitación L2.

---

## 4. Manifest de firma

Construido exactamente como el SDK oficial:

```
id:<data.id>;request-id:<x-request-id>;ts:<ts>;
```

Reglas, todas fijadas por el SDK y todas cubiertas por tests:

- el par `id:` se incluye **solo** si `data.id` es no vacío
- el par `request-id:` se incluye **solo** si `x-request-id` es no vacío
- el par `ts:` **siempre** se incluye
- separador: un solo `;`
- **el manifest termina siempre con `;`**

Ejemplos reales (valores literales afirmados en los tests):

| Caso | Manifest |
|---|---|
| todos los campos | `id:1234567890;request-id:req-abc-123;ts:1700000000;` |
| sin `data.id` | `request-id:req-abc-123;ts:1700000000;` |
| sin `request-id` | `id:1234567890;ts:1700000000;` |
| solo `ts` | `ts:1700000000;` |

La omisión es **fiel, no permisiva**: si el emisor firmó con un `data.id` que no recibimos, el
manifest omitido produce un digest distinto y la notificación se **rechaza**. Hay tests en
ambas direcciones (sección 8, casos 8/9).

---

## 5. Algoritmo

```
expected = HMAC-SHA256(key = secret, message = manifest_utf8).hex()
```

- **Algoritmo:** HMAC
- **Digest:** SHA-256
- **Encoding:** hex (64 caracteres)
- **Clave y mensaje:** ambos en UTF-8
- **Versión aceptada:** `v1` únicamente

---

## 6. Fail-closed behavior

`verifyMercadoPagoSignature` es **pura y total**: nunca lanza, nunca toca nada fuera de sus
argumentos. Devuelve una unión discriminada:

```ts
{ outcome: "VERIFIED"; reason: null }
{ outcome: "REJECTED"; reason: <enum cerrado> }
```

Orden de fallos (el primero que aplica gana), calcado del SDK:

| # | Condición | `reason` |
|---|---|---|
| 1 | sin secret configurado | `MISSING_SECRET` |
| 2 | header ausente / vacío / solo espacios | `MISSING_SIGNATURE_HEADER` |
| 3 | header sin `ts` y sin ningún `v<n>` | `MALFORMED_SIGNATURE_HEADER` |
| 4 | hay hash pero no `ts` | `MISSING_TIMESTAMP` |
| 5 | `ts` presente pero no entero (`/^\d+$/`) | `INVALID_TIMESTAMP` |
| 6 | sin valor para `v1` | `MISSING_HASH` |
| 7 | todo bien formado y el digest no coincide | `SIGNATURE_MISMATCH` |

`reason` es un **enum cerrado y libre de secretos**: nunca contiene el secret, el digest
esperado ni el recibido. Un rechazo puede loguearse y contarse sin filtrar nada.

**Nada de esto puede producir `VERIFIED`.** No existe camino donde un error del proveedor, un
header raro o un secret faltante abran acceso.

---

## 7. Timing-safe comparison

La comparación de digests **nunca usa `===`**. Se usa `crypto.timingSafeEqual`:

```ts
const expected = Buffer.from(expectedHex, "hex");
const received = Buffer.from(receivedHex, "hex");
if (expected.length !== received.length) return false;
return timingSafeEqual(expected, received);
```

Dos decisiones deliberadas:

- **Decodificar de hex a bytes crudos** hace la comparación además case-insensitive, que es lo
  correcto para hex y evita rechazar a un emisor que use mayúsculas. Hay test.
- **El corte por longitud ocurre antes** de `timingSafeEqual` (que lanza si las longitudes
  difieren). Es seguro: la longitud esperada es una constante publicada del algoritmo (64 hex),
  no un secreto, así que no revela nada sobre la clave. Hay test de que no lanza con digest corto.

---

## 8. Tests

`src/server/billing/mercadopago/__tests__/webhook-verifier.test.ts` — **78 tests, todos PASS.**

Cobertura de los 18 casos obligatorios de §8:

| # | Caso requerido | Tests |
|---|---|---|
| 1 | firma válida | 5 (incluye KAT externo) |
| 2 | firma inválida | 6 |
| 3 | firma ausente | 4 (parametrizado) |
| 4 | secret ausente | 5 |
| 5 | header malformado | 6 + 1 de distinción |
| 6 | timestamp ausente | 2 |
| 7 | timestamp inválido | 5 (parametrizado) |
| 8 | request-id ausente | 2 (omite vs. rechaza) |
| 9 | data/resource id ausente | 3 |
| 10 | casing/whitespace | 6 |
| 11 | secret nunca en error | 7 |
| 12 | secret nunca en console | 1 (6 métodos espiados) |
| 13 | no toca ApplicationStore | 2 (scan de imports + sin fetch) |
| 14 | no concede entitlement | 2 |
| 15 | no llama ProviderResourceFetcher | cubierto por 13 (scan de imports) |
| 16 | comparación incorrecta falla cerrada | 4 |
| 17 | headers duplicados | 4 |
| 18 | body no sustituye metadata firmada | 3 |

**Vectores conocidos externos (anti-autoengaño).** Los digests esperados se calcularon **fuera
de este código**, con `hmac`/`hashlib` de Python, desde los manifests afirmados literalmente. Si
se hubieran recalculado con el mismo `node:crypto` que usa la implementación, solo probarían
auto-consistencia; un valor externo fijo también atrapa un manifest construido en orden o con
separador equivocados.

**Prueba de mutación (no vacuidad).** Cambiar el separador del manifest de `;` a `,` — un solo
carácter — hizo **fallar 21 tests**. Restaurado y reverificado. La suite pinea el formato de
verdad.

---

## 9. Secretos

- El secret se lee **solo** de `MERCADOPAGO_WEBHOOK_SECRET`, server-side.
- `import "@tanstack/react-start/server-only";` como primera línea del módulo: el bundler
  rechaza el build si algo intenta alcanzarlo desde el cliente.
- **No hay ningún `VITE_MERCADOPAGO_WEBHOOK_SECRET`.** No existe en `.env.example` ni en el código.
- El secret **nunca** se devuelve, se imprime, se serializa ni entra en un mensaje de error.
  Los 7 tests del caso 11 y el test del caso 12 (con `console.log/info/warn/error/debug/trace`
  espiados) lo verifican: el módulo no escribe **nada** en consola, ni en éxito ni en fallo.
- Un secret ausente o en blanco produce `MISSING_SECRET` **antes** de examinar el header: una
  firma válida sin secret configurado **no** verifica.

---

## 10. Qué NO implementó

- **NO endpoint.** No existe `/api/mercadopago/webhook`, ni ruta, ni server function pública.
- **NO checkout**, no UI, no plan remoto, no llamada a la API de Mercado Pago.
- **NO toca ApplicationStore**, no persiste, no llama Supabase, no resuelve entitlement, no
  aplica eventos. Un resultado `VERIFIED` **no es** una suscripción pagada y este módulo no
  puede crear una.
- **NO registra el adapter completo.** `adapters/index.ts` quedó intacto: registrar el adapter
  exigiría `createSession`/`cancel`/`reactivate`/`changePlan`/checkout, fuera de alcance. El
  verifier queda **exportado y listo** para que MP-M2B lo consuma.
- **NO implementa tolerancia de timestamp / anti-replay** — ver limitación L3.

---

## 11. Limitaciones

**L1 — El `id` del manifest.** El SDK oficial, en su uso documentado, **no pasa `data.id`** al
validador, aunque la plantilla del manifest sí contempla un campo `id`. Implementé la
construcción del SDK (el `id:` se incluye cuando el valor está presente) y omití el valor
cuando no lo está. **Consecuencia:** si Mercado Pago llegara a firmar incluyendo `data.id` en el
manifest, el digest no coincidiría y la notificación se **rechazaría** — dirección segura, pero
podría descartar notificaciones legítimas. **Verificación empírica pendiente:** esto solo se
confirma contra una notificación real de Mercado Pago (MP-M3 / sandbox). Es la razón principal
del veredicto `PASS_WITH_LIMITATION`.

**L2 — `data.id` en el seam congelado.** El contrato `WebhookVerifier` es
`verify(rawBody, headers)` — dos argumentos, sin slot para query params. `data.id` es un query
param, así que el adaptador lo lee del header bag bajo su nombre canónico `data.id`, y un host
conectado a ese adaptador **debe** reenviar el valor ahí. Un host que tenga el request real
(MP-M2B) debería llamar a `verifyMercadoPagoSignature` directamente con `data.id` leído del
query y saltarse el adaptador. Documentado en el propio módulo.

**L3 — Sin ventana de frescura.** El SDK admite una `tolerance_seconds` opcional contra replay.
No la implementé: §6 exige rechazar un timestamp inválido (formato), no uno viejo (frescura), y
elegir una ventana es una decisión de política con implicaciones de clock skew. Un atacante que
capture una notificación firmada podría reenviarla dentro de la ventana de idempotencia
canónica; la idempotencia de eventos canónicos es la que debe contenerlo, no el verifier.
Recomendado para MP-M2B.

**L4 — El body no se verifica, deliberadamente.** La firma de Mercado Pago cubre metadata, no
el cuerpo JSON. Firmar o parsear el body daría falsa sensación de cobertura, así que el
parámetro `rawBody` se acepta (el contrato lo exige) y se ignora. Hay test que lo prueba con
cuerpos contradictorios.

---

## 12. Siguiente microfase recomendada

**MP-M2B — Webhook endpoint.** Consumir el verifier desde una ruta real:

1. ruta que reciba el POST, lea `x-signature` y `x-request-id` de headers y `data.id` del query
2. llamar a `verifyMercadoPagoSignature` con esos tres valores y el secret
3. `REJECTED` → 401, sin efectos, sin detalle del motivo hacia afuera
4. `VERIFIED` → `intakeMercadoPagoNotification` → `resolveMercadoPagoLookup` → `applyNormalizedEvent`
5. resolver L3 (ventana de frescura) al mismo tiempo

---

## 13. Git diff summary

```
?? src/server/billing/mercadopago/__tests__/webhook-verifier.test.ts   693 líneas
?? src/server/billing/mercadopago/webhook-verifier.ts                  329 líneas
```

Sin modificaciones a archivos existentes. Sin rutas, sin adapters, sin env, sin migraciones.

---

## QA — resultados finales

| Gate | Resultado |
|---|---|
| Tests MP-M2 (nuevos) | **78/78 PASS** |
| Tests MP-M1 | **130/130 PASS** (52 MP-M1 + 78 MP-M2) |
| Billing suite | **189/189 PASS** (111 previos + 78 nuevos, sin regresiones) |
| B0 test | **32/32 PASS** |
| Typecheck (scope billing) | **0 errores** |
| Lint (archivos tocados) | **0 violaciones** (solo ruido CRLF preexistente) |
| `git diff --check` | **PASS** (exit 0) |

**Ruido preexistente reportado por separado, NO arreglado:** el lint de estos archivos reporta
errores `Delete ␍` (prettier/prettier) por CRLF, igual que el resto del repo en checkout Windows
(`core.autocrlf=true` sin `.gitattributes`). No es de esta microfase y no se tocó. Es el mismo
hallazgo raíz que motivó el microfix `f065c68`.

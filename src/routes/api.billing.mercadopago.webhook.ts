import { createFileRoute } from "@tanstack/react-router";

/**
 * CRIPQER BILLING — MERCADO PAGO WEBHOOK ENDPOINT (MP-M2B)
 *
 *     POST /api/billing/mercadopago/webhook
 *
 * This route is TRANSPORT AND NOTHING ELSE. It receives the request and hands it
 * to the canonical intake in `src/server/billing/mercadopago/webhook-endpoint.ts`,
 * which owns the entire pipeline: signature, freshness, idempotency, authoritative
 * lookup, normalization and application. No decision, no secret and no state
 * lives in this file, so there is exactly one place to audit and one place to
 * test.
 *
 * WHY THE IMPORT IS DYNAMIC
 * The intake module is marked `server-only` and reaches Supabase and the Mercado
 * Pago credentials. Importing it at the top of a route file would put it in the
 * module graph the client build also walks; importing it INSIDE the handler keeps
 * it out of the browser bundle by construction, not by convention.
 *
 * METHOD SURFACE
 * `POST` is the only accepted method. Every other method is answered by the same
 * intake (which owns the method guard and the `Allow` header) with 405 and zero
 * effects, rather than falling through to a page render that does not exist.
 */

async function handle(request: Request): Promise<Response> {
  const { handleMercadoPagoWebhook } =
    await import("../server/billing/mercadopago/webhook-endpoint");
  return handleMercadoPagoWebhook(request);
}

export const Route = createFileRoute("/api/billing/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      ANY: async ({ request }) => handle(request),
    },
  },
});

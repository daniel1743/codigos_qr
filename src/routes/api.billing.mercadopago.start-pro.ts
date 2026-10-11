import { createFileRoute } from "@tanstack/react-router";

/**
 * CRIPQER BILLING — START A PRO SUBSCRIPTION (MP-M3C)
 *
 *     POST /api/billing/mercadopago/start-pro
 *
 * This route is TRANSPORT AND NOTHING ELSE. It hands the request to the
 * sequenced flow in `src/server/billing/mercadopago/pro-subscription-start.ts`,
 * which owns every decision: who the caller is, which offer applies, whether the
 * plan is configured, whether a subscription is already in flight, the single
 * provider call, the ownership write, and the verification that the write
 * happened before any checkout URL is returned.
 *
 * The route reads no body and takes no parameter. There is nothing a caller can
 * send that reaches Mercado Pago, so there is exactly one place to audit and one
 * place to test.
 *
 * WHY THE IMPORT IS DYNAMIC
 * The flow module is marked `server-only` and reaches Supabase and the Mercado
 * Pago credentials. Importing it at the top of a route file would put it in the
 * module graph the client build also walks; importing it INSIDE the handler keeps
 * it out of the browser bundle by construction, not by convention.
 *
 * METHOD SURFACE
 * `POST` is the only accepted method. Every other method is answered by the flow
 * itself (which owns the method guard and the `Allow` header) with 405 and zero
 * effects — and, importantly, without ever reaching Mercado Pago.
 */

async function handle(request: Request): Promise<Response> {
  const { handleStartProSubscription } =
    await import("../server/billing/mercadopago/pro-subscription-start");
  return handleStartProSubscription(request);
}

export const Route = createFileRoute("/api/billing/mercadopago/start-pro")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      ANY: async ({ request }) => handle(request),
    },
  },
});

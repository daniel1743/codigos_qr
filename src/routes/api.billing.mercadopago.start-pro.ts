import { createFileRoute } from "@tanstack/react-router";

/**
 * CRIPQER BILLING — START A PRO SUBSCRIPTION (MP-M3C / MP-M3D.7)
 *
 *     POST /api/billing/mercadopago/start-pro
 *     Body: { "card_token_id": "<token from Mercado Pago's client integration>" }
 *
 * This route is TRANSPORT AND NOTHING ELSE. It hands the request to the
 * sequenced flow in `src/server/billing/mercadopago/pro-subscription-start.ts`,
 * which owns every decision: who the caller is, which offer applies, whether the
 * plan is configured, whether a subscription is already in flight, the single
 * provider call, the ownership write, and the authoritative readback.
 *
 * This route still reads nothing itself — not the body, not a header, not a query
 * parameter. A body IS read now, but by the flow, through the frozen single-field
 * contract in `card-token.ts`. The indirection is the point: exactly one place
 * decides what may cross from a browser to this server, so an audit of "what can
 * a caller influence" has one file to read. If this route ever called
 * `request.json()` there would be two.
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

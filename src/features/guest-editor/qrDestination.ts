import { getPublicQrUrl } from "../../lib/url";

/**
 * Guest Editor V1 - G7.3: the QR destination is verified, not assumed.
 *
 * A QR that "looks right" proves nothing: what matters is the URL it physically encodes.
 * The canonical contract already exists (`getPublicQrUrl` -> `/q/{public_id}` on the
 * canonical origin, used by `PageQrPanel`), so this module only CHECKS a payload against
 * it, without generating a second QR implementation and without any network access.
 *
 * Rules enforced:
 *   - the payload must be the canonical QR URL of THIS page's `public_id`;
 *   - `https` only;
 *   - never an editor route (`/pages/...`, `/edit`);
 *   - never localhost/127.0.0.1 (a printed QR must survive the machine it was made on);
 *   - no query string or fragment (no data — personal or otherwise — inside the payload).
 */
export interface QrDestinationCheck {
  ok: boolean;
  expected: string;
  problems: string[];
}

export function expectedQrDestination(publicId: string): string {
  return getPublicQrUrl(publicId);
}

export function verifyQrDestination({
  publicId,
  payload,
}: {
  publicId: string;
  payload: string;
}): QrDestinationCheck {
  const expected = expectedQrDestination(publicId);
  const problems: string[] = [];
  const value = (payload ?? "").trim();
  const canonicalOrigin = new URL(expected).origin;

  if (!value) problems.push("payload-vacio");
  if (!/^https:\/\//i.test(value)) problems.push("no-https");

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    problems.push("url-invalida");
  }

  if (parsed) {
    if (parsed.origin !== canonicalOrigin) problems.push("origen-no-canonico");
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(parsed.hostname)) problems.push("localhost");
    if (/^\/pages\//i.test(parsed.pathname) || /\/edit\/?$/i.test(parsed.pathname)) {
      problems.push("ruta-de-editor");
    }
    if (parsed.search) problems.push("query-inesperada");
    if (parsed.hash) problems.push("fragmento-inesperado");
    if (parsed.pathname.replace(/\/+$/, "") !== new URL(expected).pathname.replace(/\/+$/, "")) {
      problems.push("ruta-no-canonica");
    }
  }

  if (value !== expected) problems.push("payload-distinto-del-esperado");

  return { ok: problems.length === 0, expected, problems };
}

/**
 * CRIPQER Conversion Advisor — CA-7.4-C · the ephemeral, isolated test host.
 *
 * A throwaway HTTP server that exists for one test run. It:
 *   · binds to an EPHEMERAL port (the OS picks it), so it can never collide with
 *     a dev server or another session's process;
 *   · serves the host's browser entry through Vite's programmatic API, with an
 *     INLINE config, so `vite.config.ts` is never read or written;
 *   · keeps the real pipeline on the SERVER side, reachable only through
 *     `ssrLoadModule`, so no server-only module can enter the browser bundle;
 *   · serves its own minimal HTML, so the application's `index.html` is neither
 *     read nor touched;
 *   · shuts down only itself, and only when the test asks.
 *
 * WHY NOT `vite.config.ts`: it is on the protected list, and its TanStack Start
 * and nitro plugins expect a whole application to build — not a single page. The
 * inline config uses the same `@vitejs/plugin-react` and `@tailwindcss/vite` the
 * app already depends on, so nothing new is installed and nothing existing is
 * modified.
 *
 * WHY NOT A ROUTE: the brief forbids adding production routes. The entry lives
 * under `ui/e2e/` and is served by this process alone; `src/routes/**` is
 * untouched.
 *
 * WHAT DOES NOT CROSS THE WIRE: the pipeline module itself is returned to the
 * caller as a Node object. Turn counts, provider-call counts and abort records
 * are read from it DIRECTLY by the test and have no HTTP route at all — so no
 * CA-8 metric can be fetched by the browser even by accident.
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createServer as createViteServer, type ViteDevServer } from "vite";

import { isAdvisorE2eScenario } from "./scenarios";

const ENTRY = "/src/lib/conversion-advisor/ui/e2e/client-entry.tsx";

/**
 * The host's own page. Minimal on purpose: a mount point, the entry, and just
 * enough base styling for the surface's utility classes to have a sane box
 * model. It is not the application's HTML and does not reference it.
 *
 * CA-11 adds an ENTRY parameter: the same host can mount the isolated surface
 * (CA-7.4-C) or the REAL landing with the Advisor inside it (`landing-entry`),
 * against the same pipeline, so the product mount is measured with the harness
 * that already exists.
 */
function hostHtml(entry: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CA-7.4-C isolated host</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`;
}

export interface TestHostOptions {
  /** The browser module to mount. Defaults to CA-7.4-C's isolated surface. */
  readonly entry?: string;
}

/** The pipeline module, as the test sees it. Never sent to the browser. */
export interface PipelineModule {
  createSession(scenario: string): string;
  runTurn(request: {
    readonly text: string;
    readonly scenario: string;
    readonly handle: string;
  }): Promise<{ readonly status: number; readonly body: unknown }>;
  resetHost(): void;
  noteAbort(): void;
  hostStats(): {
    readonly turns: number;
    /** Turns the host BEGAN, including one still in flight. */
    readonly turnsStarted: number;
    readonly providerCalls: number;
    readonly aborts: number;
    readonly sessions: number;
    readonly records: readonly {
      readonly index: number;
      readonly scenario: string;
      readonly text: string;
      readonly providerCalls: number;
      readonly status: string;
      readonly aborted: boolean;
    }[];
  };
}

export interface TestHost {
  readonly url: string;
  readonly port: number;
  /** Direct handle to the server-side pipeline, for assertions only. */
  readonly pipeline: PipelineModule;
  close(): Promise<void>;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let data = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      data += chunk;
    });
    request.on("end", () => resolveBody(data));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  // A cancelled request has no socket left to answer on. Writing anyway would
  // turn a clean abort into a host crash, so the guard is part of the design.
  if (response.writableEnded || response.destroyed) return;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export async function startTestHost(options: TestHostOptions = {}): Promise<TestHost> {
  const entry = options.entry ?? ENTRY;
  const vite: ViteDevServer = await createViteServer({
    configFile: false,
    root: process.cwd(),
    logLevel: "silent",
    // `appType: custom` keeps Vite out of the request path for routes it does
    // not own, so the API routes below are ours alone.
    appType: "custom",
    server: { middlewareMode: true, hmr: false, fs: { strict: false } },
    plugins: [react(), tailwindcss()],
  });

  // Loaded ONCE, through Vite's SSR runner. Only the JSON it produces reaches
  // the browser; the module itself stays in this process.
  const pipeline = (await vite.ssrLoadModule(
    "/src/lib/conversion-advisor/ui/e2e/pipeline-host.ts",
  )) as PipelineModule;

  const server = createHttpServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/api/session" && request.method === "POST") {
        const raw = await readBody(request);
        let parsed: unknown = {};
        try {
          parsed = raw === "" ? {} : JSON.parse(raw);
        } catch {
          sendJson(response, 400, { error: "invalid json" });
          return;
        }
        const { scenario } = (parsed ?? {}) as Record<string, unknown>;
        if (!isAdvisorE2eScenario(scenario)) {
          sendJson(response, 400, { error: "invalid scenario" });
          return;
        }
        // The scenario fixes the conversation's guard limits, so it is decided
        // when the conversation starts rather than per turn.
        sendJson(response, 200, { handle: pipeline.createSession(scenario) });
        return;
      }

      if (url.pathname === "/api/turn" && request.method === "POST") {
        const raw = await readBody(request);
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          sendJson(response, 400, { error: "invalid json" });
          return;
        }
        const { text, scenario, handle } = (parsed ?? {}) as Record<string, unknown>;

        if (
          typeof text !== "string" ||
          typeof handle !== "string" ||
          !isAdvisorE2eScenario(scenario)
        ) {
          sendJson(response, 400, { error: "invalid turn request" });
          return;
        }

        // A browser abort is a real fact, and recording it is what lets the test
        // prove the host saw the cancellation — and that the turn it cancelled
        // was still settled rather than silently refunded.
        request.on("aborted", () => pipeline.noteAbort());

        const result = await pipeline.runTurn({ text, scenario, handle });
        sendJson(response, result.status, result.body);
        return;
      }

      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await vite.transformIndexHtml("/", hostHtml(entry));
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }

      // Everything else — the entry module and its imports — goes to Vite.
      vite.middlewares(request, response, () => {
        if (response.writableEnded || response.destroyed) return;
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
      });
    })().catch(() => {
      // The host reports its own failure honestly and never leaks a stack trace
      // into a response body.
      sendJson(response, 500, { error: "host failure" });
    });
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("CA7_4C_HOST: no port was assigned");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    port: address.port,
    pipeline,
    close: async () => {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
      await vite.close();
    },
  };
}

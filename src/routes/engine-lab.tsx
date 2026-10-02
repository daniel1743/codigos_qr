import { createFileRoute, notFound } from "@tanstack/react-router";
import { EngineLab } from "@/components/engine-lab/EngineLab";

/** Internal integration route. It is absent from navigation and unreachable in production. */
export const Route = createFileRoute("/engine-lab")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow,noarchive" }],
  }),
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: EngineLab,
});

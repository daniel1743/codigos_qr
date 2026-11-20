import { createFileRoute } from "@tanstack/react-router";
import { GuestEditorHost } from "../features/guest-editor/GuestEditorHost";

/**
 * Guest Editor V1 (G1) - anonymous entry to the REAL Magic Editor.
 *
 * A visitor lands here from "Personalizar una tarjeta" and starts designing a Bio
 * card immediately: no account, no login wall, no remote write. The page is a thin
 * route around `GuestEditorHost`, which mounts `MagicEditorApp` (the same editor the
 * production host uses) with local-only persistence.
 *
 * Not indexed on purpose: it is a workspace, not a landing.
 */
export const Route = createFileRoute("/crear-tarjeta")({
  head: () => ({
    meta: [
      { title: "Crea tu tarjeta · CRIPQER" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: GuestEditorPage,
});

function GuestEditorPage() {
  return <GuestEditorHost />;
}

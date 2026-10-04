import React from "react";
import { PenLineIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { TopBar } from "../components/editor/TopBar";
import { StateTour } from "../components/editor/StateTour";
import { DesktopCanvas } from "../components/editor/DesktopCanvas";
import { MobileCanvas } from "../components/editor/MobileCanvas";
import { BlockPicker } from "../components/editor/BlockPicker";
import { PageSettings } from "../components/editor/PageSettings";
import { CanonicalCanvas } from "./CanonicalReadOnlyPage";

export function EditorPage() {
  const ed = useEditor();
  const preview = ed.mode === "preview";
  return (
    <div className={`flex h-full w-full flex-col bg-canvas${preview ? " fixed inset-0 z-[100]" : ""}`} data-cq-preview={preview ? "true" : undefined}>
      {!preview && <TopBar />}
      <StateTour />
      <main className="relative min-h-0 flex-1">
        {ed.canonicalDocument ? (
           <CanonicalCanvas />
        ) : (
           ed.isMobile ? <MobileCanvas /> : <DesktopCanvas />
        )}
        {ed.mode === "preview" && (
          <button
            type="button"
            onClick={() => ed.setMode("edit")}
            className="absolute right-4 top-4 z-40 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 text-[12px] font-semibold text-ink shadow-sm backdrop-blur transition-colors duration-150 hover:bg-white"
          >
            <PenLineIcon className="h-3.5 w-3.5" /> Volver a editar
          </button>
        )}
      </main>
      <BlockPicker variant="dialog" />
      <PageSettings variant="drawer" />
    </div>
  );
}

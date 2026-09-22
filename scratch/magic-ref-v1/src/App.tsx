import React from "react";
import { EditorProvider } from "./contexts/EditorContext";
import { Workspace } from "./components/Workspace";

type InitialState =
  | "default"
  | "card-selected"
  | "title-editing"
  | "image-selected"
  | "cta-selected"
  | "detail-modal"
  | "publish-warning";

interface AppProps {
  /** Estado inicial del prototipo, para revisar cada pantalla del spec. */
  initialState?: InitialState;
  /** Muestra el panel lateral de ajustes avanzados (opcional). */
  showAdvancedPanel?: boolean;
}

export function App({ initialState = "default", showAdvancedPanel = false }: AppProps) {
  return (
    <EditorProvider>
      <Workspace initialState={initialState} showAdvancedPanel={showAdvancedPanel} />
    </EditorProvider>
  );
}

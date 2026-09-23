import React from "react";
import "./index.css";
import { EditorProvider } from "./contexts/EditorContext";
import { Workspace } from "./components/Workspace";

export type InitialState =
  | "default"
  | "card-selected"
  | "title-editing"
  | "image-selected"
  | "cta-selected"
  | "detail-modal"
  | "publish-warning";

interface AppProps {
  initialState?: InitialState;
  showAdvancedPanel?: boolean;
  pageId?: string;
}

export function App({ initialState = "default", showAdvancedPanel = false, pageId }: AppProps) {
  return (
    <EditorProvider pageId={pageId}>
      <Workspace initialState={initialState} showAdvancedPanel={showAdvancedPanel} />
    </EditorProvider>
  );
}

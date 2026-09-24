import { createContext } from 'react';

/** When true, editable components render as plain, non-interactive previews (used by the Sistema gallery). */
export const StaticRenderContext = createContext(false);
import { createContext } from 'react';

export interface EditableParent {
  id?: string;
  blockKey?: string;
}

export const EditableParentContext = createContext<EditableParent>({});
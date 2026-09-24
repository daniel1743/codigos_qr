import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { templates } from '../data/templates';
import type {
  BlockType,
  Device,
  EditorMode,
  ElementInfo,
  MobileWidth,
  PageDoc,
  SheetState,
  TemplateId,
  TextStyle } from
'../types/editor';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';

interface History {
  past: PageDoc[];
  present: PageDoc;
  future: PageDoc[];
}

export interface RegisteredElement extends ElementInfo {
  el: HTMLElement;
}

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface PickerState {
  open: boolean;
  afterKey?: string;
}

export interface EditorValue {
  templateId: TemplateId;
  setTemplateId: (id: TemplateId) => void;
  doc: PageDoc;
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  device: Device;
  setDevice: (d: Device) => void;
  mobileWidth: MobileWidth;
  setMobileWidth: (w: MobileWidth) => void;
  isMobile: boolean;
  isSmallScreen: boolean;
  selection: ElementInfo | null;
  select: (id: string, opts?: {reveal?: boolean;}) => void;
  clearSelection: () => void;
  editingId: string | null;
  setEditingId: Setter<string | null>;
  keyboard: boolean;
  setKeyboard: Setter<boolean>;
  sheet: SheetState;
  setSheet: Setter<SheetState>;
  sheetPanel: string | null;
  setSheetPanel: Setter<string | null>;
  moreOpen: boolean;
  setMoreOpen: Setter<boolean>;
  picker: PickerState;
  openPicker: (afterKey?: string) => void;
  closePicker: () => void;
  settingsOpen: boolean;
  setSettingsOpen: Setter<boolean>;
  saveState: 'saved' | 'saving' | 'error';
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setText: (id: string, value: string) => void;
  setTextStyle: (id: string, patch: Partial<TextStyle>) => void;
  setProp: (id: string, key: string, value: string) => void;
  removeElement: (id: string, label: string) => void;
  moveBlock: (key: string, dir: -1 | 1) => void;
  duplicateBlock: (key: string) => void;
  toggleHidden: (key: string) => void;
  deleteBlock: (key: string) => void;
  addBlock: (type: BlockType, afterKey?: string) => void;
  register: (r: RegisteredElement) => void;
  unregister: (id: string, el: HTMLElement) => void;
  getElement: (id: string) => HTMLElement | null;
  getInfo: (id: string) => ElementInfo | null;
  publishing: boolean;
  publish: () => void;
  uploadAsset?: (file: File) => Promise<string>;
}

const EditorContext = createContext<EditorValue | null>(null);

function createDoc(id: TemplateId): PageDoc {
  return {
    blocks: templates[id].initialBlocks.map((b) => ({ ...b })),
    texts: {},
    textStyles: {},
    props: {},
    removed: {}
  };
}

function createHistory(id: TemplateId): History {
  return { past: [], present: createDoc(id), future: [] };
}

function withTemplateDefaults(doc: PageDoc, id: TemplateId): PageDoc {
  const existing = new Set(doc.blocks.map((block) => block.key));
  const missing = templates[id].initialBlocks
    .filter((block) => !existing.has(block.key))
    .map((block) => ({ ...block }));

  return missing.length ? { ...doc, blocks: [...doc.blocks, ...missing] } : doc;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 7);
}

interface EditorProviderProps {
  children: React.ReactNode;
  initialTemplate?: TemplateId;
  initialDevice?: Device;
  initialDocument?: MagicEditorStateV1;
  initialMode?: EditorMode;
  onDocumentChange?: (state: MagicEditorStateV1) => Promise<void> | void;
  onPublish?: (state: MagicEditorStateV1) => Promise<void> | void;
  uploadAsset?: (file: File) => Promise<string>;
}

export function EditorProvider({ children, initialTemplate = 'bio', initialDevice = 'desktop', initialDocument, initialMode = 'edit', onDocumentChange, onPublish, uploadAsset }: EditorProviderProps) {
  const [templateId, setTemplateIdState] = useState<TemplateId>(initialDocument?.templateId ?? initialTemplate);
  const [histories, setHistories] = useState<Record<TemplateId, History>>(() => ({
    bio: initialDocument?.templateId === 'bio' ? { past: [], present: initialDocument.doc, future: [] } : createHistory('bio'),
    business: initialDocument?.templateId === 'business' ? { past: [], present: initialDocument.doc, future: [] } : createHistory('business'),
    portfolio: initialDocument?.templateId === 'portfolio' ? { past: [], present: initialDocument.doc, future: [] } : createHistory('portfolio')
  }));
  const [mode, setModeState] = useState<EditorMode>(initialMode);
  const [device, setDeviceState] = useState<Device>(initialDevice);
  const [mobileWidth, setMobileWidth] = useState<MobileWidth>(390);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [selection, setSelection] = useState<ElementInfo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [sheet, setSheet] = useState<SheetState>('compact');
  const [sheetPanel, setSheetPanel] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [picker, setPicker] = useState<PickerState>({ open: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [publishing, setPublishing] = useState(false);
  const registry = useRef(new Map<string, RegisteredElement>());

  const isMobile = device === 'mobile' || isSmallScreen;
  const history = histories[templateId];
  const doc = history.present;

  useEffect(() => {
    const request = onDocumentChange?.({ templateId, doc });
    if (!request) return;

    setSaveState('saving');
    void Promise.resolve(request)
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'));
  }, [doc, onDocumentChange, templateId]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const resetTransient = useCallback(() => {
    setSelection(null);
    setEditingId(null);
    setKeyboard(false);
    setSheet('compact');
    setSheetPanel(null);
    setMoreOpen(false);
  }, []);

  const commit = useCallback(
    (fn: (d: PageDoc) => PageDoc) => {
      setHistories((h) => {
        const cur = h[templateId];
        const next = fn(cur.present);
        if (next === cur.present) return h;
        return { ...h, [templateId]: { past: [...cur.past.slice(-49), cur.present], present: next, future: [] } };
      });
    },
    [templateId]
  );

  const undo = useCallback(() => {
    setHistories((h) => {
      const c = h[templateId];
      if (!c.past.length) return h;
      const prev = c.past[c.past.length - 1];
      return { ...h, [templateId]: { past: c.past.slice(0, -1), present: prev, future: [c.present, ...c.future] } };
    });
  }, [templateId]);

  const redo = useCallback(() => {
    setHistories((h) => {
      const c = h[templateId];
      if (!c.future.length) return h;
      const [next, ...rest] = c.future;
      return { ...h, [templateId]: { past: [...c.past, c.present], present: next, future: rest } };
    });
  }, [templateId]);

  const register = useCallback((r: RegisteredElement) => {
    registry.current.set(r.id, r);
  }, []);

  const unregister = useCallback((id: string, el: HTMLElement) => {
    const cur = registry.current.get(id);
    if (cur && cur.el === el) registry.current.delete(id);
    queueMicrotask(() => {
      if (!registry.current.has(id)) setSelection((s) => s?.id === id ? null : s);
    });
  }, []);

  const getElement = useCallback((id: string) => registry.current.get(id)?.el ?? null, []);

  const getInfo = useCallback((id: string): ElementInfo | null => {
    const r = registry.current.get(id);
    if (!r) return null;
    return { id: r.id, kind: r.kind, label: r.label, parentId: r.parentId, blockKey: r.blockKey };
  }, []);

  const select = useCallback(
    (id: string, opts?: {reveal?: boolean;}) => {
      const r = registry.current.get(id);
      if (!r) return;
      setSelection({ id: r.id, kind: r.kind, label: r.label, parentId: r.parentId, blockKey: r.blockKey });
      setMoreOpen(false);
      setSheetPanel(null);
      setSheet('compact');
      setKeyboard(false);
      setEditingId(!isMobile && r.kind === 'text' ? id : null);
      if (opts?.reveal && !isMobile) r.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [isMobile]
  );

  const clearSelection = useCallback(() => {
    resetTransient();
  }, [resetTransient]);

  const setMode = useCallback(
    (m: EditorMode) => {
      setModeState(m);
      resetTransient();
      setPicker({ open: false });
      setSettingsOpen(false);
    },
    [resetTransient]
  );

  const setTemplateId = useCallback(
    (id: TemplateId) => {
      if (id === templateId) return;
      setHistories((h) => {
        const next = withTemplateDefaults(h[templateId].present, id);
        return {
          bio: { ...h.bio, present: next, future: [] },
          business: { ...h.business, present: next, future: [] },
          portfolio: { ...h.portfolio, present: next, future: [] },
        };
      });
      setTemplateIdState(id);
      resetTransient();
      setPicker({ open: false });
      setSettingsOpen(false);
    },
    [resetTransient, templateId]
  );

  const setDevice = useCallback(
    (d: Device) => {
      setDeviceState(d);
      resetTransient();
      setPicker({ open: false });
    },
    [resetTransient]
  );

  const setText = useCallback(
    (id: string, value: string) => commit((d) => d.texts[id] === value ? d : { ...d, texts: { ...d.texts, [id]: value } }),
    [commit]
  );

  const setTextStyle = useCallback(
    (id: string, patch: Partial<TextStyle>) =>
    commit((d) => ({ ...d, textStyles: { ...d.textStyles, [id]: { ...d.textStyles[id], ...patch } } })),
    [commit]
  );

  const setProp = useCallback(
    (id: string, key: string, value: string) =>
    commit((d) => d.props[id]?.[key] === value ? d : { ...d, props: { ...d.props, [id]: { ...d.props[id], [key]: value } } }),
    [commit]
  );

  const removeElement = useCallback(
    (id: string, label: string) => {
      commit((d) => ({ ...d, removed: { ...d.removed, [id]: true } }));
      resetTransient();
      toast(`${label} eliminado`, { action: { label: 'Deshacer', onClick: () => undo() } });
    },
    [commit, resetTransient, undo]
  );

  const moveBlock = useCallback(
    (key: string, dir: -1 | 1) =>
    commit((d) => {
      const i = d.blocks.findIndex((b) => b.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    }),
    [commit]
  );

  const duplicateBlock = useCallback(
    (key: string) => {
      const newKey = `${key.split('-')[0]}-${uid()}`;
      commit((d) => {
        const i = d.blocks.findIndex((b) => b.key === key);
        if (i < 0) return d;
        const blocks = [...d.blocks];
        blocks.splice(i + 1, 0, { key: newKey, type: d.blocks[i].type });
        const sourceProps = d.props[`block:${key}`];
        return { ...d, blocks, props: sourceProps ? { ...d.props, [`block:${newKey}`]: { ...sourceProps } } : d.props };
      });
      toast('Bloque duplicado');
    },
    [commit]
  );

  const toggleHidden = useCallback(
    (key: string) =>
    commit((d) => ({ ...d, blocks: d.blocks.map((b) => b.key === key ? { ...b, hidden: !b.hidden } : b) })),
    [commit]
  );

  const deleteBlock = useCallback(
    (key: string) => {
      commit((d) => ({ ...d, blocks: d.blocks.filter((b) => b.key !== key) }));
      resetTransient();
      toast('Bloque eliminado', { action: { label: 'Deshacer', onClick: () => undo() } });
    },
    [commit, resetTransient, undo]
  );

  const addBlock = useCallback(
    (type: BlockType, afterKey?: string) => {
      const key = `${type}-${uid()}`;
      commit((d) => {
        const i = afterKey ? d.blocks.findIndex((b) => b.key === afterKey) : -1;
        const blocks = [...d.blocks];
        blocks.splice(i >= 0 ? i + 1 : blocks.length, 0, { key, type });
        return { ...d, blocks };
      });
      setPicker({ open: false });
      window.setTimeout(() => select(`block:${key}`, { reveal: true }), 80);
    },
    [commit, select]
  );

  const openPicker = useCallback((afterKey?: string) => {
    setMoreOpen(false);
    setPicker({ open: true, afterKey });
  }, []);

  const closePicker = useCallback(() => setPicker({ open: false }), []);

  const publish = useCallback(() => {
    setPublishing(true);
    const result = onPublish?.({ templateId, doc });
    Promise.resolve(result).then(() => {
      setPublishing(false);
      toast.success('Página publicada', { description: `cripqer.com/${templates[templateId].slug}` });
    }).catch((error) => {
      setPublishing(false);
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar la página.');
    });
  }, [doc, onPublish, templateId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key === 'Escape' && !typing) {
        resetTransient();
        setPicker({ open: false });
        return;
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();else
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, resetTransient]);

  const value: EditorValue = {
    templateId,
    setTemplateId,
    doc,
    mode,
    setMode,
    device,
    setDevice,
    mobileWidth,
    setMobileWidth,
    isMobile,
    isSmallScreen,
    selection,
    select,
    clearSelection,
    editingId,
    setEditingId,
    keyboard,
    setKeyboard,
    sheet,
    setSheet,
    sheetPanel,
    setSheetPanel,
    moreOpen,
    setMoreOpen,
    picker,
    openPicker,
    closePicker,
    settingsOpen,
    setSettingsOpen,
    saveState,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    setText,
    setTextStyle,
    setProp,
    removeElement,
    moveBlock,
    duplicateBlock,
    toggleHidden,
    deleteBlock,
    addBlock,
    register,
    unregister,
    getElement,
    getInfo,
    publishing,
    publish,
    uploadAsset
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider');
  return ctx;
}

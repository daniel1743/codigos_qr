import type { BioTemplateConfig, BlockType, TemplateBlock } from "../types";
import { createBlock } from "../constants/blockDefinitions";
import { deepClone, uid } from "../utils";

/** SINGLE SOURCE OF TRUTH — every panel reads and writes this config. */
export interface StudioState {
  config: BioTemplateConfig;
  past: BioTemplateConfig[];
  future: BioTemplateConfig[];
  selectedBlockId: string | null;
  dirty: boolean;
}

export type StudioAction =
  | { type: "replaceConfig"; config: BioTemplateConfig; resetHistory?: boolean }
  | { type: "patchConfig"; patch: Partial<BioTemplateConfig> }
  | { type: "patch"; path: string; value: unknown }
  | { type: "selectBlock"; id: string | null }
  | { type: "addBlock"; blockType: BlockType; at?: number }
  | { type: "insertBlock"; block: TemplateBlock; at?: number }
  | { type: "insertBlocks"; blocks: TemplateBlock[]; at?: number }
  | { type: "updateBlock"; id: string; patch: Partial<TemplateBlock> }
  | { type: "patchBlockField"; id: string; path: string; value: unknown }
  | { type: "moveBlock"; id: string; direction: -1 | 1 }
  | { type: "reorderBlock"; sourceId: string; targetId: string }
  | { type: "duplicateBlock"; id: string }
  | { type: "deleteBlock"; id: string }
  | { type: "toggleBlockHidden"; id: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "markSaved" };

const HISTORY_LIMIT = 60;

function setPath<T extends object>(target: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = deepClone(target) as Record<string, unknown>;
  let node: Record<string, unknown> = clone;
  keys.slice(0, -1).forEach((key) => {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  });
  const last = keys[keys.length - 1]!;
  node[last] = value;
  return clone as T;
}

function commit(state: StudioState, config: BioTemplateConfig): StudioState {
  return {
    ...state,
    config: { ...config, metadata: { ...config.metadata, updatedAt: new Date().toISOString() } },
    past: [...state.past, state.config].slice(-HISTORY_LIMIT),
    future: [],
    dirty: true,
  };
}

function withBlocks(state: StudioState, blocks: TemplateBlock[]): StudioState {
  return commit(state, { ...state.config, blocks });
}

export function templateReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "replaceConfig":
      return action.resetHistory
        ? { config: action.config, past: [], future: [], selectedBlockId: null, dirty: false }
        : { ...commit(state, action.config), selectedBlockId: null };

    case "patchConfig":
      return commit(state, { ...state.config, ...action.patch });

    case "patch":
      return commit(state, setPath(state.config, action.path, action.value));

    case "selectBlock":
      return { ...state, selectedBlockId: action.id };

    case "addBlock": {
      const block = createBlock(action.blockType);
      const blocks = [...state.config.blocks];
      blocks.splice(action.at ?? blocks.length, 0, block);
      return { ...withBlocks(state, blocks), selectedBlockId: block.id };
    }

    case "insertBlock": {
      const blocks = [...state.config.blocks];
      blocks.splice(action.at ?? blocks.length, 0, action.block);
      return { ...withBlocks(state, blocks), selectedBlockId: action.block.id };
    }

    case "insertBlocks": {
      const blocks = [...state.config.blocks];
      blocks.splice(action.at ?? blocks.length, 0, ...action.blocks);
      return { ...withBlocks(state, blocks), selectedBlockId: action.blocks[0]?.id ?? null };
    }

    case "updateBlock":
      return withBlocks(
        state,
        state.config.blocks.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      );

    case "patchBlockField":
      return withBlocks(
        state,
        state.config.blocks.map((b) =>
          b.id === action.id ? setPath(b, action.path, action.value) : b,
        ),
      );

    case "moveBlock": {
      const blocks = [...state.config.blocks];
      const index = blocks.findIndex((b) => b.id === action.id);
      const next = index + action.direction;
      if (index < 0 || next < 0 || next >= blocks.length) return state;
      const [moved] = blocks.splice(index, 1);
      blocks.splice(next, 0, moved!);
      return withBlocks(state, blocks);
    }

    case "reorderBlock": {
      const blocks = [...state.config.blocks];
      const from = blocks.findIndex((b) => b.id === action.sourceId);
      const to = blocks.findIndex((b) => b.id === action.targetId);
      if (from < 0 || to < 0 || from === to) return state;
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved!);
      return withBlocks(state, blocks);
    }

    case "duplicateBlock": {
      const index = state.config.blocks.findIndex((b) => b.id === action.id);
      const source = state.config.blocks[index];
      if (!source) return state;
      const copy: TemplateBlock = { ...deepClone(source), id: uid("block") };
      const blocks = [...state.config.blocks];
      blocks.splice(index + 1, 0, copy);
      return { ...withBlocks(state, blocks), selectedBlockId: copy.id };
    }

    case "deleteBlock": {
      const blocks = state.config.blocks.filter((b) => b.id !== action.id);
      return {
        ...withBlocks(state, blocks),
        selectedBlockId: state.selectedBlockId === action.id ? null : state.selectedBlockId,
      };
    }

    case "toggleBlockHidden":
      return withBlocks(
        state,
        state.config.blocks.map((b) => {
          if (b.id !== action.id) return b;
          const hidden = !b.visibility.desktop && !b.visibility.tablet && !b.visibility.mobile;
          return { ...b, visibility: { desktop: hidden, tablet: hidden, mobile: hidden } };
        }),
      );

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        config: previous,
        past: state.past.slice(0, -1),
        future: [state.config, ...state.future].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        config: next,
        past: [...state.past, state.config].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        dirty: true,
      };
    }

    case "markSaved":
      return { ...state, dirty: false };

    default:
      return state;
  }
}

export function createInitialState(config: BioTemplateConfig): StudioState {
  return { config, past: [], future: [], selectedBlockId: null, dirty: false };
}

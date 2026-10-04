// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { EditableAvatar } from '../components/editor/EditableAvatar';
import { createInitialMagicPageDocument, hydrateMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import { activeStoryEntry, readStories, storyKey, storyPatch } from '../utils/stories';

const AVATAR_SRC = 'https://cdn.example.com/avatar.jpg';
const PULSE_SRC = 'https://cdn.example.com/pulse.jpg';
const SECOND_SRC = 'https://cdn.example.com/pulse-2.jpg';
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.overflow = '';
});

function mountAvatar(props: Record<string, string>, mode: 'edit' | 'preview' = 'preview') {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props.avatar = props;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)} initialMode={mode}>
      <EditableAvatar id="avatar" src={AVATAR_SRC} alt="Avatar" sizes={{ S: 92, M: 116, L: 140 }} ringColor="#0D47A1" />
    </EditorProvider>,
  ));
  return { host, root };
}

const activePulse = (src = PULSE_SRC) => ({
  src: AVATAR_SRC,
  [storyKey(0, 'at')]: hoursAgo(1),
  [storyKey(0, 'active')]: 'on',
  [storyKey(0, 'src')]: src,
});

function viewer() {
  return document.body.querySelector<HTMLElement>('[data-story-viewer="open"]');
}

/**
 * E3 — one active pulse photo, its ring, and the viewer opened by tapping the
 * published avatar. Logical 24 h expiry, no Storage deletion, same active state in
 * editor and published output.
 */
describe('E3 "Pulso activo" — photo viewer', () => {
  it('does not show the ring nor allow opening the viewer when the story is expired (src persisted)', () => {
    const { host, root } = mountAvatar({
      src: AVATAR_SRC,
      [storyKey(0, 'at')]: hoursAgo(25),
      [storyKey(0, 'active')]: 'on',
      [storyKey(0, 'src')]: PULSE_SRC,
    });
    expect(host.querySelector('[data-story-ring="off"]')).not.toBeNull();
    expect(host.querySelector('[data-story-tap="on"]')).toBeNull();
    expect(viewer()).toBeNull();
    act(() => root.unmount());
  });

  it('keeps pulse and avatar URLs independent, and the avatar picture untouched', () => {
    const { host, root } = mountAvatar(activePulse());
    const avatarImg = host.querySelector<HTMLImageElement>(`[data-editor-id="avatar"] img`);
    expect(avatarImg?.getAttribute('src')).toBe(AVATAR_SRC);
    expect(activeStoryEntry({ [storyKey(0, 'at')]: hoursAgo(1), [storyKey(0, 'active')]: 'on', [storyKey(0, 'src')]: PULSE_SRC }, Date.now())?.src).toBe(PULSE_SRC);
    act(() => root.unmount());
  });

  it('never includes the avatar key when a pulse is replaced (independent keys)', () => {
    const props = activePulse();
    const patch = storyPatch(props, { activate: 0, setMedia: { index: 0, src: SECOND_SRC } }, Date.now());
    expect(Object.keys(patch).every((key) => key.startsWith('story.'))).toBe(true);
    expect('src' in patch).toBe(false);
    expect(props.src).toBe(AVATAR_SRC);
  });

  it('activating a second pulse deactivates the first one', () => {
    let props: Record<string, string> = activePulse();
    props = { ...props, ...storyPatch(props, { activate: 1, setMedia: { index: 1, src: SECOND_SRC } }, Date.now()) };
    expect(props[storyKey(0, 'active')]).toBe('off');
    expect(activeStoryEntry(props, Date.now())?.src).toBe(SECOND_SRC);
    expect(readStories(props, Date.now()).filter((entry) => entry.active)).toHaveLength(1);
  });

  it('opens the viewer by tapping the published avatar and closes it on the button, restoring the scroll', () => {
    const { host, root } = mountAvatar(activePulse());
    const tap = host.querySelector<HTMLElement>('[data-story-tap="on"]');
    expect(tap).not.toBeNull();

    act(() => {
      tap?.click();
    });
    const overlay = viewer();
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector<HTMLImageElement>('[data-story-viewer-image]')?.getAttribute('src')).toBe(PULSE_SRC);
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      overlay?.querySelector<HTMLElement>('[data-story-viewer-close]')?.click();
    });
    expect(viewer()).toBeNull();
    expect(document.body.style.overflow).toBe('');
    act(() => root.unmount());
  });

  it('closes the viewer with Escape and with the backdrop', () => {
    const { host, root } = mountAvatar(activePulse());
    act(() => {
      host.querySelector<HTMLElement>('[data-story-tap="on"]')?.click();
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(viewer()).toBeNull();

    act(() => {
      host.querySelector<HTMLElement>('[data-story-tap="on"]')?.click();
    });
    const overlay = viewer();
    act(() => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(viewer()).toBeNull();
    act(() => root.unmount());
  });

  it('in the editor, tapping the avatar never opens the viewer', () => {
    const { host, root } = mountAvatar(activePulse(), 'edit');
    expect(host.querySelector('[data-story-tap="on"]')).toBeNull();
    act(() => {
      host.querySelector<HTMLElement>(`[data-editor-id="avatar"]`)?.click();
    });
    expect(viewer()).toBeNull();
    act(() => root.unmount());
  });
});

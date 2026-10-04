// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { EditableAvatar } from '../components/editor/EditableAvatar';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { STORY_FEATURE_LABEL, storyKey } from '../utils/stories';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

function avatarProps(overrides: Record<string, string> = {}) {
  return { src: 'https://example.com/avatar.png', size: 'M', shape: 'circle', ...overrides };
}

function mountAvatar(props: Record<string, string>) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props.avatar = props;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)} initialMode="preview">
      <EditableAvatar
        id="avatar"
        src="https://example.com/avatar.png"
        alt="Avatar"
        sizes={{ S: 92, M: 116, L: 140 }}
        ringColor="#0D47A1"
      />
    </EditorProvider>,
  ));
  return { host, root };
}

/**
 * E2 — "Pulso activo": while a story is inside its 24 h window the avatar shows a
 * subtle three-colour ring; nothing else about the avatar changes.
 */
describe('E2 "Pulso activo" — 24 h story ring on the avatar', () => {
  it('shows no ring when there is no story', () => {
    const { host, root } = mountAvatar(avatarProps());
    expect(host.querySelector('[data-story-ring="off"]')).not.toBeNull();
    expect(host.querySelector('.cq-story-ring')).toBeNull();
    act(() => root.unmount());
  });

  it('shows the three-colour ring while a story is inside its 24 h window', () => {
    const { host, root } = mountAvatar(avatarProps({
      [storyKey(0, 'at')]: hoursAgo(1),
      [storyKey(0, 'active')]: 'on',
    }));
    const wrapper = host.querySelector<HTMLElement>('[data-story-ring="active"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('title') ?? '').toContain(STORY_FEATURE_LABEL);

    const layer = host.querySelector<HTMLElement>('[data-story-ring-layer="spin"]');
    expect(layer).not.toBeNull();
    expect(layer?.className).toContain('cq-story-ring');
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    // the avatar itself (and its own ring treatment) stays untouched
    expect(host.querySelector('[data-editor-id="avatar"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('hides the ring again once the 24 h window has passed', () => {
    const { host, root } = mountAvatar(avatarProps({
      [storyKey(0, 'at')]: hoursAgo(25),
      [storyKey(0, 'active')]: 'on',
    }));
    expect(host.querySelector('[data-story-ring="off"]')).not.toBeNull();
    expect(host.querySelector('.cq-story-ring')).toBeNull();
    act(() => root.unmount());
  });

  it('keeps editor and published resolution identical', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.avatar = avatarProps({
      [storyKey(0, 'at')]: hoursAgo(2),
      [storyKey(0, 'active')]: 'on',
    });
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));

    const editorHost = document.createElement('div');
    document.body.append(editorHost);
    const editorRoot = createRoot(editorHost);
    act(() => editorRoot.render(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(saved)}>
        <TemplateRenderer />
      </EditorProvider>,
    ));

    const publicHost = document.createElement('div');
    document.body.append(publicHost);
    const publicRoot = createRoot(publicHost);
    act(() => publicRoot.render(<MagicPublicRenderer document={saved} />));

    expect(editorHost.querySelector('[data-story-ring]')?.getAttribute('data-story-ring')).toBe('active');
    expect(publicHost.querySelector('[data-story-ring]')?.getAttribute('data-story-ring')).toBe('active');

    act(() => editorRoot.unmount());
    act(() => publicRoot.unmount());
  });
});

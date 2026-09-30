// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { EditableAvatar, VerifiedNameCheck, verificationPlacementFromProps } from '../components/editor/EditableAvatar';
import { SwatchRow, normalizeHex } from '../components/editor/controls/SwatchRow';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

describe('M2.3 avatar identity and custom color controls', () => {
  it('resolves one mutually exclusive verification placement, including legacy props', () => {
    expect(verificationPlacementFromProps({ badge: 'on', badgeByName: 'on' })).toBe('name');
    expect(verificationPlacementFromProps({ badge: 'on' })).toBe('avatar');
    expect(verificationPlacementFromProps({ badgeByName: 'on' })).toBe('name');
    expect(verificationPlacementFromProps({ badgePlacement: 'none', badge: 'on', badgeByName: 'on' })).toBe('none');
    expect(verificationPlacementFromProps({}, 'name')).toBe('name');
  });

  it.each([
    ['name', 0, 1],
    ['avatar', 1, 0],
    ['none', 0, 0],
  ] as const)('renders the verification badge only in %s mode', (placement, avatarCount, nameCount) => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.avatar = { badgePlacement: placement, badge: placement === 'avatar' ? 'on' : 'off', badgeByName: placement === 'name' ? 'on' : 'off', badgeColor: '#0B1F3A' };
    const { host, root } = mount(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)}>
        <EditableAvatar id="avatar" src="/avatar.jpg" alt="Perfil" sizes={{ S: 60, M: 80, L: 100 }} defaultBadge ringColor="#fff" />
        <VerifiedNameCheck avatarId="avatar" />
      </EditorProvider>,
    );
    expect(host.querySelectorAll('[aria-label="Perfil verificado"]')).toHaveLength(avatarCount);
    expect(host.querySelectorAll('[aria-label="Nombre verificado"]')).toHaveLength(nameCount);
    act(() => root.unmount());
  });

  it('allows an exact arbitrary HEX value while preserving quick swatches and automatic mode', () => {
    let selected: string | undefined;
    const { host, root } = mount(<SwatchRow colors={['#FFFFFF', '#000000']} value={undefined} onChange={(value) => { selected = value; }} />);
    expect(host.textContent).toContain('Automático');
    expect(host.textContent).toContain('Más colores');
    act(() => (host.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click());
    const hex = host.querySelector('input[aria-label="Color HEX"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(hex, '#0B1F3A');
      hex.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '#0B1F3A' }));
    });
    act(() => (host.querySelector('[role="dialog"] button:last-child') as HTMLButtonElement).click());
    expect(selected).toBe('#0B1F3A');
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('blue')).toBeUndefined();
    act(() => root.unmount());
  });

  it('keeps placement and arbitrary color through Magic save/reload', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.avatar = { badgePlacement: 'name', badgeColor: '#0B1F3A' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
    const reloaded = hydrateMagicEditorState(saved);
    expect(reloaded.doc.props.avatar).toEqual({ badgePlacement: 'name', badgeColor: '#0B1F3A' });
  });

  it.each([
    ['name', 0, 1],
    ['avatar', 1, 0],
    ['none', 0, 0],
  ] as const)('keeps the single %s verification placement in public rendering', (placement, avatarCount, nameCount) => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.avatar = { badgePlacement: placement, badge: placement === 'avatar' ? 'on' : 'off', badgeByName: placement === 'name' ? 'on' : 'off' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
    const { host, root } = mount(<MagicPublicRenderer document={saved} />);
    expect(host.querySelectorAll('[aria-label="Perfil verificado"]')).toHaveLength(avatarCount);
    expect(host.querySelectorAll('[aria-label="Nombre verificado"]')).toHaveLength(nameCount);
    act(() => root.unmount());
  });

  it('renders a saved custom text color through the public renderer', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.texts['hero.name'] = 'Marca';
    documentState.textStyles['hero.name'] = { color: '#0B1F3A' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
    const { host, root } = mount(<MagicPublicRenderer document={saved} />);
    const name = host.querySelector('h1') as HTMLElement | null;
    expect(name?.getAttribute('style')).toContain('color: #0B1F3A');
    act(() => root.unmount());
  });
});

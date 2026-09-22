import React, { useContext } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { EditableParentContext } from '../../contexts/EditableParentContext';
import { Editable } from './Editable';
import { SocialIcon } from '../icons/SocialIcon';
import { socialLabel } from '../../data/socialPlatforms';
import type { SocialPlatform } from '../../types/editor';

export type SocialStyle = 'circle' | 'square' | 'plain';

interface EditableSocialProps {
  id: string;
  platform: SocialPlatform;
  href: string;
  size?: number;
  defaultStyle?: SocialStyle;
}

/** Style is shared by every icon in the same block, so one change restyles the whole row. */
export function socialStyleScope(blockKey: string | undefined, parentId: string | undefined): string {
  return blockKey ? `block:${blockKey}` : parentId ?? 'page';
}

export function EditableSocial({ id, platform, href, size = 44, defaultStyle = 'circle' }: EditableSocialProps) {
  const { doc } = useEditor();
  const parent = useContext(EditableParentContext);
  const scope = socialStyleScope(parent.blockKey, parent.id);
  const style = doc.props[scope]?.iconStyle as SocialStyle ?? defaultStyle;
  const p = doc.props[id] ?? {};
  const pf = p.platform as SocialPlatform ?? platform;

  const shape: React.CSSProperties =
  style === 'circle' ?
  { borderRadius: 9999, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)' } :
  style === 'square' ?
  { borderRadius: Math.round(size * 0.28), background: 'var(--fg)', color: 'var(--surface)' } :
  { color: 'var(--fg)' };

  return (
    <Editable
      id={id}
      kind="social"
      label={socialLabel(pf)}
      as="a"
      href={p.href ?? href}
      target="_blank"
      rel="noreferrer"
      aria-label={socialLabel(pf)}
      data-style={style}
      className="grid shrink-0 place-items-center transition-opacity duration-150 hover:opacity-80"
      style={{ width: size, height: size, ...shape }}>
      
      <SocialIcon platform={pf} className="h-[45%] w-[45%]" />
    </Editable>);

}
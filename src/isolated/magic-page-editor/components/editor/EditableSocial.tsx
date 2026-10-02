import React, { useContext } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { EditableParentContext } from '../../contexts/EditableParentContext';
import { Editable } from './Editable';
import { SocialIcon } from '../icons/SocialIcon';
import { socialLabel } from '../../data/socialPlatforms';
import type { SocialPlatform } from '../../types/editor';

export type SocialStyle = 'circle' | 'square' | 'plain';
export type SocialLayout = 'row' | 'column' | 'arc' | 'cluster';
export type SocialShape = 'circle' | 'rounded' | 'square';
export type SocialFill = 'filled' | 'outline' | 'plain';
export type SocialSize = 'sm' | 'md' | 'lg';

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
  const style = doc.props[scope]?.['iconStyle'] as SocialStyle ?? defaultStyle;
  const fill = doc.props[scope]?.['socialFill'] as SocialFill | undefined;
  const socialShape = doc.props[scope]?.['socialShape'] as SocialShape | undefined;
  const socialSize = doc.props[scope]?.['socialSize'] as SocialSize | undefined;
  const renderedSize = socialSize === 'sm' ? Math.round(size * 0.82) : socialSize === 'lg' ? Math.round(size * 1.18) : size;
  const p = doc.props[id] ?? {};
  const pf = p.platform as SocialPlatform ?? platform;

  const customBubble = doc.props[scope]?.['socialBubbleColor'] as string | undefined;
  const customIcon = doc.props[scope]?.['socialIconColor'] as string | undefined;

  const shape: React.CSSProperties =
  fill === 'plain' || style === 'plain' ? { color: customIcon || 'var(--fg)' } :
  fill === 'outline' ? { borderRadius: 12, border: `1px solid ${customBubble || 'var(--line)'}`, color: customIcon || 'var(--fg)' } :
  style === 'circle' || socialShape === 'circle' ?
  { borderRadius: 9999, border: `1px solid ${customBubble || 'var(--line)'}`, background: customBubble || 'var(--surface)', color: customIcon || 'var(--fg)' } :
  style === 'square' ?
  { borderRadius: socialShape === 'square' ? 0 : Math.round(renderedSize * 0.28), background: customBubble || 'var(--fg)', color: customIcon || 'var(--surface)' } :
  { color: customIcon || 'var(--fg)' };

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
      style={{ width: renderedSize, height: renderedSize, ...shape }}>
      
      <SocialIcon platform={pf} className="h-[45%] w-[45%]" />
    </Editable>);

}

/** Shared social group layout; the child icons remain independently editable. */
export function EditableSocialGroup({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { doc } = useEditor();
  const parent = useContext(EditableParentContext);
  const scope = socialStyleScope(parent.blockKey, parent.id);
  const props = doc.props[scope] ?? {};
  const layout = (props['socialLayout'] as SocialLayout | undefined) ?? 'row';
  const size = (props['socialSize'] as SocialSize | undefined) ?? 'md';
  const gap = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const layoutStyle: React.CSSProperties = layout === 'column'
    ? { flexDirection: 'column', alignItems: 'flex-start', gap }
    : layout === 'arc'
      ? { alignItems: 'flex-end', gap, transform: 'rotate(-4deg)' }
      : layout === 'cluster'
        ? { flexWrap: 'wrap', maxWidth: 220, gap }
        : { flexDirection: 'row', gap };
  return <div data-social-layout={layout} className={className} style={{ ...layoutStyle, ...style }}>{children}</div>;
}

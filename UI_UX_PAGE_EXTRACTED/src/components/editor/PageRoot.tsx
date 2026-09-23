import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';
import { toneVars } from '../../utils/styles';

interface PageRootProps {
  children: React.ReactNode;
  className?: string;
}

/** The page background itself is tappable: it opens page-level controls (background, typography, settings). */
export function PageRoot({ children, className }: PageRootProps) {
  const t = useThemeTokens();
  return (
    <Editable
      id="page"
      kind="page"
      label="Página"
      className={cx('relative w-full flex-1', className)}
      style={{ ...toneVars(t.page), background: t.page.color, color: 'var(--fg)', fontFamily: t.bodyFont }}>
      
      {children}
    </Editable>);

}

export function useFooterTone(): React.CSSProperties {
  const { doc } = useEditor();
  const t = useThemeTokens();
  const tone = t.tones.find((x) => x.id === doc.props.footer?.bg);
  return tone ? { ...toneVars(tone), background: tone.color } : {};
}
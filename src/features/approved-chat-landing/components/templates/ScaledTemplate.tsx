import React, { useLayoutEffect, useRef, useState } from 'react';
import { PAGE_WIDTH, TemplatePage } from './TemplatePage';
import type { PageContent, TemplateFamily } from '../../types/cripqer';

interface ScaledTemplateProps {
  template: TemplateFamily;
  content?: PageContent | undefined;
  reveal?: number | undefined;
  autoHeight?: boolean | undefined;
  hiddenBlocks?: string[] | undefined;
  selectedKey?: string | null | undefined;
  onSelectBlock?: ((key: string) => void) | undefined;
  className?: string | undefined;
}

/** Renders a template page at its real width and scales it to the container width. */
export function ScaledTemplate({ template, content, reveal, autoHeight, hiddenBlocks, selectedKey, onSelectBlock, className = '' }: ScaledTemplateProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = outer.current;
    const box = inner.current;
    if (!el || !box) return;
    const measure = () => {
      setScale(el.clientWidth / PAGE_WIDTH);
      setHeight(box.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      className={`relative overflow-hidden ${autoHeight ? '' : 'h-full w-full'} ${className}`}
      style={autoHeight ? { height: height * scale, width: '100%', background: template.palette.bg } : { background: template.palette.bg }}>
      
      <div ref={inner} style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left', opacity: scale ? 1 : 0 }}>
        <TemplatePage
          template={template}
          content={content}
          reveal={reveal}
          hiddenBlocks={hiddenBlocks}
          selectedKey={selectedKey}
          onSelectBlock={onSelectBlock} />
        
      </div>
    </div>);

}
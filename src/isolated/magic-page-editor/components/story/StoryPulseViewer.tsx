import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from 'lucide-react';
import { STORY_FEATURE_LABEL } from '../../utils/stories';

/**
 * E3 — "Pulso activo" viewer. Mobile first:
 *   - the overlay is a fixed layer sized with `100dvh` plus safe-area padding, so it
 *     never sits under the phone's status/navigation bars;
 *   - the photo uses `object-contain` (never cropped);
 *   - it closes with the button, the backdrop or `Esc`;
 *   - the page scroll is locked while open and restored EXACTLY on close.
 * No captions, no autoplay, no advance: one photo, the active pulse.
 */
interface StoryPulseViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function StoryPulseViewer({ src, alt = STORY_FEATURE_LABEL, onClose }: StoryPulseViewerProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const overlay = (
    <div
      data-story-viewer="open"
      role="dialog"
      aria-modal="true"
      aria-label={STORY_FEATURE_LABEL}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100dvh',
        maxHeight: '100dvh',
        zIndex: 60,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(12,12,14,0.94)',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <img
        data-story-viewer-image=""
        src={src}
        alt={alt}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 16 }}
      />
      <button
        type="button"
        data-story-viewer-close=""
        aria-label="Cerrar Pulso"
        autoFocus
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 'max(12px, env(safe-area-inset-right))',
          display: 'grid',
          placeItems: 'center',
          height: 40,
          width: 40,
          borderRadius: 9999,
          border: '1px solid rgba(255,255,255,0.28)',
          background: 'rgba(0,0,0,0.45)',
          color: '#FFFFFF',
          cursor: 'pointer',
        }}
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}

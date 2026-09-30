import React, { useEffect, useRef, useState } from 'react';
import { useEditor as useEditorForCrop } from '../../../contexts/EditorContext';
import { cx } from '../../../utils/cx';

interface PositionPadProps {
  value: string;
  onChange: (value: string) => void;
}

interface FreeCropControlProps {
  x: number;
  y: number;
  zoom: number;
  onChange: (key: 'cropX' | 'cropY' | 'zoom', value: string) => void;
}

const xs = ['left', 'center', 'right'];
const ys = ['top', 'center', 'bottom'];

/** Maps the legacy position enum to the canonical crop contract consumed by renderers. */
export function cropFromPosition(value: string): { cropX: string; cropY: string } {
  const [x = 'center', y = 'center'] = value === 'center' ? ['center', 'center'] : value.split(' ');
  const axis = (part: string) => part === 'left' || part === 'top' ? '0' : part === 'right' || part === 'bottom' ? '100' : '50';
  return { cropX: axis(x), cropY: axis(y) };
}

export function PositionPad({ value, onChange }: PositionPadProps) {
  const current = value === 'center' ? 'center center' : value;
  return (
    <div className="flex items-center gap-4">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F2F3F5] p-1.5" role="radiogroup" aria-label="Punto de enfoque">
        {ys.map((y) =>
        xs.map((x) => {
          const v = `${x} ${y}`;
          const active = v === current;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Enfocar ${x} ${y}`}
              onClick={() => onChange(v)}
              className={cx('grid h-10 w-10 place-items-center rounded-lg transition-colors duration-150', active ? 'bg-white shadow-sm' : 'hover:bg-white/60')}>
              
                <span className={cx('rounded-full transition-all duration-150', active ? 'h-2.5 w-2.5 bg-select' : 'h-1.5 w-1.5 bg-[#A3A8B0]')} />
              </button>);

        })
        )}
      </div>
      <p className="text-[12px] leading-snug text-mute">Elige qué parte de la imagen debe quedar siempre visible.</p>
    </div>);

}

/** Continuous crop controls shared by every editable photograph. */
export function FreeCropControl({ x, y, zoom, onChange }: FreeCropControlProps) {
  const pad = useRef<HTMLDivElement>(null);
  const move = (clientX: number, clientY: number) => {
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return;
    onChange('cropX', String(Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)))));
    onChange('cropY', String(Math.round(Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)))));
  };
  return (
    <div className="space-y-3">
      <div
        ref={pad}
        role="slider"
        aria-label="Encuadre libre"
        aria-valuetext={`${x}% horizontal, ${y}% vertical`}
        tabIndex={0}
        className="relative h-28 cursor-crosshair touch-none overflow-hidden rounded-xl border border-line bg-[#EEF0F3]"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX, event.clientY);
        }}>
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <span className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-select shadow-sm" style={{ left: `${x}%`, top: `${y}%` }} />
      </div>
      <label className="block text-[12px] font-medium text-mute">
        Zoom · {Math.round(zoom * 100)}%
        <input
          className="mt-2 w-full accent-[var(--select)]"
          type="range"
          min="1"
          max="2.5"
          step="0.01"
          value={zoom}
          onChange={(event) => onChange('zoom', event.target.value)} />
      </label>
      <p className="text-[12px] leading-snug text-mute">Arrastra el punto para escoger exactamente qué zona queda visible.</p>
    </div>
  );
}

/** Makes the photograph itself draggable while keeping edits in the existing document state. */
export function useFreeImagePan(id: string, cropX: string | undefined, cropY: string | undefined) {
  const [position, setPosition] = useState({ x: Number(cropX ?? 50), y: Number(cropY ?? 50) });
  const start = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const { setProp } = useEditorForCrop();

  const positionAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, position.x - (event.clientX - (start.current?.pointerX ?? event.clientX)) / rect.width * 100)),
      y: Math.max(0, Math.min(100, position.y - (event.clientY - (start.current?.pointerY ?? event.clientY)) / rect.height * 100))
    };
  };

  useEffect(() => setPosition({ x: Number(cropX ?? 50), y: Number(cropY ?? 50) }), [cropX, cropY]);

  return {
    objectPosition: `${position.x}% ${position.y}%`,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        // HeroFrame also receives bubbled pointer events from editable children.
        // Only the media itself may start a crop gesture; otherwise pointer
        // capture retargets the eventual click to the Hero container.
        if (event.currentTarget !== event.target) return;
        start.current = { pointerX: event.clientX, pointerY: event.clientY, ...position };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
          x: Math.max(0, Math.min(100, start.current.x - (event.clientX - start.current.pointerX) / rect.width * 100)),
          y: Math.max(0, Math.min(100, start.current.y - (event.clientY - start.current.pointerY) / rect.height * 100))
        });
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        if (!start.current) return;
        const next = positionAt(event);
        event.currentTarget.releasePointerCapture(event.pointerId);
        setPosition(next);
        setProp(id, 'cropX', String(Math.round(next.x)));
        setProp(id, 'cropY', String(Math.round(next.y)));
        start.current = null;
      }
    }
  };
}

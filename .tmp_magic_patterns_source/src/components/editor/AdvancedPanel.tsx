import React from 'react';
import { CornerLeftUpIcon, LockIcon, RotateCcwIcon, Settings2Icon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { Toggle } from './controls/Toggle';
import { TextField } from './controls/TextField';
import { PositionPad } from './controls/PositionPad';
import { StructureRow } from './StructureRow';
import { blockLabels } from '../../data/blockKit';
import { CardAdvanced } from '../cards/CardAdvanced';
import { getCardContext } from '../cards/cardActions';

/** "Más": the advanced layer. Same content on desktop (popover) and mobile (expanded sheet). */
export function AdvancedPanel() {
  const ed = useEditor();
  const sel = ed.selection;
  if (!sel) return null;
  const id = sel.id;
  const p = ed.doc.props[id] ?? {};
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(id, key, value);
  const block = sel.blockKey ? ed.doc.blocks.find((b) => b.key === sel.blockKey) : undefined;
  const isContainer = sel.kind === 'section' || sel.kind === 'hero';

  let specific: React.ReactNode = null;
  switch (sel.kind) {
    case 'text':{
        const ts = ed.doc.textStyles[id] ?? {};
        specific =
        <PanelSection title="Estilo del texto">
          <Toggle label="Mayúsculas" checked={!!ts.upper} onChange={(v) => ed.setTextStyle(id, { upper: v })} />
          <Segmented
            ariaLabel="Espaciado entre letras"
            options={[
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Espaciado' }]
            }
            value={ts.tracking ?? 'normal'}
            onChange={(v) => ed.setTextStyle(id, { tracking: v })} />
          
          <button
            type="button"
            onClick={() => ed.setTextStyle(id, { size: undefined, bold: undefined, color: undefined, align: undefined, upper: undefined, tracking: undefined })}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mute hover:text-ink">
            
            <RotateCcwIcon className="h-3.5 w-3.5" /> Restablecer estilo de la plantilla
          </button>
        </PanelSection>;

        break;
      }
    case 'image':
      specific =
      <PanelSection title="Accesibilidad" hint="Describe la imagen para lectores de pantalla y buscadores.">
          <TextField label="Texto alternativo" value={p.alt ?? el?.querySelector('img')?.getAttribute('alt') ?? ''} onCommit={(v) => set('alt', v)} />
        </PanelSection>;

      break;
    case 'avatar':{
        const hasBadge = p.badge ? p.badge === 'on' : !!el?.querySelector('[aria-label="Perfil verificado"]');
        specific =
        <>
          <PanelSection title="Detalles">
            <Toggle label="Insignia verificada" description="Un pequeño sello sobre la foto" checked={hasBadge} onChange={(v) => set('badge', v ? 'on' : 'off')} />
          </PanelSection>
          <PanelSection title="Encuadre">
            <PositionPad value={p.pos ?? 'center'} onChange={(v) => set('pos', v)} />
          </PanelSection>
        </>;

        break;
      }
    case 'cta':{
        const full = p.full ? p.full === 'on' : !!el?.classList.contains('w-full');
        specific =
        <PanelSection title="Comportamiento">
          <Toggle label="Ancho completo" checked={full} onChange={(v) => set('full', v ? 'on' : 'off')} />
          <Toggle label="Abrir en pestaña nueva" checked={(p.newTab ?? 'on') === 'on'} onChange={(v) => set('newTab', v ? 'on' : 'off')} />
        </PanelSection>;

        break;
      }
    case 'hero':
      specific =
      <>
          <PanelSection title="Altura de la imagen">
            <Segmented
            ariaLabel="Altura"
            options={[
            { value: 'S', label: 'Baja' },
            { value: 'M', label: 'Media' },
            { value: 'L', label: 'Alta' }]
            }
            value={p.height ?? 'M'}
            onChange={(v) => set('height', v)} />
          
          </PanelSection>
          <PanelSection title="Punto de enfoque">
            <PositionPad value={p.pos ?? 'center'} onChange={(v) => set('pos', v)} />
          </PanelSection>
        </>;

      break;
    case 'familyCard':{
        const ctx = getCardContext(ed, id, sel.blockKey);
        specific = ctx ? <CardAdvanced ctx={ctx} /> : null;
        break;
      }
    case 'price':
    case 'badge':
      specific =
      <p className="rounded-xl bg-[#F7F8FA] p-3 text-[12.5px] leading-snug text-mute">
          Si lo ocultas, vuelve a mostrarlo desde «Más» de la tarjeta, en Campos.
        </p>;

      break;
    case 'gallery':
      specific =
      <PanelSection title="Espacio entre fotos">
          <Segmented
          ariaLabel="Espacio entre fotos"
          options={[
          { value: 'S', label: 'Junto' },
          { value: 'M', label: 'Medio' },
          { value: 'L', label: 'Amplio' }]
          }
          value={p.gap ?? 'M'}
          onChange={(v) => set('gap', v)} />
        
        </PanelSection>;

      break;
    case 'card':
      specific =
      <PanelSection title="Comportamiento">
          <Toggle label="Abrir en pestaña nueva" checked={(p.newTab ?? 'on') === 'on'} onChange={(v) => set('newTab', v ? 'on' : 'off')} />
        </PanelSection>;

      break;
    case 'social':
      specific =
      <PanelSection title="Consejo" hint="El estilo de icono se comparte con todo el grupo; plataforma y destino son de cada icono.">
          <span />
        </PanelSection>;

      break;
    case 'section':
      specific = sel.blockKey ?
      <>
          <PanelSection title="Espaciado vertical" hint="El espaciado es una propiedad del bloque, no un bloque aparte.">
            <Segmented
            ariaLabel="Espaciado vertical"
            options={[
            { value: 'none', label: 'Sin' },
            { value: 'S', label: 'Compacto' },
            { value: 'M', label: 'Medio' },
            { value: 'L', label: 'Amplio' }]
            }
            value={p.spacing ?? el?.dataset.spacing ?? 'M'}
            onChange={(v) => set('spacing', v)} />
          
          </PanelSection>
          <PanelSection title="Enlace a esta sección">
            <TextField label="Ancla" prefix="#" value={p.anchor ?? ''} placeholder={blockLabels[block?.type ?? 'text'].toLowerCase()} onCommit={(v) => set('anchor', v)} />
          </PanelSection>
        </> :

      <div className="flex items-start gap-2.5 rounded-xl bg-[#F7F8FA] p-3 text-[12.5px] leading-snug text-mute">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
          El pie de página es estructura fija: siempre aparece al final. Puedes editar su texto, redes y fondo.
        </div>;

      break;
    case 'page':
      specific =
      <button
        type="button"
        onClick={() => ed.setSettingsOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition-colors duration-150 hover:bg-[#F7F8FA]">
        
          <Settings2Icon className="h-4 w-4 text-mute" />
          <span className="flex-1">
            <span className="block text-[13px] font-semibold text-ink">Ajustes de página</span>
            <span className="block text-[12px] text-mute">Título, URL, SEO y dominio</span>
          </span>
        </button>;

      break;
  }

  return (
    <div className="space-y-5">
      {specific}
      {block && (sel.kind === 'hero' || !isContainer) &&
      <PanelSection title={`Bloque · ${blockLabels[block.type]}`} hint={sel.kind === 'hero' ? undefined : 'Este elemento vive dentro de este bloque.'}>
          <StructureRow blockKey={block.key} />
          {sel.kind !== 'hero' &&
        <button
          type="button"
          onClick={() => ed.select(`block:${block.key}`)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-select hover:text-select-ink">
          
              <CornerLeftUpIcon className="h-3.5 w-3.5" /> Seleccionar bloque completo
            </button>
        }
        </PanelSection>
      }
    </div>);

}
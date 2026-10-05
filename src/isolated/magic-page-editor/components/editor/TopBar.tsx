import React, { useEffect, useRef, useState } from 'react';
import {
  CheckIcon as SelectedIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  Loader2Icon,
  MonitorIcon,
  PenLineIcon,
  Redo2Icon,
  Settings2Icon,
  SmartphoneIcon,
  Undo2Icon } from
'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import Logo from '../../../../components/brand/Logo';
import { cardFamilies } from '../../data/cardFamilies';
import { accessForIndex, isVariantLocked, miniGalleryVariants, pageFamilyVariants, templates } from '../../data/templates';
import { cx } from '../../utils/cx';
import type { TemplateId } from '../../types/editor';
import { applyCardFamilyVariant } from '../../utils/cardOps';

type PageFamily = 'bio' | 'business' | 'catalog' | 'portfolio' | 'gallery';

const pageFamilies: {id: PageFamily;label: string;short: string;template: TemplateId;}[] = [
{ id: 'bio', label: 'Bio', short: 'Bio', template: 'bio' },
{ id: 'business', label: 'Negocio / Servicios', short: 'Negocio', template: 'business' },
{ id: 'catalog', label: 'Catálogo', short: 'Catálogo', template: 'business' },
{ id: 'portfolio', label: 'Portafolio', short: 'Portafolio', template: 'portfolio' },
{ id: 'gallery', label: 'Mini Galería', short: 'Galería', template: 'portfolio' }];

const familyVariants = (family: PageFamily) => {
  if (family === 'catalog') return cardFamilies.catalog.variants;
  if (family === 'gallery') return miniGalleryVariants;
  return pageFamilyVariants[family];
};

function VariantThumbnail({ index, active }: {index: number;active: boolean;}) {
  const mode = index % 8;
  return (
    <span className={cx('relative mb-2 block h-16 overflow-hidden rounded-[6px] border', active ? 'border-select/40 bg-select-soft' : 'border-line bg-[#F2F3F5]')}>
      <span className={cx('absolute bg-[#C9CED6]',
      mode === 0 && 'inset-y-2 left-2 w-[58%]',
      mode === 1 && 'inset-x-2 top-2 h-5',
      mode === 2 && 'bottom-0 left-1/2 h-14 w-10 -translate-x-1/2 rounded-t-full',
      mode === 3 && 'inset-y-2 right-2 w-[42%]',
      mode === 4 && 'left-2 right-2 top-2 h-8',
      mode === 5 && 'inset-y-3 left-3 w-5',
      mode === 6 && 'bottom-2 left-2 right-2 h-3',
      mode === 7 && 'inset-2 rotate-[-3deg]')} />
      {(mode === 1 || mode === 4 || mode === 6) && <span className="absolute bottom-2 left-2 h-2 w-1/2 bg-[#D8DCE2]" />}
      {(mode === 3 || mode === 5) && <span className="absolute bottom-3 left-2 h-2 w-1/3 bg-[#D8DCE2]" />}
    </span>);
}

function PageVariantSelectors() {
  const ed = useEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  const storedFamily = ed.doc.props.page?.family as PageFamily | undefined;
  const [selectedFamily, setSelectedFamily] = useState<PageFamily>(storedFamily ?? ed.templateId);
  const [open, setOpen] = useState<'family' | 'variant' | null>(null);
  const catalogBlockKey = ed.doc.blocks.find((block) => block.type === 'catalog')?.key ?? 'catalog';
  const variants = familyVariants(selectedFamily);
  const selectedVariant = selectedFamily === 'catalog' ? ed.doc.props[`block:${catalogBlockKey}`]?.variant ?? variants[0].id : ed.doc.props.page?.familyVariant ?? variants[0].id;
  const family = pageFamilies.find((item) => item.id === selectedFamily) ?? pageFamilies[0];
  const variant = variants.find((item) => item.id === selectedVariant) ?? variants[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, []);

  const chooseFamily = (next: typeof pageFamilies[number]) => {
    setSelectedFamily(next.id);
    ed.setProp('page', 'family', next.id);
    if (ed.templateId !== next.template) ed.setTemplateId(next.template);
    setOpen('variant');
  };

  const chooseVariant = (id: string) => {
    if (selectedFamily === 'catalog') {
      ed.updateDoc((doc) => applyCardFamilyVariant(doc, catalogBlockKey, id));
    }
    else ed.setProp('page', 'familyVariant', id);
    setOpen(null);
  };

  return (
    <div ref={rootRef} className="relative order-last mx-auto flex w-full min-w-0 items-center gap-1.5 md:order-none md:w-auto">
      <button type="button" aria-label="Tipo de página" aria-haspopup="dialog" aria-expanded={open === 'family'} onClick={(e) => { e.stopPropagation(); setOpen(open === 'family' ? null : 'family'); }} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-line bg-white px-3 text-left text-[12.5px] text-ink transition-colors hover:bg-[#F7F8FA] md:max-w-[190px]">
        <span className="min-w-0 flex-1 truncate"><span className="hidden text-mute lg:inline">Tipo de página: </span><span className="font-semibold">{family.label}</span></span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
      </button>
      <button type="button" aria-label="Variante" aria-haspopup="dialog" aria-expanded={open === 'variant'} onClick={(e) => { e.stopPropagation(); setOpen(open === 'variant' ? null : 'variant'); }} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-line bg-white px-3 text-left text-[12.5px] text-ink transition-colors hover:bg-[#F7F8FA] md:max-w-[190px]">
        <span className="min-w-0 flex-1 truncate"><span className="hidden text-mute lg:inline">Variante: </span><span className="font-semibold">{variant.label}</span></span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
      </button>

      {open === 'family' &&
      <div role="dialog" aria-label="Tipos de página" className="absolute left-0 top-[calc(100%+9px)] z-[9999] w-[286px] rounded-[8px] border border-line bg-white p-2 shadow-toolbar">
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase text-mute">Tipo de página</p>
          {pageFamilies.map((item) => {
          const active = item.id === selectedFamily;
          return <button key={item.id} type="button" aria-pressed={active} onClick={() => chooseFamily(item)} className={cx('flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-left text-[13px] transition-colors', active ? 'bg-select-soft text-select-ink' : 'text-ink hover:bg-[#F2F3F5]')}><span className="flex-1 font-medium">{item.label}</span>{active && <SelectedIcon className="h-4 w-4" />}</button>;
        })}
        </div>
      }

      {open === 'variant' &&
      <div role="dialog" aria-label={`Variantes ${family.label}`} className="absolute left-1/2 top-[calc(100%+9px)] z-[9999] w-[min(620px,calc(100vw-24px))] -translate-x-1/2 rounded-[8px] border border-line bg-white p-4 shadow-toolbar">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div><h2 className="text-[14px] font-semibold text-ink">Variantes {family.label}</h2><p className="text-[11.5px] text-mute">{variants.length} diseños disponibles{selectedFamily === 'catalog' ? ' · cambia el bloque de catálogo' : ''}</p></div>
          </div>
          <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
            {variants.map((item, index) => {
            const active = item.id === selectedVariant;
            const access = (item as {access?: 'free' | 'premium';}).access ?? accessForIndex(index);
            const locked = isVariantLocked(access);
            return <button key={item.id} type="button" data-access={access} aria-pressed={active} onClick={() => { if (!locked) chooseVariant(item.id); }} className={cx('relative rounded-[8px] border p-2 text-left transition-colors', active ? 'border-select bg-select-soft' : 'border-line hover:bg-[#F7F8FA]')}>
                  <VariantThumbnail index={index} active={active} />
                  <span className="block truncate text-[11.5px] font-semibold text-ink">{item.label}</span>
                  {active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-select text-white"><SelectedIcon className="h-3 w-3" /></span>}
                </button>;
          })}
          </div>
        </div>
      }
    </div>);
}

function IconButton({ label, onClick, disabled, active, children }: {label: string;onClick: () => void;disabled?: boolean;active?: boolean;children: React.ReactNode;}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-30',
        active ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
      )}>

      {children}
    </button>);

}

export function TopBar() {
  const ed = useEditor();
  const isSystem = typeof window !== 'undefined' && window.location.pathname.startsWith('/sistema');
  const meta = templates[ed.templateId];
  const tab = (active: boolean) =>
  cx(
    'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-medium transition-colors duration-150',
    active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)]' : 'text-mute hover:text-ink'
  );

  return (
    <header className="relative z-50 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2 md:h-14 md:flex-nowrap md:py-0 lg:gap-3 lg:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Logo
          variant="symbol"
          width={32}
          height={32}
          title="Cripqer"
          className="shrink-0"
        />
        <div className="hidden min-w-0 2xl:block">
          <p className="text-[13px] font-semibold leading-tight text-ink">Cripqer</p>
          <p className="truncate text-[11.5px] leading-tight text-mute">cripqer.com/{meta.slug}</p>
        </div>
        <nav className="flex rounded-[10px] bg-[#F2F3F5] p-0.5" aria-label="Vista">
          <a href="/" className={tab(!isSystem)}>
            Editor
          </a>
          <a href="/sistema" className={tab(isSystem)}>
            Sistema
          </a>
        </nav>
      </div>

      {!isSystem &&
      <>
          {!ed.canonicalDocument && <PageVariantSelectors />}

          <div className="flex shrink-0 items-center gap-1">
            <div className="mr-1 hidden rounded-[10px] bg-[#F2F3F5] p-0.5 md:flex" role="radiogroup" aria-label="Dispositivo">
              <button type="button" role="radio" aria-checked={ed.device === 'desktop'} aria-label="Escritorio" title="Escritorio" onClick={() => ed.setDevice('desktop')} className={tab(ed.device === 'desktop')}>
                <MonitorIcon className="h-4 w-4" />
              </button>
              <button type="button" role="radio" aria-checked={ed.device === 'mobile'} aria-label="Móvil" title="Móvil" onClick={() => ed.setDevice('mobile')} className={tab(ed.device === 'mobile')}>
                <SmartphoneIcon className="h-4 w-4" />
              </button>
            </div>
            <IconButton label="Deshacer" onClick={ed.undo} disabled={!ed.canUndo || ed.mode === 'preview'}>
              <Undo2Icon className="h-4 w-4" />
            </IconButton>
            <IconButton label="Rehacer" onClick={ed.redo} disabled={!ed.canRedo || ed.mode === 'preview'}>
              <Redo2Icon className="h-4 w-4" />
            </IconButton>
            <span className="hidden w-[92px] items-center gap-1.5 whitespace-nowrap px-1.5 text-[12px] text-mute lg:flex" aria-live="polite">
              {ed.saveState === 'saving' ?
            <>
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Guardando…
                </> :

            <>
                  <CheckIcon className="h-3.5 w-3.5 text-[#16A34A]" /> Guardado
                </>
            }
            </span>
            <IconButton label="Ajustes avanzados de página" onClick={() => ed.setSettingsOpen(true)} active={ed.settingsOpen} disabled={ed.mode === 'preview'}>
              <Settings2Icon className="h-4 w-4" />
            </IconButton>
            <button
            type="button"
            onClick={() => ed.setMode(ed.mode === 'edit' ? 'preview' : 'edit')}
            className={cx(
              'ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150',
              ed.mode === 'preview' ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
            )}>

              {ed.mode === 'preview' ? <PenLineIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{ed.mode === 'preview' ? 'Editar' : 'Vista previa'}</span>
            </button>
            <button
            type="button"
            onClick={ed.publish}
            disabled={ed.publishing}
            className="ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-70">

              {ed.publishing && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
              Publicar
            </button>
          </div>
        </>
      }

      {isSystem &&
      <a href="/" className="ml-auto inline-flex h-9 items-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
          Abrir editor
        </a>
      }
    </header>);

}
